-- Login de clientes finales del menú público (Fase 1: identidad).
--
-- Modelo: la PERSONA vive en auth.users (única por correo) y puede tener una CUENTA
-- por negocio. Se mantiene separada de public.clients, que es el registro de ventas
-- del POS: datos históricos sucios, sin unicidad y escrito por create_order_transaction.

create table public.menu_client_accounts (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  auth_user_id           uuid null,
  email                  text not null,
  document_normalized    text not null,
  document_raw           text null,
  document_country       text null,
  full_name              text not null,
  phone                  text not null,
  phone_normalized       text null,
  client_id              uuid null references public.clients(id) on delete set null,
  preferred_branch_id    uuid null references public.branches(id) on delete set null,
  is_active              boolean not null default true,
  last_login_at          timestamptz null,
  -- Ventana corta que habilita fijar contraseña sin conocer la anterior, tras canjear
  -- el enlace de recuperación.
  reset_grant_expires_at timestamptz null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint menu_client_accounts_document_len
    check (char_length(document_normalized) between 5 and 32),
  constraint menu_client_accounts_email_lower
    check (email = lower(email))
);

-- Un documento por negocio, y una cuenta por persona en cada negocio.
create unique index menu_client_accounts_company_document_key
  on public.menu_client_accounts (company_id, document_normalized);
create unique index menu_client_accounts_company_auth_user_key
  on public.menu_client_accounts (company_id, auth_user_id)
  where auth_user_id is not null;
-- Una ficha de clients respalda como máximo una cuenta (se usará en Fase 3).
create unique index menu_client_accounts_client_key
  on public.menu_client_accounts (client_id)
  where client_id is not null;
create index menu_client_accounts_email_idx
  on public.menu_client_accounts (email);
create index menu_client_accounts_company_idx
  on public.menu_client_accounts (company_id);

-- No hay unique global sobre email a propósito: una persona con cuentas en dos negocios
-- tiene dos filas con el mismo correo. La unicidad real la impone auth.users.

-- Solicitudes de vinculación pendientes de confirmar por correo: se crean cuando alguien
-- intenta registrarse con un correo que ya pertenece a un cliente del menú.
create table public.menu_client_link_requests (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid not null,
  company_id          uuid not null references public.companies(id) on delete cascade,
  email               text not null,
  document_normalized text not null,
  document_raw        text null,
  document_country    text null,
  full_name           text not null,
  phone               text not null,
  phone_normalized    text null,
  preferred_branch_id uuid null references public.branches(id) on delete set null,
  expires_at          timestamptz not null,
  consumed_at         timestamptz null,
  created_at          timestamptz not null default now()
);

create index menu_client_link_requests_lookup_idx
  on public.menu_client_link_requests (auth_user_id, company_id)
  where consumed_at is null;

create trigger set_updated_at
  before update on public.menu_client_accounts
  for each row execute function public._trigger_set_updated_at();

-- RLS deny-all en ambas: habilitada y SIN políticas a propósito, de modo que solo
-- service_role (que bypasea RLS) accede. Todo el acceso pasa por /api/menu-account/*.
alter table public.menu_client_accounts enable row level security;
alter table public.menu_client_accounts force row level security;
revoke all on public.menu_client_accounts from anon, authenticated;

alter table public.menu_client_link_requests enable row level security;
alter table public.menu_client_link_requests force row level security;
revoke all on public.menu_client_link_requests from anon, authenticated;

comment on table public.menu_client_accounts is
  'Cuenta de un cliente final en un negocio. La persona vive en auth.users (única por correo) y puede tener una cuenta por negocio. Separada de public.clients (registro de ventas del POS, con datos sucios y sin unicidad). Acceso exclusivo vía service_role desde /api/menu-account/*.';

comment on table public.menu_client_link_requests is
  'Solicitud pendiente de vincular un negocio a una cuenta de cliente existente. Se confirma con un magic link de Supabase; el canje valida expires_at, consumed_at y que auth_user_id coincida con la sesión.';
