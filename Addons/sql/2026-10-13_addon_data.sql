-- Datos de los extras a medida del panel (GodCode-Panel/src/addons/): un JSON por empresa, extra y
-- clave (p. ej. la sucursal). Una sola tabla sirve para todos los extras.
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

create table if not exists public.addon_data (
	company_id uuid not null references public.companies(id) on delete cascade,
	-- Carpeta del extra en src/addons/ (p. ej. 'plantilla-excel').
	addon text not null check (addon ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
	-- Lo decide cada extra; la hoja usa el id de la sucursal. '' = uno para toda la empresa.
	key text not null default '' check (char_length(key) <= 100),
	data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 2000000),
	updated_at timestamptz not null default now(),
	updated_by uuid default auth.uid(),
	primary key (company_id, addon, key)
);

-- Quién y cuándo, siempre desde el servidor (no lo manda el cliente).
create or replace function public._addon_data_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := pg_catalog.now();
	new.updated_by := auth.uid();
	return new;
end;
$$;

drop trigger if exists addon_data_touch on public.addon_data;
create trigger addon_data_touch before insert or update on public.addon_data
	for each row execute function public._addon_data_touch();

alter table public.addon_data enable row level security;

-- Cada empresa solo ve y toca lo suyo; el super admin puede leer (soporte).
drop policy if exists "addon_data_select" on public.addon_data;
create policy "addon_data_select" on public.addon_data for select
	using (company_id = current_user_company_id() or is_super_admin());

drop policy if exists "addon_data_insert" on public.addon_data;
create policy "addon_data_insert" on public.addon_data for insert
	with check (company_id = current_user_company_id());

drop policy if exists "addon_data_update" on public.addon_data;
create policy "addon_data_update" on public.addon_data for update
	using (company_id = current_user_company_id())
	with check (company_id = current_user_company_id());

drop policy if exists "addon_data_delete" on public.addon_data;
create policy "addon_data_delete" on public.addon_data for delete
	using (company_id = current_user_company_id());

revoke all on public.addon_data from anon;
revoke all on public.addon_data from authenticated;
grant select, insert, update, delete on public.addon_data to authenticated;
grant all on public.addon_data to service_role;

commit;
