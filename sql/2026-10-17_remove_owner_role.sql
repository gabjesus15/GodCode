-- Fuera el rol owner.
--
-- owner era el nombre viejo del dueño, de antes de ceo. Al 2026-10-17 nadie lo tiene
-- (public.users: 10 ceo, 1 cashier; admin_users: 2 super_admin; ninguno en la metadata
-- de auth.users ni en theme_config), el alta crea ceo y el super admin no lo deja asignar.
-- Solo quedaba como sinónimo de ceo/admin en el código y en la base.
--
-- Esto:
--   - borra la fila de role_definitions (deja de verse en Configuración → Roles);
--   - lo saca de las ocho funciones que lo listaban junto a admin y ceo. Cada una se
--     reescribe desde su definición actual en producción quitando solo 'owner' de la
--     lista; el resto queda igual (security definer, search_path y permisos incluidos);
--   - lo saca de las dos políticas de lectura que lo listaban.
--
-- Si alguien tuviera owner al aplicarlo, se aborta: nadie pierde acceso sin querer.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

do $$
begin
	if exists (select 1 from public.users where lower(btrim(coalesce(role, ''))) = 'owner')
		or exists (select 1 from public.admin_users where lower(btrim(coalesce(role, ''))) = 'owner') then
		raise exception 'Hay usuarios con rol owner: pásalos a ceo antes de aplicar esto';
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Funciones: quitar 'owner' de la lista de roles.
-- ---------------------------------------------------------------------------
do $$
declare
	expected constant text[] := array[
		'can_override_delivery_fee',
		'create_manual_order_atomic_v1',
		'is_admin',
		'manual_order_actor',
		'manual_order_branch_allowed',
		'role_can',
		'set_branch_exchange_rate_source',
		'update_order_transaction'
	];
	found text[];
	fn record;
	old_def text;
	new_def text;
begin
	select array_agg(p.proname::text order by p.proname) into found
	from pg_proc p join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public' and p.prosrc ~* '''owner''';

	if found is distinct from expected then
		raise exception 'Funciones con owner distintas a las revisadas: %', found;
	end if;

	for fn in
		select p.oid, p.proname
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.prosrc ~* '''owner'''
	loop
		old_def := pg_get_functiondef(fn.oid);
		if (select count(*) from regexp_matches(old_def, '''owner''', 'gi')) <> 1 then
			raise exception '%: se esperaba una sola mención de owner', fn.proname;
		end if;

		-- 'owner', 'admin' → 'admin'   y   'admin', 'ceo', 'owner' → 'admin', 'ceo'
		new_def := regexp_replace(old_def, '''owner'',\s*', '', 'gi');
		new_def := regexp_replace(new_def, ',\s*''owner''', '', 'gi');

		if new_def ~* '''owner''' or length(old_def) - length(new_def) not between 8 and 9 then
			raise exception '%: el reemplazo no quedó como se esperaba', fn.proname;
		end if;

		execute new_def;
	end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Políticas de lectura: misma regla sin owner.
-- ---------------------------------------------------------------------------
alter policy manual_order_metrics_company_read on public.manual_order_metrics
	using (
		exists (
			select 1
			from public.users u
			where u.auth_user_id = auth.uid()
				and u.company_id = manual_order_metrics.company_id
				and lower(u.role) = any (array['admin', 'ceo'])
		)
	);

alter policy order_payment_settlements_company_read on public.order_payment_settlements
	using (
		exists (
			select 1
			from public.users u
			join public.orders o
				on o.id::text = order_payment_settlements.order_id
				and o.company_id = order_payment_settlements.company_id
			where u.auth_user_id = auth.uid()
				and u.company_id = order_payment_settlements.company_id
				and (
					lower(u.role) = any (array['admin', 'ceo'])
					or (lower(u.role) = any (array['cashier', 'staff']) and u.branch_id = o.branch_id)
				)
		)
	);

-- ---------------------------------------------------------------------------
-- El rol.
-- ---------------------------------------------------------------------------
delete from public.role_definitions where name = 'owner';

-- Nada en public debe seguir nombrando a owner.
do $$
begin
	if exists (
		select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.prosrc ~* '''owner'''
	) or exists (
		select 1 from pg_policies
		where coalesce(qual, '') || coalesce(with_check, '') ~* '''owner'''
	) then
		raise exception 'Quedó alguna mención de owner';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;
