-- Mercado Pago como método de pago del alta (enlaces de suscripción por plan).
-- Correr a mano en el Supabase del VPS. Es idempotente: se puede correr más de una vez.
--
-- 1. Crea el método apagado (is_active = false). Se enciende después desde
--    Super admin → Métodos de pago (plan), cuando los enlaces estén revisados.
-- 2. Guarda un enlace por plan. La clave es `link_` + el nombre del plan en minúsculas,
--    sin tildes y con `_` en vez de espacios ("Básico" → link_basico). Si un plan se llama
--    distinto en la tabla `plans`, ajusta la clave (o cámbiala luego desde el panel).
--
-- `countries = '{}'` significa "todos los países". Los enlaces cobran en la moneda de la
-- cuenta de Mercado Pago, así que conviene limitarlo a ese país, p. ej. ARRAY['CL'].

insert into plan_payment_methods (slug, name, countries, auto_verify, is_active, sort_order)
select 'mercadopago', 'Mercado Pago', '{}', false, false, 20
where not exists (select 1 from plan_payment_methods where slug = 'mercadopago');

insert into plan_payment_method_config (method_id, key, value)
select m.id, v.key, v.value
from plan_payment_methods m
cross join (values
	('link_basico', 'https://mpago.la/1GAqKHo'),
	('link_avanzado', 'https://mpago.la/2XrsmRp'),
	('link_business', 'https://mpago.la/25hQTHe'),
	('link_personalizado', 'https://mpago.la/1uqRa69')
) as v(key, value)
where m.slug = 'mercadopago'
	and not exists (
		select 1 from plan_payment_method_config c where c.method_id = m.id and c.key = v.key
	);

-- Revisar que los nombres de los planes calcen con las claves:
-- select name from plans where is_active order by price;
