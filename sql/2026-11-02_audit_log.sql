-- 2026-11-02 · Registro de auditoría (SOC 2 CC7.2 / ISO 27001 A.8.15).
--
-- Hasta hoy solo admin_audit_logs registraba acciones, y solo las del super admin. Nadie
-- dejaba rastro de quién cambia roles, planes, datos bancarios o cupones, ni de quién
-- descifra datos personales en el panel.
--
-- public.audit_log:
--   - La escriben los triggers de abajo, el servidor de GodCode (lib/security/audit-log.ts)
--     y la edge function client-pii del panel, siempre con service role o desde la base.
--   - Solo se agrega: nadie la modifica (ni el service role), y solo el service role la
--     borra (retención, cuando se defina en la fase 6).
--   - La leen el admin/CEO de cada negocio (sus filas) y el super admin.
--   - Nunca lleva datos personales: los triggers guardan qué columnas cambiaron y, solo en
--     las columnas de la lista de cada tabla (rol, plan, estado…), el antes y el después.
--     Los datos bancarios, correos y nombres quedan como «cambió», sin valor.
--
-- Triggers (AFTER, por fila) en las tablas de configuración sensibles: users, companies,
-- company_roles, role_definitions, branches, business_info, payment_methods,
-- discount_coupons. Pedidos y caja no, por volumen. Hoy suman unas 300 escrituras en
-- total desde el último reinicio de estadísticas, así que el costo es mínimo.
--
-- Columnas pedidas por el panel (client-pii): company_id, actor_auth_user_id, actor_role,
-- action, target_type, target_count, target_ids (máximo 50), ip, user_agent, request_id,
-- metadata.
--
-- Correr como postgres, en una transacción. Antes: pg_dump -Fc a /root/backups.

begin;

create table public.audit_log (
	id bigint generated always as identity primary key,
	created_at timestamptz not null default now(),
	company_id uuid,
	actor_auth_user_id uuid,
	actor_role text,
	action text not null check (char_length(action) between 1 and 80),
	target_type text,
	target_count int,
	target_ids jsonb check (
		target_ids is null
		or (jsonb_typeof(target_ids) = 'array' and jsonb_array_length(target_ids) <= 50)
	),
	ip text,
	user_agent text,
	request_id text,
	metadata jsonb not null default '{}'
);

comment on table public.audit_log is
	'Registro de auditoría append-only. Sin datos personales. Escribe solo service role / triggers.';

create index audit_log_company_created_idx on public.audit_log (company_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
	for select to authenticated
	using (
		public.is_super_admin()
		or (company_id = public.current_user_company_id() and public.is_admin())
	);

-- Los privilegios por defecto darían arwd a authenticated: se dejan explícitos.
revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, delete on public.audit_log to service_role;

-- Inmutable: nadie actualiza; solo el service role (o el dueño, en mantención) borra.
create or replace function public.audit_log_immutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
	v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
	if tg_op = 'UPDATE' then
		raise exception 'audit_log no se modifica.' using errcode = '42501';
	end if;
	if v_role <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
		raise exception 'Solo el servidor borra registros de auditoría.' using errcode = '42501';
	end if;
	return case when tg_op = 'DELETE' then old else null end;
end;
$$;

create trigger audit_log_immutable_row
	before update or delete on public.audit_log
	for each row execute function public.audit_log_immutable();

create trigger audit_log_immutable_truncate
	before truncate on public.audit_log
	for each statement execute function public.audit_log_immutable();

revoke all on function public.audit_log_immutable() from public, anon, authenticated;

-- Trigger genérico de cambios.
--   tg_argv[0]: columnas cuyo valor se guarda (sin datos personales), separadas por coma.
--   tg_argv[1]: columnas que no cuentan como cambio (además de updated_at).
-- Si en un UPDATE solo cambian columnas ignoradas, no se registra nada.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
	v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
	v_row jsonb := coalesce(v_new, v_old);
	v_values text[] := string_to_array(coalesce(tg_argv[0], ''), ',');
	v_ignore text[] := array['updated_at'] || string_to_array(coalesce(tg_argv[1], ''), ',');
	v_changed text[];
	v_before jsonb := '{}';
	v_after jsonb := '{}';
	v_key text;
	v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
	v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
	v_uid uuid := auth.uid();
	v_role text;
begin
	if tg_op = 'UPDATE' then
		select array_agg(k order by k) into v_changed
		from jsonb_object_keys(v_new) as k
		where not (k = any (v_ignore)) and v_new -> k is distinct from v_old -> k;
		if v_changed is null then
			return null;
		end if;
	end if;

	foreach v_key in array v_values loop
		continue when v_key = '';
		if tg_op = 'INSERT' or (tg_op = 'UPDATE' and v_key = any (v_changed)) then
			v_after := v_after || jsonb_build_object(v_key, v_new -> v_key);
		end if;
		if tg_op = 'DELETE' or (tg_op = 'UPDATE' and v_key = any (v_changed)) then
			v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
		end if;
	end loop;

	if v_uid is not null then
		select u.role into v_role from public.users u where u.auth_user_id = v_uid limit 1;
	end if;
	v_role := coalesce(v_role, nullif(v_claims ->> 'role', ''), current_user::text);

	insert into public.audit_log (
		company_id, actor_auth_user_id, actor_role, action, target_type, target_count,
		target_ids, ip, user_agent, request_id, metadata
	) values (
		case when tg_table_name = 'companies' then (v_row ->> 'id')::uuid
			else nullif(v_row ->> 'company_id', '')::uuid end,
		v_uid,
		v_role,
		'db.' || lower(tg_op),
		tg_table_name,
		1,
		jsonb_build_array(v_row ->> 'id'),
		nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1)), ''),
		left(v_headers ->> 'user-agent', 300),
		left(v_headers ->> 'x-request-id', 100),
		-- Sin jsonb_strip_nulls: un valor anterior null también es información.
		case when v_changed is null then '{}'::jsonb else jsonb_build_object('changed', to_jsonb(v_changed)) end
			|| case when v_before = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('before', v_before) end
			|| case when v_after = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('after', v_after) end
	);
	return null;
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

create trigger audit_users
	after insert or update or delete on public.users
	for each row execute function public.audit_row_change(
		'role,is_active,company_id,branch_id,allowed_tabs,company_role_id', '');

create trigger audit_companies
	after insert or update or delete on public.companies
	for each row execute function public.audit_row_change(
		'plan_id,subscription_status,subscription_ends_at,public_slug,custom_domain,custom_domain_expires_at,country,currency',
		'');

create trigger audit_company_roles
	after insert or update or delete on public.company_roles
	for each row execute function public.audit_row_change('name,nav_tabs,actions', '');

create trigger audit_role_definitions
	after insert or update or delete on public.role_definitions
	for each row execute function public.audit_row_change('name,nav_tabs,actions,is_system', '');

create trigger audit_branches
	after insert or update or delete on public.branches
	for each row execute function public.audit_row_change(
		'is_active,order_intake_paused,payment_methods,country,currency,exchange_rate_source', '');

create trigger audit_business_info
	after insert or update or delete on public.business_info
	for each row execute function public.audit_row_change('country,currency', '');

create trigger audit_payment_methods
	after insert or update or delete on public.payment_methods
	for each row execute function public.audit_row_change(
		'method_name,is_active,requires_receipt,rail,settlement_trigger,settlement_currency,allow_mixed_payment', '');

-- redemptions_count sube con cada canje: no es un cambio de configuración.
create trigger audit_discount_coupons
	after insert or update or delete on public.discount_coupons
	for each row execute function public.audit_row_change(
		'code,discount_type,discount_value,scope,min_order_subtotal,max_redemptions,max_redemptions_per_client,valid_from,valid_until,is_active',
		'redemptions_count');

-- Comprobaciones.
do $$
declare
	v_bad text := '';
begin
	if has_table_privilege('anon', 'public.audit_log', 'select')
		or has_table_privilege('authenticated', 'public.audit_log', 'insert')
		or has_table_privilege('authenticated', 'public.audit_log', 'update')
		or has_table_privilege('authenticated', 'public.audit_log', 'delete') then
		v_bad := v_bad || ' grants_sesion';
	end if;
	if not has_table_privilege('service_role', 'public.audit_log', 'insert') then
		v_bad := v_bad || ' grants_service_role';
	end if;
	if (select count(*) from pg_trigger where tgname like 'audit\_%' escape '\' and not tgisinternal) <> 10 then
		v_bad := v_bad || ' triggers';
	end if;
	if v_bad <> '' then
		raise exception 'comprobación fallida:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer:
--   drop trigger audit_users on public.users; (igual con las otras 7 tablas)
--   drop table public.audit_log;
--   drop function public.audit_row_change(); drop function public.audit_log_immutable();
