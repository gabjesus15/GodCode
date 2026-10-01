-- APLICAR ANTES DEL DEPLOY que mueve los comprobantes al bucket privado.
--
-- /api/storage/upload-image ahora sube `payment-reference` (portal) y `receipts`
-- (checkout del menú) al bucket `receipts`, bajo `platform/…`, y ya no al público
-- `menu`. El bucket lo usa el Panel (caja) y 20260720 lo dejó privado; esto solo
-- garantiza que exista y siga privado en cualquier entorno, sin tocar sus límites
-- ni sus políticas. El servidor sube y firma con la service role (no pasa por RLS),
-- así que no hace falta ninguna política nueva: nadie más lee `platform/…`.
--
-- Los comprobantes viejos siguen en `menu/uploads/{payment-reference,receipts}` y
-- sus enlaces guardados funcionan como antes (bucket público). Moverlos o borrarlos
-- es una tarea aparte con acceso a la base.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;
