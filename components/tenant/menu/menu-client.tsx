"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, MapPin, Search, X, Compass, Grid, Plus, Minus, Home, User, Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "../cart/cart-store";
import "@/app/[subdomain]/styles/BottomNavbar.css";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import { BranchSelectorModal } from "../branch/branch-selector-modal";
import { Navbar } from "../navbar/navbar";
import { CartProvider, useCart } from "../cart";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import dynamic from "next/dynamic";

const CartFloat = dynamic(
  () => import("../cart").then((mod) => mod.CartFloat),
  { ssr: false },
);

const ProductDetailsModal = dynamic(
  () => import("./product-details-modal").then((mod) => mod.ProductDetailsModal),
  { ssr: false },
);

const CartModal = dynamic(
  () => import("../cart").then((mod) => mod.CartModal),
  { ssr: false },
);
import { ProductCard } from "./product-card";
import { HeroCarousel } from "../home/hero-carousel";
import { OrderIntakePausedBanner } from "./order-intake-paused-banner";
import type { HeroBanner } from "../home/hero-carousel";
import { getTenantScopedPath } from "../utils/tenant-route";
import { createSupabaseBrowserClient } from "../../../utils/supabase/client";
import type { Json } from "../../../types/supabase-database";
import { normalizeDeliverySettings } from "@/lib/delivery/delivery-settings";
import {
  normalizeNavbarType,
  normalizeNavigationMode,
  normalizeProductCardStyle,
  normalizeProductGridStyle,
  productCardGridClass,
} from "@/lib/store-theme/theme-config";

interface BranchInfo {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  schedule?: string | null;
  company_id?: string | null;
  country?: string | null;
  currency?: string | null;
  bank_name?: string | null;
  account_type?: string | null;
  account_number?: string | null;
  account_rut?: string | null;
  account_email?: string | null;
  account_holder?: string | null;
  payment_methods?: string[];
  /** Flags/objetos configurados en admin para métodos presenciales. */
  efectivo?: unknown;
  tarjeta?: unknown;
  pago_movil?: {
    banco?: string;
    telefono?: string;
    identificacion?: string;
  } | null;
  zelle?: {
    email?: string;
    name?: string;
  } | null;
  transferencia_bancaria?: {
    banco?: string;
    nro_cuenta?: string;
    tipo_cuenta?: string;
    identificacion?: string;
    titular?: string;
    email?: string;
  } | null;
  stripe?: { [key: string]: string } | null;
  mercadopago?: { [key: string]: string } | null;
  paypal?: { [key: string]: string } | null;
  /** ADMIN-HOOK: reglas de delivery por sucursal */
  delivery_settings?: Json | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  order_intake_paused?: boolean | null;
  order_intake_pause_message?: string | null;
}

interface BranchModalItem {
  id: string;
  name: React.ReactNode;
  address: string | null;
  phone: string | null;
  schedule?: string | null;
  company_id?: string | null;
  bank_name?: string | null;
  account_type?: string | null;
  account_number?: string | null;
  account_rut?: string | null;
  account_email?: string | null;
  account_holder?: string | null;
  disabled?: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  order?: number | null;
}

interface MenuProduct {
  id: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  price: number;
  has_discount: boolean;
  discount_price: number | null;
  is_special: boolean;
}

interface MenuClientProps {
  name: string;
  logoUrl?: string | null;
  businessInfo?: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    schedule?: string | null;
    bank_name?: string | null;
    account_type?: string | null;
    account_number?: string | null;
    account_rut?: string | null;
    account_email?: string | null;
    account_holder?: string | null;
  } | null;
  branches: BranchInfo[];
  openBranchIds?: string[];
  categories: MenuCategory[];
  products: MenuProduct[];
  selectedBranchId?: string | null;
  banners?: HeroBanner[];
  country?: string;
  currency?: string;
  navbarType?: string;
  navigationMode?: string;
  productCardStyle?: string;
  productDetailsMode?: string;
  productGridStyle?: string;
  onlineOrderingEnabled?: boolean;
}

function isPromocionesCategoryName(name: string | null | undefined) {
  return String(name || "").trim().toLowerCase() === "promociones";
}

type PreviewThemePayload = {
  primaryColor?: string;
  secondaryColor?: string;
  priceColor?: string;
  discountColor?: string;
  hoverColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  navbarType?: string;
  navigationMode?: string;
  productCardStyle?: string;
  productDetailsMode?: string;
  productGridStyle?: string;
};

function decodePreviewThemeParam(encodedValue: string | null): PreviewThemePayload | null {
  if (!encodedValue) return null;
  try {
    const decoded = globalThis.atob(encodedValue);
    const parsed = JSON.parse(decoded) as PreviewThemePayload;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeHexColor(value: string | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function sanitizeImageUrl(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/")) {
    return normalized;
  }
  return "";
}

// -----------------------------------------------------------------------------
// ProductInlinePanel — expansion panel for "inline" details mode
// -----------------------------------------------------------------------------
function ProductInlinePanel({
  product,
  currency,
  country,
  onClose,
}: {
  product: MenuProduct;
  currency: string;
  country: string;
  onClose: () => void;
}) {
  const { addToCart, decreaseQuantity, cart } = useCart();
  const quantity = cart.reduce(
    (sum: number, item: { id: string; quantity: number }) =>
      item.id === product.id ? sum + (Number(item.quantity) || 0) : sum,
    0,
  );
  const showUSD = country === "VE" || country === "Venezuela";
  const isCloudinary = (product.image_url || "").includes("res.cloudinary.com");

  const displayPrice = product.has_discount && product.discount_price
    ? (showUSD ? formatCartMoney(product.discount_price, "USD") : formatCartMoney(product.discount_price, currency))
    : (showUSD ? formatCartMoney(product.price, "USD") : formatCartMoney(product.price, currency));

  return (
    <div
      className="product-inline-panel"
    >
      <button
        type="button"
        className="product-inline-panel__close"
        onClick={onClose}
        aria-label="Cerrar detalle"
      >
        <X size={18} />
      </button>

      <div className="product-inline-panel__inner">
        {product.image_url && (
          <div className="product-inline-panel__img-wrap">
            <Image
              src={product.image_url}
              alt={product.name ?? "Producto"}
              fill
              className="product-inline-panel__img"
              sizes="160px"
              unoptimized={!isCloudinary}
            />
          </div>
        )}

        <div className="product-inline-panel__body">
          <h3 className="product-inline-panel__name">{product.name}</h3>
          {product.description && (
            <p className="product-inline-panel__desc">{product.description}</p>
          )}
          <div className="product-inline-panel__footer">
            <div className="product-inline-panel__price-row">
              {product.has_discount && product.discount_price ? (
                <>
                  <span className="product-inline-panel__price discounted">{displayPrice}</span>
                  <span className="product-inline-panel__price original">
                    {showUSD ? formatCartMoney(product.price, "USD") : formatCartMoney(product.price, currency)}
                  </span>
                </>
              ) : (
                <span className="product-inline-panel__price">{displayPrice}</span>
              )}
            </div>

            {quantity === 0 ? (
              <button
                type="button"
                className="product-inline-panel__add-btn"
                onClick={() => addToCart(product)}
                aria-label={`Agregar ${product.name} al carrito`}
              >
                <Plus size={16} />
                Agregar
              </button>
            ) : (
              <div className="product-inline-panel__stepper">
                <button
                  type="button"
                  onClick={() => decreaseQuantity(product.id)}
                  aria-label="Disminuir cantidad"
                >
                  <Minus size={14} />
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



export function MenuClient({
  name,
  logoUrl,
  businessInfo,
  branches,
  openBranchIds,
  categories,
  products,
  selectedBranchId,
  banners = [],
  country = "CL",
  currency = "CLP",
  navbarType: initialNavbarType = "category-tabs",
  navigationMode: initialNavigationMode = "scroll",
  productCardStyle: initialProductCardStyle = "glass",
  productDetailsMode: initialProductDetailsMode = "modal-premium",
  productGridStyle: initialProductGridStyle = "auto",
  onlineOrderingEnabled,
}: MenuClientProps) {

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const [navbarType, setNavbarType] = useState(initialNavbarType);
  const [navigationMode, setNavigationMode] = useState(initialNavigationMode);
  const [cardStyle, setCardStyle] = useState(initialProductCardStyle);
  const [detailsMode, setDetailsMode] = useState(initialProductDetailsMode);
  const [gridStyle, setGridStyle] = useState(initialProductGridStyle);
  const [selectedProductDetails, setSelectedProductDetails] = useState<MenuProduct | null>(null);
  const [expandedInlineProductId, setExpandedInlineProductId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<"home" | "favorite" | "cart" | "profile">("home");

  const handleToggleFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  }, []);

  const totalItems = useCartStore((state) => 
    state.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  );
  const toggleCart = useCartStore((state) => state.toggleCart);

  let priorityCounter = 0;
  const nextPriority = () => priorityCounter++ < 6;

  // Inline mode: toggle expanded panel; glass card handles its own inline expand
  const handleInlineProductClick = useCallback((product: MenuProduct) => {
    setExpandedInlineProductId((prev) => (prev === product.id ? null : product.id));
  }, []);

  const getProductOnClick = useCallback((product: MenuProduct) => {
    if (detailsMode === "modal-premium") return () => setSelectedProductDetails(product);
    if (detailsMode === "inline" && cardStyle !== "glass") return () => handleInlineProductClick(product);
    return undefined; // glass handles inline on its own
  }, [detailsMode, cardStyle, handleInlineProductClick]);

  const handleProductClick = useCallback((product: MenuProduct) => {
    setSelectedProductDetails(product);
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbeddedPreview = searchParams?.get("embedded_preview") === "1";
  const previewThemeParam = searchParams?.get("preview_theme") ?? null;
  const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const homePath = useMemo(
    () => getTenantScopedPath(pathname ?? "/", "/"),
    [pathname]
  );

  const menuPath = useMemo(
    () => getTenantScopedPath(pathname ?? "/", "/menu"),
    [pathname]
  );
  const menuScopePath = useMemo(
    () => getTenantScopedPath(pathname ?? "/", "/menu/"),
    [pathname]
  );
  const menuServiceWorkerPath = useMemo(
    () => getTenantScopedPath(pathname ?? "/", "/menu/sw.js"),
    [pathname]
  );

  useEffect(() => {
    if (isEmbeddedPreview || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register(menuServiceWorkerPath, {
          scope: menuScopePath,
        });
      } catch {
        // Comentario: no interrumpir UX si SW falla.
      }
    };

    registerServiceWorker();
  }, [isEmbeddedPreview, menuScopePath, menuServiceWorkerPath]);

  useEffect(() => {
    const previewTheme = decodePreviewThemeParam(previewThemeParam);
    if (!previewTheme) {
      setNavbarType(initialNavbarType);
      setNavigationMode(initialNavigationMode);
      setCardStyle(initialProductCardStyle);
      setDetailsMode(initialProductDetailsMode);
      setGridStyle(initialProductGridStyle);
      return;
    }

    setNavbarType(normalizeNavbarType(previewTheme.navbarType || initialNavbarType));
    setNavigationMode(normalizeNavigationMode(previewTheme.navigationMode || initialNavigationMode));
    setCardStyle(normalizeProductCardStyle(previewTheme.productCardStyle || initialProductCardStyle));
    setDetailsMode(previewTheme.productDetailsMode || initialProductDetailsMode);
    setGridStyle(normalizeProductGridStyle(previewTheme.productGridStyle || initialProductGridStyle));

    const root = document.querySelector(".tenant-theme-vars") as HTMLElement | null;
    if (!root) return;

    const backgroundImageUrl = sanitizeImageUrl(previewTheme.backgroundImageUrl);
    const backgroundImage = backgroundImageUrl
      ? `url(${backgroundImageUrl}), url(/tenant/menu-pattern.webp)`
      : "url(/tenant/menu-pattern.webp)";

    const updates: Array<[string, string]> = [
      ["--tenant-primary", sanitizeHexColor(previewTheme.primaryColor, "#111827")],
      ["--accent-primary", sanitizeHexColor(previewTheme.primaryColor, "#111827")],
      ["--accent-secondary", sanitizeHexColor(previewTheme.secondaryColor, "#111827")],
      ["--price-color", sanitizeHexColor(previewTheme.priceColor, "#ff4757")],
      ["--discount-color", sanitizeHexColor(previewTheme.discountColor, "#25d366")],
      ["--accent-hover", sanitizeHexColor(previewTheme.hoverColor, "#ff2e40")],
      ["--bg-primary", sanitizeHexColor(previewTheme.backgroundColor, "#0a0a0a")],
      ["--tenant-bg-image", backgroundImage],
    ];

    const previousValues = updates.map(([name]) => [name, root.style.getPropertyValue(name)] as const);
    updates.forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });

    return () => {
      previousValues.forEach(([name, value]) => {
        if (value) {
          root.style.setProperty(name, value);
        } else {
          root.style.removeProperty(name);
        }
      });
    };
  }, [previewThemeParam, initialNavbarType, initialNavigationMode, initialProductCardStyle, initialProductDetailsMode, initialProductGridStyle]);

  // Mostrar todas las categorías de la empresa (misma lista en todas las sucursales).
  // Las secciones con 0 productos se muestran vacías o con mensaje.
  const visibleCategories = useMemo(() => [...categories], [categories]);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(
    visibleCategories[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [logoError, setLogoError] = useState(false);
  
  // Modal should always open on entry so user explicitly selects a branch.
  const hasOpenBranches = (openBranchIds ?? []).length > 0;
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(!isEmbeddedPreview && !selectedBranchId);

  // Disable scroll when modal is open
  useEffect(() => {
    if (isEmbeddedPreview) {
      document.body.style.overflow = "";
      return;
    }
    if (isLocationModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEmbeddedPreview, isLocationModalOpen]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId]
  );
  const effectiveCountry = selectedBranch?.country || country;
  const effectiveCurrency = selectedBranch?.currency || currency;
  const companyId = useMemo(
    () => selectedBranch?.company_id ?? branches[0]?.company_id ?? null,
    [selectedBranch?.company_id, branches]
  );
  const deliverySettingsNormalized = useMemo(() => {
    return selectedBranch ? normalizeDeliverySettings(selectedBranch.delivery_settings) : null;
  }, [selectedBranch]);
  const exchangeRate = deliverySettingsNormalized?.exchangeRate ?? null;

  const scheduleServerRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
    }, 350);
  }, [router]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;

    let channel = supabase
      .channel(`tenant-menu-realtime:${companyId}:${selectedBranchId ?? "none"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branches",
          filter: `company_id=eq.${companyId}`,
        },
        scheduleServerRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_shifts",
          filter: `company_id=eq.${companyId}`,
        },
        scheduleServerRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `company_id=eq.${companyId}`,
        },
        scheduleServerRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `company_id=eq.${companyId}`,
        },
        scheduleServerRefresh
      );

    if (selectedBranchId) {
      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_prices",
            filter: `branch_id=eq.${selectedBranchId}`,
          },
          scheduleServerRefresh
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_branch",
            filter: `branch_id=eq.${selectedBranchId}`,
          },
          scheduleServerRefresh
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_extras_groups",
            filter: `branch_id=eq.${selectedBranchId}`,
          },
          scheduleServerRefresh
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_upsell_beverages",
            filter: `branch_id=eq.${selectedBranchId}`,
          },
          scheduleServerRefresh
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_extras_options",
          },
          scheduleServerRefresh
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, companyId, selectedBranchId, scheduleServerRefresh]);

  const branchesWithOpenCaja = useMemo(
    () => (openBranchIds ?? []).map((id) => String(id)),
    [openBranchIds]
  );

  const modalBranches = useMemo<BranchModalItem[]>(() => {
    return [...branches]
      .sort((a, b) => {
        const aOpen = branchesWithOpenCaja.includes(String(a.id));
        const bOpen = branchesWithOpenCaja.includes(String(b.id));
        if (aOpen === bOpen) return 0;
        return aOpen ? -1 : 1;
      })
      .map((branch) => {
        const isOpen = branchesWithOpenCaja.includes(String(branch.id));
        return {
          ...branch,
          name: (
            <div className="branch-item-row">
              <div className="branch-name-group">
                <MapPin size={18} className={`branch-pin-icon ${isOpen ? "icon-open" : "icon-closed"}`} />
                <span className="branch-item-name">{branch.name}</span>
              </div>
              <span className={`branch-status-badge ${isOpen ? "status-open" : "status-closed"}`}>
                {isOpen ? <span className="status-dot" /> : null}
                {isOpen ? "ABIERTO" : "CERRADO"}
              </span>
            </div>
          ),
          disabled: hasOpenBranches ? !isOpen : false,
        };
      });
  }, [branches, branchesWithOpenCaja, hasOpenBranches]);

  // Keep modal open until there is an explicit selected branch.
  useEffect(() => {
    if (isEmbeddedPreview) return;
    if (!selectedBranchId) {
      setIsLocationModalOpen(true);
    }
  }, [isEmbeddedPreview, selectedBranchId]);

  const FIRE_ICON =
    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif";

  const { specialProducts, filteredBySearch, query } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const promoIds = categories
      .filter((cat) => isPromocionesCategoryName(cat.name))
      .map((cat) => cat.id);
    return {
      specialProducts: products.filter(
        (product) => product.is_special && promoIds.includes(product.category_id ?? "")
      ),
      filteredBySearch: q
        ? products.filter((p) => p.name?.toLowerCase().includes(q))
        : [],
      query: q,
    };
  }, [products, categories, searchQuery]);

  useEffect(() => {
    if (specialProducts.length > 0) {
      setActiveCategory("special");
    } else if (visibleCategories[0]?.id) {
      setActiveCategory(visibleCategories[0].id);
    } else {
      setActiveCategory(null);
    }
  }, [specialProducts.length, visibleCategories]);

  // Solución robusta: flag y timeout para bloquear el observer tras click
  const observerBlockRef = useRef(false);
  const scrollToCategory = useCallback((id: string) => {
    setActiveCategory(id);
    if (navigationMode === "pagination") return;

    observerBlockRef.current = true;
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        observerBlockRef.current = false;
      }, 800); // Bloquea el observer por 800ms tras click
    } else {
      observerBlockRef.current = false;
    }
  }, [navigationMode]);

  useEffect(() => {
    if (query || navigationMode === "pagination") return;

    const observerOptions = {
      root: null,
      rootMargin: "-80px 0px -80% 0px", // Ajusta para que la sección activa sea la más cercana al top
      threshold: 0, // Detecta cualquier intersección
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (observerBlockRef.current) return;
      // Selecciona la sección más cercana al top
      const sorted = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (sorted.length > 0) {
        const id = sorted[0].target.id.replace("section-", "");
        setActiveCategory(id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = document.querySelectorAll(".category-section");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [query, visibleCategories]);

  useEffect(() => {
    if (navbarType === "icon-list" && activeCategory) {
      const container = document.querySelector(".icon-list-categories");
      if (container) {
        const activeElement = container.querySelector(".icon-list-card.active") as HTMLElement | null;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
        }
      }
    } else if (navbarType === "sidebar-categories" && activeCategory) {
      const container = document.querySelector(".sidebar-categories-panel");
      if (container) {
        const activeElement = container.querySelector(".sidebar-nav-item.active") as HTMLElement | null;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "auto", block: "nearest", inline: "start" });
        }
      }
    }
  }, [activeCategory, navbarType]);

  const handleBranchSelect = (branch: BranchModalItem) => {
    setIsLocationModalOpen(false);
    router.push(`${menuPath}?branch=${branch.id}`);
  };

  const categoriesList = useMemo(() => {
    return [
      ...(specialProducts.length > 0
        ? [
            {
              id: "special",
              name: "Solo por hoy",
              icon: FIRE_ICON,
            },
          ]
        : []),
      ...visibleCategories.map((cat) => {
        // Encontrar la primera imagen de producto disponible para usarla como icono de la categoría (Rappi style)
        const catFirstProduct = products.find(p => p.category_id === cat.id && p.image_url);
        const productIcon = catFirstProduct?.image_url;

        return {
          id: cat.id,
          name: cat.name,
          icon: isPromocionesCategoryName(cat.name) ? FIRE_ICON : productIcon || null,
        }
      }),
    ];
  }, [specialProducts.length, visibleCategories, products]);

  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  const megaMenuOverlay = isMegaMenuOpen ? (
    <div className="mega-menu-overlay" onClick={() => setIsMegaMenuOpen(false)}>
      <div className="mega-menu-content shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mega-menu-header">
          <h3>Categorías</h3>
          <button className="mega-menu-close" onClick={() => setIsMegaMenuOpen(false)} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="mega-menu-grid">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                scrollToCategory(cat.id);
                setIsMegaMenuOpen(false);
              }}
              className={`mega-menu-item ${activeCategory === cat.id ? "active" : ""}`}
            >
              <div className="mega-menu-item-icon-wrapper">
                {cat.icon ? (
                  <Image
                    src={cat.icon}
                    className={`mega-menu-item-icon ${cat.id === "special" || isPromocionesCategoryName(cat.name) ? "icon-contain" : "icon-cover"}`}
                    alt=""
                    width={44}
                    height={44}
                    unoptimized
                  />
                ) : (
                  <span className="mega-menu-item-initial">
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="mega-menu-item-name">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  const sidebarContent = (
    <aside className="sidebar-categories-panel">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <Image
            src={logoError ? "/tenant/logo-placeholder.svg" : logoUrl || "/tenant/logo-placeholder.svg"}
            alt="Logo"
            className="sidebar-logo"
            width={44}
            height={44}
            onError={() => setLogoError(true)}
            unoptimized
          />
          <div className="sidebar-brand-info">
            <h3 className="sidebar-brand-title">{name}</h3>
            <p className="sidebar-brand-subtitle">Menú Digital</p>
          </div>
        </div>

        <div className="sidebar-location-selector">
          <button
            onClick={() => {
              if (!isEmbeddedPreview) setIsLocationModalOpen(true);
            }}
            className="sidebar-location-button"
          >
            <MapPin size={16} className="sidebar-location-icon" color="var(--accent-primary)" />
            <div className="sidebar-location-content">
              <p className="sidebar-location-label">Sucursal</p>
              <p className="sidebar-location-value">
                {selectedBranch ? selectedBranch.name : "Seleccionar Local"}
              </p>
            </div>
            <ChevronDown size={14} className="sidebar-location-chevron" />
          </button>
        </div>
      </div>
      <nav className="sidebar-nav">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`sidebar-nav-item ${activeCategory === cat.id ? "active" : ""}`}
          >
            {cat.icon ? (
              <Image src={cat.icon} className="sidebar-item-icon" alt="" width={16} height={16} unoptimized />
            ) : (
              <Grid size={14} className="sidebar-item-icon opacity-60" />
            )}
            <span className="sidebar-item-text">{cat.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );

  const iconListContent = (
    <div className="icon-list-categories">
      <div className="icon-list-container">
        {categoriesList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`icon-list-card ${activeCategory === cat.id ? "active" : ""}`}
          >
            <div className="icon-list-card-image-wrapper">
              {cat.icon ? (
                <Image src={cat.icon} className="icon-list-card-image" alt="" width={40} height={40} unoptimized />
              ) : (
                <span className="icon-list-card-initial">
                  {cat.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="icon-list-card-name">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );


  const navbar = (
    <header className={`navbar-sticky navbar-type-${navbarType}`}>
      <div className="container nav-container-top">
        <button
          onClick={() => router.push(homePath)}
          className="nav-back-button"
          aria-label="Volver al inicio"
        >
          <ChevronLeft size={28} />
        </button>
        <div className={`nav-brand-wrapper ${searchExpanded ? "mobile-search-active" : ""} ${navbarType === "sidebar-categories" ? "nav-brand-sidebar-hidden" : ""}`}>
          <Image
            src={
              logoError ? "/tenant/logo-placeholder.svg" : logoUrl || "/tenant/logo-placeholder.svg"
            }
            alt="Logo del local"
            className="nav-logo"
            width={40}
            height={40}
            onError={() => setLogoError(true)}
            unoptimized
          />
          <div className="nav-brand-info">
            <h2 className="nav-brand-title">
              {name}
            </h2>
            <button
              onClick={() => {
                if (!isEmbeddedPreview) setIsLocationModalOpen(true);
              }}
              className="nav-location-button"
            >
              <MapPin size={12} className="text-[var(--accent-primary)]" />
              <span className="nav-location-text nav-location-text--truncate">
                {selectedBranch ? selectedBranch.name : "Seleccionar Local"}
              </span>
              <ChevronDown size={12} className="opacity-60" />
            </button>
          </div>
        </div>
        <div className="nav-search-section">
          <div className="nav-actions-wrapper">
            {navbarType === "mega-menu" && (
              <button
                onClick={() => setIsMegaMenuOpen(true)}
                className="mega-menu-header-trigger"
                aria-label="Ver Categorías"
              >
                <Compass size={20} />
              </button>
            )}
          </div>
          <div
            className={`search-pill-wrapper ${searchExpanded ? "expanded" : ""}`}
            onClick={() => {
              if (!searchExpanded) {
                setSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 150);
              }
            }}
          >
            <Search size={20} className="search-icon-pill" />
            <input
              ref={searchInputRef}
              type="text"
              className="search-input-pill"
              placeholder="Buscar plato..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onBlur={() => {
                if (!searchQuery.trim()) setSearchExpanded(false);
              }}
              onClick={(event) => event.stopPropagation()}
            />
            {searchExpanded ? (
              <button
                type="button"
                className="btn-close-pill"
                onClick={(event) => {
                  event.stopPropagation();
                  setSearchExpanded(false);
                  setSearchQuery("");
                }}
                aria-label="Cerrar búsqueda"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {(navbarType === "category-tabs" || navbarType === "sidebar-categories" || navbarType === "floating-bottom") && (
        <Navbar
          categories={[
            ...(specialProducts.length > 0
              ? [
                  {
                    id: "special",
                    name: (
                      <span className="flex items-center gap-1.5">
                        <Image src={FIRE_ICON} className="fire-inline-icon" alt="🔥" width={16} height={16} unoptimized />
                        <span>Solo por hoy</span>
                      </span>
                    ),
                  },
                ]
              : []),
            ...visibleCategories.map((cat) => {
              const catIcon = isPromocionesCategoryName(cat.name) ? FIRE_ICON : null;
              return {
                id: cat.id,
                name: (
                  <span className="flex items-center gap-1.5">
                    {catIcon && (
                      <Image
                        src={catIcon}
                        alt=""
                        width={16}
                        height={16}
                        className="tab-item-icon-img"
                        unoptimized
                      />
                    )}
                    <span>{cat.name}</span>
                  </span>
                ),
              };
            }),
          ]}
          activeCategory={activeCategory}
          onCategoryClick={(id) => {
            scrollToCategory(id);
          }}
        />
      )}
      {navbarType === "icon-list" && iconListContent}

    </header>
  );

  const bottomNavbar = ((cardStyle === "layout-food" || navbarType === "floating-bottom") && selectedBranch) ? (
    <div className="bottom-floating-navbar">
      <button
        type="button"
        className={`bottom-nav-item ${activeBottomTab === "home" ? "active-nav-circle" : ""}`}
        onClick={() => {
          setActiveBottomTab("home");
          scrollToCategory(visibleCategories[0]?.id || "special");
        }}
        aria-label="Inicio"
      >
        <Home size={22} />
        <span>Inicio</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeBottomTab === "favorite" ? "active-nav-circle" : ""}`}
        onClick={() => setActiveBottomTab("favorite")}
        aria-label="Favoritos"
      >
        <Heart size={22} fill={activeBottomTab === "favorite" ? "#000000" : "none"} />
        <span>Favoritos</span>
      </button>

      {onlineOrderingEnabled !== false && (
        <button
          type="button"
          className={`bottom-nav-item ${activeBottomTab === "cart" ? "active-nav-circle" : ""}`}
          onClick={() => {
            toggleCart?.();
          }}
          aria-label="Carrito"
        >
          <ShoppingBag size={22} />
          {totalItems > 0 && <span className="bottom-nav-cart-badge">{totalItems}</span>}
          <span>Carrito</span>
        </button>
      )}

      <button
        type="button"
        className={`bottom-nav-item ${activeBottomTab === "profile" ? "active-nav-circle" : ""}`}
        onClick={() => {
          router.push("/cuenta");
        }}
        aria-label="Perfil"
      >
        <User size={22} />
        <span>Perfil</span>
      </button>
    </div>
  ) : null;

  const cartUi = selectedBranch && onlineOrderingEnabled !== false ? (
    <>
      {cardStyle !== "layout-food" ? <CartFloat currency={effectiveCurrency} /> : bottomNavbar}
      <CartModal
        businessInfo={{ name, ...(businessInfo ?? {}) }}
        selectedBranch={selectedBranch}
        currency={effectiveCurrency}
      />
    </>
  ) : (selectedBranch && cardStyle === "layout-food" ? bottomNavbar : null);

  const megaMenuFab = navbarType === "mega-menu" && (
    <button
      type="button"
      onClick={() => setIsMegaMenuOpen(true)}
      className="mega-menu-fab shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
      aria-label="Ver Categorías"
    >
      <Compass size={20} />
      <span>Categorías</span>
    </button>
  );

  return (
    <CartProvider
      selectedBranchId={selectedBranch?.id ?? null}
      branchDeliverySettings={selectedBranch?.delivery_settings ?? null}
      branchOriginLat={
        selectedBranch?.origin_lat != null && Number.isFinite(Number(selectedBranch.origin_lat))
          ? Number(selectedBranch.origin_lat)
          : null
      }
      branchOriginLng={
        selectedBranch?.origin_lng != null && Number.isFinite(Number(selectedBranch.origin_lng))
          ? Number(selectedBranch.origin_lng)
          : null
      }
      currency={effectiveCurrency}
      country={effectiveCountry}
    >
      <div className={`page-wrapper navbar-type-${navbarType} nav-mode-${navigationMode} card-style-${cardStyle}${onlineOrderingEnabled === false ? " online-ordering-disabled" : ""}`}>
        {/* Render sidebar panel on desktop if sidebar-categories layout */}
        {navbarType === "sidebar-categories" && sidebarContent}

        <div className="main-content-layout">
          {selectedBranch?.order_intake_paused && (
            <OrderIntakePausedBanner message={selectedBranch.order_intake_pause_message} />
          )}
          {mounted && typeof document !== "undefined" && document.getElementById("navbar-portal-root")
            ? createPortal(navbar, document.getElementById("navbar-portal-root") as Element)
            : navbar}

          <div className="menu-spacer" />

          {banners.length > 0 && <HeroCarousel banners={banners} />}

          <main className="container">


            {query ? (
              <section id="section-search" className="category-section">
                <h2 className="category-title">Resultados para &quot;{searchQuery.trim()}&quot;</h2>
                {filteredBySearch.length > 0 ? (
                  <>
                    <div className={`product-grid ${productCardGridClass(cardStyle, gridStyle)}`}>
                      {filteredBySearch.map((product) => (
                        <ProductCard key={product.id} product={product} priority={nextPriority()} country={effectiveCountry} currency={effectiveCurrency} cardStyle={cardStyle} onClick={getProductOnClick(product)} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={() => handleToggleFavorite(product.id)} exchangeRate={exchangeRate} />
                      ))}
                    </div>
                    {detailsMode === "inline" && expandedInlineProductId && (() => {
                      const p = filteredBySearch.find((x) => x.id === expandedInlineProductId);
                      return p ? <ProductInlinePanel product={p} currency={effectiveCurrency} country={effectiveCountry} onClose={() => setExpandedInlineProductId(null)} /> : null;
                    })()}
                  </>
                ) : (
                  <p className="no-results-text">
                    No hay platos con ese nombre.
                  </p>
                )}
              </section>
            ) : activeBottomTab === "favorite" ? (
              <section id="section-favorites" className="category-section">
                <h2 className="category-title category-title--with-icon">
                  <Heart className="category-icon text-red-500 fill-red-500" size={24} />
                  Mis Favoritos
                </h2>
                {favoriteIds.length > 0 ? (
                  <>
                    <div className={`product-grid ${productCardGridClass(cardStyle, gridStyle)}`}>
                      {products
                        .filter((p) => favoriteIds.includes(p.id))
                        .map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            priority={nextPriority()}
                            country={effectiveCountry}
                            currency={effectiveCurrency}
                            cardStyle={cardStyle}
                            onClick={getProductOnClick(product)}
                            isFavorite={true}
                            onToggleFavorite={() => handleToggleFavorite(product.id)}
                            exchangeRate={exchangeRate}
                          />
                        ))}
                    </div>
                    {detailsMode === "inline" && expandedInlineProductId && (() => {
                      const favProds = products.filter((p) => favoriteIds.includes(p.id));
                      const p = favProds.find((x) => x.id === expandedInlineProductId);
                      return p ? <ProductInlinePanel product={p} currency={effectiveCurrency} country={effectiveCountry} onClose={() => setExpandedInlineProductId(null)} /> : null;
                    })()}
                  </>
                ) : (
                  <p className="no-results-text">Aún no has agregado ningún producto a tus favoritos.</p>
                )}
              </section>
            ) : (
              <>
                {/* In pagination mode, we show special products only when "special" is active */}
                {(navigationMode === "pagination" ? activeCategory === "special" : true) && specialProducts.length > 0 ? (
                  <section id="section-special" className="category-section">
                    <h2 className="category-title">
                      <Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
                      Solo por hoy
                    </h2>
                    <div className={`product-grid ${productCardGridClass(cardStyle, gridStyle)}`}>
                      {specialProducts.map((product) => (
                        <ProductCard key={product.id} product={product} priority={nextPriority()} country={effectiveCountry} currency={effectiveCurrency} cardStyle={cardStyle} onClick={getProductOnClick(product)} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={() => handleToggleFavorite(product.id)} exchangeRate={exchangeRate} />
                      ))}
                    </div>
                    {detailsMode === "inline" && expandedInlineProductId && (() => {
                      const p = specialProducts.find((x) => x.id === expandedInlineProductId);
                      return p ? <ProductInlinePanel product={p} currency={effectiveCurrency} country={effectiveCountry} onClose={() => setExpandedInlineProductId(null)} /> : null;
                    })()}
                  </section>
                ) : null}

                {visibleCategories
                  .filter((cat) => navigationMode === "pagination" ? activeCategory === cat.id : true)
                  .map((category) => {
                    const categoryProducts = products.filter(
                      (product) => product.category_id === category.id
                    );

                    return (
                      <section
                        key={category.id}
                        id={`section-${category.id}`}
                        className="category-section"
                      >
                        <h2 className="category-title">
                          {isPromocionesCategoryName(category.name) ? (
                            <>
                              {category.name}
                              <Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
                            </>
                          ) : (
                            category.name
                          )}
                        </h2>
                        <div className={`product-grid ${productCardGridClass(cardStyle, gridStyle)}`}>
                          {categoryProducts.length > 0
                            ? categoryProducts.map((product) => (
                                <ProductCard key={product.id} product={product} priority={nextPriority()} country={effectiveCountry} currency={effectiveCurrency} cardStyle={cardStyle} onClick={getProductOnClick(product)} isFavorite={favoriteIds.includes(product.id)} onToggleFavorite={() => handleToggleFavorite(product.id)} exchangeRate={exchangeRate} />
                              ))
                            : (
                                <p className="no-results-text">No hay productos en esta categoría.</p>
                              )}
                        </div>
                        {detailsMode === "inline" && expandedInlineProductId && (() => {
                          const p = categoryProducts.find((x) => x.id === expandedInlineProductId);
                          return p ? <ProductInlinePanel product={p} currency={effectiveCurrency} country={effectiveCountry} onClose={() => setExpandedInlineProductId(null)} /> : null;
                        })()}
                      </section>
                    );
                  })}
              </>
            )}
          </main>

          {mounted && typeof document !== "undefined" && document.getElementById("cart-portal-root")
            ? createPortal(cartUi, document.getElementById("cart-portal-root") as Element)
            : null}

          {mounted && (
            <ProductDetailsModal
              isOpen={!!selectedProductDetails}
              onClose={() => setSelectedProductDetails(null)}
              product={selectedProductDetails}
              country={effectiveCountry}
              currency={effectiveCurrency}
              onlineOrderingEnabled={onlineOrderingEnabled}
              exchangeRate={exchangeRate}
            />
          )}

          {isEmbeddedPreview ? null : (
            <BranchSelectorModal
              isOpen={isLocationModalOpen}
              onClose={() => {
                if (selectedBranchId) {
                  setIsLocationModalOpen(false);
                }
              }}
              branches={modalBranches}
              allBranches={branches}
              isLoadingCaja={false}
              onSelectBranch={handleBranchSelect}
              allowClose={Boolean(selectedBranchId)}
              schedule={businessInfo?.schedule ?? null}
            />
          )}

          {/* Floating actions and modal overlays for mega-menu */}
          {megaMenuOverlay}
          {megaMenuFab}
        </div>
      </div>
    </CartProvider>
  );
}