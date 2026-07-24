"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { X, MapPin, AlertCircle, Plus, Check, CupSoda, Sparkles, Store, Truck, ArrowLeft, Ticket } from "lucide-react";
import { formatCartMoney } from "../utils/format-cart-money";
import { type CartFulfillment, isUpsellBeverageLineId } from "../cart-context";
import {
  effectiveDeliveryPricingMode,
  isOrderPaymentAllowedForDelivery,
  normalizeDeliverySettings,
  resolveDeliveryPaymentMethodsForCheckout,
  stripStaffOnlyDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import { parseUnifiedAddressSearch } from "@/lib/delivery/address-search-query";
import { buildBusinessClosedCustomerMessage } from "@/lib/tenant/business-closed-message";
import { generateWSMessage } from "../services/whatsapp-message";
import { parseOrderRpcPayload } from "../services/order-payload";
import { paymentMethodRequiresReceipt } from "../services/menu-order-payment";
import { getFormStrategy, resolveCheckoutCountryCode } from "@/lib/geo/country-forms";
import {
  ENHANCE_CATALOG_BEVERAGE_FALLBACK,
  ENHANCE_CATALOG_EXTRA_FALLBACK,
  resolvePaymentMethodLabel,
} from "../constants";
import type {
  AddressSearchHit,
  ActiveSessionInfo,
  BranchInfo,
  BusinessInfo,
  CartLineItem,
  CartModalViewState,
} from "../cart-modal-types";
import { CartCouponFields } from "./cart-coupon-fields";
import { CartEmptyState } from "./cart-empty-state";
import { CartEnhanceCatalogGlyph } from "./cart-enhance-catalog-glyph";
import { CartItemRow } from "./cart-item-row";
import { CartNamedAreaSelect } from "./cart-named-area-select";
import { CartPaymentFlow } from "./cart-payment-flow";
import { CartSuccessView } from "./cart-success-view";
import { buildCartClientSchema } from "../services/cart-validation";
import { useSubmitOrder } from "../services/order-submission";
import { mergeCartWithBranchPrices } from "../utils/cart-pricing";
import { validateImageFile } from "../../utils/cloudinary";
import { useCart } from "../use-cart";
import { sanitizeUserText } from "@/utils/sanitize-user-text";
import { useCartCheckoutFlow } from "../hooks/use-cart-checkout-flow";
import { useDismissKeyboardOnOutsideTap } from "@/lib/tenant/mobile/use-dismiss-keyboard";
import { useTenantMounted } from "@/lib/tenant/hooks/use-tenant-mounted";
import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";
import { LazyDeliveryPreviewMap } from "@/lib/tenant/lazy/tenant-dynamic";
import type { OrderChannelMode } from "@/lib/tenant/menu-settings";
import {
	requiresOpenShiftForCheckout,
	shouldOpenWhatsAppOnCheckout,
	shouldPersistOrderToPanel,
} from "@/lib/tenant/menu-settings";

import "../../../../app/[subdomain]/styles/CartModal.css";
import "../../../../app/[subdomain]/styles/CartModal.custom.css";

export function CartModal({
  businessInfo,
  selectedBranch,
  currency: propCurrency = "CLP",
  orderChannel = "both",
}: {
  businessInfo?: BusinessInfo | null;
  selectedBranch?: BranchInfo | null;
  currency?: string;
  orderChannel?: OrderChannelMode;
}) {
  const submitOrderMutation = useSubmitOrder();

  const t = useTranslations("tenant.cart.modal");
    const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

    const mounted = useTenantMounted();

    const {
      cart,
      isCartOpen,
      addToCart,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      cartSubtotal,
      grandTotal,
      deliveryFee,
      getPrice,
      setLineNote,
      fulfillment,
      setFulfillment,
      deliveryLine1,
      setDeliveryLine1,
      deliveryCommune,
      setDeliveryCommune,
      deliveryReference,
      setDeliveryReference,
      deliveryLat,
      deliveryLng,
      setDeliveryCoords,
      deliveryNamedAreaId,
      setDeliveryNamedAreaId,
      deliveryKmManual,
      setDeliveryKmManual,
      globalExtras,
      setGlobalExtras,
      isDeliveryOutOfZone,
      quotedRouteKm,
      setShowDeliveryReference,
      deliveryWaivedFree,
      deliveryNamedAreaLabel,
      deliveryQuoteLoading,
      deliveryQuoteError,
      extrasEnabledByBranch,
      beveragesUpsellEnabledByBranch,
      deliveryShowNumericFee,
      deliveryExternalHintText,
      uberQuoteId,
      branchPriceRows,
      appliedCouponCode,
      appliedCouponDiscount,
      taxTotal = 0,
      localTotal = null,
      exchangeRate,
      currency = propCurrency,
      country: cartCountry = "CL",
    } = useCart();



     type CheckoutLiveBranch = Pick<
      BranchInfo,
      | "payment_methods"
      | "delivery_settings"
      | "efectivo"
      | "tarjeta"
      | "order_intake_paused"
      | "order_intake_pause_message"
      | "order_intake_paused_at"
    >;

    const [checkoutLiveBranch, setCheckoutLiveBranch] = useState<CheckoutLiveBranch | null>(
      null,
    );
    const [receiptRequiredMethods, setReceiptRequiredMethods] = useState<Set<string> | null>(
      null,
    );

    const selectedBranchForCheckout = useMemo<BranchInfo | null>(() => {
      if (!selectedBranch) return null;
      if (!checkoutLiveBranch) return selectedBranch;
      return { ...selectedBranch, ...checkoutLiveBranch } as BranchInfo;
    }, [selectedBranch, checkoutLiveBranch]);

    // Real-time: mantener actualizados los métodos de pago (y restricción delivery) del checkout
    // cuando el admin edita la sucursal en el panel.
    useEffect(() => {
      if (!selectedBranch?.id || !isCartOpen) {
        queueMicrotask(() => setCheckoutLiveBranch(null));
        return;
      }

      const channel = supabase
        .channel(`tenant-cart-checkout-branch:${selectedBranch.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "branches",
            filter: `id=eq.${selectedBranch.id}`,
          },
          (payload: unknown) => {
            const next = (payload as { new?: unknown }).new;
            if (!next || typeof next !== "object") return;
            const row = next as Record<string, unknown>;
            setCheckoutLiveBranch({
              payment_methods:
                row.payment_methods === null
                  ? undefined
                  : (row.payment_methods as string[] | undefined),
              delivery_settings: row.delivery_settings as BranchInfo["delivery_settings"],
              efectivo: row.efectivo,
              tarjeta: row.tarjeta,
              order_intake_paused: row.order_intake_paused as boolean | null | undefined,
              order_intake_pause_message: row.order_intake_pause_message as string | null | undefined,
              order_intake_paused_at: row.order_intake_paused_at as string | null | undefined,
            });
          },
        );

      channel.subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [supabase, selectedBranch?.id, isCartOpen]);

    useEffect(() => {
      if (!selectedBranch?.id || !isCartOpen) {
        return;
      }
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setReceiptRequiredMethods(null);
      });
      fetch(`/api/tenant/payment-method-policies?branchId=${encodeURIComponent(selectedBranch.id)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("payment_method_policies_unavailable");
          return response.json() as Promise<{
            methods?: Array<{ id?: string; requiresReceipt?: boolean }>;
          }>;
        })
        .then((payload) => {
          if (cancelled) return;
          setReceiptRequiredMethods(new Set(
            (payload.methods ?? [])
              .filter((method) => method.requiresReceipt)
              .map((method) => String(method.id ?? "").trim())
              .filter(Boolean),
          ));
        })
        .catch(() => {
          if (!cancelled) setReceiptRequiredMethods(null);
        });
      return () => {
        cancelled = true;
      };
    }, [
      isCartOpen,
      selectedBranch?.id,
      selectedBranchForCheckout?.payment_methods,
    ]);

    const deliverySettings = useMemo(
      () =>
        normalizeDeliverySettings(
          stripStaffOnlyDeliverySettings(selectedBranchForCheckout?.delivery_settings),
        ),
      [selectedBranchForCheckout]
    );

    const branchPaymentMethods = useMemo(() => {
      const base = Array.isArray(selectedBranchForCheckout?.payment_methods)
        ? [...selectedBranchForCheckout!.payment_methods]
        : [];

      const hasEfectivo = (() => {
        const v = selectedBranchForCheckout?.efectivo;
        if (v == null) return false;
        if (typeof v === "string") {
          const t = v.trim();
          if (!t) return false;
          // Si viene serializado como JSON vacío "{}", no lo consideramos activo.
          try {
            const parsed = JSON.parse(t);
            if (parsed && typeof parsed === "object" && Object.keys(parsed as Record<string, unknown>).length === 0) {
              return false;
            }
          } catch {
            // Si no es JSON, al menos que no sea el string "{}".
            if (t === "{}") return false;
          }
          return true;
        }
        if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
        return true;
      })();

      const hasTarjeta = (() => {
        const v = selectedBranchForCheckout?.tarjeta;
        if (v == null) return false;
        if (typeof v === "string") {
          const t = v.trim();
          if (!t) return false;
          try {
            const parsed = JSON.parse(t);
            if (parsed && typeof parsed === "object" && Object.keys(parsed as Record<string, unknown>).length === 0) {
              return false;
            }
          } catch {
            if (t === "{}") return false;
          }
          return true;
        }
        if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
        return true;
      })();

      if (hasEfectivo && !base.includes("efectivo")) base.push("efectivo");
      if (hasTarjeta && !base.includes("tarjeta")) base.push("tarjeta");

      return Array.from(new Set(base));
    }, [selectedBranchForCheckout]);

    const checkoutPaymentMethods = useMemo(
      () =>
        resolveDeliveryPaymentMethodsForCheckout(
          branchPaymentMethods,
          deliverySettings,
          fulfillment,
        ),
      [branchPaymentMethods, deliverySettings, fulfillment],
    );

    const effectiveCountryCode = useMemo(
      () =>
        resolveCheckoutCountryCode({
          branchCountry: selectedBranchForCheckout?.country ?? selectedBranch?.country,
          businessCountry: businessInfo?.country,
          cartCountry,
        }),
      [
        businessInfo?.country,
        cartCountry,
        selectedBranch?.country,
        selectedBranchForCheckout?.country,
      ],
    );

    const strategy = useMemo(
      () => getFormStrategy(effectiveCountryCode),
      [effectiveCountryCode],
    );

    const deliveryPriceMode = useMemo(
      () => effectiveDeliveryPricingMode(deliverySettings),
      [deliverySettings]
    );

    const mapAddressMode = useMemo(
      () => deliveryPriceMode === "distance" || deliveryPriceMode === "external",
      [deliveryPriceMode],
    );

    const enhancementCatalogs = useMemo(() => {
      const raw =
        selectedBranchForCheckout?.delivery_settings &&
        typeof selectedBranchForCheckout.delivery_settings === "object" &&
        !Array.isArray(selectedBranchForCheckout.delivery_settings)
          ? (selectedBranchForCheckout.delivery_settings as Record<string, unknown>)
          : {};
      const parseRows = (x: unknown) =>
        Array.isArray(x)
          ? x
              .filter((r) => r && typeof r === "object")
              .map((r) => {
                const o = r as Record<string, unknown>;
                const rawImg = o.image_url ?? o.imageUrl;
                const imageUrl =
                  typeof rawImg === "string" && rawImg.trim().length > 0
                    ? rawImg.trim()
                    : null;
                return {
                  id: String(o.id ?? ""),
                  name: String(o.name ?? ""),
                  price: Math.max(0, Math.round(Number(o.price) || 0)),
                  image_url: imageUrl,
                };
              })
              .filter((r) => r.id && r.name)
          : [];
      return {
        beverages: parseRows(raw.cartBeveragesCatalog ?? raw.beveragesCatalog),
        globalExtras: parseRows(raw.cartGlobalExtrasCatalog ?? raw.globalExtrasCatalog),
      };
    }, [selectedBranchForCheckout]);

    const [geoHint, setGeoHint] = useState<string | null>(null);
    // Modo simple: no mostramos autocompletado visual de direcciones.
    // Aun así, geocodificamos en background para obtener lat/lng.
    const SHOW_ADDRESS_SUGGESTIONS = false;

    const [addressHits, setAddressHits] = useState<AddressSearchHit[]>([]);
    const [addressSearchConfigError, setAddressSearchConfigError] = useState<
      string | null
    >(null);
    const [addressSearchLoading, setAddressSearchLoading] = useState(false);
    const [addressHitsOpen, setAddressHitsOpen] = useState(false);
    const addressSearchWrapRef = useRef<HTMLDivElement>(null);
    /** Precisión del punto de entrega (búsqueda vs GPS). */
    const [deliveryAddressPrecision, setDeliveryAddressPrecision] = useState<
      "exact" | "approx" | null
    >(null);
    /** Evita geocodificar por calle/comuna justo después de elegir sugerencia o GPS. */
    const suppressLineGeocodeUntilRef = useRef(0);
    const isManualEditRef = useRef(false);
    const [lineGeocodeLoading, setLineGeocodeLoading] = useState(false);
    const [debouncedDeliveryLine, setDebouncedDeliveryLine] = useState({
      line1: "",
      commune: "",
    });

    /** Un solo campo: búsqueda + relleno de calle/comuna al elegir sugerencia. */
    const [unifiedAddressSearch, setUnifiedAddressSearch] = useState("");
    const [debouncedLookup, setDebouncedLookup] = useState("");
    const cartWasOpenRef = useRef(false);

    // 3 campos separados: Comuna + Calle + Número.
    // `deliveryLine1` en el store se compone como: `${street} ${number}`.
    const [streetInput, setStreetInput] = useState("");
    const [streetNumberInput, setStreetNumberInput] = useState("");

    function splitLine1IntoStreetAndNumber(line1: string): {
      street: string;
      number: string;
    } {
      const t = line1.trim();
      if (!t) return { street: "", number: "" };
      // Si viene con cosas tipo "..., depto 4", nos quedamos con lo antes de la coma.
      const beforeComma = t.split(",")[0].trim();
      // Toma el último número al final de la cadena.
      const m = beforeComma.match(/^(.*?)(\d+[A-Za-z]?)\s*$/);
      if (!m) return { street: t, number: "" };
      return { street: (m[1] ?? "").trim(), number: (m[2] ?? "").trim() };
    }

    // Mantener inputs sincronizados si `deliveryLine1` se setea desde GPS / geocoding.
    useEffect(() => {
      if (isManualEditRef.current) {
        isManualEditRef.current = false;
        return;
      }
      const { street, number } = splitLine1IntoStreetAndNumber(deliveryLine1);
      queueMicrotask(() => {
        setStreetInput(street);
        setStreetNumberInput(number);
      });
    }, [deliveryLine1]);

    useEffect(() => {
      const wasOpen = cartWasOpenRef.current;
      cartWasOpenRef.current = isCartOpen;
      if (!isCartOpen || !mapAddressMode) return;
      if (wasOpen) return;
      const merged = [deliveryLine1.trim(), deliveryCommune.trim()]
        .filter(Boolean)
        .join(", ");
      queueMicrotask(() => setUnifiedAddressSearch(merged));
    }, [isCartOpen, mapAddressMode, deliveryLine1, deliveryCommune]);

    useEffect(() => {
      if (!isCartOpen) return;
      const t = window.setTimeout(() => {
        const v = unifiedAddressSearch.trim();
        setDebouncedLookup(v);
        // En modo distancia con campos separados (comuna/calle/número),
        // no volver a parsear el string unificado para evitar "pisar" inputs.
        // Caso típico: escribir solo "Ñuñoa" en comuna terminaba moviéndolo a calle.
        if (mapAddressMode && !SHOW_ADDRESS_SUGGESTIONS) {
          return;
        }
        const { line1, commune } = parseUnifiedAddressSearch(unifiedAddressSearch);
        setDeliveryLine1(line1);
        setDeliveryCommune(commune);
      }, TENANT_UI_CONFIG.cartAddressDebounceMs);
      return () => window.clearTimeout(t);
    }, [
      unifiedAddressSearch,
      isCartOpen,
      mapAddressMode,
      SHOW_ADDRESS_SUGGESTIONS,
      setDeliveryLine1,
      setDeliveryCommune,
    ]);

    useEffect(() => {
      const t = window.setTimeout(() => {
        setDebouncedDeliveryLine({
          line1: deliveryLine1.trim(),
          commune: deliveryCommune.trim(),
        });
      }, TENANT_UI_CONFIG.cartGeocodeDebounceMs);
      return () => clearTimeout(t);
    }, [deliveryLine1, deliveryCommune]);

    useEffect(() => {
      if (!mapAddressMode) return;
      const q = debouncedLookup.trim();
      if (q.length < 3) {
        const clearT = window.setTimeout(() => {
          setAddressHits([]);
          setAddressSearchConfigError(null);
          setAddressSearchLoading(false);
        }, 0);
        return () => clearTimeout(clearT);
      }
      let cancelled = false;
      const loadT = window.setTimeout(() => {
        if (!cancelled) setAddressSearchLoading(true);
      }, 0);
      const params = new URLSearchParams({ q });
      const { commune: hint } = parseUnifiedAddressSearch(q);
      if (hint.length >= 2) {
        params.set("communeHint", hint);
      }
      if (selectedBranch?.id) {
        params.set("branchId", selectedBranch.id);
      }
      if (selectedBranch?.origin_lat != null && selectedBranch?.origin_lng != null) {
        const olat = Number(selectedBranch.origin_lat);
        const olng = Number(selectedBranch.origin_lng);
        if (Number.isFinite(olat) && Number.isFinite(olng)) {
          params.set("nearLat", String(olat));
          params.set("nearLon", String(olng));
        }
      }
      fetch(`/api/geo/address-search?${params}`)
        .then(async (r) => {
          if (cancelled) return;
          const j = (await r.json().catch(() => ({}))) as {
            ok?: boolean;
            results?: AddressSearchHit[];
            code?: string;
          };
          if (r.status === 503) {
            setAddressSearchConfigError(
              t("delivery.searchUnavailable")
            );
            setAddressHits([]);
            return;
          }
          const results = Array.isArray(j.results) ? j.results : [];
          setAddressSearchConfigError(null);
          setAddressHits(results);

        })
        .catch(() => {
          if (!cancelled) {
            setAddressHits([]);
            setAddressSearchConfigError(null);
          }
        })
        .finally(() => {
          if (!cancelled) setAddressSearchLoading(false);
        });
      return () => {
        cancelled = true;
        clearTimeout(loadT);
      };
    }, [
      debouncedLookup,
      mapAddressMode,
      selectedBranch?.id,
      selectedBranch?.origin_lat,
      selectedBranch?.origin_lng,
      SHOW_ADDRESS_SUGGESTIONS,
      setDeliveryCoords,
      setShowDeliveryReference,
      t,
    ]);

    useEffect(() => {
      function onDoc(e: MouseEvent) {
        if (!addressHitsOpen) return;
        const el = addressSearchWrapRef.current;
        if (el && !el.contains(e.target as Node)) setAddressHitsOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [addressHitsOpen]);

    /** Si el cliente completa el número en calle/comuna, recalculamos coordenadas y el envío. */
    useEffect(() => {
      if (!mapAddressMode) return;
      if (fulfillment !== "delivery") return;
      if (Date.now() < suppressLineGeocodeUntilRef.current) return;

      const rawLine = debouncedDeliveryLine.line1;
      const rawCommune = debouncedDeliveryLine.commune;
      if (rawLine.length < 4 || rawCommune.length < 2) return;
      if (!/\d/.test(rawLine)) return;

      const q = [rawLine.trim(), rawCommune.trim()].filter(Boolean).join(", ");
      if (q.length < 4) return;

      let cancelled = false;
      const loadT = window.setTimeout(() => {
        if (!cancelled) setLineGeocodeLoading(true);
      }, 0);

      const params = new URLSearchParams({ q });
      if (rawCommune.length >= 2) {
        params.set("communeHint", rawCommune.trim());
      }
      if (selectedBranch?.id) {
        params.set("branchId", selectedBranch.id);
      }
      if (selectedBranch?.origin_lat != null && selectedBranch?.origin_lng != null) {
        const olat = Number(selectedBranch.origin_lat);
        const olng = Number(selectedBranch.origin_lng);
        if (Number.isFinite(olat) && Number.isFinite(olng)) {
          params.set("nearLat", String(olat));
          params.set("nearLon", String(olng));
        }
      }

      fetch(`/api/geo/address-search?${params}`)
        .then((r) => r.json())
        .then((j: { results?: AddressSearchHit[] }) => {
          if (cancelled) return;
          const first = Array.isArray(j.results) ? j.results[0] : undefined;
          if (!first) return;
          setDeliveryCoords(first.lat, first.lng);
          setDeliveryAddressPrecision(
            first.precision === "exact" ? "exact" : "approx"
          );
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) {
            window.setTimeout(() => setLineGeocodeLoading(false), 0);
          }
        });

      return () => {
        cancelled = true;
        clearTimeout(loadT);
      };
    }, [
      debouncedDeliveryLine,
      mapAddressMode,
      fulfillment,
      selectedBranch?.id,
      selectedBranch?.origin_lat,
      selectedBranch?.origin_lng,
      setDeliveryCoords,
    ]);

    const filteredCart = useMemo(
      () => mergeCartWithBranchPrices(cart, branchPriceRows, {
        omitLinesWithoutPriceWhenBranchHasData: true,
      }),
      [cart, branchPriceRows]
    );

    // Detectar productos eliminados al cambiar de sucursal
    // const [removedProducts, setRemovedProducts] = useState<string[]>([]);
    // useEffect(() => {
    //   // Buscar en localStorage si hay productos eliminados
    //   const storage = localStorage.getItem("tenant_cart_storage");
    //   if (storage) {
    //     try {
    //       const parsed = JSON.parse(storage);
    //       if (parsed.removedProducts && Array.isArray(parsed.removedProducts)) {
    //         setRemovedProducts(parsed.removedProducts);
    //         localStorage.removeItem("tenant_cart_storage_removed");
    //       }
    //     } catch {}
    //   }
    // }, [selectedBranch]);

  const [viewState, setViewState] = useState<CartModalViewState>({
    showPaymentInfo: false,
    showPaymentMethods: false,
    showForm: false,
    showSuccess: false,
    isSaving: false,
    error: null,
    receiptUploadFailed: false,
    lastOrderSuccess: null,
  });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setViewState((prev) => (prev.error ? { ...prev, error: null } : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cart, filteredCart.length, selectedBranch?.id]);

  const {
    checkoutSession,
    patchCheckoutSession,
    resetCheckoutSession,
    stepFlags,
    goBackCheckoutStep,
    dismissCart,
    paymentMethodKey,
    setPaymentMethodKey,
    activeEnhancePanel,
    setActiveEnhancePanel,
  } = useCartCheckoutFlow({
    isCartOpen,
    showSuccess: viewState.showSuccess,
  });

  const showPaymentInfo = stepFlags.showPaymentInfo;
  const showPaymentMethods = stepFlags.showPaymentMethods;
  const showForm = checkoutSession.showForm;

  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const fulfillmentScrollRef = useRef<HTMLDivElement | null>(null);
  const fulfillmentChoiceRef = useRef<HTMLDivElement | null>(null);
  const cartPanelRef = useRef<HTMLDivElement | null>(null);
  const wasCartOpenRef = useRef(false);
  const [orderRequestId, setOrderRequestId] = useState(() => crypto.randomUUID());

  useDismissKeyboardOnOutsideTap(cartPanelRef);

  useEffect(() => {
    if (!isCartOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = cartPanelRef.current;
    if (panel) {
      const prev = document.activeElement as HTMLElement | null;
      panel.focus();
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusable = panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      panel.addEventListener("keydown", handleTab);
      return () => {
        panel.removeEventListener("keydown", handleTab);
        document.body.style.overflow = prevOverflow;
        prev?.focus();
      };
    }
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isCartOpen]);

  useEffect(() => {
    if (!paymentMethodKey) return;
    if (checkoutPaymentMethods.length === 0) {
      queueMicrotask(() => setPaymentMethodKey(null));
      return;
    }
    if (!checkoutPaymentMethods.includes(paymentMethodKey)) {
      queueMicrotask(() => setPaymentMethodKey(null));
    }
  }, [paymentMethodKey, checkoutPaymentMethods, setPaymentMethodKey]);

  const selectedPaymentRequiresReceipt = useMemo(
    () => paymentMethodRequiresReceipt(
      paymentMethodKey,
      receiptRequiredMethods,
    ),
    [paymentMethodKey, receiptRequiredMethods],
  );

  const clientSchema = useMemo(() => {
    return buildCartClientSchema(
      {
        nameShort: t("validation.nameShort"),
        nameInvalid: t("validation.nameInvalid"),
        phoneShort: t("validation.phoneShort"),
        phoneLong: t("validation.phoneLong"),
        phoneInvalid: t("validation.phoneInvalid"),
      },
      {
        fulfillment: fulfillment === "delivery" ? "delivery" : "pickup",
        requiresReceipt: selectedPaymentRequiresReceipt,
        validateRut: strategy.validateId,
      }
    );
  }, [t, fulfillment, selectedPaymentRequiresReceipt, strategy]);

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: strategy.phonePrefix,
      rut: "",
      receiptFile: null,
      receiptPreview: undefined,
      fulfillment: fulfillment === "delivery" ? ("delivery" as const) : ("pickup" as const),
      delivery_address: {
        address: deliveryLine1,
        formatted_address: `${deliveryLine1}, ${deliveryCommune}`.trim(),
        reference: deliveryReference,
        lat: deliveryLat,
        lng: deliveryLng,
        namedAreaId: deliveryNamedAreaId,
      },
    },
  });
     // Prellenar datos desde localStorage solo en cliente
     useEffect(() => {
       if (typeof window !== "undefined") {
         const phone = localStorage.getItem("tenant_client_phone");
         const rut = localStorage.getItem("tenant_client_rut");
         if (phone) form.setValue("phone", phone);
         if (rut) form.setValue("rut", rut);
       }
     }, [form]);

  const { handleSubmit, setValue, getValues, control } = form;

  useEffect(() => {
    const phone = getValues("phone")?.trim() ?? "";
    const isUnsetOrLegacyDefault =
      !phone ||
      phone === "+56 9" ||
      phone === "+56 9 " ||
      phone === "+58" ||
      phone === "+58 ";
    if (isUnsetOrLegacyDefault) {
      setValue("phone", strategy.phonePrefix);
    }
  }, [effectiveCountryCode, getValues, setValue, strategy.phonePrefix]);

  useEffect(() => {
    const justOpened = isCartOpen && !wasCartOpenRef.current;
    wasCartOpenRef.current = isCartOpen;
    if (!justOpened) return;
    const draft = checkoutSession.clientDraft;
    if (draft.name.trim()) setValue("name", draft.name);
    if (draft.rut.trim()) setValue("rut", draft.rut);
    const phone = draft.phone.trim();
    if (phone && phone !== "+56 9" && phone !== "+56 9 " && phone !== "+58" && phone !== "+58 ") {
      setValue("phone", phone);
    }
  }, [checkoutSession.clientDraft, isCartOpen, setValue]);

  const formValues = useWatch({ control });

  // Sincronizar fulfillment y datos de delivery al form de react-hook-form
  useEffect(() => {
    setValue("fulfillment", fulfillment);
  }, [fulfillment, setValue]);

  useEffect(() => {
    setValue("delivery_address", {
      address: deliveryLine1,
      formatted_address: `${deliveryLine1}, ${deliveryCommune}`.trim(),
      reference: deliveryReference,
      lat: deliveryLat,
      lng: deliveryLng,
      namedAreaId: deliveryNamedAreaId,
    });
  }, [
    deliveryLine1,
    deliveryCommune,
    deliveryReference,
    deliveryLat,
    deliveryLng,
    deliveryNamedAreaId,
    setValue,
  ]);
    const [isShiftLoading, setIsShiftLoading] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(true);
  const selectedBranchId = selectedBranch?.id ?? null;

  useEffect(() => {
    if (!isCartOpen || !selectedBranchId) {
      Promise.resolve().then(() => {
        setIsShiftOpen(false);
        setIsShiftLoading(false);
      });
      return;
    }

    let cancelled = false;

    const checkShiftStatus = async () => {
      setIsShiftLoading(true);
      const { data, error } = await supabase
        .from("cash_shifts")
        .select("id")
        .eq("status", "open")
        .eq("branch_id", selectedBranchId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setIsShiftOpen(false);
        setIsShiftLoading(false);
        return;
      }

      setIsShiftOpen(Boolean(data));
      setIsShiftLoading(false);
    };

    Promise.resolve().then(() => {
      checkShiftStatus().catch(() => {
        if (!cancelled) {
          setIsShiftOpen(false);
          setIsShiftLoading(false);
        }
      });
    });

    const channel = supabase
      .channel(`cart-shift-realtime:${selectedBranchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_shifts",
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        () => {
          checkShiftStatus().catch(() => {
            if (!cancelled) setIsShiftOpen(false);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isCartOpen, selectedBranchId, supabase]);

  const isOrderIntakePaused = selectedBranchForCheckout?.order_intake_paused === true;
  const canCheckout =
    (requiresOpenShiftForCheckout(orderChannel) ? isShiftOpen : true) && !isOrderIntakePaused;
  const persistsToPanel = shouldPersistOrderToPanel(orderChannel);
  const opensWhatsApp = shouldOpenWhatsAppOnCheckout(orderChannel);
  const closedBusinessMessage = useMemo(
    () =>
      buildBusinessClosedCustomerMessage({
        businessName: businessInfo?.name,
        branchName: selectedBranch?.name,
        schedule: selectedBranch?.schedule ?? businessInfo?.schedule ?? null,
        timeZone:
          selectedBranch?.country === "VE" || selectedBranch?.country === "Venezuela"
            ? "America/Caracas"
            : "America/Santiago",
      }),
    [
      businessInfo?.name,
      businessInfo?.schedule,
      selectedBranch?.country,
      selectedBranch?.name,
      selectedBranch?.schedule,
    ],
  );

  const minOrder = deliverySettings.minOrderSubtotal ?? 0;
  const MIN_DRIVER_REFERENCE_LEN = 6;
  const meetsMinDelivery =
    fulfillment !== "delivery" || cartSubtotal + 1e-9 >= minOrder;
  const hasDeliveryCoords =
    deliveryLat != null &&
    deliveryLng != null &&
    Number.isFinite(deliveryLat) &&
    Number.isFinite(deliveryLng);
  const deliveryAddressOk =
    fulfillment !== "delivery" ||
    (deliveryLine1.trim().length >= 4 &&
      (deliveryCommune.trim().length >= 2 || hasDeliveryCoords));
  const deliveryReferenceOk =
    fulfillment !== "delivery" ||
    deliveryReference.trim().length >= MIN_DRIVER_REFERENCE_LEN;

  const namedManualOk =
    deliveryPriceMode !== "named" ||
    deliverySettings.namedAreaResolution !== "manual_select" ||
    Boolean(deliveryNamedAreaId?.trim());

  const addressMatchedOk =
    deliveryPriceMode !== "named" ||
    deliverySettings.namedAreaResolution !== "address_matched" ||
    (deliveryAddressOk &&
      !deliveryQuoteLoading &&
      !deliveryQuoteError &&
      deliveryNamedAreaLabel != null);

  function isValidCoordsForQuote() {
    const lat = deliveryLat;
    const lng = deliveryLng;
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    );
  }

  function kmManualValid() {
    const n = Number(String(deliveryKmManual).replace(",", "."));
    return Number.isFinite(n) && n >= 0;
  }

  const distanceReady =
    (deliveryPriceMode !== "distance" && deliveryPriceMode !== "external") ||
    (deliveryPriceMode === "external"
      ? !isDeliveryOutOfZone &&
        !deliveryQuoteError &&
        isValidCoordsForQuote() &&
        !deliveryQuoteLoading
      : !isDeliveryOutOfZone &&
        !deliveryQuoteError &&
        (isValidCoordsForQuote()
          ? !deliveryQuoteLoading
          : kmManualValid()));

  const requiresDeliveryAddress =
    mapAddressMode ||
    (deliveryPriceMode === "named" && deliverySettings.namedAreaResolution === "address_matched");

  const canProceedFulfillment =
    fulfillment !== "delivery" ||
    ((requiresDeliveryAddress ? deliveryAddressOk : true) &&
      meetsMinDelivery &&
      deliveryReferenceOk &&
      namedManualOk &&
      addressMatchedOk &&
      distanceReady);

  const fulfillmentErrorMessage =
    !canProceedFulfillment
      ? fulfillment === "delivery" && requiresDeliveryAddress && !deliveryAddressOk
        ? deliveryPriceMode === "external"
          ? t("delivery.needLocationForUber")
          : t("delivery.needLocationStreetOrKm")
        : fulfillment === "delivery" && mapAddressMode && !isValidCoordsForQuote()
        ? deliveryPriceMode === "external"
          ? t("delivery.needLocationForUber")
          : t("delivery.needLocationStreetOrKm")
        : fulfillment === "delivery" && !deliveryReferenceOk
        ? t("delivery.addDriverInstructionsMin", { min: MIN_DRIVER_REFERENCE_LEN })
        : isDeliveryOutOfZone
        ? t("delivery.locationOutsideArea")
        : !meetsMinDelivery
        ? t("delivery.minOrderForDelivery", { amount: formatCartMoney(minOrder, currency) })
        : deliveryQuoteLoading &&
          (deliveryPriceMode === "distance" || deliveryPriceMode === "external") &&
          isValidCoordsForQuote()
        ? t("delivery.calculatingWithLocation")
        : deliveryQuoteError
        ? deliveryQuoteError
        : t("delivery.completeDataToContinue")
      : null;

  const checkoutPhase = useMemo((): "summary" | "fulfillment" | "payment" => {
    if (!showPaymentInfo) return "summary";
    if (!showPaymentMethods) return "fulfillment";
    return "payment";
  }, [showPaymentInfo, showPaymentMethods]);

  const isDeliveryFulfillmentFocus =
    showPaymentInfo &&
    !showPaymentMethods &&
    fulfillment === "delivery" &&
    deliverySettings.enabled;

  const requestDeliveryGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoHint(t("delivery.geoNotAvailable"));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoHint(
        t("delivery.geoNeedsHttps")
      );
      return;
    }
    setGeoHint(t("delivery.searchingLocation"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDeliveryCoords(lat, lng);
        setDeliveryAddressPrecision("exact");
        setGeoHint(t("delivery.searchingAddress"));
        fetch(
          `/api/geo/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { line1?: string; commune?: string } | null) => {
            const l1 = data?.line1?.trim() ?? "";
            const com = data?.commune?.trim() ?? "";
            if (l1) setDeliveryLine1(l1);
            if (com) setDeliveryCommune(com);
            if (l1 || com) {
              setUnifiedAddressSearch([l1, com].filter(Boolean).join(", "));
            }
            suppressLineGeocodeUntilRef.current = Date.now() + 1200;
            setGeoHint(
              t("delivery.locationSavedReview")
            );
            setShowDeliveryReference(true);
          })
          .catch(() => {
            suppressLineGeocodeUntilRef.current = Date.now() + 1200;
            setGeoHint(
              t("delivery.locationSavedCompleteManually")
            );
            setShowDeliveryReference(true);
          });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoHint(
            t("delivery.permissionDenied")
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoHint(t("delivery.noSignal"));
        } else if (err.code === err.TIMEOUT) {
          setGeoHint(t("delivery.timeout"));
        } else {
          setGeoHint(t("delivery.cannotReadLocation"));
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [
    setDeliveryCoords,
    setDeliveryLine1,
    setDeliveryCommune,
    setShowDeliveryReference,
    setUnifiedAddressSearch,
    t,
  ]);

  const selectAddressSearchHit = useCallback(
    (hit: AddressSearchHit) => {
      suppressLineGeocodeUntilRef.current = Date.now() + 850;
      const { commune: userCommuneFromField } = parseUnifiedAddressSearch(
        unifiedAddressSearch,
      );
      const communeFromDetail = (): string => {
        const d = hit.detailLine?.trim();
        if (!d) return "";
        const parts = d.split(",").map((s) => s.trim());
        const first = parts[0] ?? "";
        if (/^región\b/i.test(first)) {
          return (parts[1] ?? "").slice(0, 120);
        }
        return first.length >= 2 ? first.slice(0, 120) : "";
      };
      const comFromHit = hit.commune?.trim() || communeFromDetail();
      const com =
        userCommuneFromField.trim().length >= 2
          ? userCommuneFromField.trim().slice(0, 120)
          : comFromHit;
      const pickStreetLineFromLabel = (label: string | undefined): string => {
        if (!label?.trim()) return "";
        const parts = label.split(",").map((s) => s.trim());
        for (const p of parts) {
          if (
            /\d/.test(p) &&
            /(av|avenida|calle|pasaje|vicuña|paseo|camino|n°|número)/i.test(p)
          ) {
            return p.slice(0, 200);
          }
        }
        for (const p of parts) {
          if (/\d/.test(p) && p.length >= 4) return p.slice(0, 200);
        }
        return "";
      };
      const userTypedDigits = /\d/.test(unifiedAddressSearch);
      let line1 =
        hit.line1?.trim() ||
        (hit.label?.split(",")[0]?.trim() ?? "").slice(0, 200);
      if (userTypedDigits && !/\d/.test(line1)) {
        const fromLabel = pickStreetLineFromLabel(hit.label);
        if (fromLabel) line1 = fromLabel;
      }
      setDeliveryCoords(hit.lat, hit.lng);
      setDeliveryLine1(line1);
      setDeliveryCommune(com);
      setUnifiedAddressSearch([line1, com].filter(Boolean).join(", "));
      setDeliveryKmManual("");
      setAddressHitsOpen(false);
      setDeliveryAddressPrecision(hit.precision === "exact" ? "exact" : "approx");
      setGeoHint(
        t("delivery.addressFoundReview")
      );
      setShowDeliveryReference(true);
    },
    [
      setDeliveryCoords,
      setDeliveryCommune,
      setDeliveryKmManual,
      setDeliveryLine1,
      setShowDeliveryReference,
      setUnifiedAddressSearch,
      unifiedAddressSearch,
      t,
    ]
  );

  const activeInfo = useMemo<ActiveSessionInfo>(() => {
    const info = businessInfo || {};
    if (!selectedBranch) return info;
    return {
      ...info,
      ...selectedBranch,
      name: selectedBranch.name || info.name,
      address: selectedBranch.address || info.address,
      phone: selectedBranch.phone || info.phone,
      bank_name: selectedBranch.bank_name || info.bank_name,
      account_type: selectedBranch.account_type || info.account_type,
      account_number: selectedBranch.account_number || info.account_number,
      account_rut: selectedBranch.account_rut || info.account_rut,
      account_email: selectedBranch.account_email || info.account_email,
      account_holder: selectedBranch.account_holder || info.account_holder,
    };
  }, [businessInfo, selectedBranch]);

  useEffect(() => {
    return () => {
      const receiptPreview = getValues("receiptPreview");
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [getValues]);

  const validation = useMemo(() => {
    const values = formValues; // CORRECTO: Usa los valores reactivos de watch()
    const isRutValid = strategy.validateId(values.rut || "");
    const isPhoneValid = strategy.validatePhone(values.phone || "");

    const nameValue = (values.name || "").trim();
    const namePattern = /^[\p{L} .'-]+$/u;
    const isNameValid = nameValue.length > 2 && namePattern.test(nameValue);
    const isReceiptValid = selectedPaymentRequiresReceipt ? !!values.receiptFile : true;

    return {
      rut: isRutValid,
      phone: isPhoneValid,
      name: isNameValid,
      receipt: isReceiptValid,
      isReady: isNameValid && isPhoneValid && isRutValid && isReceiptValid,
    };
  }, [formValues, selectedPaymentRequiresReceipt, strategy]); // CORRECTO: Depende de los valores reactivos

  // Usar setValue de react-hook-form para cambios
  const handleInputChange = useCallback((field: string, value: string) => {
    if (field === "rut") value = strategy.formatId ? strategy.formatId(value) : value;
    if (field === "phone") value = strategy.normalizePhone(value);
    setValue(field as keyof typeof clientSchema.shape, value);
    setViewState((prev) => ({ ...prev, error: null }));
    if (field === "name" || field === "phone" || field === "rut") {
      patchCheckoutSession?.({
        clientDraft: {
          ...checkoutSession.clientDraft,
          [field]: value,
        },
      });
    }
  }, [checkoutSession.clientDraft, patchCheckoutSession, setValue, clientSchema, strategy]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const preview = URL.createObjectURL(file);
        const { valid, error: validationError } = validateImageFile(file);
        if (!valid) {
          setViewState((prev) => ({
            ...prev,
            error: validationError || t("validation.invalidFile"),
          }));
          return;
        }
        setValue("receiptFile", file);
        setValue("receiptPreview", preview);
        setViewState((prev) => ({ ...prev, error: null }));
      }
    },
    [setValue, t]
  );

  const resetFlow = useCallback(() => {
    setViewState({
      showPaymentInfo: false,
      showPaymentMethods: false,
      showForm: false,
      showSuccess: false,
      isSaving: false,
      error: null,
      receiptUploadFailed: false,
      lastOrderSuccess: null,
    });
    resetCheckoutSession?.();
    setValue("name", "");
    setValue("phone", strategy.phonePrefix);
    setValue("rut", "");
    setValue("receiptFile", null);
    setValue("receiptPreview", undefined);
    setShowFieldErrors(false);
  }, [resetCheckoutSession, setValue, strategy.phonePrefix]);

  const handleCloseCart = useCallback(() => {
    dismissCart();
  }, [dismissCart]);

  const triggerHaptic = useCallback((duration = 8) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  }, []);

  const handleFulfillmentChange = useCallback(
    (next: CartFulfillment) => {
      if (fulfillment === next) return;
      const scroller = fulfillmentScrollRef.current;
      const choice = fulfillmentChoiceRef.current;
      const prevScrollTop = scroller?.scrollTop ?? 0;
      const prevChoiceTop = choice?.getBoundingClientRect().top ?? 0;
      setFulfillment(next);
      requestAnimationFrame(() => {
        if (!scroller) return;
        const nextChoiceTop = choice?.getBoundingClientRect().top ?? prevChoiceTop;
        const delta = nextChoiceTop - prevChoiceTop;
        scroller.scrollTop = Math.max(0, prevScrollTop + delta);
      });
    },
    [fulfillment, setFulfillment],
  );

  // Nota: se eliminó el swipe/drag de cierre del carrito.

  const toggleGlobalExtra = useCallback(
    (extra: { id: string; name: string; price: number }) => {
      const current = Array.isArray(globalExtras) ? globalExtras : [];
      const exists = current.some((x) => x.id === extra.id);
      if (exists) {
        setGlobalExtras(current.filter((x) => x.id !== extra.id));
      } else {
        setGlobalExtras([
          ...current,
          { id: extra.id, name: extra.name, price: extra.price, qty: 1 },
        ]);
      }
    },
    [globalExtras, setGlobalExtras],
  );

  const addUpsellBeverage = useCallback(
    (bev: { id: string; name: string; price: number }) => {
      addToCart(
        {
          id: `upsell_beverage_${bev.id}`,
          name: bev.name,
          description: t("catalog.suggestedDrink"),
          image_url: null,
          price: bev.price,
          has_discount: false,
          discount_price: null,
          is_active: true,
        },
        {
          selectedBeverages: [{ id: bev.id, name: bev.name, price: bev.price, qty: 1 }],
        },
      );
    },
    [addToCart, t],
  );

  const handleSendOrder = handleSubmit(async (data) => {
    // ...existing code...
    if (!canCheckout) {
      const msg = isOrderIntakePaused
        ? (selectedBranchForCheckout?.order_intake_pause_message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos.")
        : !isShiftOpen
          ? closedBusinessMessage
          : businessInfo?.schedule
            ? `Nuestro horario es: ${businessInfo.schedule}`
            : t("errors.noOrdersNow");
      // ...existing code...
      setViewState((v) => ({ ...v, isSaving: false, error: msg }));
      return;
    }
    if (viewState.isSaving) {
      // ...existing code...
      return;
    }
    if (!selectedBranch?.id) {
      // ...existing code...
      setViewState((prev) => ({
        ...prev,
        error: t("errors.noBranchSelected"),
      }));
      return;
    }
    if (fulfillment === "delivery" && deliverySettings.enabled && !canProceedFulfillment) {
      setViewState((v) => ({
        ...v,
        isSaving: false,
        error: fulfillmentErrorMessage || t("errors.completeDeliveryOrMin"),
      }));
      return;
    }
    if (
      paymentMethodKey &&
      fulfillment === "delivery" &&
      deliverySettings.enabled &&
      !isOrderPaymentAllowedForDelivery(paymentMethodKey, deliverySettings)
    ) {
      setViewState((v) => ({
        ...v,
        isSaving: false,
        error:
          t("errors.paymentNotAllowedForDelivery"),
      }));
      return;
    }
    setViewState((v) => ({ ...v, isSaving: true, error: null }));
    try {
      const omittedLines = cart.length - filteredCart.length;
      if (omittedLines > 0) {
        setViewState((v) => ({
          ...v,
          isSaving: false,
          error:
            omittedLines === 1
              ? t("errors.oneProductUnavailableInBranch")
              : t("errors.productsUnavailableInBranch", { count: omittedLines }),
        }));
        return;
      }

      // Usar `filteredCart` (ya tiene precios/activos validados contra la sucursal).
      // Evita errores `invalid_item_price` / productos no disponibles al RPC.
      const itemsForOrder = (filteredCart as CartLineItem[]).map((item) => {
        const selectedExtras = (item.selected_extras ?? [])
          .map((ex) => ({
            id: String(ex.id),
            name: String(ex.name),
            price: Math.max(0, Number(ex.price) || 0),
            qty: Math.max(1, Number(ex.qty) || 1),
          }))
          .filter((ex) => ex.id);
        const selectedBeverages = (
          isUpsellBeverageLineId(item.id) ? [] : (item.selected_beverages ?? [])
        )
          .map((bev) => ({
            id: String(bev.id),
            name: String(bev.name),
            price: Math.max(0, Number(bev.price) || 0),
            qty: Math.max(1, Number(bev.qty) || 1),
          }))
          .filter((bev) => bev.id);
        const extrasTotal = [...selectedExtras, ...selectedBeverages].reduce(
          (sum, x) => sum + x.price * x.qty,
          0,
        );
        const extrasDesc = [
          selectedExtras.length
            ? `Extras: ${selectedExtras.map((x) => `${x.qty}x ${x.name}`).join(", ")}`
            : "",
          selectedBeverages.length
            ? `Bebidas: ${selectedBeverages.map((x) => `${x.qty}x ${x.name}`).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");
        const notePart = item.line_note?.trim()
          ? `Nota: ${sanitizeUserText(item.line_note.trim())}`
          : "";
        const fullDesc = [item.description ?? "", item.line_summary ?? "", extrasDesc, notePart]
          .filter(Boolean)
          .join(" | ");
        return {
          id: item.id,
          name: String(item.name ?? ""),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          has_discount: Boolean(item.has_discount),
          discount_price: item.has_discount && item.discount_price != null ? Number(item.discount_price) : null,
          description: fullDesc ? sanitizeUserText(fullDesc) : null,
          extras_total: Math.round(extrasTotal),
          extras: [...selectedExtras, ...selectedBeverages],
          custom_item: String(item.id ?? "").startsWith("upsell_beverage_"),
        };
      });
      const globalExtrasLines = (globalExtras ?? []).map((ex, idx) => ({
        id: `global_extra_${idx}_${ex.id}`,
        name: String(ex.name ?? t("catalog.globalExtra")),
        quantity: Math.max(1, Number(ex.qty) || 1),
        price: Math.max(0, Number(ex.price) || 0),
        has_discount: false,
        discount_price: null,
        description: t("catalog.globalExtraDescription"),
        extras_total: 0,
        extras: [],
        custom_item: true,
      }));
      const mergedItemsForOrder = [...itemsForOrder, ...globalExtrasLines];
      const snapFulfillment = fulfillment;
      const snapSubtotal = cartSubtotal;
      const snapFee =
        snapFulfillment === "delivery" && deliverySettings.enabled ? deliveryFee : 0;
      const snapGrand = grandTotal;
      const addrFull = `${deliveryLine1}, ${deliveryCommune}`.trim();
      const kmForOrder =
        snapFulfillment === "delivery" &&
        deliverySettings.enabled &&
        deliveryPriceMode === "distance"
          ? quotedRouteKm != null && Number(quotedRouteKm) > 0
            ? Math.round(Number(quotedRouteKm))
            : Math.round(Number(String(deliveryKmManual).replace(",", ".")) || 0)
          : 0;
      const deliverySnapshot =
        snapFulfillment === "delivery" && deliverySettings.enabled
          ? {
              address: sanitizeUserText(addrFull),
              formatted_address: sanitizeUserText(addrFull),
              line1: sanitizeUserText(deliveryLine1),
              commune: sanitizeUserText(deliveryCommune),
              ...(deliveryReference.trim()
                ? { reference: sanitizeUserText(deliveryReference) }
                : {}),
              lat: deliveryLat,
              lng: deliveryLng,
              ...(deliveryNamedAreaId?.trim()
                ? { named_area_id: deliveryNamedAreaId.trim() }
                : {}),
              ...(deliveryNamedAreaLabel
                ? { named_area_label: deliveryNamedAreaLabel }
                : {}),
            }
          : null;
      const lineNotesBlock = (filteredCart as CartLineItem[])
        .filter((line) => line.line_note?.trim())
        .map((line) => `${line.name}: ${sanitizeUserText(line.line_note!.trim())}`)
        .join("\n");
      const orderPayload = {
        client_request_id: orderRequestId,
        client_name: sanitizeUserText(data.name),
        client_phone: String(data.phone ?? "").trim(),
        client_rut: String(data.rut ?? "").trim(),
        payment_method_specific: paymentMethodKey,
        total: Number(snapGrand) || 0,
        items: mergedItemsForOrder,
        note: lineNotesBlock,
        status: "pending",
        receiptFile: data.receiptFile,
        branch_id: selectedBranch.id,
        branch_name: selectedBranch.name || t("common.unknown"),
        company_id: selectedBranch.company_id || null,
        currency: selectedBranch.currency || currency || null,
        requires_receipt: selectedPaymentRequiresReceipt,
        order_type:
          snapFulfillment === "delivery" && deliverySettings.enabled
            ? ("delivery" as const)
            : ("pickup" as const),
        delivery_address: deliverySnapshot,
        delivery_fee: snapFee,
        delivery_km: kmForOrder,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_named_area_id: deliveryNamedAreaId?.trim() || null,
        uber_quote_id: uberQuoteId || null,
        coupon_code: appliedCouponCode?.trim() ? appliedCouponCode.trim() : null,
      };
      let parsed: ReturnType<typeof parseOrderRpcPayload> = null;
      let receiptUploadFailed = false;
      let paymentStatus: string | null = null;
      let evidenceStatus: string | null = null;
      if (persistsToPanel) {
        const submitResult = await submitOrderMutation.mutateAsync({
          orderData: orderPayload,
          receiptFile: data.receiptFile ?? null,
        });
        parsed = parseOrderRpcPayload(submitResult.order);
        receiptUploadFailed = submitResult.receiptUploadFailed ?? false;
        paymentStatus = submitResult.paymentStatus ?? null;
        evidenceStatus = submitResult.evidenceStatus ?? null;
        setOrderRequestId(crypto.randomUUID());
      }
      setViewState((v) => ({
        ...v,
        showSuccess: true,
        isSaving: false,
        receiptUploadFailed: receiptUploadFailed ?? false,
        lastOrderSuccess: parsed
          ? { ...parsed, fulfillment: snapFulfillment, paymentStatus, evidenceStatus }
          : {
              id: 0,
              order_number: null,
              handoff_code: null,
              fulfillment: snapFulfillment,
              paymentStatus,
              evidenceStatus,
            },
      }));
      setShowFieldErrors(false);
      const deliverySummary =
        snapFulfillment === "delivery" && deliverySnapshot
          ? `${t("delivery.addressLabel")}: ${deliverySnapshot.line1}, ${deliverySnapshot.commune}`
          : undefined;
      const finalizeCheckout = () => {
        if (opensWhatsApp) {
          const paymentData = paymentMethodKey
            ? (activeInfo as Record<string, unknown>)[paymentMethodKey]
            : undefined;
          const wsCart = cart.map((line) => {
            const lineNote = line.line_note?.trim();
            const noteInDesc = lineNote ? `Nota: ${lineNote}` : "";
            const mergedDesc = [line.description, noteInDesc].filter(Boolean).join(" | ");
            return { ...line, description: mergedDesc || line.description };
          });
          const wsLineNotes = cart
            .filter((line) => line.line_note?.trim())
            .map((line) => `${line.name}: ${line.line_note!.trim()}`)
            .join("\n");
          const message = generateWSMessage(
            data,
            wsCart,
            snapGrand,
            paymentMethodKey,
            wsLineNotes,
            activeInfo.name,
            paymentData,
            {
              fulfillment: snapFulfillment,
              cartSubtotal: snapSubtotal,
              deliveryFee: snapFee,
              grandTotal: snapGrand,
              deliverySummary,
              orderId: parsed?.id ?? null,
              orderNumber: parsed?.order_number ?? null,
              handoffCode: parsed?.handoff_code ?? null,
              couponCode: appliedCouponCode?.trim() ? appliedCouponCode.trim() : null,
              couponDiscount:
                appliedCouponDiscount > 0 ? appliedCouponDiscount : undefined,
              currency: currency,
              localCurrency: currency === "USD" ? "VES" : "USD",
              localTotal: localTotal,
              country: effectiveCountryCode,
              exchangeRate: exchangeRate ?? null,
              paymentMethodKey,
            },
            {
              titlePrefix: t("ws.titlePrefix"),
              businessFallback: t("ws.businessFallback"),
              customer: t("ws.customer"),
              rut: strategy.idName,
              phone: t("ws.phone"),
              typeLabel: t("ws.typeLabel"),
              typeDelivery: t("ws.typeDelivery"),
              typePickup: t("ws.typePickup"),
              shipping: t("ws.shipping"),
              subtotalProducts: t("ws.subtotalProducts"),
              orderNumber: t("ws.orderNumber"),
              orderId: t("ws.orderId"),
              handoffCode: t("ws.handoffCode"),
              detail: t("ws.detail"),
              doLabel: t("ws.doLabel"),
              total: t("ws.total"),
              couponLabel: t("ws.couponLabel"),
              payment: t("ws.payment"),
              paymentUnknown: t("paymentMethods.unknown"),
              bankTransferTitle: t("ws.bankTransferTitle"),
              bank: t("ws.bank"),
              accountType: t("ws.accountType"),
              account: t("ws.account"),
              holder: t("ws.holder"),
              bankTransferHint: t("ws.bankTransferHint"),
              note: t("ws.note"),
            },
            resolvePaymentMethodLabel(paymentMethodKey, t),
          );
          const rawPhone = (activeInfo.phone || "").replace(/\D/g, "");
          if (!rawPhone) {
            setViewState((v) => ({
              ...v,
              isSaving: false,
              error: t("errors.whatsappNotConfigured"),
            }));
            return;
          }
          window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`, "_blank");
        }
        clearCart();
      };
      if (opensWhatsApp) {
        setTimeout(finalizeCheckout, 1500);
      } else {
        finalizeCheckout();
      }
    } catch (error: unknown) {
      const errorRecord = (error ?? {}) as Record<string, unknown>;
      const message = String(errorRecord.message || t("errors.processOrderTryAgain"));
      setViewState((v) => ({ ...v, isSaving: false, error: message }));
    }
  });

  const showBeveragesUpsell = beveragesUpsellEnabledByBranch && enhancementCatalogs.beverages.length > 0;
  const showExtrasUpsell = extrasEnabledByBranch && enhancementCatalogs.globalExtras.length > 0;
  const showCouponRail = Boolean(selectedBranchId);

  const enhanceTabCount =
    (showBeveragesUpsell ? 1 : 0) + (showExtrasUpsell ? 1 : 0) + (showCouponRail ? 1 : 0);

  const enhanceGroupAriaLabel = useMemo(() => {
    const parts: string[] = [];
    if (showBeveragesUpsell) parts.push(t("catalog.drinksForOrder"));
    if (showExtrasUpsell) parts.push(t("catalog.globalExtrasForOrder"));
    if (showCouponRail) parts.push(t("coupon.segLabel"));
    return parts.length > 0 ? parts.join(", ") : t("catalog.addDrinksOrExtras");
  }, [showBeveragesUpsell, showExtrasUpsell, showCouponRail, t]);





  if (!mounted || !isCartOpen) return null;

  if (viewState.showSuccess) {
    return (
      <div className="modal-overlay cart-overlay" onClick={handleCloseCart}>
        <div
          ref={cartPanelRef}
          className="cart-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t("success.sentAria")}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="cart-header">
            <h3>{t("success.sentTitle")}</h3>
            <button onClick={handleCloseCart} className="btn-close-cart" aria-label={t("actions.close")}><X size={20} /></button>
          </header>
          <CartSuccessView
            onNewOrder={resetFlow}
            onGoHome={handleCloseCart}
            receiptUploadFailed={viewState.receiptUploadFailed}
            activeInfo={activeInfo}
            lastOrder={viewState.lastOrderSuccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className="modal-overlay cart-overlay"
      onClick={handleCloseCart}
    >
      <div
        ref={cartPanelRef}
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("dialog.currentOrderAria")}
        tabIndex={-1}
        data-checkout-phase={checkoutPhase}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cart-header">
          <div className="cart-header-main">
            <div className="cart-header-title-row">
              <h3>{t("header.title")}</h3>
              <span className="cart-count-badge">{mounted ? filteredCart.length : 0}</span>
            </div>
            {selectedBranch ? (
              <div className="cart-branch-row">
                <MapPin size={13} className="cart-branch-icon" aria-hidden />
                <span className="cart-branch-name">{selectedBranch.name}</span>
              </div>
            ) : null}
          </div>
          <button onClick={handleCloseCart} className="btn-close-cart" aria-label={t("actions.close")}><X size={20} /></button>
        </header>

        {isOrderIntakePaused && (
          <div className="cart-error-banner animate-fade" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", borderBottom: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {selectedBranchForCheckout?.order_intake_pause_message || "Tenemos mucha demanda por el momento. Vuelve a intentar en unos minutos."}
            </span>
          </div>
        )}

        {viewState.error ? (
          <div className="cart-error-banner animate-fade">
            <AlertCircle size={16} /> {viewState.error}
          </div>
        ) : null}

        <div
          className={`cart-body cart-checkout-phase--${checkoutPhase}${
            isDeliveryFulfillmentFocus ? " cart-body--delivery-step" : ""
          }`}
        >
          {filteredCart.length === 0 ? (
            <CartEmptyState onMenu={handleCloseCart} />
          ) : (
            <>
              {!isDeliveryFulfillmentFocus ? (
                <>
              <div className="cart-items-list">
                {(filteredCart as CartLineItem[]).map((item) => (
                  <CartItemRow
                    key={item.lineId ?? item.id}
                    item={item}
                    unitPrice={getPrice(item)}
                    onRemove={removeFromCart}
                    onAdd={addToCart}
                    onDecrease={decreaseQuantity}
                    onLineNoteChange={setLineNote}
                  />
                ))}
              </div>
                </>
              ) : null}
            </>
          )}
        </div>

        {filteredCart.length > 0 ? (
          <>
            {!showPaymentInfo &&
            !showPaymentMethods &&
            !showForm &&
            (showBeveragesUpsell || showExtrasUpsell || showCouponRail) ? (
              <div className="cart-footer-enhance-container">
                <div
                  className={`cart-footer-enhance-rail${
                    enhanceTabCount === 1 ? " cart-footer-enhance-rail--single" : ""
                  }`}
                >
                <div
                  className={`cart-footer-enhance-expand${
                    activeEnhancePanel !== "none" ? " is-open" : ""
                  }`}
                  aria-hidden={activeEnhancePanel === "none"}
                >
                  <div className="cart-footer-enhance-scroll" key={activeEnhancePanel}>
                    {activeEnhancePanel === "coupon" ? (
                      <CartCouponFields
                        variant="panel"
                        branchId={selectedBranchId}
                        cartSubtotal={cartSubtotal}
                        currency={currency}
                        clientPhone={formValues.phone || ""}
                      />
                    ) : (
                    <div className="cart-enhance-panel glass cart-enhance-panel--in-footer">
                      {activeEnhancePanel === "beverages" ? (
                        <div className="cart-enhance-grid cart-enhance-grid--tiles">
                          {enhancementCatalogs.beverages.map((bev) => (
                            <div
                              key={bev.id}
                              className="cart-enhance-tile cart-enhance-tile--drink"
                            >
                              <button
                                type="button"
                                className="cart-enhance-tile-body"
                                onClick={() => addUpsellBeverage(bev)}
                              >
                                <CartEnhanceCatalogGlyph
                                  key={`${bev.id}-${bev.image_url ?? ""}`}
                                  imageUrl={bev.image_url}
                                  fallbackSrc={ENHANCE_CATALOG_BEVERAGE_FALLBACK}
                                />
                                <span className="cart-enhance-tile-main">
                                  <span className="cart-enhance-tile-title">{bev.name}</span>
                                  <span className="cart-enhance-tile-sub">
                                    {formatCartMoney(bev.price, currency)}
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                className="cart-enhance-tile-plus"
                                onClick={() => addUpsellBeverage(bev)}
                                aria-label={`Agregar ${bev.name}`}
                              >
                                <Plus size={18} strokeWidth={2.5} aria-hidden />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : activeEnhancePanel === "extras" ? (
                        <div className="cart-enhance-grid cart-enhance-grid--tiles">
                          {enhancementCatalogs.globalExtras.map((extra) => {
                            const active = (globalExtras ?? []).some((x) => x.id === extra.id);
                            return (
                              <div
                                key={extra.id}
                                className={`cart-enhance-tile cart-enhance-tile--extra${
                                  active ? " is-selected" : ""
                                }`}
                              >
                                <button
                                  type="button"
                                  className="cart-enhance-tile-body"
                                  onClick={() => toggleGlobalExtra(extra)}
                                >
                                  <CartEnhanceCatalogGlyph
                                    key={`${extra.id}-${extra.image_url ?? ""}`}
                                    imageUrl={extra.image_url}
                                    fallbackSrc={ENHANCE_CATALOG_EXTRA_FALLBACK}
                                  />
                                  <span className="cart-enhance-tile-main">
                                    <span className="cart-enhance-tile-title">{extra.name}</span>
                                    <span className="cart-enhance-tile-sub">
                                      {active ? (
                                        <span className="cart-enhance-tile-pill">{t("catalog.inYourOrder")}</span>
                                      ) : (
                                        formatCartMoney(extra.price, currency)
                                      )}
                                    </span>
                                  </span>
                                </button>
                                {active ? (
                                  <span className="cart-enhance-tile-check" aria-hidden>
                                    <Check size={18} strokeWidth={2.5} />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="cart-enhance-tile-plus"
                                    onClick={() => toggleGlobalExtra(extra)}
                                    aria-label={`Agregar ${extra.name}`}
                                  >
                                    <Plus size={18} strokeWidth={2.5} aria-hidden />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    )}
                  </div>
                </div>
                <div className="cart-enhance-segmented-wrap">
                  <div
                    className={`cart-enhance-segmented${
                      enhanceTabCount === 1 ? " cart-enhance-segmented--single" : ""
                    }`}
                    role="group"
                    aria-label={enhanceGroupAriaLabel}
                  >
                    {showBeveragesUpsell ? (
                      <button
                        type="button"
                        className={`cart-enhance-seg ${
                          activeEnhancePanel === "beverages" ? "is-active" : ""
                        }`}
                        onClick={() => {
                          triggerHaptic();
                          setActiveEnhancePanel(
                            activeEnhancePanel === "beverages" ? "none" : "beverages",
                          );
                        }}
                      >
                        <CupSoda size={17} aria-hidden />
                        <span>Bebidas</span>
                      </button>
                    ) : null}
                    {showExtrasUpsell ? (
                      <button
                        type="button"
                        className={`cart-enhance-seg ${
                          activeEnhancePanel === "extras" ? "is-active" : ""
                        }`}
                        onClick={() => {
                          triggerHaptic();
                          setActiveEnhancePanel(
                            activeEnhancePanel === "extras" ? "none" : "extras",
                          );
                        }}
                      >
                        <Sparkles size={17} aria-hidden />
                        <span>Extras</span>
                      </button>
                    ) : null}
                    {showCouponRail ? (
                      <button
                        type="button"
                        className={`cart-enhance-seg ${
                          activeEnhancePanel === "coupon" || appliedCouponCode ? "is-active" : ""
                        }`}
                        onClick={() => {
                          triggerHaptic();
                          setActiveEnhancePanel(
                            activeEnhancePanel === "coupon" ? "none" : "coupon",
                          );
                        }}
                      >
                        <Ticket size={17} aria-hidden />
                        <span>{t("coupon.segLabel")}</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                </div>
              </div>
            ) : null}
            <div className="cart-footer-stack cart-footer-stack--solo">
            <footer
              className={`cart-footer cart-footer--sheet${
                showPaymentInfo
                  ? " cart-footer--checkout-fulfillment"
                  : ""
              }`}
            >
            <div
              key={showPaymentInfo ? "checkout" : "summary"}
              className="cart-footer-pane"
            >
            {!showPaymentInfo ? (
              <>
                 <div className="total-row">
                  <span>{t("summary.subtotal")}</span>
                  <div style={{ textAlign: "right" }}>
                    <span>{formatCartMoney(cartSubtotal, currency)}</span>
                    {exchangeRate != null && exchangeRate > 0 && (
                      <span style={{ display: "block", fontSize: "0.78rem", opacity: 0.6 }}>
                        ({formatCartMoney(cartSubtotal * exchangeRate, currency === "USD" ? "VES" : "USD")})
                      </span>
                    )}
                  </div>
                </div>
                {appliedCouponDiscount > 0 ? (
                  <div className="total-row total-row-discount">
                    <span>{t("summary.discount")}</span>
                    <div style={{ textAlign: "right" }}>
                      <span>-{formatCartMoney(appliedCouponDiscount, currency)}</span>
                      {exchangeRate != null && exchangeRate > 0 && (
                        <span style={{ display: "block", fontSize: "0.78rem", opacity: 0.6 }}>
                          (-{formatCartMoney(appliedCouponDiscount * exchangeRate, currency === "USD" ? "VES" : "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
                {fulfillment === "delivery" && deliverySettings.enabled ? (
                  <div className="total-row total-row-delivery">
                    <span>{t("summary.shipping")}</span>
                    <div style={{ textAlign: "right" }}>
                      <span>
                        {deliveryWaivedFree
                          ? t("summary.free")
                          : isDeliveryOutOfZone
                            ? "—"
                            : !deliveryShowNumericFee && deliveryExternalHintText
                              ? deliveryExternalHintText
                              : formatCartMoney(deliveryFee, currency)}
                      </span>
                      {!deliveryWaivedFree && !isDeliveryOutOfZone && (deliveryShowNumericFee || !deliveryExternalHintText) && exchangeRate != null && exchangeRate > 0 && (
                        <span style={{ display: "block", fontSize: "0.78rem", opacity: 0.6 }}>
                          ({formatCartMoney(deliveryFee * exchangeRate, currency === "USD" ? "VES" : "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
                {taxTotal > 0 && (
                  <div className="total-row total-row-tax">
                    <span>
                      Impuesto (IVA)
                      {deliverySettings.taxRate ? ` (${deliverySettings.taxRate}%)` : ""}
                      {deliverySettings.taxIncluded ? " (Incluido)" : " (Adicional)"}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <span>{formatCartMoney(taxTotal, currency)}</span>
                      {exchangeRate != null && exchangeRate > 0 && (
                        <span style={{ display: "block", fontSize: "0.78rem", opacity: 0.6 }}>
                          ({formatCartMoney(taxTotal * exchangeRate, currency === "USD" ? "VES" : "USD")})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="total-row total-row-grand">
                  <span>{t("summary.total")}</span>
                  <div style={{ textAlign: "right" }}>
                    <span className="total-price" style={{ display: "block" }}>{formatCartMoney(grandTotal, currency)}</span>
                    {localTotal != null && localTotal > 0 && (
                      <span className="total-price-local" style={{ display: "block", fontSize: "0.85rem", opacity: 0.7, marginTop: "2px" }}>
                        ({formatCartMoney(localTotal, currency === "USD" ? "VES" : "USD")})
                      </span>
                    )}
                  </div>
                </div>

                {isShiftLoading ? (
                  <button className="btn btn-primary btn-block btn-lg" disabled>
                    {t("actions.loading")}
                  </button>
                ) : isOrderIntakePaused ? (
                  <button className="btn btn-primary btn-block btn-lg" disabled>
                    Pedidos pausados
                  </button>
                ) : requiresOpenShiftForCheckout(orderChannel) && !isShiftOpen ? (
                  <div className="cash-closed-banner">
                    <AlertCircle size={16} />
                    <span>{closedBusinessMessage}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic(12);
                      setActiveEnhancePanel("none");
                      patchCheckoutSession?.({
                        showPaymentInfo: true,
                        showPaymentMethods: false,
                        showForm: false,
                      });
                    }}
                    className="btn btn-primary btn-block btn-lg"
                  >
                    {t("actions.goToPay")}
                  </button>
                )}
              </>
            ) : !showPaymentMethods ? (
              <>
                <div className="cart-footer-fulfillment-expand">
                  <div className="cart-footer-fulfillment-scroll" ref={fulfillmentScrollRef}>
                    {deliverySettings.enabled ? (
                      <div
                        className={`cart-fulfillment-block cart-fulfillment-block--in-footer ${
                          isDeliveryFulfillmentFocus
                            ? "cart-fulfillment-block--focus"
                            : "glass"
                        } ${fulfillment === "delivery" ? "cart-fulfillment-block--delivery-open" : ""}`}
                      >
                      <div className="cart-fulfillment-title">{t("delivery.howReceiveOrder")}</div>
                      <p className="cart-fulfillment-subtitle">
                        {t("delivery.fulfillmentSubtitle")}
                      </p>
                      <div className="cart-fulfillment-choice" ref={fulfillmentChoiceRef}>
                        <button
                          type="button"
                          className={`cart-fulfill-option ${fulfillment === "pickup" ? "is-active" : ""}`}
                          onClick={() => handleFulfillmentChange("pickup")}
                        >
                          <Store size={18} />
                          {t("delivery.pickup")}
                        </button>
                        <button
                          type="button"
                          className={`cart-fulfill-option ${fulfillment === "delivery" ? "is-active" : ""}`}
                          onClick={() => handleFulfillmentChange("delivery")}
                        >
                          <Truck size={18} />
                          {t("delivery.delivery")}
                        </button>
                      </div>
                      {fulfillment === "delivery" && deliverySettings.enabled ? (
                        <div className="cart-delivery-fields">
                          {deliverySettings.customerNotes ? (
                            <p className="cart-delivery-note">{deliverySettings.customerNotes}</p>
                          ) : null}

                          {deliveryPriceMode === "named" &&
                          deliverySettings.namedAreaResolution === "manual_select" ? (
                            <>
                              <label className="cart-field-label" id="cart-named-area-label">
                                {t("delivery.zoneLabel")}
                              </label>
                              <CartNamedAreaSelect
                                areas={deliverySettings.namedAreas}
                                value={deliveryNamedAreaId}
                                formatMoney={formatCartMoney}
                                currency={currency}
                                onPick={(id) => {
                                  setDeliveryNamedAreaId(id);
                                  if (id) {
                                    const area = deliverySettings.namedAreas.find((a) => a.id === id);
                                    if (area?.name) setDeliveryCommune(area.name);
                                  }
                                }}
                              />
                            </>
                          ) : null}

                          {deliveryPriceMode === "named" &&
                          deliverySettings.namedAreaResolution === "address_matched" ? (
                            <p className="cart-delivery-note">
                              {t("delivery.writeStreetNumberCommune")}
                            </p>
                          ) : null}

                          {mapAddressMode ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-block cart-geo-btn"
                                onClick={requestDeliveryGeo}
                              >
                                <MapPin size={17} aria-hidden />
                                <span className="cart-geo-btn-copy">{t("delivery.useCurrentLocation")}</span>
                              </button>
                              <p className="cart-geo-helper">
                                {t("delivery.preciseShippingHint")}
                              </p>
                              {geoHint ? <p className="cart-geo-hint">{geoHint}</p> : null}
                              <p className="cart-delivery-note">
                                {t("delivery.fullAddressHint")}
                              </p>
                              {deliveryAddressPrecision === "approx" ? (
                                <p className="cart-fulfillment-warn">
                                  {t("delivery.approxHintPrefix")} <strong>{t("delivery.useMyLocationStrong")}</strong>.
                                </p>
                              ) : null}
                            </>
                          ) : null}

                          <div
                            className={
                              mapAddressMode
                                ? "cart-address-search-wrap"
                                : undefined
                            }
                            ref={
                              mapAddressMode
                                ? addressSearchWrapRef
                                : undefined
                            }
                          >
                            {mapAddressMode ? (
                              <>
                              <label
                                className="cart-field-label"
                                htmlFor="cart-delivery-commune"
                              >
                                {t("delivery.communeOrCity")}
                              </label>
                              <input
                                id="cart-delivery-commune"
                                className="form-input"
                                value={deliveryCommune}
                                onChange={(e) => {
                                  isManualEditRef.current = true;
                                  suppressLineGeocodeUntilRef.current = 0;
                                  const nextCommune = e.target.value;
                                  setDeliveryCommune(nextCommune);
                                  setDeliveryAddressPrecision(null);
                                  const streetPart = [
                                    streetInput.trim(),
                                    streetNumberInput.trim(),
                                  ]
                                    .filter(Boolean)
                                    .join(" ");
                                  const merged = [
                                    streetPart,
                                    nextCommune.trim(),
                                  ]
                                    .filter(Boolean)
                                    .join(", ");
                                  setUnifiedAddressSearch(merged);
                                }}
                                placeholder={t("delivery.communePlaceholder")}
                              />

                              <label
                                className="cart-field-label"
                                htmlFor="cart-delivery-street"
                              >
                                {t("delivery.street")}
                              </label>
                              <input
                                id="cart-delivery-street"
                                className="form-input"
                                value={streetInput}
                                onChange={(e) => {
                                  isManualEditRef.current = true;
                                  suppressLineGeocodeUntilRef.current = 0;
                                  const nextStreet = e.target.value;
                                  setStreetInput(nextStreet);
                                  setDeliveryAddressPrecision(null);
                                  const streetPart = [
                                    nextStreet.trim(),
                                    streetNumberInput.trim(),
                                  ]
                                    .filter(Boolean)
                                    .join(" ");
                                  setDeliveryLine1(streetPart);
                                  const merged = [streetPart, deliveryCommune.trim()]
                                    .filter(Boolean)
                                    .join(", ");
                                  setUnifiedAddressSearch(merged);
                                }}
                                placeholder={t("delivery.streetPlaceholder")}
                              />

                              <label
                                className="cart-field-label"
                                htmlFor="cart-delivery-number"
                              >
                                {t("delivery.number")}
                              </label>
                              <input
                                id="cart-delivery-number"
                                className="form-input"
                                value={streetNumberInput}
                                onChange={(e) => {
                                  isManualEditRef.current = true;
                                  suppressLineGeocodeUntilRef.current = 0;
                                  const nextNumber = e.target.value;
                                  setStreetNumberInput(nextNumber);
                                  setDeliveryAddressPrecision(null);
                                  const streetPart = [
                                    streetInput.trim(),
                                    nextNumber.trim(),
                                  ]
                                    .filter(Boolean)
                                    .join(" ");
                                  setDeliveryLine1(streetPart);
                                  const merged = [streetPart, deliveryCommune.trim()]
                                    .filter(Boolean)
                                    .join(", ");
                                  setUnifiedAddressSearch(merged);
                                }}
                                inputMode="numeric"
                                placeholder={t("delivery.numberPlaceholder")}
                              />
                              </>
                            ) : null}
                        {SHOW_ADDRESS_SUGGESTIONS &&
                        mapAddressMode &&
                            addressSearchLoading ? (
                              <p className="cart-geo-hint">{t("delivery.searchingAddresses")}</p>
                            ) : null}
                        {SHOW_ADDRESS_SUGGESTIONS &&
                        mapAddressMode &&
                            addressSearchConfigError ? (
                              <p className="cart-fulfillment-warn">
                                {addressSearchConfigError}
                              </p>
                            ) : null}
                        {SHOW_ADDRESS_SUGGESTIONS &&
                        mapAddressMode &&
                            addressHitsOpen &&
                            addressHits.length > 0 ? (
                              <ul
                                className="cart-address-hits"
                                aria-label={t("delivery.addressSuggestionsAria")}
                              >
                                {addressHits.map((hit, idx) => {
                                  const subtitle = hit.commune?.trim() || "";
                                  return (
                                    <li key={`${hit.lat}-${hit.lng}-${idx}`}>
                                      <button
                                        type="button"
                                        className="cart-address-hit-btn"
                                        onClick={() => selectAddressSearchHit(hit)}
                                      >
                                        <MapPin
                                          className="cart-address-hit-pin"
                                          size={18}
                                          aria-hidden
                                        />
                                        <span className="cart-address-hit-body">
                                          <span className="cart-address-hit-primary">
                                            {hit.line1 || hit.label}
                                          </span>
                                          {subtitle ? (
                                            <span className="cart-address-hit-detail">
                                              {subtitle}
                                            </span>
                                          ) : null}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </div>
                          {fulfillment === "delivery" &&
                          mapAddressMode &&
                          lineGeocodeLoading ? (
                            <p className="cart-geo-hint">
                              {t("delivery.updatingLocationFromStreet")}
                            </p>
                          ) : null}

                          {fulfillment === "delivery" &&
                          mapAddressMode ? (
                            <LazyDeliveryPreviewMap lat={deliveryLat} lng={deliveryLng} />
                          ) : null}

                          <label className="cart-field-label">
                            {t("delivery.driverInstructionsRequired")}
                          </label>
                          <textarea
                            className="form-input"
                            rows={2}
                            value={deliveryReference}
                            onChange={(e) => setDeliveryReference(e.target.value)}
                            placeholder={t("delivery.driverInstructionsPlaceholder")}
                          />
                          {!deliveryReferenceOk && fulfillment === "delivery" ? (
                            <p className="cart-geo-hint">
                              {t("delivery.driverInstructionsMin", { min: MIN_DRIVER_REFERENCE_LEN })}
                            </p>
                          ) : null}

                          {deliveryQuoteLoading ? (
                            <p className="cart-geo-hint">{t("delivery.calculatingShipping")}</p>
                          ) : null}
                          {deliveryQuoteError ? (
                            <p className="cart-fulfillment-warn">{deliveryQuoteError}</p>
                          ) : null}
                          {deliveryNamedAreaLabel ? (
                            <p className="cart-geo-hint">{t("delivery.detectedZone", { zone: deliveryNamedAreaLabel })}</p>
                          ) : null}

                          {fulfillment === "delivery" &&
                          deliveryPriceMode === "distance" &&
                          quotedRouteKm != null &&
                          quotedRouteKm > 0 ? (
                            <div className="cart-delivery-quote">
                              <span>{t("delivery.approxDistance")}</span>
                              <strong>{Math.round(Number(quotedRouteKm))} km</strong>
                            </div>
                          ) : null}
                          <div className="cart-delivery-quote cart-delivery-fee-row">
                            <span>{t("delivery.shippingCost")}</span>
                            <strong>
                              {deliveryWaivedFree
                                ? t("summary.free")
                                : isDeliveryOutOfZone
                                  ? t("delivery.outOfZone")
                                  : !deliveryShowNumericFee && deliveryExternalHintText
                                    ? deliveryExternalHintText
                                    : formatCartMoney(deliveryFee, currency)}
                            </strong>
                          </div>
                          {!meetsMinDelivery ? (
                            <p className="cart-fulfillment-warn">
                              {t("delivery.minOrderForDelivery", { amount: formatCartMoney(minOrder, currency) })}
                            </p>
                          ) : null}
                          {isDeliveryOutOfZone ? (
                            <p className="cart-fulfillment-warn">
                              {t("delivery.locationExceedsMaxKm")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    ) : (
                      <p className="cart-pickup-only-hint cart-pickup-only-hint--in-footer">
                        {t("delivery.pickupOnlyBranch")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="cart-footer-fulfillment-cta">
                {!canProceedFulfillment ? (
                  <div className="cash-closed-banner">
                    <AlertCircle size={16} />
                    <span>
                      {fulfillment === "delivery" &&
                      mapAddressMode &&
                      !isValidCoordsForQuote()
                        ? deliveryPriceMode === "external"
                          ? t("delivery.needLocationForUber")
                          : t("delivery.needLocationStreetOrKm")
                        : fulfillment === "delivery" && !deliveryReferenceOk
                          ? t("delivery.addDriverInstructionsMin", { min: MIN_DRIVER_REFERENCE_LEN })
                          : isDeliveryOutOfZone
                            ? t("delivery.locationOutsideArea")
                            : !meetsMinDelivery
                              ? t("delivery.minAmountForDelivery", { amount: formatCartMoney(minOrder, currency) })
                              : deliveryQuoteLoading &&
                                  (deliveryPriceMode === "distance" ||
                                    deliveryPriceMode === "external") &&
                                  isValidCoordsForQuote()
                                ? t("delivery.calculatingWithLocation")
                                : deliveryQuoteError
                                  ? deliveryQuoteError
                                  : t("delivery.completeDataToContinue")}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic(12);
                      patchCheckoutSession?.({ showPaymentMethods: true });
                    }}
                    className="btn btn-primary btn-block btn-lg"
                  >
                    {t("actions.continueToPaymentMethods")}
                  </button>
                )}
                <button
                  onClick={() => goBackCheckoutStep()}
                  className="btn btn-text btn-block mt-2"
                >
                  <ArrowLeft size={16} className="mr-5" />
                  {t("actions.backToSummary")}
                </button>
                </div>
              </>
            ) : (
              <CartPaymentFlow
                paymentMethodKey={paymentMethodKey}
                setPaymentMethodKey={setPaymentMethodKey}
                paymentMethodsForCheckout={checkoutPaymentMethods}
                receiptRequiredMethods={receiptRequiredMethods}
                showForm={showForm}
                setShowForm={(value: boolean) => patchCheckoutSession?.({ showForm: value })}
                formData={{
                      name: formValues.name || "",
                      phone: formValues.phone || "",
                      rut: formValues.rut || "",
                      receiptFile: formValues.receiptFile ?? null,
                      receiptPreview: formValues.receiptPreview ?? null,
                }}
                onInputChange={handleInputChange}
                onFileChange={handleFileChange}
                onSubmit={handleSendOrder}
                isSaving={viewState.isSaving}
                validation={validation}
                showFieldErrors={showFieldErrors}
                setShowFieldErrors={setShowFieldErrors}
                cartTotal={grandTotal}
                onBack={() => goBackCheckoutStep()}
                activeInfo={activeInfo}
                setViewState={setViewState}
                strategy={strategy}
                isOrderIntakePaused={isOrderIntakePaused}
              />
            )}
            </div>
          </footer>
          </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
