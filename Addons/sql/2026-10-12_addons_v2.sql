-- Extras v2: qué desbloquea cada extra, extras privados de una empresa y pedidos a medida.
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- 1. Extras: privados (de una sola empresa) y pestañas del panel que desbloquean.
alter table public.addons
	add column if not exists company_id uuid references public.companies(id) on delete cascade,
	add column if not exists unlocks_tabs text[] not null default '{}';

create index if not exists idx_addons_company_id on public.addons(company_id) where company_id is not null;

-- Los privados solo los ve su empresa (y el super admin). Los públicos, todos.
drop policy if exists "addons_select" on public.addons;
create policy "addons_select" on public.addons for select
	using (company_id is null or company_id = current_user_company_id() or is_super_admin());

-- 2. Pedidos de extras a medida (los hace el dueño en /cuenta, los cotiza el super admin).
create table if not exists public.addon_requests (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	requested_by_email text,
	title text not null check (char_length(title) between 3 and 120),
	description text not null check (char_length(description) between 10 and 4000),
	urgency text not null default 'normal' check (urgency in ('normal', 'pronto', 'urgente')),
	status text not null default 'submitted'
		check (status in ('submitted', 'quoted', 'accepted', 'paid', 'delivered', 'rejected', 'cancelled')),
	quote_amount numeric check (quote_amount is null or quote_amount >= 0),
	quote_billing text check (quote_billing is null or quote_billing in ('one_time', 'monthly')),
	quote_note text,
	addon_id uuid references public.addons(id) on delete set null,
	quoted_at timestamptz,
	delivered_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_addon_requests_company_id on public.addon_requests(company_id);
create index if not exists idx_addon_requests_status on public.addon_requests(status);
create index if not exists idx_addon_requests_addon_id on public.addon_requests(addon_id) where addon_id is not null;

drop trigger if exists set_updated_at on public.addon_requests;
create trigger set_updated_at before update on public.addon_requests
	for each row execute function _trigger_set_updated_at();

alter table public.addon_requests enable row level security;

-- Solo lectura desde el cliente; las escrituras van por la API con service role.
drop policy if exists "addon_requests_select" on public.addon_requests;
create policy "addon_requests_select" on public.addon_requests for select
	using (company_id = current_user_company_id() or is_super_admin());

revoke all on public.addon_requests from anon;
revoke all on public.addon_requests from authenticated;
grant select on public.addon_requests to authenticated;
grant all on public.addon_requests to service_role;

commit;
