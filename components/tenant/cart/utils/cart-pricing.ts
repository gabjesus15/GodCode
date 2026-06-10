import currency from "currency.js";

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
};

export type MergeCartBranchPricesOptions = {
  /**
   * true: si hay al menos una fila de precios para la sucursal, se omiten ítems del carrito sin fila (modal web).
   * false: se conservan ítems sin fila con los datos ya guardados en el carrito (provider / persistencia).
   */
  omitLinesWithoutPriceWhenBranchHasData: boolean;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Une el carrito con precios y metadatos de producto por sucursal.
 * Filtra `is_active === false` al final.
 */
export function mergeCartWithBranchPrices<
  T extends {
    id: string;
    name?: string | null;
    description?: string | null;
    price?: number | null;
    has_discount?: boolean | null;
    discount_price?: number | null;
    is_active?: boolean | null;
  },
>(cart: T[], rows: BranchProductPriceRow[] | null | undefined, options: MergeCartBranchPricesOptions): T[] {
  const list = rows ?? [];
  const hasAnyRows = list.length > 0;
  const priceByProductId = new Map(list.map((row) => [String(row.product_id), row]));

  const merged = cart.reduce<T[]>((acc, cartItem) => {
    const priceRow = priceByProductId.get(String(cartItem.id)) ?? null;
    const meta = priceRow?.products;
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
    const hasStoredPrice = Number(cartItem.price) > 0;
    if (
      !hasAnyRows ||
      !options.omitLinesWithoutPriceWhenBranchHasData ||
      isSyntheticLine ||
      hasStoredPrice
    ) {
      acc.push({ ...cartItem });
    }
    return acc;
  }, []);

  return merged.filter((item) => item.is_active !== false);
}

export interface CartTotalsResult {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  taxTotal: number;
  total: number;
  localTotal: number | null;
}

/**
 * Realiza los cálculos monetarios precisos del carrito usando currency.js.
 * Soporta IVA incluido/excluido y conversión dual de divisas.
 */
export function calculateCartTotals(params: {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  taxRate?: number | null;
  taxIncluded?: boolean | null;
  exchangeRate?: number | null;
}) {
  const sub = currency(params.subtotal);
  const disc = currency(params.discountAmount);
  const devFee = currency(params.deliveryFee);
  const taxRatePercent = params.taxRate ? params.taxRate : 0;
  const taxIncluded = params.taxIncluded ?? false;
  const exchangeRate = params.exchangeRate ? params.exchangeRate : 0;

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
