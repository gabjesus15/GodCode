-- 2026-11-02 · Datos: client_addresses.company_id igual al de su cliente.
--
-- La prueba de aislamiento (sql/checks/aislamiento-empresas.sql) encontró 1 dirección,
-- creada el 2026-06-09, cuyo company_id es de otra empresa aunque su cliente es de la
-- empresa correcta. No era una filtración: RLS de client_addresses va por el cliente, así
-- que solo la ve la empresa del cliente. Pero cualquier reporte que filtre por
-- client_addresses.company_id la atribuye mal.
--
-- Correr como postgres. Antes: pg_dump -Fc a /root/backups.

begin;

update public.client_addresses x
set company_id = p.company_id
from public.clients p
where p.id = x.client_id
	and x.company_id is distinct from p.company_id;

do $$
begin
	if exists (
		select 1 from public.client_addresses x
		join public.clients p on p.id = x.client_id
		where x.company_id is distinct from p.company_id
	) then
		raise exception 'comprobación fallida: quedan direcciones desalineadas';
	end if;
end
$$;

commit;
