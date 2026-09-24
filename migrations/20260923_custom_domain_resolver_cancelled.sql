-- Dominio propio: una cancelación sigue online hasta el vencimiento.
--
-- El dueño que cancela conserva la tienda hasta el fin del periodo pagado (así lo dice
-- /cuenta y así lo hace ya el subdominio, con isTenantSubscriptionAccessible). Esta
-- función, que resuelve el dominio propio en el proxy, cortaba el dominio en el mismo
-- momento de cancelar. Ahora sigue la misma regla:
--   - suspendida: no enruta;
--   - vencida (subscription_ends_at pasado): no enruta, aunque el cron no haya corrido;
--   - cancelada: enruta solo mientras no venza.
--
-- Devuelve `text` (el slug o null), que es lo que espera lib/tenant/custom-domain-resolve.ts.
-- La versión actual de la base devuelve una tabla y `create or replace` no puede cambiar
-- el tipo de retorno (error 42P13), por eso se borra y se vuelve a crear en la misma
-- transacción. El código acepta las dos formas, así que no hay corte si esto no corre.

begin;

drop function if exists public.resolve_public_slug_by_custom_domain(text);

create function public.resolve_public_slug_by_custom_domain(p_host text)
returns text
language sql
stable
security definer
set search_path = public
as $$
	select c.public_slug::text
	from public.companies c
	where
		c.public_slug is not null
		and c.custom_domain is not null
		and trim(c.custom_domain) <> ''
		and lower(regexp_replace(trim(c.custom_domain), '^www\.', ''))
			= lower(regexp_replace(trim(p_host), '^www\.', ''))
		and lower(coalesce(c.subscription_status, '')) <> 'suspended'
		and (
			c.subscription_ends_at is null
			or c.subscription_ends_at > now()
		)
		and (
			lower(coalesce(c.subscription_status, '')) not in ('cancelled', 'canceled')
			or c.subscription_ends_at is not null
		)
	limit 1;
$$;

grant execute on function public.resolve_public_slug_by_custom_domain(text) to anon;
grant execute on function public.resolve_public_slug_by_custom_domain(text) to authenticated;

commit;
