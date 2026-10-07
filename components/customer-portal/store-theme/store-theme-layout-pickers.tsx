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
  isGlassCardStyle,
  normalizeCartStyle,
  normalizeFeaturedStyle,
  normalizeHeaderStyle,
  type CartStyle,
  type FeaturedStyle,
  type HeaderStyle,
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
  { value: "category-tabs", label: "Pastillas", description: "Categorías en pastillas; la activa con tu color" },
  { value: "underline-tabs", label: "Subrayado", description: "Texto limpio con una línea bajo la categoría activa" },
  { value: "sidebar-categories", label: "Barra lateral", description: "Categorías en panel lateral" },
  { value: "mega-menu", label: "Mega menú", description: "Menú flotante por categorías" },
  { value: "icon-list", label: "Iconos", description: "Categorías en círculos con icono" },
  { value: "floating-bottom", label: "Barra flotante inferior", description: "Categorías arriba + barra de app abajo (Inicio, Favoritos, Carrito, Perfil)" },
];

const PRODUCT_CARD_OPTIONS: Array<{ value: ProductCardStyle; label: string; description: string }> = [
  { value: "glass", label: "Cristal", description: "Foto arriba y precio abajo. La de Rica Pizza y Oishi" },
  { value: "glass-row", label: "Cristal en fila", description: "Foto a la izquierda; caben más productos por pantalla" },
  { value: "glass-plate", label: "Plato", description: "El plato redondo sale por encima de la tarjeta" },
  { value: "glass-wide", label: "Foto grande", description: "Una foto grande por producto, ideal para platos vistosos" },
  { value: "layout-carta", label: "Carta", description: "Lista con la foto al lado, como una carta impresa" },
  { value: "layout-vitrina", label: "Vitrina", description: "Foto cuadrada y ficha limpia, luminosa" },
  { value: "layout-cartel", label: "Cartel", description: "La foto llena la tarjeta y el nombre va encima, grande" },
  { value: "layout-nori", label: "Nori", description: "Foto de canto a canto y una línea fina, sobria" },
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
  if (type === "underline-tabs") {
    return (
      <PreviewStage className="flex h-14 flex-col justify-end px-2">
        <div className="flex items-end gap-2 border-b border-[var(--pick-hairline)]">
          <div className="flex flex-col items-center gap-1">
            <div className="h-1.5 w-8 rounded-full bg-[var(--pick-ink)]" />
            <div className="h-[3px] w-8 rounded-t bg-[var(--accent-primary)]" />
          </div>
          <div className="mb-[7px] h-1.5 w-7 rounded-full bg-[var(--pick-surface-strong)]" />
          <div className="mb-[7px] h-1.5 w-6 rounded-full bg-[var(--pick-surface-strong)]" />
        </div>
        <div className="h-3" />
      </PreviewStage>
    );
  }
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
  if (style === "layout-carta") {
    return (
      <PreviewStage className="flex h-[72px] items-center gap-2 p-2">
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-4/5 rounded-full bg-[var(--pick-ink)]" />
          <div className="h-1.5 w-full rounded-full bg-[var(--pick-surface-strong)]" />
          <div className="h-2 w-10 rounded-full bg-[var(--price-color)]" />
        </div>
        <div className="relative h-12 w-12 shrink-0 rounded-lg bg-[var(--pick-surface-strong)]">
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-vitrina") {
    return (
      <PreviewStage className="flex h-[92px] flex-col p-1.5">
        <div className="h-[55%] rounded-md bg-[var(--pick-surface-strong)]" />
        <div className="flex flex-1 items-end justify-between px-0.5 pb-0.5">
          <div className="space-y-1">
            <div className="h-2 w-12 rounded-full bg-[var(--pick-ink)]" />
            <div className="h-2 w-8 rounded-full bg-[var(--price-color)]" />
          </div>
          <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "layout-cartel") {
    return (
      <PreviewStage className="h-[92px]">
        <div className="absolute inset-0 bg-[var(--pick-surface-strong)]" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent to-black/80" />
        <div className="absolute bottom-7 left-2 h-2.5 w-14 rounded-sm bg-white" />
        <div className="absolute bottom-2 left-2 h-3 w-9 rounded-full bg-white/90" />
        <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
      </PreviewStage>
    );
  }
  if (style === "layout-nori") {
    return (
      <PreviewStage className="flex h-[92px] flex-col">
        <div className="h-[52%] bg-[var(--pick-surface-strong)]" />
        <div className="px-2 pt-1.5">
          <div className="h-2 w-3/4 rounded-full bg-[var(--pick-ink)]" />
        </div>
        <div className="mx-2 mt-auto flex items-center justify-between border-t border-[var(--pick-hairline)] py-1.5">
          <div className="h-2 w-9 rounded-full bg-[var(--price-color)]" />
          <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "glass-row") {
    return (
      <PreviewStage className="flex h-[72px] items-center gap-2 border border-[var(--card-border)] p-1.5">
        <div className="h-full w-[52px] shrink-0 rounded-md bg-[var(--pick-surface-strong)]" />
        <div className="flex h-full flex-1 flex-col justify-between py-0.5">
          <div className="space-y-1">
            <div className="h-2 w-4/5 rounded-full bg-[var(--pick-ink)]" />
            <div className="h-1.5 w-full rounded-full bg-[var(--pick-surface-strong)]" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-2 w-9 rounded-full bg-[var(--price-color)]" />
            <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
          </div>
        </div>
      </PreviewStage>
    );
  }
  if (style === "glass-plate") {
    return (
      <PreviewStage className="flex h-[92px] flex-col items-center border border-[var(--card-border)] px-2 pb-1.5 pt-1">
        <div className="h-11 w-11 rounded-full bg-[var(--pick-surface-strong)] shadow-[0_6px_12px_-4px_rgba(0,0,0,0.45)] ring-2 ring-[var(--pick-surface)]" />
        <div className="mt-1.5 h-2 w-12 rounded-full bg-[var(--pick-ink)]" />
        <div className="mt-auto flex w-full items-center justify-between">
          <div className="h-2 w-9 rounded-full bg-[var(--price-color)]" />
          <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
        </div>
      </PreviewStage>
    );
  }
  if (style === "glass-wide") {
    return (
      <PreviewStage className="flex h-[92px] flex-col border border-[var(--card-border)] p-1">
        <div className="h-[58%] rounded-md bg-[var(--pick-surface-strong)]" />
        <div className="mt-1 h-2 w-2/3 rounded-full bg-[var(--pick-ink)]" />
        <div className="mt-auto flex items-center justify-between">
          <div className="h-2 w-10 rounded-full bg-[var(--price-color)]" />
          <div className="h-5 w-5 rounded-full bg-[var(--accent-primary)]" />
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

const HEADER_OPTIONS: Array<{ value: HeaderStyle; label: string; description: string }> = [
  { value: "bar", label: "Barra", description: "Logo y nombre en la barra de arriba, directo a la carta" },
  { value: "cover", label: "Portada", description: "Foto grande, tu logo encima y si estás abierto" },
];

const FEATURED_OPTIONS: Array<{ value: FeaturedStyle; label: string; description: string }> = [
  { value: "section", label: "Como categoría", description: "Los especiales van como una categoría más" },
  { value: "carousel", label: "Carrusel", description: "Fila de destacados arriba que se desliza con el dedo" },
];

const CART_OPTIONS: Array<{ value: CartStyle; label: string; description: string }> = [
  { value: "float", label: "Botón", description: "Botón redondo en la esquina con la cantidad" },
  { value: "bar", label: "Barra con total", description: "Barra abajo con la cantidad y el total al agregar" },
];

function HeaderPreview({ style }: { style: HeaderStyle }) {
  if (style === "cover") {
    return (
      <PreviewStage className="flex h-[72px] flex-col p-1.5">
        <div className="h-7 rounded-md bg-[var(--pick-surface-strong)]" />
        <div className="-mt-3 flex items-end gap-1.5 px-1">
          <div className="h-7 w-7 rounded-lg bg-[var(--accent-primary)] ring-2 ring-[var(--pick-surface)]" />
          <div className="mb-0.5 space-y-1">
            <div className="h-2 w-14 rounded-full bg-[var(--pick-ink)]" />
            <div className="h-1.5 w-9 rounded-full bg-[var(--pick-surface-strong)]" />
          </div>
        </div>
      </PreviewStage>
    );
  }
  return (
    <PreviewStage className="flex h-[72px] flex-col gap-1.5 p-1.5">
      <div className="flex items-center justify-center gap-1.5">
        <div className="h-4 w-4 rounded bg-[var(--accent-primary)]" />
        <div className="h-2 w-12 rounded-full bg-[var(--pick-ink)]" />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1">
        <div className="rounded bg-[var(--pick-surface)]" />
        <div className="rounded bg-[var(--pick-surface)]" />
      </div>
    </PreviewStage>
  );
}

function FeaturedPreview({ style }: { style: FeaturedStyle }) {
  if (style === "carousel") {
    return (
      <PreviewStage className="flex h-[72px] flex-col gap-1 p-1.5">
        <div className="h-1.5 w-12 rounded-full bg-[var(--pick-ink)]" />
        <div className="flex flex-1 gap-1 overflow-hidden">
          <div className="w-[38%] shrink-0 rounded bg-[var(--pick-surface-strong)]" />
          <div className="w-[38%] shrink-0 rounded bg-[var(--pick-surface-strong)]" />
          <div className="w-[38%] shrink-0 rounded bg-[var(--pick-surface-strong)] opacity-60" />
        </div>
      </PreviewStage>
    );
  }
  return (
    <PreviewStage className="flex h-[72px] flex-col gap-1 p-1.5">
      <div className="h-1.5 w-12 rounded-full bg-[var(--pick-ink)]" />
      <div className="grid flex-1 grid-cols-2 gap-1">
        <div className="rounded bg-[var(--pick-surface-strong)]" />
        <div className="rounded bg-[var(--pick-surface-strong)]" />
      </div>
    </PreviewStage>
  );
}

function CartPreview({ style }: { style: CartStyle }) {
  return (
    <PreviewStage className="h-[72px]">
      <div className="absolute inset-x-1.5 top-1.5 grid grid-cols-2 gap-1">
        <div className="h-8 rounded bg-[var(--pick-surface)]" />
        <div className="h-8 rounded bg-[var(--pick-surface)]" />
      </div>
      {style === "bar" ? (
        <div className="absolute inset-x-1.5 bottom-1.5 flex h-5 items-center gap-1 rounded-md bg-[var(--accent-primary)] px-1">
          <div className="h-3 w-4 rounded bg-black/20" />
          <div className="h-1.5 flex-1 rounded-full bg-white/80" />
          <div className="h-1.5 w-5 rounded-full bg-white" />
        </div>
      ) : (
        <div className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-[var(--accent-primary)] shadow" />
      )}
    </PreviewStage>
  );
}

function makeSimplePicker<T extends string>(
  name: string,
  legend: string,
  options: Array<{ value: T; label: string; description: string }>,
  normalize: (value: unknown) => T,
  Preview: (props: { style: T }) => ReactNode,
) {
  return memo(function SimplePicker({ value, onChange, disabled, theme }: PickerProps<T>) {
    const selected = normalize(value);
    const themeStyle = usePickerThemeStyle(theme);
    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="sr-only">{legend}</legend>
        <div style={themeStyle} className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <OptionTile
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              description={option.description}
              isActive={selected === option.value}
              onSelect={() => onChange(option.value)}
            >
              <Preview style={option.value} />
            </OptionTile>
          ))}
        </div>
      </fieldset>
    );
  });
}

export const StoreThemeHeaderPicker = makeSimplePicker("headerStyle", "Cabecera del menú", HEADER_OPTIONS, normalizeHeaderStyle, HeaderPreview);
export const StoreThemeFeaturedPicker = makeSimplePicker("featuredStyle", "Destacados", FEATURED_OPTIONS, normalizeFeaturedStyle, FeaturedPreview);
export const StoreThemeCartPicker = makeSimplePicker("cartStyle", "Carrito", CART_OPTIONS, normalizeCartStyle, CartPreview);

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

  const setLayoutPiece = useCallback(
    (key: "headerStyle" | "featuredStyle" | "cartStyle", value: string) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
      touch();
    },
    [setStoreThemeDraft, touch],
  );

  return { setNavbarType, setProductCardStyle, setNavigationMode, setProductDetailsMode, setLayoutPiece };
}

export function getStoreThemeComboWarnings(theme: StoreThemeConfig | null | undefined): string[] {
  if (!theme) return [];
  const warnings: string[] = [];
  const navbarType = normalizeNavbarType(theme.navbarType);
  const productCardStyle = normalizeProductCardStyle(theme.productCardStyle);
  const navigationMode = normalizeNavigationMode(theme.navigationMode);
  const productDetailsMode = normalizeProductDetailsMode(theme.productDetailsMode);

  if (navbarType === "floating-bottom") {
    warnings.push("Configura WhatsApp, Instagram o ubicación en tus sucursales para que aparezca la pestaña Contacto.");
  }
  if (navigationMode === "pagination") {
    warnings.push("En modo paginación los clientes ven una categoría a la vez.");
  }
  if (productDetailsMode === "inline" && !isGlassCardStyle(productCardStyle)) {
    warnings.push("Con expansión en tarjeta (no Cristal), los detalles se abren en un panel debajo del producto.");
  }
  if (navbarType === "sidebar-categories") {
    warnings.push("En móvil, la barra lateral usa pestañas horizontales en el header.");
  }
  return warnings;
}
