-- Datos de cobro por sucursal: solo campos públicos.
--
-- Las columnas branches.stripe / mercadopago / paypal guardaban claves de API
-- (secret_key, access_token, client_secret, publishable_key, public_key, client_id)
-- y el menú público lee esas columnas con la clave anónima. Ningún código las usaba
-- para cobrar. Desde este cambio la app solo guarda y muestra:
--   mercadopago -> link, alias
--   paypal      -> email, link
-- y Stripe deja de ser método de sucursal.
--
-- Después de correr esto, ROTA en Stripe / Mercado Pago / PayPal cualquier clave
-- que alguna sucursal haya tenido cargada: estuvo expuesta.

create or replace function pg_temp.pick_public_keys(raw text, keys text[])
returns text
language plpgsql
as $$
declare
	parsed jsonb;
	result jsonb := '{}'::jsonb;
	k text;
begin
	if raw is null or btrim(raw) = '' then
		return null;
	end if;
	begin
		parsed := raw::jsonb;
	exception when others then
		return null;
	end;
	if jsonb_typeof(parsed) <> 'object' then
		return null;
	end if;
	foreach k in array keys loop
		if jsonb_typeof(parsed -> k) = 'string' and btrim(parsed ->> k) <> '' then
			result := result || jsonb_build_object(k, btrim(parsed ->> k));
		end if;
	end loop;
	if result = '{}'::jsonb then
		return null;
	end if;
	return result::text;
end;
$$;

update public.branches
set
	stripe = null,
	payment_methods = array_remove(payment_methods, 'stripe'),
	mercadopago = pg_temp.pick_public_keys(mercadopago, array['link', 'alias']),
	paypal = pg_temp.pick_public_keys(paypal, array['email', 'link'])
where stripe is not null
	or 'stripe' = any(payment_methods)
	or mercadopago is not null
	or paypal is not null;
