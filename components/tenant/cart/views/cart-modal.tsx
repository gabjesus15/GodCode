"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { X, MapPin, AlertCircle, Plus, Check, CupSoda, Sparkles, Store, Truck, ArrowLeft } from "lucide-react";
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
import { generateWSMessage } from "../services/whatsapp-message";
import { parseOrderRpcPayload } from "../services/order-payload";
import { getFormStrategy } from "@/lib/geo/country-forms";
import {
  ENHANCE_CATALOG_BEVERAGE_FALLBACK,
  ENHANCE_CATALOG_EXTRA_FALLBACK,
  PAYMENT_METHOD_CONFIG,
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
import { mergeCartWithBranchPrices } from "../utils/cart-pricing";
import { validateImageFile } from "../../utils/cloudinary";
import { useCart } from "../use-cart";
import { sanitizeUserText } from "@/utils/sanitize-user-text";
import { ordersService } from "../../data/orders-service";
const DeliveryPreviewMap = dynamic(
  () =>
    import("../../delivery/delivery-preview-map").then((mod) => mod.DeliveryPreviewMap),
  { ssr: false },
);

import "../../../../app/[subdomain]/styles/CartModal.css";
import "../../../../app/[subdomain]/styles/CartModal.custom.css";

export function CartModal({
  businessInfo,
  selectedBranch,
  currency = "CLP",
}: {
  businessInfo?: BusinessInfo | null;
  selectedBranch?: BranchInfo | null;
  currency?: string;
}) {
  const countryCode = businessInfo?.country || "CL";
  const strategy = useMemo(() => getFormStrategy(countryCode), [countryCode]);

  const t = useTranslations("tenant.cart.modal");
    const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      const timer = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(timer);
    }, []);

    const {
      cart,
      isCartOpen,
      toggleCart,
      addToCart,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      cartSubtotal,
      grandTotal,
      deliveryFee,
      getPrice,
      orderNote,
      setOrderNote,
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
    } = useCart();



    type CheckoutLiveBranch = Pick<
      BranchInfo,
      "payment_methods" | "delivery_settings" | "efectivo" | "tarjeta"
    >;

    const [checkoutLiveBranch, setCheckoutLiveBranch] = useState<CheckoutLiveBranch | null>(
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
      if (!selectedBranch?.id) {
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
            });
          },
        );

      channel.subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [supabase, selectedBranch?.id]);

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

    const deliveryPriceMode = useMemo(
      () => effectiveDeliveryPricingMode(deliverySettings),
      [deliverySettings]
    );

    const mapAddressMode = useMemo(
      () => deliveryPriceMode === "distance" || deliveryPriceMode === "external",
      [deliveryPriceMode],
    );

    const [activeEnhancePanel, setActiveEnhancePanel] = useState<
      "none" | "beverages" | "extras"
    >("none");

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
      }, 420);
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
      }, 520);
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

          if (!SHOW_ADDRESS_SUGGESTIONS && results[0]) {
            const first = results[0];
            if (Date.now() >= suppressLineGeocodeUntilRef.current) {
              suppressLineGeocodeUntilRef.current = Date.now() + 850;
              setDeliveryCoords(first.lat, first.lng);
              setDeliveryAddressPrecision(
                first.precision === "exact" ? "exact" : "approx"
              );
              setGeoHint(t("delivery.addressFoundReviewFee"));
              setShowDeliveryReference(true);
            }
          }
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

      const q =
        rawLine.trim().length >= 3
          ? rawLine.trim()
          : [rawLine.trim(), rawCommune.trim()].filter(Boolean).join(", ");
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

  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const [paymentMethodKey, setPaymentMethodKey] = useState<string | null>(null);
  const fulfillmentScrollRef = useRef<HTMLDivElement | null>(null);
  const fulfillmentChoiceRef = useRef<HTMLDivElement | null>(null);
  const cartPanelRef = useRef<HTMLDivElement | null>(null);

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
  }, [paymentMethodKey, checkoutPaymentMethods]);

  const clientSchema = buildCartClientSchema({
    nameShort: t("validation.nameShort"),
    nameInvalid: t("validation.nameInvalid"),
    phoneShort: t("validation.phoneShort"),
    phoneLong: t("validation.phoneLong"),
    phoneInvalid: t("validation.phoneInvalid"),
  });

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      phone: "+56 9 ",
      rut: "",
      receiptFile: null,
      receiptPreview: undefined,
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
  const formValues = useWatch({ control });
    const [isShiftLoading, setIsShiftLoading] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(true);
  const selectedBranchId = selectedBranch?.id ?? null;

  useEffect(() => {
    if (!selectedBranchId) {
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
  }, [selectedBranchId, supabase]);

  const canCheckout = isShiftOpen;

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
        ? t("delivery.minOrderForDelivery", { amount: formatCartMoney(minOrder) })
        : deliveryQuoteLoading &&
          (deliveryPriceMode === "distance" || deliveryPriceMode === "external") &&
          isValidCoordsForQuote()
        ? t("delivery.calculatingWithLocation")
        : deliveryQuoteError
        ? deliveryQuoteError
        : t("delivery.completeDataToContinue")
      : null;

  const checkoutPhase = useMemo((): "summary" | "fulfillment" | "payment" => {
    if (!viewState.showPaymentInfo) return "summary";
    if (!viewState.showPaymentMethods) return "fulfillment";
    return "payment";
  }, [viewState.showPaymentInfo, viewState.showPaymentMethods]);

  const isDeliveryFulfillmentFocus =
    viewState.showPaymentInfo &&
    !viewState.showPaymentMethods &&
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
    const requiresReceipt =
      Boolean(
        paymentMethodKey &&
          PAYMENT_METHOD_CONFIG[paymentMethodKey]?.isOnline
      );
    const isReceiptValid = requiresReceipt ? !!values.receiptFile : true;

    return {
      rut: isRutValid,
      phone: isPhoneValid,
      name: isNameValid,
      receipt: isReceiptValid,
      isReady: isNameValid && isPhoneValid && isRutValid && isReceiptValid,
    };
  }, [formValues, paymentMethodKey, strategy]); // CORRECTO: Depende de los valores reactivos

  // Usar setValue de react-hook-form para cambios
  const handleInputChange = useCallback((field: string, value: string) => {
    if (field === "rut") value = strategy.formatId ? strategy.formatId(value) : value;
    if (field === "phone") value = strategy.normalizePhone(value);
    setValue(field as keyof typeof clientSchema.shape, value);
    setViewState((prev) => ({ ...prev, error: null }));
  }, [setValue, clientSchema, strategy]);

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
    setPaymentMethodKey(null);
    setValue("name", "");
    setValue("phone", "+56 9 ");
    setValue("rut", "");
    setValue("receiptFile", null);
    setValue("receiptPreview", undefined);
    setShowFieldErrors(false);
  }, [setValue]);

  const handleCloseCart = useCallback(() => {
    if (viewState.showSuccess) {
      toggleCart();
      return;
    }
    toggleCart();
    setTimeout(resetFlow, 300);
  }, [viewState.showSuccess, toggleCart, resetFlow]);

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
      const msg = selectedBranch
        ? `Esta sucursal (${selectedBranch.name}) no esta recibiendo pedidos. Abre la caja en el admin para habilitar compras.`
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
        const fullDesc = [item.description ?? "", item.line_summary ?? "", extrasDesc]
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
      const isOnline = paymentMethodKey && PAYMENT_METHOD_CONFIG[paymentMethodKey]?.isOnline;
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
      const orderPayload = {
        client_name: sanitizeUserText(data.name),
        client_phone: String(data.phone ?? "").trim(),
        client_rut: String(data.rut ?? "").trim(),
        payment_type: isOnline ? ('online' as const) : ('tienda' as const),
        payment_method_specific: paymentMethodKey,
        total: Number(snapGrand) || 0,
        items: mergedItemsForOrder,
        note: sanitizeUserText(orderNote),
        status: "pending",
        receiptFile: data.receiptFile,
        branch_id: selectedBranch.id,
        branch_name: selectedBranch.name || t("common.unknown"),
        company_id: selectedBranch.company_id || null,
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
      const { order: newOrder, receiptUploadFailed } = await ordersService.createOrder(
        orderPayload,
        data.receiptFile ?? null
      );
      const parsed = parseOrderRpcPayload(newOrder);
      setViewState((v) => ({
        ...v,
        showSuccess: true,
        isSaving: false,
        receiptUploadFailed: receiptUploadFailed ?? false,
        lastOrderSuccess: parsed
          ? { ...parsed, fulfillment: snapFulfillment }
          : {
              id: 0,
              order_number: null,
              handoff_code: null,
              fulfillment: snapFulfillment,
            },
      }));
      setShowFieldErrors(false);
      const deliverySummary =
        snapFulfillment === "delivery" && deliverySnapshot
          ? `${t("delivery.addressLabel")}: ${deliverySnapshot.line1}, ${deliverySnapshot.commune}`
          : undefined;
      setTimeout(() => {
        const paymentData = paymentMethodKey
          ? (activeInfo as Record<string, unknown>)[paymentMethodKey]
          : undefined;
        const message = generateWSMessage(
          data,
          cart,
          snapGrand,
          paymentMethodKey,
          orderNote,
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
          },
          {
            titlePrefix: t("ws.titlePrefix"),
            businessFallback: t("ws.businessFallback"),
            customer: t("ws.customer"),
            rut: t("ws.rut"),
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
        const targetPhone = rawPhone;
        window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, "_blank");
        clearCart();
      }, 1500);
    } catch (error: unknown) {
      const errorRecord = (error ?? {}) as Record<string, unknown>;
      const message = String(errorRecord.message || t("errors.processOrderTryAgain"));
      setViewState((v) => ({ ...v, isSaving: false, error: message }));
    }
  });

  const enhanceTabCount =
    (beveragesUpsellEnabledByBranch ? 1 : 0) + (extrasEnabledByBranch ? 1 : 0);





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
          {cart.length === 0 ? (
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
                  />
                ))}
              </div>
              <div className="cart-notes">
                <label>{t("notes.label")}</label>
                <textarea
                  className="form-input"
                  placeholder={t("notes.placeholder")}
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  rows={2}
                />
              </div>
                </>
              ) : null}
            </>
          )}
        </div>

        {cart.length > 0 ? (
          <>
            {!viewState.showPaymentInfo &&
            !viewState.showPaymentMethods &&
            !viewState.showForm &&
            (beveragesUpsellEnabledByBranch || extrasEnabledByBranch) ? (
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
                  hidden={activeEnhancePanel === "none"}
                >
                  <div className="cart-footer-enhance-scroll">
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
                          {enhancementCatalogs.beverages.length === 0 ? (
                            <p className="cart-geo-hint">No hay bebidas configuradas para upsell.</p>
                          ) : null}
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
                          {enhancementCatalogs.globalExtras.length === 0 ? (
                            <p className="cart-geo-hint">No hay extras globales configurados.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="cart-enhance-segmented-wrap">
                  <div
                    className={`cart-enhance-segmented${
                      enhanceTabCount === 1 ? " cart-enhance-segmented--single" : ""
                    }`}
                    role="group"
                    aria-label={
                      beveragesUpsellEnabledByBranch && extrasEnabledByBranch
                        ? t("catalog.addDrinksOrExtras")
                        : beveragesUpsellEnabledByBranch
                          ? t("catalog.drinksForOrder")
                          : t("catalog.globalExtrasForOrder")
                    }
                  >
                    {beveragesUpsellEnabledByBranch ? (
                      <button
                        type="button"
                        className={`cart-enhance-seg ${
                          activeEnhancePanel === "beverages" ? "is-active" : ""
                        }`}
                        onClick={() => {
                          triggerHaptic();
                          setActiveEnhancePanel((v) => (v === "beverages" ? "none" : "beverages"));
                        }}
                      >
                        <CupSoda size={17} aria-hidden />
                        <span>Bebidas</span>
                      </button>
                    ) : null}
                    {extrasEnabledByBranch ? (
                      <button
                        type="button"
                        className={`cart-enhance-seg ${
                          activeEnhancePanel === "extras" ? "is-active" : ""
                        }`}
                        onClick={() => {
                          triggerHaptic();
                          setActiveEnhancePanel((v) => (v === "extras" ? "none" : "extras"));
                        }}
                      >
                        <Sparkles size={17} aria-hidden />
                        <span>Extras</span>
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
                viewState.showPaymentInfo && !viewState.showPaymentMethods
                  ? " cart-footer--checkout-fulfillment"
                  : ""
              }`}
            >
            <div
              key={viewState.showPaymentInfo ? "checkout" : "summary"}
              className="cart-footer-pane"
            >
            {!viewState.showPaymentInfo ? (
              <>
                <CartCouponFields
                  branchId={selectedBranchId}
                  cartSubtotal={cartSubtotal}
                  currency={currency}
                />
                <div className="total-row">
                  <span>{t("summary.subtotal")}</span>
                  <span>{formatCartMoney(cartSubtotal, currency)}</span>
                </div>
                {appliedCouponDiscount > 0 ? (
                  <div className="total-row total-row-discount">
                    <span>{t("summary.discount")}</span>
                    <span>-{formatCartMoney(appliedCouponDiscount, currency)}</span>
                  </div>
                ) : null}
                {fulfillment === "delivery" && deliverySettings.enabled ? (
                  <div className="total-row total-row-delivery">
                    <span>{t("summary.shipping")}</span>
                    <span>
                      {deliveryWaivedFree
                        ? t("summary.free")
                        : isDeliveryOutOfZone
                          ? "—"
                          : !deliveryShowNumericFee && deliveryExternalHintText
                            ? deliveryExternalHintText
                            : formatCartMoney(deliveryFee, currency)}
                    </span>
                  </div>
                ) : null}
                <div className="total-row total-row-grand">
                  <span>{t("summary.total")}</span>
                  <span className="total-price">{formatCartMoney(grandTotal, currency)}</span>
                </div>

                {isShiftLoading ? (
                  <button className="btn btn-primary btn-block btn-lg" disabled>
                    {t("actions.loading")}
                  </button>
                ) : !canCheckout ? (
                  <div className="cash-closed-banner">
                    <AlertCircle size={16} />
                    <span>
                      {selectedBranch
                        ? `Esta sucursal no está recibiendo pedidos. Abre la caja en ${selectedBranch.name} para habilitar compras.`
                        : `Caja cerrada.${businessInfo?.schedule ? ` Horario: ${businessInfo.schedule}` : ""}`}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic(12);
                      setActiveEnhancePanel("none");
                      setViewState((v) => ({
                        ...v,
                        showPaymentInfo: true,
                        showPaymentMethods: false,
                      }));
                    }}
                    className="btn btn-primary btn-block btn-lg"
                  >
                    {t("actions.goToPay")}
                  </button>
                )}
              </>
            ) : !viewState.showPaymentMethods ? (
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
                            <DeliveryPreviewMap lat={deliveryLat} lng={deliveryLng} />
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
                              ? t("delivery.minAmountForDelivery", { amount: formatCartMoney(minOrder) })
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
                      setViewState((v) => ({ ...v, showPaymentMethods: true }));
                    }}
                    className="btn btn-primary btn-block btn-lg"
                  >
                    {t("actions.continueToPaymentMethods")}
                  </button>
                )}
                <button
                  onClick={() =>
                    setViewState((v) => ({
                      ...v,
                      showPaymentInfo: false,
                      showPaymentMethods: false,
                    }))
                  }
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
                showForm={viewState.showForm}
                setShowForm={(value: boolean) => setViewState((v) => ({ ...v, showForm: value }))}
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
                onBack={() =>
                  setViewState((v) => ({
                    ...v,
                    showPaymentMethods: false,
                    showForm: false,
                  }))
                }
                activeInfo={activeInfo}
                setViewState={setViewState}
                strategy={strategy}
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
