"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, MapPin, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import { BranchSelectorModal } from "../branch/branch-selector-modal";
import { Navbar } from "../navbar/navbar";
import { CartProvider } from "../cart";
import dynamic from "next/dynamic";

const CartFloat = dynamic(
  () => import("../cart").then((mod) => mod.CartFloat),
  { ssr: false },
);

const CartModal = dynamic(
  () => import("../cart").then((mod) => mod.CartModal),
  { ssr: false },
);
import { ProductCard } from "./product-card";
import { HeroCarousel } from "../home/hero-carousel";
import type { HeroBanner } from "../home/hero-carousel";
import { getTenantScopedPath } from "../utils/tenant-route";
import { createSupabaseBrowserClient } from "../../../utils/supabase/client";
import type { Json } from "../../../types/supabase-database";

interface BranchInfo {
  id: string;
  name: string | null;
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
}: MenuClientProps) {

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  let priorityCounter = 0;
  const nextPriority = () => priorityCounter++ < 6;
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
    if (!previewTheme) return;

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
  }, [previewThemeParam]);

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
  const companyId = useMemo(
    () => selectedBranch?.company_id ?? branches[0]?.company_id ?? null,
    [selectedBranch?.company_id, branches]
  );

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
  }, []);

  useEffect(() => {
    if (query) return;

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

  const handleBranchSelect = (branch: BranchModalItem) => {
    setIsLocationModalOpen(false);
    router.push(`${menuPath}?branch=${branch.id}`);
  };

  const navbar = (
    <header className="navbar-sticky">
      <div className="container nav-container-top">
        <button
          onClick={() => router.push(homePath)}
          className="nav-back-button"
          aria-label="Volver al inicio"
        >
          <ChevronLeft size={28} />
        </button>
        <div className={`nav-brand-wrapper ${searchExpanded ? "mobile-search-active" : ""}`}>
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
              <MapPin size={12} color="var(--accent-primary)" className="nav-location-icon" />
              <span className="nav-location-text">
                {selectedBranch ? selectedBranch.name : "Seleccionar Local"}
              </span>
              <ChevronDown size={12} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>
        <div className="nav-search-section">
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
      <Navbar
        categories={[
          ...(specialProducts.length > 0
            ? [
                {
                  id: "special",
                  name: (
                    <>
                      <Image src={FIRE_ICON} className="fire-inline-icon" alt="🔥" width={20} height={20} unoptimized />
                      Solo por hoy
                    </>
                  ),
                },
              ]
            : []),
          ...visibleCategories.map((cat) => ({
            id: cat.id,
            name: isPromocionesCategoryName(cat.name) ? (
              <>
                <span>{cat.name}</span>
                <Image src={FIRE_ICON} className="fire-inline-icon" alt="🔥" width={20} height={20} unoptimized />
              </>
            ) : (
              cat.name
            ),
          })),
        ]}
        activeCategory={activeCategory}
        onCategoryClick={(id) => scrollToCategory(id)}
      />
    </header>
  );

  const cartUi = selectedBranch ? (
    <>
      <CartFloat currency={currency} />
      <CartModal
        businessInfo={{ name, ...(businessInfo ?? {}) }}
        selectedBranch={selectedBranch}
        currency={currency}
      />
    </>
  ) : null;

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
    >
      <div className="page-wrapper">
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
                <div className="product-grid">
                  {filteredBySearch.map((product) => (
                    <ProductCard key={product.id} product={product} priority={nextPriority()} country={country} currency={currency} />
                  ))}
                </div>
              ) : (
                <p className="no-results-text">
                  No hay platos con ese nombre.
                </p>
              )}
            </section>
          ) : null}

          {!query && specialProducts.length > 0 ? (
            <section id="section-special" className="category-section">
              <h2 className="category-title">
                <Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
                Solo por hoy
              </h2>
              <div className="product-grid">
                {specialProducts.map((product) => (
                  <ProductCard key={product.id} product={product} priority={nextPriority()} country={country} currency={currency} />
                ))}
              </div>
            </section>
          ) : null}

          {!query
            ? visibleCategories.map((category) => {
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
                    <div className="product-grid">
                      {categoryProducts.length > 0
                        ? categoryProducts.map((product) => (
                            <ProductCard key={product.id} product={product} priority={nextPriority()} country={country} currency={currency} />
                          ))
                        : (
                            <p className="no-results-text">No hay productos en esta categoría.</p>
                          )}
                    </div>
                  </section>
                );
              })
            : null}

        </main>

        {mounted && typeof document !== "undefined" && document.getElementById("cart-portal-root")
          ? createPortal(cartUi, document.getElementById("cart-portal-root") as Element)
          : null}

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
      </div>
    </CartProvider>
  );
}