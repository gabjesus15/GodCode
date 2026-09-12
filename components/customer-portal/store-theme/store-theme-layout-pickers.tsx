"use client";

import { memo, useCallback, useMemo } from "react";
import { Check } from "lucide-react";

import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import {
  type NavbarType,
  type NavigationMode,
  type ProductCardStyle,
  type ProductDetailsMode,
  normalizeNavbarType,
  normalizeNavigationMode,
  normalizeProductCardStyle,
  normalizeProductDetailsMode,
} from "@/lib/store-theme/theme-config";
import { parseThemeColor, themeColorsToCssVarEntries } from "@/lib/store-theme/apply-theme-css-vars";
import { contrastRatio } from "@/lib/store-theme/store-theme-utils";
import { DEFAULT_STORE_THEME } from "../shared/customer-account-store-theme-constants";
import type { StoreThemeConfig } from "../shared/customer-account-types";

const PRODUCT_DETAILS_OPTIONS: Array<{ value: ProductDetailsMode; label: string; description: string }> = [
  { value: "modal-premium", label: "Pop-up Premium", description: "Modal a pantalla completa con imagen, descripción y agregar al carrito" },
  { value: "inline", label: "Expansión en tarjeta", description: "Cristal: expande la tarjeta. Otros estilos: panel ancho debajo del producto" },
];

const NAVBAR_OPTIONS: Array<{ value: NavbarType; label: string; description: string }> = [
  { value: "category-tabs", label: "Pestañas", description: "Tabs horizontales con scroll" },
  { value: "sidebar-categories", label: "Barra lateral", description: "Categorías en panel lateral" },
  { value: "mega-menu", label: "Mega menú", description: "Menú flotante por categorías" },
  { value: "icon-list", label: "Iconos", description: "Categorías en círculos con icono" },
  { value: "floating-bottom", label: "Barra flotante inferior", description: "Categorías arriba + barra de app abajo (Inicio, Favoritos, Carrito, Perfil)" },
];

const PRODUCT_CARD_OPTIONS: Array<{ value: ProductCardStyle; label: string; description: string }> = [
  { value: "glass", label: "Cristal", description: "Tarjeta translúcida sobre el fondo" },
  { value: "layout-clean", label: "Zapatillas", description: "Imagen a sangre con panel lateral" },
  { value: "layout-detailed", label: "Tecnología", description: "Imagen cuadrada y ficha con descripción" },
  { value: "layout-horizontal", label: "Horizontal", description: "Fila compacta, más productos por pantalla" },
  { value: "layout-sidebar", label: "Barra lateral", description: "Acciones apiladas al borde de la imagen" },
  { value: "layout-rappi", label: "Rappi", description: "Imagen enmarcada y botón de acción redondo" },
  { value: "layout-sneaker", label: "Sneaker", description: "Producto centrado sobre pedestal oscuro" },
  { value: "layout-skew", label: "Gaming", description: "Bloque inclinado y marca de agua" },
  { value: "layout-food", label: "Food Deluxe", description: "Sin marco, el plato flota sobre el fondo" },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Tokens vivos en las miniaturas
 *
 * Las miniaturas se dibujaban con grises y `indigo-500` fijos, así que elegías
 * un layout sin ver tu paleta — y dos de ellas mentían: "Tecnología" y "Rappi"
 * se pintaban blancas cuando las tarjetas reales son `#0d0d0f` y
 * `rgba(8,8,8,.65)`. Aquí el mismo `themeColorsToCssVarEntries` que emite el
 * storefront alimenta las miniaturas, así que lo que ves sale del contrato de
 * tokens real, no de una interpretación paralela.
 *
 * `--pick-*` son locales de este componente, no del contrato compartido: son la
 * tinta de los placeholders, derivada del fondo del borrador para que las
 * miniaturas sigan legibles con paletas claras y oscuras.
 * ──────────────────────────────────────────────────────────────────────────── */

type PickerStyle = CSSProperties & Record<string, string>;

function usePickerThemeStyle(theme: StoreThemeConfig | null | undefined): PickerStyle {
  return useMemo(() => {
    const resolved = theme ?? DEFAULT_STORE_THEME;
    const style = {} as PickerStyle;
    for (const [name, value] of themeColorsToCssVarEntries(resolved)) {
      style[name] = value;
    }

    /**
     * Con tint al 0% el menú enseña la imagen de fondo a pleno y `--bg-primary`
     * queda en `rgba(...,0)`. Pintar la miniatura con ese valor la dejaba
     * transparente sobre la tarjeta blanca del panel, con la tinta clara encima:
     * invisible. El lienzo usa entonces el color sólido elegido como sustrato, y
     * la imagen del tenant se superpone con sus propios tokens de capa.
     */
    const parsedBg = parseThemeColor(resolved.backgroundColor, "#0a0a0a");
    style["--pick-stage"] = parsedBg.alpha >= 0.05 ? resolved.backgroundColor : parsedBg.hex;

    // El contraste se mide contra el sustrato opaco, no contra el color con alfa.
    const whiteOnStage = contrastRatio("#ffffff", parsedBg.hex) ?? 21;
    const inkIsLight = whiteOnStage >= 3;

    style["--pick-ink"] = inkIsLight ? "rgba(255,255,255,0.92)" : "rgba(17,17,19,0.92)";
    style["--pick-ink-dim"] = inkIsLight ? "rgba(255,255,255,0.45)" : "rgba(17,17,19,0.40)";
    style["--pick-surface"] = inkIsLight ? "rgba(255,255,255,0.09)" : "rgba(17,17,19,0.07)";
    style["--pick-surface-strong"] = inkIsLight ? "rgba(255,255,255,0.16)" : "rgba(17,17,19,0.13)";
    style["--pick-hairline"] = inkIsLight ? "rgba(255,255,255,0.12)" : "rgba(17,17,19,0.10)";

    // El menú escala el fondo con `cover` sobre una capa del tamaño del viewport;
    // la miniatura hace lo mismo a su escala, así que enseña el mismo encuadre.
    style["--pick-bg-size"] = style["--tenant-bg-size"] === "auto" ? "auto" : "cover";
    return style;
  }, [theme]);
}

/** Lienzo de miniatura: el fondo del tenant, no un gris de sistema. */
function PreviewStage({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[var(--pick-stage)] ring-1 ring-inset ring-[var(--pick-hairline)] ${className}`}
    >
      {/* Capa de imagen del tenant. Sin imagen, `--tenant-bg-layer-opacity` es 0
          y la capa se apaga sola. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "var(--tenant-bg-image)",
          backgroundSize: "var(--pick-bg-size)",
          backgroundRepeat: "var(--tenant-bg-repeat)",
          opacity: "var(--tenant-bg-layer-opacity)",
          filter: "var(--tenant-bg-layer-filter)",
        }}
      />
      {children}
    </div>
  );
}

function NavbarPreview({ type }: { type: NavbarType }) {
  if (type === "sidebar-categories") {
    return (
      <PreviewStage className="flex h-14 gap-1 p-1.5">
        <div className="w-1/4 rounded bg-[var(--pick-surface-strong)]" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-2/3 rounded-full bg-[var(--accent-primary)]" />
          <div className="grid flex-1 grid-cols-2 gap-1">
            <div className="rounded bg-[var(--pick-surface)]" />
            <div className="rounded bg-[var(--pick-surface)]" />
          </div>
        </div>
      </PreviewStage>
    );
  }
  if (type === "mega-menu") {
    return (
      <PreviewStage className="flex h-14 flex-col justify-end gap-1 p-1.5">
        <div className="flex gap-1">
          <div className="h-2 flex-1 rounded-full bg-[var(--accent-primary)]" />
          <div className="h-2 flex-1 rounded-full bg-[var(--pick-surface-strong)]" />
          <div className="h-2 flex-1 rounded-full bg-[var(--pick-surface-strong)]" />
        </div>
        <div className="h-6 rounded-md border border-[var(--card-border)] bg-[var(--pick-surface)]" />
      </PreviewStage>
    );
  }
  if (type === "icon-list") {
    return (
      <PreviewStage className="flex h-14 items-center justify-center gap-2 px-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={
              i === 1
                ? "h-7 w-7 rounded-full bg-[var(--accent-primary)] shadow-[0_2px_8px_var(--accent-shadow)]"
                : "h-7 w-7 rounded-full bg-[var(--pick-surface-strong)]"
            }
          />
        ))}
      </PreviewStage>
    );
  }
  if (type === "floating-bottom") {
    return (
      <PreviewStage className="flex h-14 flex-col justify-end p-1.5">
        <div className="mx-auto flex h-7 w-5/6 items-center justify-around rounded-full bg-[var(--pick-surface-strong)] px-2 py-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <div className="h-5 w-5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          <div className="h-1.5 w-2.5 rounded bg-[var(--pick-ink-dim)]" />
          <div className="h-1.5 w-2.5 rounded bg-[var(--pick-ink-dim)]" />
          <div className="h-1.5 w-2.5 rounded bg-[var(--pick-ink-dim)]" />
        </div>
      </PreviewStage>
    );
  }
  return (
    <PreviewStage className="flex h-14 items-center gap-1.5 px-2">
      <div className="h-6 w-12 shrink-0 rounded-full bg-[var(--accent-primary)] shadow-[0_2px_8px_var(--accent-shadow)]" />
      <div className="h-6 w-12 shrink-0 rounded-full bg-[var(--pick-surface-strong)]" />
      <div className="h-6 w-12 shrink-0 rounded-full bg-[var(--pick-surface-strong)]" />
      <div className="ml-auto h-6 w-6 shrink-0 rounded-full bg-[var(--pick-surface-strong)]" />
    </PreviewStage>
  );
}

function ProductCardPreview({ style }: { style: ProductCardStyle }) {
  if (style === "layout-clean") {
    return (
      <PreviewStage className="h-[92px]">
        <div className="absolute inset-0 bg-[var(--pick-surface)]" />
        <div className="absolute bottom-0 left-0 top-8 w-7 bg-[var(--pick-surface-strong)]" />
        <div className="absolute bottom-2 left-9 right-2 flex items-center justify-between">
          <div className="h-2 w-10 rounded-full bg-[var(--price-color)]" />
          <div className="h-6 w-6 rounded-full bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-detailed") {
    return (
      <PreviewStage className="flex h-[92px] flex-col">
        {/* Barra de acento superior: `.product-layout-detailed::before` */}
        <div className="h-[3px] shrink-0 bg-[var(--accent-primary)]" />
        <div className="relative h-[46%] bg-[var(--pick-surface)]">
          <div className="absolute left-1.5 top-1.5 h-2 w-6 rounded-full bg-[var(--discount-color)]" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 border-t border-[var(--pick-hairline)] px-2">
          <div className="h-2 w-4/5 rounded-full bg-[var(--pick-ink)]" />
          <div className="flex items-center justify-between gap-1">
            <div className="h-2 w-8 rounded-full bg-[var(--price-color)]" />
            <div className="h-4 w-12 rounded-md bg-[var(--pick-surface-strong)]" />
          </div>
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-horizontal") {
    return (
      <PreviewStage className="flex h-[72px]">
        <div className="w-1 shrink-0 bg-[var(--accent-primary)]" />
        <div className="w-[36%] shrink-0 border-r border-[var(--pick-hairline)] bg-[var(--pick-surface-strong)]" />
        <div className="flex flex-1 flex-col justify-center gap-1 p-2">
          <div className="h-2 w-4/5 rounded-full bg-[var(--pick-ink)]" />
          <div className="h-3 w-14 rounded-full bg-[var(--price-color)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-sidebar") {
    return (
      <PreviewStage className="flex h-[92px] flex-col">
        <div className="relative h-[62%] bg-[var(--pick-surface)]">
          <div className="absolute right-0 top-0 flex h-full w-6 flex-col items-center justify-center gap-1 bg-[var(--pick-surface-strong)]">
            <div className="h-4 w-4 rounded-full border border-[var(--card-border)]" />
            <div className="h-4 w-4 rounded-full bg-[var(--accent-primary)]" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-between px-2">
          <div className="h-2 w-1/2 rounded-full bg-[var(--pick-ink)]" />
          <div className="h-2 w-8 rounded-full bg-[var(--price-color)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-rappi") {
    return (
      <PreviewStage className="flex h-[92px] flex-col">
        <div className="mx-2 mt-2 h-[48%] rounded-lg bg-[var(--pick-surface)]" />
        <div className="flex flex-1 items-center justify-between px-2 pb-2">
          <div className="space-y-1">
            <div className="h-2 w-16 rounded-full bg-[var(--pick-ink)]" />
            <div className="h-2 w-8 rounded-full bg-[var(--price-color)]" />
          </div>
          <div className="h-7 w-7 rounded-full bg-[var(--accent-primary)] shadow-[0_2px_8px_var(--accent-shadow)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-sneaker") {
    return (
      <PreviewStage className="flex h-[92px] flex-col">
        <div className="flex flex-1 items-end justify-center pb-1">
          <div className="h-10 w-16 rounded-lg bg-[var(--pick-surface-strong)]" />
        </div>
        <div className="flex items-center justify-between border-t border-[var(--pick-hairline)] bg-[var(--pick-surface)] px-2 py-1.5">
          <div className="h-2.5 w-10 rounded-full bg-[var(--price-color)]" />
          <div className="h-6 w-6 rounded-lg bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-skew") {
    return (
      <PreviewStage className="flex h-[92px] flex-col p-2">
        <div className="absolute right-1 top-1 text-[10px] font-black text-[var(--pick-surface-strong)]">GM</div>
        <div className="my-1 flex-1 skew-y-[-3deg] rounded-lg bg-[var(--accent-secondary)] opacity-40" />
        <div className="flex items-center justify-between gap-1">
          <div className="h-2 w-1/2 rounded-full bg-[var(--pick-ink)]" />
          <div className="h-2 w-8 rounded-full bg-[var(--price-color)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-food") {
    /* Food Deluxe no tiene marco: el plato flota sobre el fondo del menú. */
    return (
      <PreviewStage className="flex h-[92px] flex-col p-2">
        <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pick-surface-strong)]">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--discount-color)]" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-9 w-14 rounded-full bg-[var(--pick-surface-strong)] shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="h-2.5 w-10 rounded bg-[var(--price-color)]" />
          <div className="h-4 w-4 rounded bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  return (
    <PreviewStage className="flex h-[92px] flex-col border border-[var(--card-border)]">
      <div className="h-[55%] bg-[var(--pick-surface)] backdrop-blur-sm" />
      <div className="flex flex-1 items-center justify-between p-2">
        <div className="h-2 w-12 rounded-full bg-[var(--price-color)]" />
        <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
      </div>
    </PreviewStage>
  );
}

function ProductDetailsPreview({ mode }: { mode: ProductDetailsMode }) {
  if (mode === "modal-premium") {
    return (
      <PreviewStage className="flex h-[92px] w-full flex-col justify-end p-2">
        {/* Catálogo detrás del modal */}
        <div className="pointer-events-none absolute inset-0 grid select-none grid-cols-3 gap-1.5 p-2 opacity-40">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-[var(--pick-surface-strong)]" />
          ))}
        </div>

        {/* Scrim: el modal atenúa el catálogo para proteger el foco */}
        <div className="absolute inset-0 bg-black/30 transition-[background-color] duration-300 group-hover:bg-black/45 motion-reduce:transition-none" />

        <div className="relative flex h-[70%] w-full translate-y-2.5 flex-col gap-1.5 rounded-t-lg border-x border-t border-[var(--card-border)] bg-[var(--bg-primary)] p-2 shadow-[0_-6px_18px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none">
          <div className="mx-auto h-1 w-6 rounded-full bg-[var(--pick-surface-strong)]" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 shrink-0 rounded bg-[var(--pick-surface-strong)]" />
            <div className="flex-1 space-y-1">
              <div className="h-2 w-4/5 rounded bg-[var(--pick-ink)]" />
              <div className="h-1.5 w-1/2 rounded bg-[var(--price-color)]" />
            </div>
          </div>
          <div className="mt-auto h-3 w-full rounded bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }

  return (
    <PreviewStage className="flex h-[92px] w-full flex-col justify-start p-2">
      <div className="flex w-full flex-col overflow-hidden rounded-md border border-[var(--card-border)] bg-[var(--pick-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--pick-hairline)] p-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 shrink-0 rounded bg-[var(--pick-surface-strong)]" />
            <div className="space-y-1">
              <div className="h-2 w-16 rounded bg-[var(--pick-ink)]" />
              <div className="h-1.5 w-8 rounded bg-[var(--price-color)]" />
            </div>
          </div>
          <div className="flex h-3.5 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]">
            <span className="select-none text-[8px] font-bold text-white">Ver</span>
          </div>
        </div>

        {/* La tarjeta crece en su sitio; el catálogo alrededor no se atenúa */}
        <div className="flex h-0 flex-col justify-between space-y-1 overflow-hidden px-2 py-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:h-8 group-hover:py-1.5 motion-reduce:h-8 motion-reduce:py-1.5 motion-reduce:transition-none">
          <div className="h-1.5 w-11/12 rounded bg-[var(--pick-ink-dim)]" />
          <div className="h-1 w-2/3 rounded bg-[var(--pick-ink-dim)]" />
        </div>
      </div>
    </PreviewStage>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Celda de opción
 *
 * El radio real es `sr-only`, así que el foco de teclado no se veía en ninguno
 * de los tres pickers: se navegaba a ciegas. `peer-focus-visible` lo devuelve.
 * La marca de selección baja a la fila del rótulo para no taparle la esquina a
 * la miniatura que estás evaluando.
 * ──────────────────────────────────────────────────────────────────────────── */

function OptionTile({
  name,
  value,
  label,
  description,
  isActive,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  label: string;
  description?: string;
  isActive: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className="group relative block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={isActive}
        onChange={onSelect}
        className="peer sr-only"
      />
      <div
        className={`flex h-full flex-col overflow-hidden rounded-xl border bg-white transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 group-active:scale-[0.985] motion-reduce:transition-none motion-reduce:group-active:scale-100 ${
          isActive
            ? "border-indigo-500 shadow-[0_2px_10px_rgba(79,70,229,0.16)] ring-1 ring-indigo-500"
            : "border-[#e5e5ea] hover:border-[#c7c7cc] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        }`}
      >
        <div className="p-2.5">{children}</div>
        <div className="flex items-start gap-1.5 border-t border-[#f0f0f5] px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight text-[#1d1d1f]">{label}</p>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-snug text-[#6e6e73]">{description}</p>
            ) : null}
          </div>
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
              isActive ? "bg-indigo-500 text-white" : "bg-[#f0f0f5] text-transparent"
            }`}
            aria-hidden
          >
            <Check size={11} strokeWidth={3} />
          </span>
        </div>
      </div>
    </label>
  );
}

type PickerProps<T> = {
  value: string | undefined;
  onChange: (next: T) => void;
  disabled?: boolean;
  /** Borrador actual: alimenta los tokens vivos de las miniaturas. */
  theme?: StoreThemeConfig | null;
};

export const StoreThemeNavbarPicker = memo(function StoreThemeNavbarPicker({
  value,
  onChange,
  disabled,
  theme,
}: PickerProps<NavbarType>) {
  const selected = normalizeNavbarType(value);
  const themeStyle = usePickerThemeStyle(theme);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Tipo de barra de navegación</legend>
      <div style={themeStyle} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NAVBAR_OPTIONS.map((option) => (
          <OptionTile
            key={option.value}
            name="navbarType"
            value={option.value}
            label={option.label}
            description={option.description}
            isActive={selected === option.value}
            onSelect={() => onChange(option.value)}
          >
            <NavbarPreview type={option.value} />
          </OptionTile>
        ))}
      </div>
    </fieldset>
  );
});

export const StoreThemeProductCardPicker = memo(function StoreThemeProductCardPicker({
  value,
  onChange,
  disabled,
  theme,
}: PickerProps<ProductCardStyle>) {
  const selected = normalizeProductCardStyle(value);
  const themeStyle = usePickerThemeStyle(theme);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Estilo de tarjeta de producto</legend>
      <div style={themeStyle} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PRODUCT_CARD_OPTIONS.map((option) => (
          <OptionTile
            key={option.value}
            name="productCardStyle"
            value={option.value}
            label={option.label}
            description={option.description}
            isActive={selected === option.value}
            onSelect={() => onChange(option.value)}
          >
            <ProductCardPreview style={option.value} />
          </OptionTile>
        ))}
      </div>
    </fieldset>
  );
});

export const StoreThemeProductDetailsPicker = memo(function StoreThemeProductDetailsPicker({
  value,
  onChange,
  disabled,
  theme,
}: PickerProps<ProductDetailsMode>) {
  const selected = normalizeProductDetailsMode(value);
  const themeStyle = usePickerThemeStyle(theme);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Modo de Detalles del Producto</legend>
      <div style={themeStyle} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRODUCT_DETAILS_OPTIONS.map((option) => (
          <OptionTile
            key={option.value}
            name="productDetailsMode"
            value={option.value}
            label={option.label}
            description={option.description}
            isActive={selected === option.value}
            onSelect={() => onChange(option.value)}
          >
            <ProductDetailsPreview mode={option.value} />
          </OptionTile>
        ))}
      </div>
    </fieldset>
  );
});

export function useStoreThemeLayoutHandlers(
  setStoreThemeDraft: Dispatch<SetStateAction<StoreThemeConfig | null>>,
  onDraftMutated?: () => void,
) {
  const touch = useCallback(() => {
    onDraftMutated?.();
  }, [onDraftMutated]);

  const setNavbarType = useCallback(
    (navbarType: NavbarType) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, navbarType } : prev));
      touch();
    },
    [setStoreThemeDraft, touch],
  );

  const setProductCardStyle = useCallback(
    (productCardStyle: ProductCardStyle) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, productCardStyle } : prev));
      touch();
    },
    [setStoreThemeDraft, touch],
  );

  const setNavigationMode = useCallback(
    (navigationMode: NavigationMode) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, navigationMode: normalizeNavigationMode(navigationMode) } : prev));
      touch();
    },
    [setStoreThemeDraft, touch],
  );

  const setProductDetailsMode = useCallback(
    (productDetailsMode: ProductDetailsMode) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, productDetailsMode } : prev));
      touch();
    },
    [setStoreThemeDraft, touch],
  );

  return { setNavbarType, setProductCardStyle, setNavigationMode, setProductDetailsMode };
}

export function getStoreThemeComboWarnings(theme: StoreThemeConfig | null | undefined): string[] {
  if (!theme) return [];
  const warnings: string[] = [];
  const navbarType = normalizeNavbarType(theme.navbarType);
  const productCardStyle = normalizeProductCardStyle(theme.productCardStyle);
  const navigationMode = normalizeNavigationMode(theme.navigationMode);
  const productDetailsMode = normalizeProductDetailsMode(theme.productDetailsMode);

  if (navbarType === "mega-menu" && productCardStyle === "layout-food") {
    warnings.push("Con mega menú y tarjetas Food Deluxe, el botón flotante de categorías se oculta; usa el header o el overlay.");
  }
  if (navbarType === "floating-bottom" && productCardStyle !== "layout-food") {
    warnings.push("La barra inferior también aparece con navbar flotante, no solo con tarjetas Food Deluxe.");
    warnings.push("Configura WhatsApp, Instagram o ubicación en tus sucursales para que aparezca la pestaña Contacto.");
  }
  if (navigationMode === "pagination") {
    warnings.push("En modo paginación los clientes ven una categoría a la vez.");
  }
  if (productDetailsMode === "inline" && productCardStyle !== "glass") {
    warnings.push("Con expansión en tarjeta (no Cristal), los detalles se abren en un panel debajo del producto.");
  }
  if (productDetailsMode === "inline" && ["layout-clean", "layout-skew", "layout-food"].includes(productCardStyle)) {
    warnings.push("Estas tarjetas muestran poca información antes de abrir el panel de detalles.");
  }
  if (productDetailsMode === "modal-premium" && productCardStyle === "glass") {
    warnings.push("Cristal + modal premium usa un flujo distinto al de otras tarjetas con el mismo ajuste de detalles.");
  }
  if (navbarType === "sidebar-categories") {
    warnings.push("En móvil, la barra lateral usa pestañas horizontales en el header.");
  }
  return warnings;
}
