-- Extras v2.1: el módulo del panel de caja que abre cada extra.
-- `panel_module` = nombre de la carpeta en GodCode-Panel/src/addons/<panel_module>/.
-- Sin valor, el extra es un servicio (dominio, personalización) sin pantalla en el panel.
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

alter table public.addons
	add column if not exists panel_module text;

alter table public.addons drop constraint if exists addons_panel_module_format;
alter table public.addons
	add constraint addons_panel_module_format
	check (panel_module is null or panel_module ~ '^[a-z0-9][a-z0-9-]{1,48}$');

commit;
