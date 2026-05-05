# Roadmap de RPC Supabase (agregados)

Estas funciones **no están obligatorias** para el funcionamiento actual (el BFF ya usa consultas y RPC existentes como `create_order_transaction`). Sirven como objetivo de diseño para reducir round-trips y simplificar políticas RLS en vistas agregadas.

## `get_tenant_orders_paginated`

- **Entrada sugerida**: `branch_id uuid`, `cursor`, `limit`, filtros de estado/fecha.
- **Salida**: filas de pedidos con totales y cliente ya resueltos para lista tenant/admin.
- **Notas**: paginación estable por `(created_at, id)`; índices compuestos acordes.

## `get_customer_account_snapshot`

- **Entrada**: `company_id uuid` (y/o sesión) + scopes necesarios para portal.
- **Salida**: payload único (plan, billing, addons, tema tienda flags) para evitar 4–8 selects encadenados desde el BFF.

## `get_super_admin_companies_overview`

- **Entrada**: filtros de búsqueda, página.
- **Salida**: columnas de tabla “overview” (plan, estado, métricas light) sin N+1 por empresa.

## Implementación

1. Diseñar contrato JSON estable y permisos (`SECURITY INVOKER` salvo requisito contrario).
2. Añadir migración en `supabase/migrations/` con `COMMENT ON FUNCTION`.
3. Cambiar rutas BFF para consumir la RPC y eliminar selects redundantes.
4. Re-ejecutar advisors (performance) y medir latencia p95.
