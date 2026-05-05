# Auditoría N+1 y lecturas en batch (BFF)

Documento de seguimiento tras el refactor **Esquema Perfecto**. Objetivo: evitar bucles de consulta (N+1) en rutas calientes y en cliente tenant.

## `components/tenant/data/orders-service.ts`

- **`buildOrderItemsFromBranch`**: ya usa `Promise.all` para cargar precios, `product_branch` y `products` en **una tanda** antes del bucle de líneas → **no hay N+1** en esa fase.
- **`createOrder`**: secuencia típica `cash_shifts` → `branches` → (opcional) `fetch` a `/api/geo/*` → RPC `create_order_transaction` → posible `PATCH` a `/api/tenant/public-order-delivery`. Son pasos de negocio distintos; el coste dominante suele ser red/geo + RPC, no un bucle ORM.
- **Mejora futura**: encapsular precarga de ítems + validación de sucursal en un RPC único (`get_order_precheck` o extender contrato del RPC de creación) si el perfil de latencia lo exige.

## `lib/delivery/delivery-settings.ts` y rutas geo

- La resolución de zonas y tarifas debe seguir **batch** en servidor (mapas por id, una lectura de branch/settings por request).
- Las rutas bajo `app/api/geo/*` deben evitar consultas por ítem en bucle; preferir `.in()` / joins vía RPC.

## Portal cliente (`app/api/customer-account/*`)

- `realtime-snapshot` y rutas de billing: revisar que cada handler no dispare una cadena de `.select()` por fila relacionada; usar vistas materializadas o RPC agregada cuando el snapshot crezca.

## Próximo paso

Ver contratos en [rpc-roadmap.md](./rpc-roadmap.md) para snapshots paginados y agregados.
