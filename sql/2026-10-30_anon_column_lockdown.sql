-- Sin sesión (anon) solo se leen las columnas que usan la tienda y el carrito.
--
-- Hasta hoy:
--   - cash_shifts: public_menu_read_open_cash_shifts deja leer las cajas abiertas de los
--     negocios activos, y el permiso era de tabla entera: cualquiera, sin sesión, veía
--     saldo inicial, esperado y real, totales por medio de pago y quién abrió la caja.
--     anon además tenía INSERT/UPDATE/DELETE (las políticas lo frenaban, pero no hace falta);
--   - companies: public_menu_read_active_companies deja leer los negocios activos con todas
--     sus columnas: legal_rut, email, created_by y first_payment_promo_used_at incluidos.
--
-- Quién lee sin sesión: la tienda pregunta si hay caja abierta (menu/page.tsx,
-- load-home-page.ts, use-checkout-branch-live.ts, orders-service.ts: id, branch_id,
-- company_id, status) y carga el negocio en utils/tenant-cache.ts, que desde este cambio ya
-- no pide legal_rut, email ni created_by. Lo demás que lee esas columnas va por service role.
-- Las funciones invoker que tocan cash_shifts (cash_movements_set_minor_v3,
-- set_cash_movement_company_id) solo usan id, branch_id y company_id.
--
-- Por eso esto: anon pasa de permiso de tabla a permiso por columna. Las políticas no
-- cambian. authenticated y service_role quedan igual.
--
-- Correr como supabase_admin, en una sola transacción, con utils/tenant-cache.ts ya
-- desplegado (si no, la tienda falla al pedir columnas sin permiso). Antes: pg_dump -Fc a
-- /root/backups.

begin;

revoke all on public.cash_shifts from anon;
grant select (id, branch_id, company_id, status) on public.cash_shifts to anon;

revoke select on public.companies from anon;
grant select (
	id, name, public_slug, custom_domain, custom_domain_expires_at, plan_id,
	subscription_status, subscription_ends_at, country, currency, theme_config,
	integration_settings, phone, address, created_at, updated_at
) on public.companies to anon;

commit;
