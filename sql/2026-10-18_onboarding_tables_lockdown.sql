-- Las solicitudes de alta y sus adicionales solo se leen y escriben por el servidor.
--
-- Hasta hoy:
--   - onboarding_applications_insert (with check true): cualquiera, sin sesión, podía crear
--     solicitudes con PostgREST, incluso con el company_id de otro negocio y
--     payment_status = 'pending_validation' (sale en la cola de pagos del super admin);
--   - onboarding_applications_update / _select (company_id = current_user_company_id()):
--     cualquier usuario de un negocio, cajero incluido, podía cambiar plan_id,
--     payment_amount, payment_months, status, payment_status y coupon_* de la solicitud de
--     su negocio, y leerla entera (facturación, pago, verification_token);
--   - oaa_insert (with check true): cualquiera, sin sesión, podía agregar adicionales a
--     cualquier solicitud;
--   - email_log_insert (with check true): cualquiera, sin sesión, podía insertar filas.
--
-- Quién usa estas tablas: todo el código va por service role (el alta y su servicio
-- onboarding-billing, checkout, /cuenta, super admin, cron de correos y conciliación). El
-- formulario del alta llama a /api/onboarding/*, no a la tabla. Ninguna función de la base
-- las toca. El panel no las usa.
--
-- Por eso esto:
--   - onboarding_applications y onboarding_application_addons: sin permisos para anon y
--     authenticated, y sin políticas. Con RLS activo y sin políticas, una sesión no puede
--     hacer nada aunque algún día vuelvan los permisos;
--   - email_log: sin INSERT/UPDATE/DELETE para anon y authenticated, y sin
--     email_log_insert. La lectura del super admin (email_log_select) queda.
--
-- Correr como supabase_admin, en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

set local lock_timeout = '5s';

-- Las políticas tienen que ser las que se revisaron el 2026-10-18.
do $$
declare
	found text[];
begin
	select array_agg(format('%s:%s:%s', c.relname, p.polname, p.polcmd) order by c.relname, p.polname)
	into found
	from pg_policy p join pg_class c on c.oid = p.polrelid
	where p.polrelid in (
		'public.onboarding_applications'::regclass,
		'public.onboarding_application_addons'::regclass,
		'public.email_log'::regclass
	);

	if found is distinct from array[
		'email_log:email_log_insert:a',
		'email_log:email_log_select:r',
		'onboarding_application_addons:oaa_insert:a',
		'onboarding_application_addons:oaa_select:r',
		'onboarding_applications:onboarding_applications_insert:a',
		'onboarding_applications:onboarding_applications_select:r',
		'onboarding_applications:onboarding_applications_update:w'
	] then
		raise exception 'Políticas distintas a las revisadas: %', found;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos.
-- ---------------------------------------------------------------------------
revoke all on public.onboarding_applications from anon, authenticated;
revoke all on public.onboarding_application_addons from anon, authenticated;
revoke insert, update, delete on public.email_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Políticas.
-- ---------------------------------------------------------------------------
drop policy onboarding_applications_insert on public.onboarding_applications;
drop policy onboarding_applications_select on public.onboarding_applications;
drop policy onboarding_applications_update on public.onboarding_applications;
drop policy oaa_insert on public.onboarding_application_addons;
drop policy oaa_select on public.onboarding_application_addons;
drop policy email_log_insert on public.email_log;

-- ---------------------------------------------------------------------------
-- Comprobaciones.
-- ---------------------------------------------------------------------------
do $$
declare
	extra text;
begin
	select string_agg(format('%s %s %s', r.name, t.rel, p.priv), ', ') into extra
	from (values ('anon'), ('authenticated')) r(name)
	cross join (values
		('public.onboarding_applications'),
		('public.onboarding_application_addons'),
		('public.email_log')
	) t(rel)
	cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
	where has_table_privilege(r.name, t.rel, p.priv)
		and not (t.rel = 'public.email_log' and p.priv in ('SELECT', 'TRUNCATE'));

	if extra is not null then
		raise exception 'Quedaron permisos de más: %', extra;
	end if;

	select string_agg(format('%s %s', t.rel, p.priv), ', ') into extra
	from (values
		('public.onboarding_applications'),
		('public.onboarding_application_addons'),
		('public.email_log')
	) t(rel)
	cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
	where not has_table_privilege('service_role', t.rel, p.priv);

	if extra is not null then
		raise exception 'service_role perdió permisos: %', extra;
	end if;

	if exists (
		select 1 from pg_policy
		where polrelid in ('public.onboarding_applications'::regclass, 'public.onboarding_application_addons'::regclass)
	) or (
		select array_agg(polname order by polname) from pg_policy where polrelid = 'public.email_log'::regclass
	) is distinct from array['email_log_select'::name] then
		raise exception 'Las políticas no quedaron como se esperaba';
	end if;

	if exists (
		select 1 from pg_class
		where oid in (
			'public.onboarding_applications'::regclass,
			'public.onboarding_application_addons'::regclass,
			'public.email_log'::regclass
		) and not relrowsecurity
	) then
		raise exception 'RLS quedó apagado en alguna de las tablas';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Para deshacer (como supabase_admin): el respaldo
-- /root/backups/pre_onboarding_lockdown_20261018_043128.dump, o
--   grant all on public.onboarding_applications, public.onboarding_application_addons to anon, authenticated;
--   grant insert, update, delete on public.email_log to anon, authenticated;
--   create policy onboarding_applications_insert on public.onboarding_applications for insert with check (true);
--   create policy onboarding_applications_select on public.onboarding_applications for select
--     using (public.is_super_admin() or company_id = public.current_user_company_id());
--   create policy onboarding_applications_update on public.onboarding_applications for update
--     using (public.is_super_admin() or company_id = public.current_user_company_id());
--   create policy oaa_insert on public.onboarding_application_addons for insert with check (true);
--   create policy oaa_select on public.onboarding_application_addons for select
--     using (application_id in (select id from public.onboarding_applications
--       where public.is_super_admin() or company_id = public.current_user_company_id()));
--   create policy email_log_insert on public.email_log for insert with check (true);
