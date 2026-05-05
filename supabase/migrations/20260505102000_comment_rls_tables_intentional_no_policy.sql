-- Tablas con RLS activado y sin políticas explícitas: acceso vía API solo con service_role
-- (bypass RLS) o lectura futura controlada por políticas. Documentación para advisors
-- `rls_enabled_no_policy`.

COMMENT ON TABLE public.addons IS
  'RLS ON; sin políticas para roles anon/authenticated: uso vía service_role / BFF. Añadir SELECT público solo si el producto lo requiere.';

COMMENT ON TABLE public.analytics_events IS
  'RLS ON; sin políticas: inserción/lectura vía service_role o rutas server-only.';

COMMENT ON TABLE public.branch_payment_methods IS
  'RLS ON; sin políticas explícitas: datos sensibles de pasarelas; solo service_role.';

COMMENT ON TABLE public.company_addons IS
  'RLS ON; sin políticas: gestión desde backend con service_role.';

COMMENT ON TABLE public.company_branch_extra_entitlements IS
  'RLS ON; sin políticas: mantenimiento admin/service_role.';

COMMENT ON TABLE public.company_plan_change_schedules IS
  'RLS ON; sin políticas: flujos internos y service_role.';

COMMENT ON TABLE public.company_theme_drafts IS
  'RLS ON; sin políticas: borradores tenant vía API con service_role o políticas futuras.';

COMMENT ON TABLE public.company_theme_versions IS
  'RLS ON; sin políticas: versionado interno.';

COMMENT ON TABLE public.email_log IS
  'RLS ON; sin políticas: correos transaccionales solo backend.';

COMMENT ON TABLE public.landing_contacts IS
  'RLS ON; sin políticas: CRM landing solo service_role / super-admin API.';

COMMENT ON TABLE public.landing_leads IS
  'RLS ON; sin políticas: leads solo service_role.';

COMMENT ON TABLE public.landing_media_assets IS
  'RLS ON; sin políticas: media landing administrada en servidor.';

COMMENT ON TABLE public.landing_webhook_subscriptions IS
  'RLS ON; sin políticas: webhooks internos.';

COMMENT ON TABLE public.onboarding_application_addons IS
  'RLS ON; sin políticas: micro onboarding + service_role.';

COMMENT ON TABLE public.onboarding_applications IS
  'RLS ON; sin políticas: aplicaciones onboarding vía BFF con service_role.';

COMMENT ON TABLE public.plan_payment_method_config IS
  'RLS ON; sin políticas: configuración global de planes; service_role.';

COMMENT ON TABLE public.plan_payment_methods IS
  'RLS ON; sin políticas: catálogo admin; valorar SELECT lectura pública en migración futura.';

COMMENT ON TABLE public.super_admin_notification_state IS
  'RLS ON; sin políticas: estado interno super-admin.';

COMMENT ON TABLE public.tenant_connected_accounts IS
  'RLS ON; sin políticas: cuentas conectadas tenant; solo service_role.';
