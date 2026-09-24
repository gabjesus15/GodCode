# Poner al día la base de Supabase de Gcode y comprobar el código nuevo

> **Para una IA (o persona) con acceso a la base de Supabase por MCP.** Léelo completo antes de ejecutar nada.
> Rama del código: `mejora/paneles-admin-cuenta` · Preparado el 24-09-2026.

## Contexto

En esta rama se reescribieron el panel super admin, el portal del dueño (`/cuenta`), la facturación del portal (renovar, cambiar de plan, extras, PayPal y comprobantes), el onboarding y todos los correos (con recordatorios automáticos). El desarrollador no pudo conectarse a la base (VPN), así que **ningún cambio se probó contra la base real**.

Tu trabajo tiene dos partes:

1. **Verificar** que la base tiene lo que el código nuevo usa (columnas, restricciones, índices, claves, funciones) y reportar cualquier diferencia.
2. **Aplicar 5 migraciones** y comprobar que quedaron bien.

Trata la base como **producción**.

## Reglas

1. **Respaldo primero.** Antes de escribir nada, confirma que existe un respaldo de hoy (Supabase → Database → Backups) o crea uno. Si no puedes, detente y avísalo.
2. **La fase A es solo lectura.** No ejecutes migraciones hasta terminarla. Si algo sale marcado como **bloqueante**, detente y reporta.
3. **Cada migración, en su propia ejecución y transacción** (el archivo completo de una vez: algunas crean funciones temporales que solo viven en esa sesión). Si una falla, se deshace sola: no la arregles improvisando, reporta el error exacto.
4. **No borres filas, no desactives RLS, no toques ni imprimas columnas con secretos** (claves de API, datos cifrados). Donde se pide mirar datos, devuelve solo conteos.
5. Solo haz lo que este documento pide. Los únicos cambios permitidos fuera de las migraciones son los que dicen «si pasa X, haz Y». Cualquier otra corrección: **proponla** en el informe.
6. Al terminar, entrega el informe con el formato de la sección D.

## A. Verificación (solo lectura)

### A1. `saas_tickets.source` admite `system` y `onboarding` — **bloqueante**

El código ahora crea tickets internos con `source = 'system'` (no se muestran al dueño) y el seguimiento del alta usa `source = 'onboarding'`. La migración B4 también escribe `system`.

```sql
select conname, pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.saas_tickets'::regclass and contype = 'c';

select source, count(*) from public.saas_tickets group by 1 order by 2 desc;
```

- Si ningún CHECK restringe `source`: **OK**.
- Si hay uno y no admite `system` u `onboarding`: amplíalo (permitido), conservando todos los valores que ya admite y los que existen en los datos:

```sql
begin;
alter table public.saas_tickets drop constraint <nombre_del_check>;
alter table public.saas_tickets
	add constraint saas_tickets_source_check
	check (source in (<valores que ya admitía>, 'system', 'onboarding'))
	not valid;
commit;
```

### A2. Valores de estado que escribe el código

El código escribe o filtra estos valores. Revisa los CHECK de cada tabla y reporta cualquier valor que no admitan.

| Tabla.columna | Valores que usa el código |
|---|---|
| `companies.subscription_status` | active, trial, payment_pending, cancelled, suspended |
| `payments_history.status` | pending, pending_validation, paid, rejected, cancelled (también lee approved) |
| `saas_tickets.status` | open, in_progress, waiting_customer, resolved, closed |
| `saas_tickets.source` | tenant, saas, system, onboarding (ver A1) |
| `saas_tickets.category` | general, billing, technical, product, account, onboarding_delivery |
| `saas_tickets.priority` | low, medium, high, critical |
| `saas_ticket_messages.author_type` | tenant, super_admin |
| `company_plan_change_schedules.status` | scheduled, applied, failed, cancelled |
| `company_branch_extra_entitlements.status` | pending, active, cancelled |
| `company_addons.status` | active |
| `onboarding_applications.status` | pending_verification, email_verified, form_completed, payment_pending, payment_validated, active, rejected |
| `onboarding_applications.payment_status` | pending, pending_validation, paid, rejected |
| `subscription_notifications.status` / `.type` | pending, sent, failed / onboarding_contact_followup |

```sql
select c.conrelid::regclass as tabla, c.conname, pg_get_constraintdef(c.oid) as definicion
from pg_constraint c
where c.contype = 'c'
	and c.conrelid in (
		'public.companies'::regclass,
		'public.payments_history'::regclass,
		'public.saas_tickets'::regclass,
		'public.saas_ticket_messages'::regclass,
		'public.company_plan_change_schedules'::regclass,
		'public.company_branch_extra_entitlements'::regclass,
		'public.company_addons'::regclass,
		'public.onboarding_applications'::regclass,
		'public.subscription_notifications'::regclass
	)
order by 1, 2;
```

- `payments_history.status` lo resuelve la migración B2: no lo cambies a mano.
- Para cualquier otra columna: si un CHECK no admite un valor de la lista, amplíalo igual que en A1 (agregar el valor, `not valid`, sin quitar ninguno) y anótalo en el informe.
- **Críticos** (el código no revisa el error al escribirlos, así que fallarían en silencio):
  - `company_plan_change_schedules.status = 'cancelled'`: si la base lo rechaza, una bajada de plan programada sigue activa y el cron la aplica aunque el dueño ya haya pagado una subida.
  - `saas_tickets.status = 'closed'`: se usa al anular un pedido para cerrar su ticket.

### A3. Columnas que usa el código

Según los tipos generados de la base (`types/supabase-database.ts`, 19-09-2026), **todas las columnas que usa el código nuevo existen**, salvo la tabla `email_deliveries`, que crea la migración B5. Confírmalo con la base actual: cualquier fila con `existe = false` es una diferencia a reportar.

```sql
with esperadas(tabla, columna) as (values
	('payments_history', 'payment_reference'),
	('payments_history', 'reference_file_url'),
	('payments_history', 'payment_method'),
	('payments_history', 'payment_method_slug'),
	('payments_history', 'payer_email_normalized'),
	('payments_history', 'paypal_payer_id_hash'),
	('payments_history', 'months_paid'),
	('payments_history', 'payment_date'),
	('company_branch_extra_entitlements', 'status'),
	('company_branch_extra_entitlements', 'payment_id'),
	('company_branch_extra_entitlements', 'quantity'),
	('company_branch_extra_entitlements', 'unit_price'),
	('company_branch_extra_entitlements', 'starts_at'),
	('company_branch_extra_entitlements', 'expires_at'),
	('company_branch_extra_entitlements', 'updated_at'),
	('company_plan_change_schedules', 'status'),
	('company_plan_change_schedules', 'current_plan_id'),
	('company_plan_change_schedules', 'target_plan_id'),
	('company_plan_change_schedules', 'effective_at'),
	('company_plan_change_schedules', 'applied_at'),
	('company_plan_change_schedules', 'apply_error'),
	('company_plan_change_schedules', 'requested_by_email'),
	('company_plan_change_schedules', 'reason'),
	('company_plan_change_schedules', 'metadata'),
	('company_plan_change_schedules', 'updated_at'),
	('companies', 'subscription_status'),
	('companies', 'subscription_ends_at'),
	('companies', 'custom_domain'),
	('companies', 'custom_domain_expires_at'),
	('companies', 'first_payment_promo_used_at'),
	('companies', 'integration_settings'),
	('companies', 'country'),
	('companies', 'currency'),
	('companies', 'theme_config'),
	('company_addons', 'status'),
	('company_addons', 'expires_at'),
	('company_addons', 'price_paid'),
	('company_addons', 'updated_at'),
	('onboarding_applications', 'verification_token'),
	('onboarding_applications', 'payment_reference'),
	('onboarding_applications', 'payment_reference_url'),
	('onboarding_applications', 'payment_status'),
	('onboarding_applications', 'payment_amount'),
	('onboarding_applications', 'payment_months'),
	('onboarding_applications', 'subscription_payment_method'),
	('onboarding_applications', 'welcome_email_sent_at'),
	('onboarding_applications', 'updated_at'),
	('onboarding_applications', 'country'),
	('saas_tickets', 'source'),
	('saas_tickets', 'resolved_at'),
	('saas_tickets', 'first_response_at'),
	('saas_tickets', 'assigned_admin_id'),
	('saas_tickets', 'resolution_due_at'),
	('saas_tickets', 'last_message_at'),
	('saas_ticket_messages', 'is_internal'),
	('saas_ticket_messages', 'author_type'),
	('saas_ticket_messages', 'author_email'),
	('plans', 'marketing_lines'),
	('plans', 'marketing_lines_i18n'),
	('plans', 'prices_by_continent'),
	('plans', 'is_public'),
	('plans', 'name_i18n'),
	('subscription_notifications', 'company_id'),
	('subscription_notifications', 'type'),
	('subscription_notifications', 'scheduled_for'),
	('subscription_notifications', 'status'),
	('subscription_notifications', 'sent_at'),
	('subscription_notifications', 'error'),
	('branches', 'payment_methods'),
	('branches', 'stripe'),
	('branches', 'mercadopago'),
	('branches', 'paypal')
)
select e.tabla, e.columna, c.data_type is not null as existe, c.data_type
from esperadas e
left join information_schema.columns c
	on c.table_schema = 'public' and c.table_name = e.tabla and c.column_name = e.columna
order by existe, e.tabla, e.columna;
```

Además, `branches.payment_methods` debe ser un arreglo (`ARRAY`): la migración B1 usa `array_remove`.

### A4. Índices únicos que suponen los `upsert`

El código hace `upsert` con estas claves: sin un índice único (o clave primaria) sobre exactamente esas columnas, Postgres rechaza la operación.

| Tabla | Columnas del `onConflict` |
|---|---|
| `company_addons` | company_id, addon_id |
| `business_info` | company_id |
| `company_theme_drafts` | company_id |
| `landing_media_assets` | key |
| `saas_broadcast_reads` | broadcast_id, company_id, email |

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
	and tablename in ('company_addons', 'business_info', 'company_theme_drafts', 'landing_media_assets', 'saas_broadcast_reads')
	and indexdef ilike 'create unique index%'
order by 1, 2;
```

Si falta alguno, **no lo crees**: repórtalo con la cantidad de filas duplicadas que tendría (un índice único falla si ya hay duplicados).

**Al revés en `users`:** una misma persona puede ser dueña de dos negocios; el alta crea una fila por negocio con el mismo `email` y `auth_user_id`. Si alguna de esas columnas (o `auth_id`) tiene un índice único **por sí sola**, el alta del segundo negocio fallaría: repórtalo.

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'users' and indexdef ilike 'create unique index%';
```

### A5. Claves foráneas que el código nombra en sus consultas

Las consultas con relaciones (`plans!nombre_fkey(...)`) se rompen si la clave tiene otro nombre, y las relaciones sin nombre se rompen si hay **más de una** clave entre las mismas dos tablas.

- Por nombre: `company_plan_change_schedules_target_plan_id_fkey` (→ plans) y `users_branch_id_fkey` (→ branches).
- Sin nombre (debe haber exactamente una): companies → plans (`plan_id`), company_addons → addons (`addon_id`), saas_tickets → companies (`company_id`), company_branch_extra_entitlements → companies.

```sql
select conname, conrelid::regclass as tabla, confrelid::regclass as referencia
from pg_constraint
where contype = 'f'
	and conrelid in (
		'public.company_plan_change_schedules'::regclass,
		'public.users'::regclass,
		'public.companies'::regclass,
		'public.company_addons'::regclass,
		'public.saas_tickets'::regclass,
		'public.company_branch_extra_entitlements'::regclass
	)
order by 2, 1;
```

### A6. Funciones (RPC)

Funciones que el código llama (todas existían antes; confirma que siguen):
`create_order_transaction`, `get_cart_branch_prices`, `get_public_menu`, `get_company_health`, `create_role_definition`, `update_role_definition`, `delete_role_definition` y `resolve_public_slug_by_custom_domain` (la reemplaza B3).

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
	and p.proname in (
		'create_order_transaction', 'get_cart_branch_prices', 'get_public_menu', 'get_company_health',
		'create_role_definition', 'update_role_definition', 'delete_role_definition',
		'resolve_public_slug_by_custom_domain'
	)
order by 1;
```

### A7. Tipo de los `id` (lo necesita la migración B5)

```sql
select table_name, data_type
from information_schema.columns
where table_schema = 'public' and column_name = 'id'
	and table_name in ('companies', 'onboarding_applications');
```

B5 crea claves foráneas `uuid` hacia esas dos tablas. Si alguna no es `uuid`, cambia en B5 el tipo de la columna correspondiente (`company_id` o `application_id`) al tipo real antes de ejecutarla, y anótalo.

### A8. Foto de los datos (solo conteos, antes de migrar)

```sql
-- Empresas que el próximo cron pasará a «suspendida» (vencidas y todavía activas).
select count(*) as vencidas_activas from public.companies
where subscription_status = 'active' and subscription_ends_at < now();

-- Empresas que recibirán recordatorio de vencimiento en el primer cron (vencen en 8 días o menos).
select subscription_status, count(*) from public.companies
where subscription_ends_at between now() and now() + interval '8 days'
group by 1;

-- Estados actuales de payments_history.
select status, count(*) from public.payments_history group by 1 order by 2 desc;

-- Sucursales que la migración B1 va a limpiar.
select
	count(*) filter (where stripe is not null) as con_stripe,
	count(*) filter (where 'stripe' = any(payment_methods)) as metodo_stripe,
	count(*) filter (where mercadopago is not null) as con_mercadopago,
	count(*) filter (where paypal is not null) as con_paypal
from public.branches;

-- B1 deja en NULL todo valor que no sea un objeto JSON (irreversible). Si alguno de estos
-- conteos es mayor que 0, NO ejecutes B1: repórtalo para que lo revise el dueño.
select
	count(*) filter (where mercadopago is not null and left(btrim(mercadopago), 1) <> '{') as mercadopago_no_json,
	count(*) filter (where paypal is not null and left(btrim(paypal), 1) <> '{') as paypal_no_json
from public.branches;

-- Pedidos del portal abiertos creados con el código anterior: al desplegar se procesan con
-- las reglas nuevas. Solo reportar; el equipo los revisa.
select split_part(payment_reference, '-', 1) as tipo, status, count(*)
from public.payments_history
where status in ('pending', 'pending_validation', 'rejected')
	and payment_reference ~ '^(PLANCHG|RENEW|ADDON|CUST)-'
group by 1, 2
order by 1, 2;

-- Referencias de pago repetidas (el código las busca de a una y fallaría con duplicados).
select 'payments_history' as tabla, payment_reference, count(*)
from public.payments_history where payment_reference is not null
group by 2 having count(*) > 1
union all
select 'onboarding_applications', payment_reference, count(*)
from public.onboarding_applications where payment_reference is not null
group by 2 having count(*) > 1;
```

## B. Migraciones (en este orden)

### B1. `migrations/20260923_branch_payment_public_fields.sql`

Datos de cobro de sucursales: solo campos públicos. **Modifica datos** de `branches` (quita Stripe y deja en Mercado Pago/PayPal solo link, alias o email). **No la ejecutes si A8 mostró valores no-JSON.** Ejecuta el archivo completo en una sola llamada: crea una función temporal.

```sql
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
```

### B2. `migrations/20260923_payments_history_status.sql`

Estados de los pedidos del portal. Reemplaza el CHECK de `payments_history.status` y crea un índice. **Antes de correrla**, si A8 mostró algún estado que no está en la lista del CHECK, agrégalo a la lista: con `not valid` las filas viejas no se revisan al crearlo, pero fallarían la próxima vez que alguien las actualice.

```sql
-- Estados de payments_history para los pagos del portal /cuenta.
--
-- Cada compra del dueño (renovar, subir de plan, extra, sucursal extra) crea un pedido:
--   pending             -> falta pagar (PayPal o subir el comprobante)
--   pending_validation  -> comprobante enviado, lo revisa el equipo
--   paid                -> pagado y aplicado
--   rejected            -> comprobante rechazado; puede mandar otro o pagar con PayPal
--   cancelled           -> el dueño lo anuló sin pagar
-- (approved / failed / refunded quedan permitidos para registros antiguos o ajustes a mano:
-- con NOT VALID las filas viejas no se revisan al crear el CHECK, pero sí al actualizarlas,
-- así que la lista debe incluir todo estado que ya exista en la tabla).
--
-- Sin esta migración la app sigue funcionando: si la base rechaza "pending" crea el
-- pedido como "pending_validation" sin comprobante, y si rechaza "cancelled" borra el
-- pedido sin pagar. Con ella, la cola "Pagos por validar" solo muestra lo que de verdad
-- hay que revisar.
--
-- Es idempotente: quita cualquier CHECK previo sobre status y deja uno con la lista
-- completa (NOT VALID: no revisa filas viejas con otros valores).

do $$
declare
	r record;
begin
	for r in
		select conname
		from pg_constraint
		where conrelid = 'public.payments_history'::regclass
			and contype = 'c'
			and pg_get_constraintdef(oid) ilike '%status%'
	loop
		execute format('alter table public.payments_history drop constraint %I', r.conname);
	end loop;
end $$;

alter table public.payments_history
	add constraint payments_history_status_check
	check (
		status is null
		or status in ('pending', 'pending_validation', 'paid', 'rejected', 'cancelled', 'approved', 'failed', 'refunded')
	)
	not valid;

-- La cola del super admin y el portal buscan por estado.
create index if not exists payments_history_status_date_idx
	on public.payments_history (status, payment_date desc);
```

### B3. `migrations/20260923_custom_domain_resolver_cancelled.sql`

El dominio propio sigue funcionando hasta el vencimiento si el dueño canceló. **Borra y vuelve a crear** `resolve_public_slug_by_custom_domain` en una transacción: la versión actual devuelve una tabla y el código espera `text` (`create or replace` no puede cambiar el tipo). El código ya acepta las dos formas.

```sql
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
```

### B4. `migrations/20260923_system_tickets_backfill.sql`

Reclasifica los tickets automáticos antiguos como `system`. **Primero ejecuta solo el SELECT** y anota el resultado; después el UPDATE. Requiere A1 en OK.

```sql
-- Tickets automáticos antiguos -> "system".
--
-- Hasta ahora /cuenta abría tickets a nombre del dueño (source = 'tenant') cada vez que
-- publicaba la tienda, cancelaba, reactivaba o cambiaba de plan. Aparecían en su Soporte
-- y en su actividad como si él los hubiera escrito (en Rica Pizza, decenas de
-- "Publicacion de cambios de tienda"). La app ya no los crea así: los registros internos
-- van con source = 'system' y el portal no los muestra.
--
-- Esto reclasifica los que ya existen. No borra nada: el equipo los sigue viendo en el
-- panel de tickets. Revisa el conteo con el SELECT antes de correr el UPDATE.

select subject, status, count(*)
from public.saas_tickets
where source = 'tenant'
	and (
		subject = 'Publicacion de cambios de tienda'
		or subject like 'Cancelacion programada del plan · %'
		or subject like 'Cancelacion revertida · %'
		or subject like 'Downgrade programado · %'
		or subject like 'Cambio de plan aplicado · %'
		or subject like 'Cambio de plan pendiente · %'
		or subject like 'Compra de extra pendiente · %'
		or subject like 'Compra de extra aplicada · %'
	)
group by subject, status
order by count(*) desc;

update public.saas_tickets
set source = 'system'
where source = 'tenant'
	and (
		subject = 'Publicacion de cambios de tienda'
		or subject like 'Cancelacion programada del plan · %'
		or subject like 'Cancelacion revertida · %'
		or subject like 'Downgrade programado · %'
		or subject like 'Cambio de plan aplicado · %'
		or subject like 'Cambio de plan pendiente · %'
		or subject like 'Compra de extra pendiente · %'
		or subject like 'Compra de extra aplicada · %'
	);
```

### B5. `migrations/20260924_email_deliveries.sql`

Tabla `email_deliveries` (registro de correos y anti-duplicados). Revisa A7 antes.

```sql
-- Registro de correos enviados por la plataforma (lib/email/deliveries.ts).
--
-- Para qué sirve:
-- 1. Que un recordatorio automático no salga dos veces: cada envío reserva su `dedupe_key`
--    (única) antes de mandarse; si el cron corre dos veces, el segundo choca y no envía.
-- 2. Dejar el historial de avisos por negocio, para que el super admin vea qué le llegó.
--
-- Sin esta tabla la app sigue funcionando: los avisos puntuales (pago recibido, etc.) salen
-- igual, pero los recordatorios del cron NO se envían (fail-closed, para no repetirlos a diario).
--
-- Solo la usa el service role: RLS activada y sin políticas.
-- Requisitos: public.companies(id) y public.onboarding_applications(id) de tipo uuid.

begin;

create table if not exists public.email_deliveries (
	id uuid primary key default gen_random_uuid(),
	kind text not null,
	recipient text not null,
	subject text not null default '',
	company_id uuid references public.companies (id) on delete set null,
	application_id uuid references public.onboarding_applications (id) on delete set null,
	dedupe_key text,
	status text not null default 'sending'
		constraint email_deliveries_status_check check (status in ('sending', 'sent', 'failed', 'skipped')),
	provider_message_id text,
	error text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	sent_at timestamptz
);

-- Única solo cuando hay clave: un envío fallido la libera (se pone en null) para reintentar.
create unique index if not exists email_deliveries_dedupe_key_key
	on public.email_deliveries (dedupe_key)
	where dedupe_key is not null;

create index if not exists email_deliveries_company_created_idx
	on public.email_deliveries (company_id, created_at desc);

create index if not exists email_deliveries_created_idx
	on public.email_deliveries (created_at desc);

alter table public.email_deliveries enable row level security;

comment on table public.email_deliveries is
	'Correos enviados por Gcode (lib/email). dedupe_key evita repetir recordatorios; solo service role.';

commit;

-- Comprobación (debe devolver la tabla con RLS activa y los 3 índices):
-- select relname, relrowsecurity from pg_class where relname = 'email_deliveries';
-- select indexname from pg_indexes where tablename = 'email_deliveries';
```

## C. Comprobaciones después de migrar

```sql
-- B1: ninguna sucursal con Stripe.
select count(*) as sucursales_con_stripe from public.branches
where stripe is not null or 'stripe' = any(payment_methods);

-- B2: el CHECK nuevo existe; filas antiguas con otros estados (se aceptan, solo contar).
select pg_get_constraintdef(oid) from pg_constraint where conname = 'payments_history_status_check';
select status, count(*) from public.payments_history
where status is not null
	and status not in ('pending', 'pending_validation', 'paid', 'rejected', 'cancelled', 'approved', 'failed', 'refunded')
group by 1;

-- B3: la función devuelve text y respeta las cancelaciones vigentes.
select pg_get_function_result('public.resolve_public_slug_by_custom_domain(text)'::regprocedure) as devuelve,
	pg_get_functiondef('public.resolve_public_slug_by_custom_domain(text)'::regprocedure) like '%subscription_ends_at > now()%' as resolver_actualizado;

-- B4: tickets automáticos reclasificados.
select source, count(*) from public.saas_tickets group by 1 order by 2 desc;

-- B5: tabla de correos con RLS y sus 3 índices.
select relname, relrowsecurity from pg_class where relname = 'email_deliveries';
select indexname from pg_indexes where tablename = 'email_deliveries' order by 1;
```

## D. Informe (devuélvelo con este formato)

```
Respaldo: <fecha y hora, o por qué no se pudo>

A1 saas_tickets.source ........ OK / AMPLIADO (valores) / FALLA (detalle)
A2 estados .................... OK / AMPLIADO (tabla.columna: valor) / FALLA
A3 columnas ................... OK / FALTAN: tabla.columna, …
A4 índices únicos ............. OK / FALTAN: …
A5 claves foráneas ............ OK / FALTAN o con otro nombre: …
A6 funciones .................. OK / FALTAN: …
A7 tipos de id ................ uuid / otro (y cómo se ajustó B5)
A8 conteos .................... <resultados, incluidos no-JSON de B1, pedidos abiertos y referencias repetidas>

B1 branch_payment_public_fields ... OK / ERROR (mensaje exacto)
B2 payments_history_status ........ OK / ERROR
B3 custom_domain_resolver ......... OK / ERROR
B4 system_tickets_backfill ........ OK (filas: n) / ERROR
B5 email_deliveries ............... OK / ERROR

C comprobaciones .............. <resultados>

Cambios fuera de las migraciones: <lista o «ninguno»>
Diferencias con el código y propuesta: <lista o «ninguna»>
```

## Anexo 1. Qué cambió en el código (para entender los chequeos)

- **Pedidos del portal** en `payments_history`: estados `pending` → `pending_validation` (comprobante) → `paid`, o `rejected` / `cancelled`. Referencias `RENEW-`, `PLANCHG-`, `ADDON-<uuid>-M1-`, `CUST-`.
- **Sucursales extra** en `company_branch_extra_entitlements` (`pending` → `active` al pagar) y **extras mensuales** en `company_addons`: vencen y se renuevan con la suscripción.
- **Cambios de plan programados** en `company_plan_change_schedules` (`scheduled` → `applied` / `failed` / `cancelled`).
- **Tickets internos** con `source = 'system'`: el equipo los ve, el dueño no.
- **Correos**: todos pasan por `lib/email`. `email_deliveries` guarda cada envío y, con su `dedupe_key` única, evita que un recordatorio salga dos veces. **Sin esa tabla los recordatorios automáticos no se envían** (a propósito); los avisos puntuales (pago recibido, etc.) salen igual.
- **Cron diario** (`/api/cron/subscription-status`): suspende vencidas, aplica cambios de plan, manda seguimientos del alta y los recordatorios (vencimiento a 7/3/1 días, plan vencido, pagos sin completar, altas a medias).
- **Onboarding**: el paso de pago muestra el total antes de cobrar (la API `/api/onboarding/application` ahora devuelve el presupuesto).

## Anexo 2. Para quien despliega (no es tarea de la IA)

- Desplegar **juntos** la app y `services/onboarding-billing`.
- Variables (en la app y en el servicio): `RESEND_API_KEY`, `RESEND_FROM` (p. ej. `Gcode POS <noreply@godcode.me>`), `ONBOARDING_TEAM_EMAIL` (bandeja del equipo; vacío = correo de soporte), `CRON_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT`, `NEXT_PUBLIC_TENANT_PANEL_URL`. Opcionales: `EMAIL_REPLY_TO`, `EMAIL_LOGO_URL`.
- **Recordatorios**: el primer despliegue conviene hacerlo con `EMAIL_REMINDERS=dry-run`, revisar en el super admin **Correos → Hoy saldrían** qué se enviaría, y después pasar a `EMAIL_REMINDERS=on` (o quitar la variable).
- Después de B1, **rotar** en Stripe / Mercado Pago / PayPal cualquier clave que alguna sucursal haya tenido cargada: estuvo expuesta en el menú público.
