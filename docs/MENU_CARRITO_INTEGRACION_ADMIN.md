# Menu + Carrito: Integracion, flujos y controles de admin

Este documento explica como funciona actualmente el flujo de `menu + carrito + checkout` en tenant, que datos se envian/reciben, y que controles conviene exponer en panel admin por sucursal para manejar todo sin romper UX.

## 1) Mapa general de arquitectura

- **Entrada tenant**
  - [`components/tenant/menu/menu-client.tsx`](components/tenant/menu/menu-client.tsx)
  - Monta `CartProvider`, `CartFloat` y `CartModal`.
  - Pasa `selectedBranch` y `selectedBranch.delivery_settings` al provider.

- **Estado global del carrito**
  - [`components/tenant/cart/provider/cart-provider.tsx`](components/tenant/cart/provider/cart-provider.tsx)
  - Encapsula store, pricing, fee de delivery, quote states, feature flags por sucursal.
  - Expone todo via contexto.

- **UI y flujo checkout**
  - [`components/tenant/cart/views/cart-modal.tsx`](components/tenant/cart/views/cart-modal.tsx)
  - Maneja steps (`summary -> fulfillment -> payment`), render de bebidas/extras, delivery form, envio de orden.

- **Validacion y persistencia de orden**
  - [`components/tenant/data/orders-service.ts`](components/tenant/data/orders-service.ts)
  - Recalcula totales/fees server-side y ejecuta RPC `create_order_transaction`.

- **Normalizacion de delivery settings**
  - [`lib/delivery-settings.ts`](lib/delivery-settings.ts)
  - Convierte JSON flexible (`camelCase`/`snake_case`) a esquema estable.
  - Resuelve estrategia de pricing, pagos permitidos en delivery y validaciones.


## 2) Controles por sucursal (lo importante para admin)

Hoy casi todo se controla desde `branches.delivery_settings` (JSON).

### 2.1 Flags de activacion de botones Bebidas/Extras

Leidos en [`components/tenant/cart/provider/cart-provider.tsx`](components/tenant/cart/provider/cart-provider.tsx):

- `extrasEnabledByBranch` o `extras_enabled_by_branch` -> activa boton/panel **Extras**.
- `beveragesUpsellEnabledByBranch` o `beverages_upsell_enabled_by_branch` -> activa boton/panel **Bebidas**.

Si estan en `false` (o ausentes), no se muestran en UI.

### 2.2 Catalogos de Bebidas/Extras en carrito

Leidos en [`components/tenant/cart/views/cart-modal.tsx`](components/tenant/cart/views/cart-modal.tsx), desde `selectedBranch.delivery_settings`:

- `cartBeveragesCatalog` (fallback: `beveragesCatalog`)
- `cartGlobalExtrasCatalog` (fallback: `globalExtrasCatalog`)

Formato esperado por item:

- `id` (string)
- `name` (string)
- `price` (number)
- `image_url` (opcional)

### 2.3 Delivery settings (pricing y reglas)

Normalizados por [`lib/delivery-settings.ts`](lib/delivery-settings.ts):

- `enabled`
- `deliveryPricingStrategy`: `"distance"` | `"named_areas"` | `"external"`
- `namedAreaResolution`: `"manual_select"` | `"address_matched"`
- `pricePerKm`, `baseFee`, `minFee`, `maxFee`
- `maxDeliveryKm`
- `freeDeliveryFromSubtotal`
- `minOrderSubtotal`
- `customerNotes`
- `zones` / `namedAreas`
- `allowedPaymentMethodsForDelivery`

Esto controla:

- si aparece `Delivery`,
- como se calcula fee,
- metodos de pago permitidos en delivery,
- mensajes al cliente y validaciones.

Con `deliveryPricingStrategy: "external"` y `externalDeliveryProvider: "uber_direct"`:

- `uberDirectStoreId`: store id de Uber por **sucursal** (panel CEO, edicion de sucursal).
- `showExternalDeliveryFeeAmount` / `externalDeliveryDisplayText`: UX cuando no se muestra monto fijo.

Credenciales OAuth (`client_id` / `client_secret`) van por **empresa** en `companies.integration_settings.uber` (Client Secret cifrado con `UBER_SECRETS_ENCRYPTION_KEY`). Si la empresa no tiene credenciales en BD, el servidor puede usar `UBER_CLIENT_ID` / `UBER_CLIENT_SECRET` como respaldo. Las APIs [`app/api/geo/delivery-quote/route.ts`](../app/api/geo/delivery-quote/route.ts) y [`app/api/tenant/public-order-delivery/route.ts`](../app/api/tenant/public-order-delivery/route.ts) resuelven el token con [`lib/company-integration-settings.ts`](../lib/company-integration-settings.ts).


## 3) Flujo de datos: de donde sale cada cosa y a donde va

## 3.1 Inicio de pagina menu

1. `menu-client` resuelve sucursal seleccionada.
2. Pasa a `CartProvider`:
   - `selectedBranchId`
   - `branchDeliverySettings` (`selectedBranch.delivery_settings`)
   - `branchOriginLat/Lng`
3. `CartProvider`:
   - normaliza settings,
   - calcula flags de features por sucursal,
   - fuerza `pickup` si delivery no esta habilitado,
   - expone estado derivado al contexto.

## 3.2 Bebidas/Extras en carrito

1. `cart-modal` revisa flags `beveragesUpsellEnabledByBranch` / `extrasEnabledByBranch`.
2. Si hay al menos uno activo, renderiza rail y panel.
3. Cuando usuario agrega:
   - **Bebidas upsell** -> se agrega linea al carrito (`upsell_beverage_*`) con `selected_beverages`.
   - **Extras globales** -> se guardan en `globalExtras` del contexto.
4. Totales:
   - `cart-provider` suma producto + extras por linea + extras globales.

## 3.3 Delivery quote/address

En modo `distance`, `cart-modal` puede usar:

- `GET /api/geo/address-search` (sugerencias/geocoding),
- `POST /api/geo/delivery-quote` (fee por coordenadas).

En modo `named_areas + address_matched`, se usa geocoding por direccion para resolver area.

## 3.4 Envio de orden (checkout)

`cart-modal` arma payload y llama `ordersService.createOrder(...)`.

`orders-service`:

1. Valida caja abierta.
2. Recalcula subtotal de items (server-side).
3. Relee `branches.delivery_settings` y recalcula delivery fee (no confia en cliente).
4. Ejecuta RPC `create_order_transaction` con:
   - `p_items`, `p_total`,
   - `p_order_type` (`pickup`/`delivery`),
   - `p_delivery_fee`,
   - `p_delivery_address`,
   - datos cliente/pago/sucursal.
5. Si delivery y hay `orderId`, hace patch adicional via `POST /api/tenant/public-order-delivery`.


## 4) Que se envia exactamente (resumen practico)

Desde frontend -> backend al confirmar pedido:

- Cliente:
  - `client_name`, `client_phone`, `client_rut`
- Pago:
  - `payment_type`, `payment_method_specific`, `receiptFile` (si aplica)
- Orden:
  - `items` (incluye extras por item y lineas de extras globales)
  - `note`
  - `branch_id`, `company_id`
  - `order_type` (`pickup`/`delivery`)
- Delivery (si aplica):
  - `delivery_address` (line1, commune, reference, etc.)
  - `delivery_km`, `delivery_lat`, `delivery_lng`
  - `delivery_named_area_id`

Backend -> frontend:

- Orden creada (id, numero/codigo si aplica),
- errores de negocio traducidos (fuera de zona, minimo no alcanzado, item invalid price, etc.).


## 5) Controles recomendados en Admin (por sucursal)

Para manejar todo lo que cambiaste hoy desde admin, conviene exponer:

## 5.1 Bloque "Upsell carrito"

- Toggle: `beveragesUpsellEnabledByBranch`
- Toggle: `extrasEnabledByBranch`
- Tabla editable `cartBeveragesCatalog`
  - `id`, `name`, `price`, `image_url`, `active`
- Tabla editable `cartGlobalExtrasCatalog`
  - `id`, `name`, `price`, `image_url`, `active`
- Orden manual y preview mobile del rail.

## 5.2 Bloque "Delivery rules"

- Toggle delivery `enabled`
- Estrategia pricing:
  - `distance` o `named_areas`
- Si `distance`:
  - `pricePerKm`, `baseFee`, `minFee`, `maxFee`, `maxDeliveryKm`
- Si `named_areas`:
  - CRUD de `namedAreas` (id, name, feeFlat, minSubtotal, freeFromSubtotal, aliases)
  - `namedAreaResolution` (`manual_select` / `address_matched`)
- `minOrderSubtotal`, `freeDeliveryFromSubtotal`
- `customerNotes`
- `allowedPaymentMethodsForDelivery`

## 5.3 Validaciones admin (importante)

- No guardar catalogos con ids vacios o precios negativos.
- Evitar duplicados de `id` en bebidas/extras.
- En `namedAreas`, exigir nombre y fee valido.
- Si `minFee > maxFee`, corregir automaticamente (igual que helper actual).
- Guardar en formato consistente (`camelCase`) aunque frontend tolera `snake_case`.


## 6) Activaciones y efectos en runtime

- Cambio de sucursal:
  - `CartProvider` limpia carrito cuando cambia `selectedBranchId`.
  - Se recalculan flags y reglas de delivery en caliente.
- Si delivery queda deshabilitado:
  - se fuerza `pickup`.
- Si se desactiva bebidas/extras:
  - se oculta rail de paneles automaticamente.


## 7) Checklist de regression antes de commit/release

- Menu
  - categoria/busqueda funcionan en mobile y desktop.
- Carrito
  - abre/cierra sin scroll fantasma.
  - bebidas/extras aparecen solo cuando flags de sucursal estan activos.
  - agregar/quitar extras y bebidas actualiza total correctamente.
- Checkout
  - `pickup` y `delivery` completos.
  - validaciones de direccion/referencia funcionan.
  - fee de delivery coincide con reglas de sucursal.
- Orden
  - RPC recibe `p_order_type`, `p_delivery_fee`, `p_delivery_address` correctamente.
  - errores de negocio muestran mensaje entendible.


## 8) Nota para futuras extensiones admin

Si agregas mas toggles por sucursal, recomendacion:

- mantenerlos dentro de `delivery_settings` (o crear `branch_features` dedicado),
- versionar esquema JSON (ej: `settingsVersion`) para migraciones limpias,
- documentar defaults en backend para evitar `undefined behavior`.

