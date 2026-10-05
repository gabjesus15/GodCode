# Hoja de producto: tamaños que crecen y variantes

Plan de diseño e implementación (4 oct 2026), construido el 5 oct 2026 en la rama `claude/tamanos-producto-iooyjl` (PR #4). Lo que falta: el editor de variantes en el Panel (copiar el patrón del editor de tamaños del parche cloud y llamar a `admin_set_product_variants`) y aplicar `migrations/20261005_product_variants.sql` después de la de tamaños.

Para verlo sin base: `/dev/product-sheet` (solo en desarrollo) abre la hoja con productos de ejemplo en claro/oscuro y con el acento que se quiera.

## Qué se encontró

- Las fotos de Rica Pizza son PNG 1024×1024 con transparencia (recortes): el plato puede crecer de verdad sobre el escenario `--menu-media-*` que ya existe en `tenant-base.css`. Para fotos rectangulares (JPG), en vez de recortarlas en círculo (contorno falso), crece una tarjeta de foto con esquinas redondeadas.
- `framer-motion` 12 ya es dependencia pero no se usa en el storefront: entra con `LazyMotion` + `domAnimation` y componentes `m.*`, cargado con la hoja (ya es `LazyProductDetailsModal`).
- Tokens disponibles: `--menu-accent`, `--menu-accent-soft`, `--menu-on-accent`, `--menu-surface(-2)`, `--menu-line(-strong)`, `--menu-fg(-2/-3)`, `--menu-media-top/bottom/glow`, `--menu-ease` (`cubic-bezier(0.16,1,0.3,1)`), radios `--menu-r-*`, sombras `--menu-shadow-*`.
- `menu_modifier_groups` (4 filas vivas: Plaqueta, Proteína, Relleno…) es el sistema de modificadores de la caja (quitar/agregar/cambiar con inventario). No sirve de «variante con opción por defecto» para el menú público.
- Las tablas `product_extras_groups/options` tienen 0 filas y el storefront no las lee.

## Modelo de datos para variantes (espejo de `product_sizes`)

Tabla `product_variants`: `id, company_id, product_id, branch_id, group_name ("Proteína"), name ("Pollo"), price_delta numeric default 0, image_url text null, sort_order, is_active, created_at, updated_at`. La primera opción de cada grupo (por `sort_order`) es la predeterminada. RLS igual que tamaños (lectura anónima solo con suscripción vigente). RPC `admin_set_product_variants(p_product_id, p_branch_id, p_variants jsonb, p_apply_to_all_branches)` calcado de `admin_set_product_sizes`. `validate_and_normalize_order_items` acepta `variant_ids uuid[]` opcional: valida producto/sucursal/activo, un id por grupo, suma `price_delta` después de la oferta y guarda `variant_ids`, `variant_names`, `variant_delta`; nombre de línea `Producto (Familiar, Pollo)`. La migración debe partir de la versión del PR #4 (que es la viva + tamaños).

## Diseño de la hoja (móvil primero, Operate)

- **Momento focal:** elegir tamaño hace crecer el plato (escala 0.68 → 1 repartida por índice, no por precio) con muelle `stiffness 260 / damping 22`, la sombra elíptica bajo el plato escala con él y el precio del CTA se desliza arriba/abajo según suba o baje.
- **Tamaños:** control segmentado con pulgar deslizante (`layoutId`), nombre arriba y precio tabular abajo; `role=radiogroup` con radios reales (teclado nativo).
- **Variantes:** por grupo, etiqueta y chips con punto de check; delta `+$1` en pequeño; si la variante trae `image_url`, la foto hace crossfade.
- **Pie:** stepper local (−/1/+) + CTA «Agregar · total» (aria-live); al agregar, el CTA pasa a «Agregado ✓» 450 ms y la hoja se cierra. Mismo pie para productos simples.
- **Tarjetas:** el «+» de un producto con tamaños o variantes abre esta misma hoja completa (sustituye la hoja compacta `ProductSizeSheet`).
- **Movimiento reducido:** `useReducedMotion` → sin desplazamientos; solo opacidad y estado. Equipos lentos (`useLowEndDevice`): sin halo ni blur.
- **Verificación:** página de desarrollo `app/dev/product-sheet` (404 en producción) con fixture de Rica Pizza (tamaños + grupo «Proteína») para iterar sin tocar la base.

## Archivos a tocar (rama PR #4)

`lib/tenant/product-variants.ts` (nuevo), `product-sizes.ts` (`composeLineName`), `cached-menu.ts`, `menu/page.tsx`, `menu-types.ts`, `product-card-shared.tsx`, `product-details-sheet.tsx` (reescritura), `product-size-picker.tsx` (pasa a abrir la hoja completa), `ProductDetailsSheet.css`, `cart-context.tsx`, `cart-store.ts` (clave de línea con variantes), `cart-pricing.ts`, `fetch-cart-branch-prices.ts`, `build-order-payload.ts`, `order-catalog-items/route.ts`, `build-order-items-from-branch.ts`, `activity.ts`, `use-repeat-order.ts`, `menu-account-types.ts`, `use-menu-realtime.ts`, `messages/*.json` (6), `migrations/20261005_product_variants.sql`, tests en `__tests__/lib/tenant/product-sizes.test.ts`. El editor del Panel para variantes se copia del de tamaños del parche cloud.
