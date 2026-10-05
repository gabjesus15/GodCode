-- APLICAR ANTES DEL DEPLOY que mueve los comprobantes al bucket privado.
--
-- /api/storage/upload-image sube el comprobante del portal (`payment-reference`) al
-- bucket `receipts` bajo `platform/…`, y /api/tenant/public-order-receipt adjunta el
-- comprobante del checkout del menú bajo `{empresa}/orders/{sucursal}/receipts/…`, que
-- es el árbol que usa la caja (Panel). Ya nada va al bucket público `menu`.
--
-- El bucket existe y es privado desde 20260720 (verificado en la base el 2026-10-04:
-- public = false, 5 MB, jpeg/png/webp/gif); esto lo garantiza en cualquier entorno sin
-- tocar sus límites. El servidor sube y firma con la service role (no pasa por RLS) y la
-- caja lee con las policies `receipts_company_*` (primera carpeta = empresa).
--
-- Se quitan las policies heredadas de cuando el bucket era público, que seguían vivas:
--   * `Allow public read receipts` (rol public) dejaba descargar y listar cualquier
--     comprobante con la clave anon, aunque el bucket fuera privado;
--   * `Allow authenticated upload/update/delete receipts` dejaban a cualquier usuario
--     autenticado subir, pisar o borrar objetos de otra empresa.
-- Las `receipts_company_*` ya cubren lo que hace la caja (sube, lee y borra solo bajo
-- su carpeta); se añade la de update con la misma regla por si algún flujo hace upsert.
-- Portal, super admin y microservicio usan la service role, que no pasa por policies, y
-- las URLs firmadas tampoco.
--
-- Los comprobantes viejos siguen en `menu/uploads/{payment-reference,receipts}` y sus
-- enlaces guardados funcionan como antes (bucket público). Moverlos o borrarlos es una
-- tarea aparte con acceso a la base.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "Allow public read receipts" on storage.objects;
drop policy if exists "Allow authenticated upload receipts" on storage.objects;
drop policy if exists "Allow authenticated update receipts" on storage.objects;
drop policy if exists "Allow authenticated delete receipts" on storage.objects;

drop policy if exists receipts_company_update on storage.objects;
create policy receipts_company_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select u.company_id::text from public.users u
      where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
    )
  )
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select u.company_id::text from public.users u
      where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
    )
  );
