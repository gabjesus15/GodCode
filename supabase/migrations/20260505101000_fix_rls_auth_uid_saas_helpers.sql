-- Mitiga re-evaluación por fila de auth.uid() dentro de helpers SECURITY DEFINER del panel SaaS.
-- Las políticas RLS definidas solo en el Dashboard deben actualizarse aparte: reemplazar
-- auth.uid() por (select auth.uid()) en USING / WITH CHECK (ver docs/supabase/advisor-runbook.md).

CREATE OR REPLACE FUNCTION public.saas_staff_session_email_norm()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT lower(trim(btrim(coalesce(u.email::text, ''))))
	FROM auth.users u
	WHERE u.id = (select auth.uid())
	LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_saas_admin_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT coalesce(
		(select auth.uid()) IS NOT NULL
		AND exists (
			SELECT 1
			FROM public.admin_users au
			WHERE public.saas_staff_session_email_norm() <> ''
				AND lower(trim(btrim(coalesce(au.email::text, '')))) = public.saas_staff_session_email_norm()
				AND lower(trim(btrim(coalesce(au.role::text, '')))) = ANY (ARRAY['super_admin'::text, 'support'::text])
		),
		false
	);
$$;

CREATE OR REPLACE FUNCTION public.is_saas_admin_mutator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT coalesce(
		(select auth.uid()) IS NOT NULL
		AND exists (
			SELECT 1
			FROM public.admin_users au
			WHERE public.saas_staff_session_email_norm() <> ''
				AND lower(trim(btrim(coalesce(au.email::text, '')))) = public.saas_staff_session_email_norm()
				AND lower(trim(btrim(coalesce(au.role::text, '')))) = 'super_admin'
		),
		false
	);
$$;
