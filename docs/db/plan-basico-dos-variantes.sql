-- Plan Básico en dos variantes: «solo menú digital» y «solo panel CEO».
--
-- NO está aplicado en producción. Revisar y correr a mano (SQL editor o MCP de Supabase)
-- cuando se fusione el PR que agrega `plans.features.product_mode`.
--
-- Antes de correr: comprobar que existan `plans.name_i18n`, `plans.marketing_lines_i18n` y
-- `plans.prices_by_continent` (columnas opcionales de las migraciones de planes).
--
-- Qué hace:
-- 1. Crea «Básico · Menú digital» copiando precio, límites y precios por región del Básico
--    actual. `product_mode = menu_only`: los pedidos llegan por WhatsApp y el panel CEO
--    queda en productos, categorías, bebidas, extras, cambios y carrusel (banners).
-- 2. Crea «Básico · Panel CEO» igual, con `product_mode = panel_only`: panel completo
--    (todas las pestañas que el CEO ve por defecto) y sin menú público.
-- 3. Saca el Básico actual del registro y del landing (`is_public = false`) pero lo deja
--    activo: los negocios que ya lo tienen no cambian nada.
--
-- Es idempotente: si las variantes ya existen (por nombre) no las duplica.
-- Los textos de venta quedan en español e inglés; el resto de idiomas usa el español.

begin;

with basico as (
	select *
	from public.plans
	where lower(name) in ('básico', 'basico')
	order by created_at nulls last
	limit 1
)
insert into public.plans (
	name, name_i18n, price, prices_by_continent, max_branches, max_users,
	is_active, is_public, features, marketing_lines, marketing_lines_i18n
)
select
	'Básico · Menú digital',
	jsonb_build_object('es', 'Básico · Menú digital', 'en', 'Basic · Digital menu'),
	b.price,
	b.prices_by_continent,
	b.max_branches,
	b.max_users,
	true,
	true,
	(coalesce(b.features, '{}'::jsonb) - 'ceo_tabs')
		|| jsonb_build_object(
			'product_mode', 'menu_only',
			'ceo_tabs', jsonb_build_array('categories', 'products', 'beverages', 'extras', 'menu_modifiers', 'menu_carousel')
		),
	jsonb_build_array(
		'Menú digital con tu marca y tu link',
		'Pedidos directo a tu WhatsApp, con el detalle listo',
		'Sube productos y banners desde el panel'
	),
	jsonb_build_object(
		'es', jsonb_build_array(
			'Menú digital con tu marca y tu link',
			'Pedidos directo a tu WhatsApp, con el detalle listo',
			'Sube productos y banners desde el panel'
		),
		'en', jsonb_build_array(
			'Digital menu with your brand and your link',
			'Orders straight to your WhatsApp, ready to prepare',
			'Upload products and banners from the panel'
		)
	)
from basico b
where not exists (select 1 from public.plans where name = 'Básico · Menú digital');

with basico as (
	select *
	from public.plans
	where lower(name) in ('básico', 'basico')
	order by created_at nulls last
	limit 1
)
insert into public.plans (
	name, name_i18n, price, prices_by_continent, max_branches, max_users,
	is_active, is_public, features, marketing_lines, marketing_lines_i18n
)
select
	'Básico · Panel CEO',
	jsonb_build_object('es', 'Básico · Panel CEO', 'en', 'Basic · CEO panel'),
	b.price,
	b.prices_by_continent,
	b.max_branches,
	b.max_users,
	true,
	true,
	(coalesce(b.features, '{}'::jsonb) - 'ceo_tabs')
		|| jsonb_build_object(
			'product_mode', 'panel_only',
			-- Sin menú público, el dominio propio no tiene a dónde apuntar.
			'blocked_addons', jsonb_build_array('custom_domain'),
			'ceo_tabs', jsonb_build_array(
				'orders', 'caja', 'analytics', 'local_expenses', 'categories', 'products', 'inventory',
				'beverages', 'extras', 'menu_modifiers', 'menu_carousel', 'clients', 'users',
				'payment_methods', 'coupons'
			)
		),
	jsonb_build_array(
		'Caja, pedidos y reportes de tu local',
		'Sin menú público: vendes en el mostrador',
		'Pasa a un plan con menú cuando quieras'
	),
	jsonb_build_object(
		'es', jsonb_build_array(
			'Caja, pedidos y reportes de tu local',
			'Sin menú público: vendes en el mostrador',
			'Pasa a un plan con menú cuando quieras'
		),
		'en', jsonb_build_array(
			'Cash register, orders and reports for your business',
			'No public menu: you sell at the counter',
			'Move to a plan with a menu whenever you want'
		)
	)
from basico b
where not exists (select 1 from public.plans where name = 'Básico · Panel CEO');

update public.plans
set is_public = false
where lower(name) in ('básico', 'basico')
	and exists (select 1 from public.plans where name = 'Básico · Menú digital')
	and exists (select 1 from public.plans where name = 'Básico · Panel CEO');

commit;

-- Para revisar:
-- select name, price, is_public, is_active, features->>'product_mode' as modo, features->'ceo_tabs' as pestanas
-- from public.plans order by price, name;
