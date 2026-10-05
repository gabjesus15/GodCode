import currency from "currency.js";
import { isUuidLike } from "./safe-ids";
import { composeLineName, type ProductSizeOption } from "@/lib/tenant/product-sizes";
import { resolveVariantSelection, type ProductVariantGroup } from "@/lib/tenant/product-variants";

/** Fila típica de `product_prices` + join `products` desde Supabase. */
export type BranchProductPriceRow = {
  product_id: string;
  price: number | null;
  has_discount: boolean | null;
  discount_price: number | null;
  products?: {
    id?: string;
    name?: string | null;
    is_active?: boolean | null;
    description?: string | null;
  } | null;
  /**
   * Tamaños activos del producto en la sucursal. `undefined` = no se pudieron leer
   * (se conserva el precio del carrito); `[]` = el producto ya no tiene tamaños.
   */
  sizes?: ProductSizeOption[];
  /**
   * Grupos de variantes activos del producto en la sucursal. `undefined` = no se
   * pudieron leer (se conserva lo que hay en el carrito); `[]` = sin variantes.
   */
  variants?: ProductVariantGroup[];
};

export type MergeCartBranchPricesOptions = {
  /**
   * true: si hay al menos una fila de precios para la sucursal, se omiten ítems del carrito sin fila (modal web).
   * false: se conservan ítems sin fila con los datos ya guardados en el carrito (provider / persistencia).
   */
  omitLinesWithoutPriceWhenBranchHasData: boolean;
};

/**
 * Une el carrito con precios y metadatos de producto por sucursal.
 * Filtra `is_active === false` al final.
 */
export function mergeCartWithBranchPrices<
  T extends {
    lineId?: string;
    id: string;
    name?: string | null;
    description?: string | null;
    price?: number | null;
    has_discount?: boolean | null;
    discount_price?: number | null;
    is_active?: boolean | null;
    size_id?: string | null;
    size_name?: string | null;
    variant_ids?: string[] | null;
    variant_names?: string[] | null;
    variant_delta?: number | null;
  },
>(cart: T[], rows: BranchProductPriceRow[] | null | undefined, options: MergeCartBranchPricesOptions): T[] {
  const list = rows ?? [];
  const hasAnyRows = list.length > 0;
  const priceByProductId = new Map(list.map((row) => [String(row.product_id), row]));

  const merged = cart.reduce<T[]>((acc, cartItem) => {
    const priceRow = priceByProductId.get(String(cartItem.id)) ?? null;
    const meta = priceRow?.products;
    const needsSize = Boolean(cartItem.size_id);
    const needsVariants = Boolean(cartItem.variant_ids && cartItem.variant_ids.length > 0);
    if (priceRow && (needsSize || needsVariants)) {
      // Línea configurada: el precio sale del tamaño (o del base) más los deltas de las
      // variantes, siempre con los valores vigentes de la sucursal.
      const { sizes, variants } = priceRow;
      if ((needsSize && sizes === undefined) || (needsVariants && variants === undefined)) {
        acc.push({ ...cartItem, is_active: meta?.is_active ?? cartItem.is_active });
        return acc;
      }
      const size = needsSize ? sizes?.find((entry) => entry.id === String(cartItem.size_id)) ?? null : null;
      const selection = needsVariants
        ? resolveVariantSelection(variants, cartItem.variant_ids)
        : { ids: [], names: [], delta: 0 };
      // Tamaño o variante borrados o desactivados en el panel: la línea sale del carrito.
      if ((needsSize && !size) || !selection) {
        acc.push({ ...cartItem, is_active: false });
        return acc;
      }
      const basePrice = size ? size.price : Number(priceRow.price ?? cartItem.price ?? 0);
      const discount = Number(priceRow.discount_price ?? 0);
      const hasDiscount = !size && Boolean(priceRow.has_discount) && discount > 0;
      acc.push({
        ...cartItem,
        price: basePrice + selection.delta,
        has_discount: hasDiscount,
        discount_price: hasDiscount ? discount + selection.delta : null,
        size_name: size?.name ?? cartItem.size_name,
        ...(needsVariants
          ? { variant_ids: selection.ids, variant_names: selection.names, variant_delta: selection.delta }
          : {}),
        name: meta?.name ? composeLineName(meta.name, [size?.name ?? null, ...selection.names]) : cartItem.name,
        description: meta?.description ?? cartItem.description,
        is_active: meta?.is_active ?? cartItem.is_active,
      });
      return acc;
    }
    if (priceRow) {
      acc.push({
        ...cartItem,
        price: priceRow.price,
        has_discount: priceRow.has_discount,
        discount_price: priceRow.discount_price,
        name: meta?.name ?? cartItem.name,
        description: meta?.description ?? cartItem.description,
        is_active: meta?.is_active ?? cartItem.is_active,
      });
      return acc;
    }
    const isSyntheticLine = !isUuidLike(String(cartItem.id));
    // A partial branch-price response must not make an already priced cart
    // line disappear. The atomic order RPC still revalidates catalog price and
    // availability before persisting, so preserving it here is UX-safe.
    const hasUsableCartPrice =
      !cartItem.lineId
      &&
      Number.isFinite(Number(cartItem.price))
      && Number(cartItem.price) >= 0
      && cartItem.is_active !== false;
    if (
      !hasAnyRows ||
      !options.omitLinesWithoutPriceWhenBranchHasData ||
      isSyntheticLine ||
      hasUsableCartPrice
    ) {
      acc.push({ ...cartItem });
    }
    return acc;
  }, []);

  return merged.filter((item) => item.is_active !== false);
}

/**
 * Importe monetario saneado: no finito o negativo cuenta como 0.
 *
 * `currency()` propaga NaN sin avisar, así que un subtotal corrupto salía como
 * `total: NaN` hasta la interfaz. Y sin acotar a 0, un descuento negativo subía
 * el total y una tarifa de envío negativa lo bajaba.
 */
function safeMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Porcentaje de impuesto saneado, acotado a [0, 100].
 *
 * Equivale a `parseOptionalTaxRate` del Panel POS, que ya descartaba valores
 * fuera de ese rango. Aquí no había cota superior: un `taxRate` de 1000
 * multiplicaba el total por once.
 */
function safeTaxRate(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

/**
 * Realiza los cálculos monetarios precisos del carrito usando currency.js.
 * Soporta IVA incluido/excluido y conversión dual de divisas.
 *
 * Todas las entradas se sanean primero: este cálculo alimenta lo que el cliente
 * ve antes de confirmar, y un dato corrupto no debe convertirse en un total
 * corrupto. La RPC `create_order_transaction` recalcula al crear el pedido.
 */
export function calculateCartTotals(params: {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxRate?: number | null;
  taxIncluded?: boolean | null;
  exchangeRate?: number | null;
}) {
  const sub = currency(safeMoney(params.subtotal));
  // Un descuento mayor que el subtotal ya se acotaba al calcular el total, pero
  // se devolvía sin acotar: la interfaz mostraba "-999" sobre un subtotal de 10.
  const disc = currency(Math.min(safeMoney(params.discountAmount), sub.value));
  const devFee = currency(safeMoney(params.deliveryFee));
  const taxRatePercent = safeTaxRate(params.taxRate);
  const taxIncluded = params.taxIncluded ?? false;
  const exchangeRate = safeMoney(params.exchangeRate);

  // Subtotal neto después del descuento
  const subAfterDiscount = currency(Math.max(0, sub.subtract(disc).value));

  let taxTotal = currency(0);
  let baseTotal = currency(0);

  if (taxRatePercent > 0) {
    if (taxIncluded) {
      // IVA Incluido: tax_total = subtotal_after_discount - (subtotal_after_discount / (1 + tax_rate / 100))
      const divisor = currency(1).add(currency(taxRatePercent).divide(100));
      const net = subAfterDiscount.divide(divisor);
      taxTotal = subAfterDiscount.subtract(net);
      baseTotal = subAfterDiscount.add(devFee);
    } else {
      // IVA Excluido: tax_total = subtotal_after_discount * (tax_rate / 100)
      taxTotal = subAfterDiscount.multiply(currency(taxRatePercent).divide(100));
      baseTotal = subAfterDiscount.add(taxTotal).add(devFee);
    }
  } else {
    baseTotal = subAfterDiscount.add(devFee);
  }

  const total = Math.max(0, baseTotal.value);
  const localTotalVal = exchangeRate > 0 ? currency(total).multiply(exchangeRate).value : null;

  return {
    subtotal: sub.value,
    discountTotal: disc.value,
    deliveryFee: devFee.value,
    taxTotal: taxTotal.value,
    total: total,
    localTotal: localTotalVal,
  };
}
