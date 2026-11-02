-- Prueba de aislamiento entre empresas (SOC 2 CC6.1 / ISO 27001 A.8.3). Solo lectura.
--
-- Simula, con los mismos claims que manda PostgREST, tres sesiones de la empresa con más
-- pedidos: su CEO, un usuario no admin (cajero) y un cliente del menú con sesión pero sin
-- fila en users. Para cada tabla de public con company_id cuenta cuántas filas de OTRAS
-- empresas ve cada sesión. Más un puñado de tablas sin company_id, por su tabla padre.
--
-- Lo esperado: 0 en todo, salvo el catálogo que la tienda pública ya muestra a cualquiera
-- (productos, tamaños, variantes… de negocios activos): eso sale marcado como «público».
--
-- Correr como postgres (puede cambiar de rol):
--   psql -U postgres -d postgres -X -q -f sql/checks/aislamiento-empresas.sql
-- Corre en una transacción read only y termina en rollback: no cambia nada.

begin read only;

do $$
declare
	v_company uuid;
	v_ceo uuid;
	v_staff uuid;
	v_session record;
	v_table record;
	v_n bigint;
	v_leaks int := 0;
	-- Tablas que la tienda pública ya lee sin sesión (políticas public_menu_* / *_select_public).
	v_public text[] := array[
		'products', 'product_prices', 'product_branch', 'product_sizes', 'product_variants',
		'categories', 'category_branch', 'hero_banners', 'branches', 'business_info',
		'product_extras_groups', 'product_extras_options', 'product_upsell_beverages',
		'addons', 'exchange_rates', 'plans'];
begin
	-- La de más pedidos entre las que tienen CEO y algún usuario no admin.
	select o.company_id into v_company
	from public.orders o
	where exists (select 1 from public.users u where u.company_id = o.company_id and u.role = 'ceo')
		and exists (select 1 from public.users u where u.company_id = o.company_id
			and u.role not in ('ceo', 'admin') and coalesce(u.is_active, true))
	group by o.company_id order by count(*) desc limit 1;
	if v_company is null then
		select o.company_id into v_company
		from public.orders o group by o.company_id order by count(*) desc limit 1;
	end if;

	select u.auth_user_id into v_ceo from public.users u
	where u.company_id = v_company and u.role = 'ceo' and coalesce(u.is_active, true)
		and u.auth_user_id is not null
		and not exists (select 1 from public.admin_users a where lower(a.email) = lower(u.email))
	limit 1;

	select u.auth_user_id into v_staff from public.users u
	where u.company_id = v_company and u.role not in ('ceo', 'admin') and coalesce(u.is_active, true)
		and u.auth_user_id is not null
		and not exists (select 1 from public.admin_users a where lower(a.email) = lower(u.email))
	limit 1;

	raise notice 'Empresa de prueba: % · CEO: % · no admin: %',
		v_company, v_ceo is not null, v_staff is not null;

	for v_session in
		select * from (values
			('ceo', v_ceo),
			('no_admin', v_staff),
			('cliente_menu', gen_random_uuid())
		) s(label, uid)
		where s.uid is not null
	loop
		perform set_config('request.jwt.claims',
			json_build_object('role', 'authenticated', 'sub', v_session.uid)::text, true);
		execute 'set local role authenticated';

		for v_table in
			select c.relname as table_name
			from pg_class c
			join pg_attribute a on a.attrelid = c.oid and a.attname = 'company_id' and not a.attisdropped
			where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
				and has_table_privilege('authenticated', c.oid, 'select')
				-- Su RLS va por el cliente, no por su propio company_id: se revisa abajo, por el padre.
				and c.relname <> 'client_addresses'
			order by 1
		loop
			begin
				execute format(
					'select count(*) from public.%I where company_id is distinct from $1',
					v_table.table_name) into v_n using v_company;
			exception when insufficient_privilege then
				v_n := 0;
			end;
			if v_n > 0 then
				if v_table.table_name = any (v_public) then
					raise notice '  [%] % · % filas de otras empresas (público)',
						v_session.label, v_table.table_name, v_n;
				else
					raise warning '  [%] % · % filas de OTRAS EMPRESAS',
						v_session.label, v_table.table_name, v_n;
					v_leaks := v_leaks + 1;
				end if;
			end if;
		end loop;

		-- Tablas sin company_id, por su padre.
		for v_table in
			select * from (values
				('client_addresses', 'select count(*) from public.client_addresses x join public.clients p on p.id = x.client_id where p.company_id is distinct from $1'),
				('branch_payment_methods', 'select count(*) from public.branch_payment_methods x join public.branches p on p.id = x.branch_id where p.company_id is distinct from $1'),
				('inventory_branch', 'select count(*) from public.inventory_branch x join public.branches p on p.id = x.branch_id where p.company_id is distinct from $1'),
				('saas_ticket_messages', 'select count(*) from public.saas_ticket_messages x join public.saas_tickets p on p.id = x.ticket_id where p.company_id is distinct from $1')
			) q(table_name, sql)
		loop
			begin
				execute v_table.sql into v_n using v_company;
			exception when insufficient_privilege or undefined_table or undefined_column then
				v_n := 0;
			end;
			if v_n > 0 then
				raise warning '  [%] % · % filas de OTRAS EMPRESAS', v_session.label, v_table.table_name, v_n;
				v_leaks := v_leaks + 1;
			end if;
		end loop;

		execute 'reset role';
	end loop;

	-- No es filtración, pero ensucia los reportes: direcciones cuyo company_id no es el de su
	-- cliente (las ve la empresa del cliente, que es la correcta).
	select count(*) into v_n
	from public.client_addresses x join public.clients p on p.id = x.client_id
	where x.company_id is distinct from p.company_id;
	if v_n > 0 then
		raise notice 'Datos: % direcciones con company_id distinto al de su cliente.', v_n;
	end if;

	if v_leaks = 0 then
		raise notice 'RESULTADO: sin filtraciones entre empresas (fuera del catálogo público).';
	else
		raise warning 'RESULTADO: % casos con filas de otras empresas visibles.', v_leaks;
	end if;
end
$$;

rollback;
