-- Roles propios de cada negocio y tope de usuarios por plan.
--
-- El CEO, desde /cuenta › Equipo, crea roles para su gente (p. ej. «Mesero», «Cocina»)
-- eligiendo qué pestañas del panel ven y qué acciones sensibles pueden hacer, y crea
-- usuarios hasta el tope de su plan (el CEO no cuenta).
--
-- Un usuario con rol propio queda con users.role = 'cashier' y users.company_role_id:
-- todo lo que hoy limita al cajero (sucursal, políticas, client-pii, pedido manual,
-- manual_order_actor) sigue igual. El rol propio solo reemplaza lo que el super admin
-- le da al cajero en role_definitions (nav_tabs / actions).
--
-- Esto:
--   - crea public.company_roles (lectura para el mismo negocio; escribe solo /cuenta
--     con service role);
--   - agrega users.company_role_id con un trigger que exige rol del mismo negocio, base
--     cajero, y que solo lo cambie service role o un admin/ceo del negocio;
--   - crea session_role_can(rol, acción): como role_can, pero si el usuario de la sesión
--     tiene rol propio y el rol es el suyo, mira las acciones de su rol propio;
--   - pasa a session_role_can las tres funciones que usaban role_can con el rol de quien
--     actúa (reembolso y costo de envío a mano) y ajusta current_user_can;
--   - deja los topes de usuarios: Básico 4, Avanzado 4, Business 7, X 12.
--
-- Sin roles propios creados, nadie gana ni pierde nada.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- ---------------------------------------------------------------------------
-- Roles del negocio.
-- ---------------------------------------------------------------------------
create table public.company_roles (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	name text not null check (char_length(btrim(name)) between 1 and 40),
	nav_tabs text[] not null default '{}',
	actions text[] not null default '{}',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index company_roles_company_name_key on public.company_roles (company_id, lower(btrim(name)));

create trigger set_updated_at before update on public.company_roles
	for each row execute function public._trigger_set_updated_at();

alter table public.company_roles enable row level security;

create policy company_roles_company_read on public.company_roles for select to authenticated
	using (company_id = public.current_user_company_id() or public.is_super_admin());

revoke all on public.company_roles from public, anon, authenticated;
grant select on public.company_roles to authenticated;
grant all on public.company_roles to service_role;

-- ---------------------------------------------------------------------------
-- El rol propio de cada usuario.
-- ---------------------------------------------------------------------------
alter table public.users
	add column company_role_id uuid references public.company_roles(id) on delete restrict;

create index users_company_role_id_idx on public.users (company_role_id) where company_role_id is not null;

-- Rol propio: del mismo negocio y sobre la base del cajero. Si el usuario pasa a otro
-- rol (admin, ceo), el rol propio se suelta solo. Desde el navegador solo lo cambia un
-- admin/ceo del negocio; /cuenta escribe con service role (sin auth.uid()).
create or replace function public.users_company_role_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $$
begin
	if new.company_role_id is not null
		and lower(btrim(coalesce(new.role, ''))) not in ('cashier', 'staff') then
		new.company_role_id := null;
	end if;

	if (tg_op = 'INSERT' and new.company_role_id is not null)
		or (tg_op = 'UPDATE' and new.company_role_id is distinct from old.company_role_id) then
		if auth.uid() is not null and not exists (
			select 1 from public.users me
			where me.auth_user_id = auth.uid()
				and coalesce(me.is_active, true)
				and me.company_id = new.company_id
				and lower(btrim(coalesce(me.role, ''))) in ('admin', 'ceo')
		) and not public.is_super_admin() then
			raise exception 'company_role_not_allowed' using errcode = '42501';
		end if;
	end if;

	if new.company_role_id is not null and not exists (
		select 1 from public.company_roles cr
		where cr.id = new.company_role_id and cr.company_id = new.company_id
	) then
		raise exception 'company_role_wrong_company' using errcode = '23514';
	end if;

	return new;
end;
$$;

create trigger users_company_role_guard
	before insert or update of role, company_role_id, company_id on public.users
	for each row execute function public.users_company_role_guard();

-- ---------------------------------------------------------------------------
-- ¿Puede este rol hacer esta acción, para quien está actuando?
-- ---------------------------------------------------------------------------
create or replace function public.session_role_can(p_role text, p_action text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $$
	with me as (
		select u.company_role_id
		from public.users u
		where u.auth_user_id = auth.uid()
			and coalesce(u.is_active, true)
			and u.company_role_id is not null
			and (case lower(btrim(coalesce(u.role, ''))) when 'staff' then 'cashier' else lower(btrim(coalesce(u.role, ''))) end)
				= (case lower(btrim(coalesce(p_role, ''))) when 'staff' then 'cashier' else lower(btrim(coalesce(p_role, ''))) end)
		limit 1
	)
	select case
		when exists (select 1 from me) then exists (
			select 1 from me join public.company_roles cr on cr.id = me.company_role_id
			where p_action = any(cr.actions)
		)
		else public.role_can(p_role, p_action)
	end;
$$;

revoke all on function public.session_role_can(text, text) from public, anon;
grant execute on function public.session_role_can(text, text) to authenticated, service_role;

-- La misma pregunta para las políticas RLS (recompensas por puntos).
create or replace function public.current_user_can(p_action text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $$
	select public.is_super_admin() or exists (
		select 1
		from public.users u
		left join public.company_roles cr on cr.id = u.company_role_id
		where u.auth_user_id = auth.uid()
			and coalesce(u.is_active, true)
			and case
				when u.company_role_id is not null then p_action = any(coalesce(cr.actions, '{}'))
				else public.role_can(u.role, p_action)
			end
	);
$$;

-- ---------------------------------------------------------------------------
-- Reembolso y costo de envío a mano: el rol de quien actúa, con su rol propio.
-- Cada función se reescribe desde su definición actual cambiando solo la llamada.
-- ---------------------------------------------------------------------------
do $$
declare
	expected constant text[] := array[
		'refund_order_payment_v2',
		'resolve_delivery_fee_for_role',
		'resolve_delivery_fee_for_role_legacy_v1'
	];
	found text[];
	fn record;
	old_def text;
	new_def text;
begin
	select array_agg(p.proname::text order by p.proname) into found
	from pg_proc p join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.prosrc ~ 'role_can\('
		and p.proname not in ('role_can', 'current_user_can', 'session_role_can');

	if found is distinct from expected then
		raise exception 'Funciones con role_can distintas a las revisadas: %', found;
	end if;

	for fn in
		select p.oid, p.proname
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(expected)
	loop
		old_def := pg_get_functiondef(fn.oid);
		if (select count(*) from regexp_matches(old_def, 'public\.role_can\(', 'g')) <> 1
			or (select count(*) from regexp_matches(old_def, 'role_can\(', 'g')) <> 1 then
			raise exception '%: se esperaba una sola llamada a public.role_can', fn.proname;
		end if;

		new_def := replace(old_def, 'public.role_can(', 'public.session_role_can(');

		if new_def ~ '[^_]role_can\(' or length(new_def) - length(old_def) <> 8 then
			raise exception '%: el reemplazo no quedó como se esperaba', fn.proname;
		end if;

		execute new_def;
	end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Tope de usuarios del equipo por plan (el CEO no cuenta).
-- ---------------------------------------------------------------------------
do $$
declare
	changed integer;
begin
	update public.plans set max_users = 4
	where id in (
		'cab5b3c1-f446-4cf2-aaab-863dd178bb14', -- Básico · Menú digital
		'461c488f-127d-4844-99e1-2d4267f3e693', -- Básico · Panel CEO
		'ee1f46c5-5bfb-4863-b3df-efa7ec9debd4', -- Basico (ya no público)
		'7f165ec6-e133-4b06-ab6c-00f520386e17'  -- Avanzado
	);
	get diagnostics changed = row_count;
	if changed <> 4 then raise exception 'Planes de 4 usuarios: se esperaban 4, cambiaron %', changed; end if;

	update public.plans set max_users = 7 where id = '6429b81a-6317-430b-8f38-18e0eb0fd701'; -- Business
	get diagnostics changed = row_count;
	if changed <> 1 then raise exception 'Business no encontrado'; end if;

	update public.plans set max_users = 12 where id = 'e2758e36-3ea9-4ee4-834a-8c6e986e6770'; -- X
	get diagnostics changed = row_count;
	if changed <> 1 then raise exception 'X no encontrado'; end if;
end
$$;

-- Nada debe seguir llamando a role_can con el rol de quien actúa sin pasar por su rol propio.
do $$
begin
	if exists (
		select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public'
			and p.prosrc ~ '[^_]role_can\(|^role_can\('
			and p.proname not in ('current_user_can', 'session_role_can')
	) then
		raise exception 'Quedó una función llamando a role_can directo';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;
