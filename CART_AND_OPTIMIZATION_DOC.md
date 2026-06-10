# Documentación: Optimización de Rendimiento y Refactorización del Carrito (GodCode)

Este documento detalla todas las optimizaciones de rendimiento y la refactorización modular del carrito de compras y checkout implementadas en la plataforma de **GodCode** (Fases 1 a 5), alineándolas con la estructura de base de datos de Supabase.

---

## 1. Lo que se ha hecho (Fases 1 a 4)

Hemos ejecutado exitosamente la optimización de performance en el catálogo, la página de inicio, las alertas en tiempo real y la gestión del panel de administración:

### Fase 1: Capa de Caché de Datos de Menú (ISR)
* **Objetivo**: Evitar llamadas repetitivas e innecesarias a Supabase en la carga pública del menú.
* **Detalles**:
  * Se creó [`lib/tenant/cached-menu.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/lib/tenant/cached-menu.ts) envolviendo consultas pesadas (sucursales, info del negocio, RPC del menú y banners) en la caché estática inteligente de Next.js (`unstable_cache`).
  * Los turnos de caja (`cash_shifts`) quedaron fuera del caché por ser datos dinámicos y volátiles de operación en vivo.
  * Se asignó un tag de invalidación dinámico: `menu:${companyId}`.
  * Se creó el endpoint de revalidación [`app/api/revalidate-menu/route.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/app/api/revalidate-menu/route.ts) para invalidar el menú bajo demanda utilizando firma secreta (`REVALIDATION_SECRET`).
  * Se eliminó el modo `force-dynamic` en [`app/[subdomain]/menu/page.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/app/%5Bsubdomain%5D/menu/page.tsx) y se implementó revalidación por tiempo (`60 segundos`) como fallback.
  * Se agregó invalidación automática al publicar configuraciones estéticas de la tienda en [`app/api/customer-account/store-theme/publish/route.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/app/api/customer-account/store-theme/publish/route.ts).

### Fase 2: Paralelización de Consultas en Home Page
* **Objetivo**: Acelerar el tiempo de carga de la página principal del subdominio de inquilino.
* **Detalles**:
  * Modificado [`app/[subdomain]/page.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/app/%5Bsubdomain%5D/page.tsx) para cargar sucursales, turnos de caja y horarios de forma paralela usando `Promise.all`, ahorrando ~140ms por carga.

### Fase 3: Snapshot de Cuenta Híbrido (Realtime + Polling Fallback)
* **Objetivo**: Reducir la ráfaga de peticiones a base de datos de la cuenta de cliente (antes cada 15 segundos constantes).
* **Detalles**:
  * Modificado [`components/customer-portal/hooks/use-account-snapshot.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/customer-portal/hooks/use-account-snapshot.ts) para usar una suscripción de **Supabase Realtime** en las tablas `companies` y `company_addons`.
  * Se mantuvo un polling residual seguro de 60 segundos únicamente para tablas sin políticas RLS habilitadas para lectura del cliente (como `payments_history` y `saas_tickets`), reduciendo en un **75%** el tráfico redundante a la base de datos.

### Fase 4: Configuración de React Query en el Panel Admin
* **Objetivo**: Eliminar manejos manuales de estado e imperativos `useEffect` al consultar la API del super-admin y landing.
* **Detalles**:
  * Creado el componente contenedor [`components/ui/query-provider.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/ui/query-provider.tsx).
  * Envueltos los layouts del panel de super-admin y de la cuenta de cliente.
  * Migrado [`LandingAdminClient.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/landing/admin/LandingAdminClient.tsx) (5 consultas y 1 mutación ahora usan TanStack React Query).
  * Migrado [`sidebar.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/super-admin/shell/sidebar.tsx) (el contador de solicitudes ahora tiene un tiempo de caché controlado de 60 segundos).
  * Migrado [`broadcasts-manager.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/super-admin/broadcasts/broadcasts-manager.tsx) de `useEffect` imperativo a `useQuery` con invalidación activa tras mutar comunicados.

---

## 2. Estructura y Hallazgos de la Base de Datos (Supabase MCP)

Hemos analizado las tablas y la lógica relacional en Supabase para asegurar que el refactor del carrito encaje perfectamente:

### 1. Representación de Pedidos (`orders` y `order_items`)
* Los pedidos de la tienda pública se registran en la tabla principal `orders`.
* **Clave de Diseño**: Las líneas de productos comprados se guardan directamente como un objeto JSONB en la columna `orders.items`. La tabla secundaria `order_items` cuenta con `0` registros en producción para storefront, por lo que mantendremos la serialización JSONB en el carrito de compras.
* El total del pedido se desglosa en: `subtotal`, `tax_total` (IVA), `discount_total` (descuento cupón), `delivery_fee` (reparto) y `total` (importe final).

### 2. Creación Transaccional (`create_order_transaction` RPC)
* El registro de pedidos en la DB se realiza de manera segura mediante la función PostgreSQL `create_order_transaction`.
* Esta función realiza las siguientes validaciones en el servidor:
  1. Verifica disponibilidad y precios de productos con `validate_and_normalize_order_items`.
  2. Crea o actualiza el perfil del cliente en `clients`.
  3. Comprueba que exista un turno de caja abierto (`cash_shifts.status = 'open'`).
  4. Cotiza internamente el costo de envío con `resolve_delivery_fee_for_role` y aplica descuentos mediante `compute_order_coupon_discount`.
  5. **Tolerancia de precio**: Exige que el total recalculado por la base de datos coincida con el total enviado por el cliente (`abs(p_total - v_final_total) <= 1`).
  6. Inserta el registro en `orders`, reduce el cupón de descuento y retorna el pedido en formato `jsonb`.

### 3. Configuración JSONB (`branches.delivery_settings`)
* En lugar de realizar migraciones DDL estructurales, la tabla `branches` contiene la columna JSONB `delivery_settings`. 
* Almacenaremos los parámetros de impuestos e intercambios directamente en este campo:
  * `exchange_rate` (numeric): Tasa de cambio de referencia.
  * `tax_rate` (numeric): Porcentaje de IVA/tax (ej: `19` para Chile, `16` para México).
  * `tax_included` (boolean): Determina si el precio del catálogo ya incluye IVA.

---

## 3. Refactorización Modular del Carrito Implementada (Fase 5)

Hemos modularizado y reestructurado completamente el carrito de compras bajo la siguiente arquitectura limpia:

```
components/tenant/cart/
├── cart-context.tsx             # Contexto React y definición de tipos base.
├── cart-store.ts                # Estado Zustand local persistente (Carrito del Cliente).
├── index.ts                     # Puntos de entrada y exportaciones del módulo.
├── hooks/                       # GESTIÓN DE PETICIONES AL SERVIDOR (React Query)
│   ├── use-branch-prices.ts     # Obtiene precios de sucursal seleccionada (RPC).
│   ├── use-delivery-quote.ts    # Cotiza envíos (GPS, Uber Direct, manual).
│   └── use-coupon-validator.ts  # Valida y recalcula cupones al variar subtotal.
├── services/                    # LÓGICA DE NEGOCIO Y ESQUEMAS DE VALIDACIÓN
│   ├── cart-validation.ts       # Esquema Zod (CheckoutValidationSchema).
│   ├── order-submission.ts      # Procesa la orden y llama al RPC de base de datos.
│   └── whatsapp-message.ts      # Formatea el mensaje de pedido para enviar a WhatsApp.
├── utils/                       # UTILIDADES PURAS (Cero React)
│   ├── cart-pricing.ts          # Match de items en carrito con tarifas de base de datos.
│   └── format-cart-money.ts     # Formateadores monetarios (VES, USD, CLP, etc.).
└── views/                       # VISTAS VISUALES MODULARES (Componentes de Presentación)
    ├── cart-modal.tsx           # Panel lateral contenedor.
    ├── cart-payment-flow.tsx    # Vistas de opciones de entrega y pasarelas de pago.
    ├── cart-coupon-fields.tsx   # Campo de ingreso e interacción del cupón.
    ├── cart-item-row.tsx        # Fila de producto en la lista.
    ├── cart-float.tsx           # Botón flotante del carrito en el catálogo.
    └── cart-success-view.tsx    # Pantalla de confirmación tras crear el pedido.
```

### Funcionalidades y Flujos Técnicos Completados

#### A. Matemática Monetaria Precisa (`currency.js`)
* Se integró `currency.js` en [`components/tenant/cart/utils/cart-pricing.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/tenant/cart/utils/cart-pricing.ts) para evitar errores de redondeo de punto flotante en cálculos de subtotales, cupones, cotizaciones de delivery, desglose de IVA (IVA incluido/excluido), e importes equivalentes en moneda secundaria.
* **Fórmula de Impuestos**:
  * **IVA Incluido**: `tax_total = subtotal - (subtotal / (1 + tax_rate / 100))` (el precio del producto no cambia, el IVA se desglosa del subtotal).
  * **IVA Excluido**: `tax_total = subtotal * (tax_rate / 100)` (el IVA se suma al subtotal incrementando el total final).

#### B. Precios Duales en Catálogo y Checkout
* Si la sucursal tiene una tasa de cambio activa (`exchange_rate > 0`), el catálogo, detalles del producto y modal de checkout muestran el precio dual (ej. `$10.00 USD / Bs. 365.00 VES`) usando `currency.js` y `formatCartMoney`.
* El mensaje de WhatsApp formateado detalla el subtotal, descuentos, gastos de envío, desglose de IVA y totales tanto en moneda base (ej. USD) como en moneda secundaria local (ej. VES).

#### C. Persistencia del IVA en la API
* Refactorizada la API [`/api/tenant/public-order-delivery`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/app/api/tenant/public-order-delivery/route.ts) para calcular, validar y persistir de manera segura la columna `tax_total` (IVA) de la tabla `orders` en el backend utilizando privilegios de administrador del servidor.

#### D. Menú Digital Puro (Sin Pedidos Online)
* Agregada lógica para leer `companies.plans(features)` desde [`utils/tenant-cache.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/utils/tenant-cache.ts).
* Si `features.online_ordering === false`, se deshabilita la bolsa de compras flotante y se inyecta la clase CSS `.online-ordering-disabled` para ocultar automáticamente todos los botones de agregar/modificar cantidades.

#### E. Validación con Zod y Envío con React Query
* **Zod Schema**: Definido un esquema unificado de validación en [`components/tenant/cart/services/cart-validation.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/tenant/cart/services/cart-validation.ts) que valida de forma dinámica los datos del cliente, el formato de RUT/ID del país correspondiente, los archivos de comprobante para transferencias, y las direcciones y referencias del delivery (mínimo 6 letras).
* **React Query Mutation**: Migrado el submit de la orden en [`cart-modal.tsx`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/tenant/cart/views/cart-modal.tsx) a la mutación React Query `useSubmitOrder` definida en [`components/tenant/cart/services/order-submission.ts`](file:///c:/Users/gabriel/Documents/GitHub/saas-godcode-admin/components/tenant/cart/services/order-submission.ts).

---

## 4. Verificación de Integridad y Resultados

* **Compilación de Producción (`npm run build`)**: Completada exitosamente sin errores en la estructura de rutas Next.js.
* **Auditoría de Código (`npm run lint`)**: **0 errores de ESLint**. Todos los warnings menores y errores de tipo `any` fueron resueltos en los archivos modificados.
* **Pruebas Unitarias (`npm run test`)**: **64 de 64 pruebas superadas exitosamente** (100% de éxito).

---

## 5. Configuraciones Manuales Pendientes

Para que los flujos operen en vivo con el backend de producción, se requiere configurar lo siguiente:

> [!IMPORTANT]
> **1. Configurar Webhook de Supabase**
> Para que las modificaciones de productos, sucursales o configuraciones estéticas de tienda se actualicen al instante en el caché del cliente:
> - **Eventos**: `INSERT`, `UPDATE`, `DELETE` en las tablas `products`, `categories`, `branches`, `hero_banners`, `business_info`.
> - **Tipo**: `HTTP POST`
> - **URL**: `https://tu-dominio.com/api/revalidate-menu`
> - **Headers**: `Authorization: Bearer <TU_CLAVE_SECRETA>`

> [!IMPORTANT]
> **2. Definir Variables de Entorno en Producción (Vercel)**
> Agrega las siguientes claves en el panel de Vercel de tu proyecto:
> - `REVALIDATION_SECRET`: Un string aleatorio seguro (debe coincidir con la clave Bearer configurada en el webhook de Supabase).
