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
