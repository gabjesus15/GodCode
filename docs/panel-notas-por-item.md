# Notas por ítem: menú → caja / comandas (GodCode-Panel)

## Problema

El menú digital ya **no** envía una única "Nota de cocina" para todo el pedido. Cada línea del carrito puede tener su propia nota (`line_note`).

Si caja/comandas sigue leyendo solo `orders.note` como un bloque global, **las notas no aparecen en cada ítem** aunque el cliente las haya escrito por producto.

Este documento define qué guarda el menú hoy y qué hay que cambiar en el panel para que la nota llegue **a cada ítem**.

---

## Qué envía el menú (contrato actual)

Al confirmar pedido vía `create_order_transaction`, el menú persiste la nota en **dos sitios**:

### A) Dentro de cada ítem — `orders.items` (JSON)

Cada elemento del array tiene `name`, `quantity`, `price`, `description`, etc.

Si el cliente escribió nota para esa línea, `description` incluye un segmento:

```
Nota: {texto del cliente}
```

Ejemplo completo de `description`:

```
Promo del día | Extras: 1x Queso | Nota: Sin cebolla
```

Reglas:

| Regla | Valor |
|-------|--------|
| Prefijo | `Nota: ` (con espacio) |
| Separador entre partes | ` \| ` |
| Campo dedicado en DB | **No existe** `line_note` en `orders`; solo va en `description` |

### B) Resumen en cabecera — `orders.note` (`p_note`)

Líneas agregadas, **una por producto con nota**:

```
Tumbarrancho especial: Sin cebolla
Coca cola: Bien fría
```

Puede incluir metadatos del menú (no son notas de cocina):

```
[Sucursal: Centro]
Tumbarrancho especial: Sin cebolla
[Envio: $1.500]
```

| Línea | Tratamiento en panel |
|-------|----------------------|
| `Producto: texto` | Nota de ese ítem |
| `[Sucursal: ...]` | Info operativa; ignorar en comanda |
| `[Envio: $...]` | Info operativa; ignorar en comanda |

### C) Qué dejó de usarse

- Una sola nota global tipo "Notas de cocina" en el checkout del menú.
- Depender **solo** de `orders.note` sin leer `items[].description`.

---

## Qué debe cambiar en GodCode-Panel

### Objetivo

En **detalle de pedido**, **caja** y **comanda/impresión**, mostrar la nota **junto a cada ítem**, no solo un párrafo general arriba del pedido.

### 1. Dejar de asumir nota global única

**Antes (lógica antigua):**

```js
// Solo esto — pierde notas por ítem
const kitchenNote = order.note;
```

**Después:**

```js
const itemsWithNotes = (order.items ?? []).map((item) => ({
  ...item,
  lineNote: extractLineNote(item.description),
}));
```

La nota por ítem **primaria** está en `items[].description`.  
`orders.note` es **respaldo / resumen** y compatibilidad con pedidos viejos.

### 2. Helper: extraer nota de un ítem

```js
/**
 * @param {string|null|undefined} description
 * @returns {string|null}
 */
export function extractLineNote(description) {
  if (!description || typeof description !== "string") return null;
  const segment = description
    .split(" | ")
    .map((p) => p.trim())
    .find((p) => p.startsWith("Nota:"));
  if (!segment) return null;
  const text = segment.replace(/^Nota:\s*/i, "").trim();
  return text || null;
}
```

### 3. Helper: líneas útiles de `orders.note`

```js
/**
 * @param {string|null|undefined} orderNote
 * @returns {Array<{ productName: string, note: string }>}
 */
export function parseAggregatedLineNotes(orderNote) {
  if (!orderNote?.trim()) return [];
  return orderNote
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith("[Sucursal:") &&
        !l.startsWith("[Envio:")
    )
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon <= 0) return null;
      return {
        productName: line.slice(0, colon).trim(),
        note: line.slice(colon + 1).trim(),
      };
    })
    .filter(Boolean);
}
```

### 4. Resolver nota por ítem (recomendado)

```js
/**
 * @param {object} item — fila de order.items
 * @param {string|null|undefined} orderNote — order.note completo
 */
export function resolveItemKitchenNote(item, orderNote) {
  const fromDescription = extractLineNote(item?.description);
  if (fromDescription) return fromDescription;

  const aggregated = parseAggregatedLineNotes(orderNote);
  const name = String(item?.name ?? "").trim();
  const match = aggregated.find(
    (row) => row.productName.toLowerCase() === name.toLowerCase()
  );
  return match?.note ?? null;
}
```

Orden de prioridad:

1. `Nota:` en `item.description`
2. Línea `nombre: nota` en `orders.note`
3. Si el pedido es viejo y solo hay texto en `orders.note` sin ítems anotados → mostrar `orders.note` **una vez** a nivel pedido (ver compatibilidad)

### 5. Dónde tocar en el panel (checklist)

Buscar en el repo referencias a nota de cocina / `order.note` / `kitchenNote` / comanda.

| Área | Cambio |
|------|--------|
| Lista de ítems del pedido | Mostrar `resolveItemKitchenNote(item, order.note)` bajo cada producto |
| Modal / drawer de pedido | Igual; quitar suposición de un solo textarea de nota |
| Comanda (pantalla cocina) | Una línea de nota por ítem en la tarjeta del producto |
| Impresión ticket/comanda | Incluir nota bajo el ítem si existe |
| Badge o bloque "Nota de cocina" global | Solo si **ningún** ítem tiene nota y `order.note` tiene texto legacy |

### 6. UI sugerida por ítem

```
Tumbarrancho especial  x1
  Nota: Sin cebolla
```

Estilo secundario (texto muted, debajo del nombre). Si no hay nota, no mostrar la línea.

### 7. Compatibilidad con pedidos antiguos

| Origen | `items[].description` | `orders.note` | Comportamiento panel |
|--------|------------------------|---------------|----------------------|
| Menú nuevo con notas | contiene `Nota: ...` | líneas `Producto: nota` | Nota por ítem |
| Menú nuevo sin notas | sin `Nota:` | vacío o solo sucursal/envío | Sin nota |
| Menú antiguo | sin `Nota:` | texto libre global | Mostrar `orders.note` como hoy (bloque único) |

Detección legacy sugerida:

```js
export function isLegacyGlobalKitchenNote(order) {
  const items = order.items ?? [];
  const anyLineNote = items.some((it) => extractLineNote(it.description));
  if (anyLineNote) return false;
  const aggregated = parseAggregatedLineNotes(order.note);
  if (aggregated.length > 0) return false;
  return Boolean(order.note?.trim());
}
```

---

## Ejemplo en base de datos

**Pedido con dos ítems y notas distintas:**

`orders.items` (simplificado):

```json
[
  {
    "name": "Tumbarrancho especial",
    "quantity": 1,
    "description": "Nota: Sin cebolla"
  },
  {
    "name": "Coca cola",
    "quantity": 1,
    "description": "Nota: Bien fría"
  }
]
```

`orders.note`:

```
[Sucursal: Centro]
Tumbarrancho especial: Sin cebolla
Coca cola: Bien fría
```

**Resultado esperado en caja:** cada ítem muestra su nota; no un solo bloque arriba.

---

## Pruebas manuales

1. Menú: dos productos, nota distinta en cada uno → en panel, **dos notas** en lugares correctos.
2. Menú: un producto con nota, otro sin → solo el primero muestra nota.
3. Menú: sin notas → sin bloque de nota en ítems.
4. Pedido antiguo con solo `orders.note` → sigue viéndose el bloque global.
5. Comanda / impresión → nota bajo el ítem correspondiente.

---

## Referencias en GodCode (menú) — solo lectura

| Qué | Archivo |
|-----|---------|
| Nota en `description` | `components/tenant/cart/views/cart-modal.tsx` (`notePart`, `fullDesc`) |
| Resumen en `note` del pedido | `components/tenant/cart/views/cart-modal.tsx` (`lineNotesBlock`) |
| RPC `p_note` | `components/tenant/data/orders-service.ts` (`finalNote` → `p_note`) |
| UI nota por línea | `components/tenant/cart/views/cart-item-row.tsx` |

---

## Resumen para implementación

1. **No** depender solo de `orders.note` para cocina en pedidos del menú nuevo.
2. **Sí** parsear `Nota: ...` en cada `items[].description`.
3. Usar `orders.note` como resumen y fallback por nombre de producto.
4. Mantener bloque global solo para pedidos legacy.
5. Actualizar comanda e impresión con la misma función `resolveItemKitchenNote`.

No se requieren migraciones ni columnas nuevas en Supabase: el menú ya envía los datos; el cambio es **solo en cómo el panel los lee y muestra**.
