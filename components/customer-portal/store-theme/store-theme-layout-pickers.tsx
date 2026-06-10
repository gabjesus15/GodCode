"use client";

import { memo, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";

import type { Dispatch, SetStateAction } from "react";
import {
  type NavbarType,
  type ProductCardStyle,
  type ProductDetailsMode,
  type ProductGridStyle,
  normalizeNavbarType,
  normalizeProductCardStyle,
  normalizeProductDetailsMode,
  normalizeProductGridStyle,
} from "@/lib/store-theme/theme-config";
import type { StoreThemeConfig } from "../shared/customer-account-types";

const PRODUCT_DETAILS_OPTIONS: Array<{ value: ProductDetailsMode; label: string; description: string }> = [
  { value: "modal-premium", label: "Pop-up Premium", description: "Modal a pantalla completa con diseño moderno" },
  { value: "inline", label: "Expansión clásica", description: "La tarjeta se estira hacia abajo para mostrar detalles" },
];

const PRODUCT_GRID_OPTIONS: Array<{ value: ProductGridStyle; label: string; description: string }> = [
  { value: "auto", label: "Adaptativo (Auto)", description: "Se adapta de acuerdo al estilo de tarjeta de producto y tamaño de pantalla" },
  { value: "cols-2", label: "2 Columnas", description: "Forzar 2 columnas en móviles (ideal para tarjetas compactas)" },
  { value: "cols-3", label: "3 Columnas", description: "Forzar 3 columnas en móviles grandes / tablets" },
  { value: "cols-1", label: "1 Columna", description: "Tarjetas grandes ocupando todo el ancho de fila" },
  { value: "cols-list", label: "Lista vertical", description: "Diseño limpio de lista vertical de una columna fija" },
];

const NAVBAR_OPTIONS: Array<{ value: NavbarType; label: string; description: string }> = [
  { value: "category-tabs", label: "Pestañas", description: "Tabs horizontales con scroll" },
  { value: "sidebar-categories", label: "Barra lateral", description: "Categorías en panel lateral" },
  { value: "mega-menu", label: "Mega menú", description: "Menú flotante por categorías" },
  { value: "icon-list", label: "Iconos", description: "Categorías en círculos con icono" },
  { value: "floating-bottom", label: "Barra flotante inferior", description: "Barra flotante de navegación inferior (estilo comida deluxe)" },
];

const PRODUCT_CARD_OPTIONS: Array<{ value: ProductCardStyle; label: string }> = [
  { value: "glass", label: "Cristal" },
  { value: "layout-clean", label: "Zapatillas" },
  { value: "layout-detailed", label: "Tecnología" },
  { value: "layout-horizontal", label: "Horizontal" },
  { value: "layout-sidebar", label: "Barra lateral" },
  { value: "layout-rappi", label: "Rappi" },
  { value: "layout-sneaker", label: "Sneaker" },
  { value: "layout-skew", label: "Gaming" },
  { value: "layout-food", label: "Food Deluxe" },
];

function NavbarPreview({ type }: { type: NavbarType }) {
  if (type === "sidebar-categories") {
    return (
      <div className="flex h-14 gap-1 rounded-lg bg-[#f5f5f7] p-1.5">
        <div className="w-1/4 rounded bg-gray-300" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-2 w-2/3 rounded-full bg-gray-300" />
          <div className="grid flex-1 grid-cols-2 gap-1">
            <div className="rounded bg-gray-200" />
            <div className="rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }
  if (type === "mega-menu") {
    return (
      <div className="flex h-14 flex-col justify-end gap-1 rounded-lg bg-[#f5f5f7] p-1.5">
        <div className="flex gap-1">
          <div className="h-2 flex-1 rounded-full bg-indigo-400" />
          <div className="h-2 flex-1 rounded-full bg-gray-300" />
          <div className="h-2 flex-1 rounded-full bg-gray-300" />
        </div>
        <div className="h-6 rounded-md border border-dashed border-indigo-300 bg-indigo-50" />
      </div>
    );
  }
  if (type === "icon-list") {
    return (
      <div className="flex h-14 items-center justify-center gap-2 rounded-lg bg-[#f5f5f7] px-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-7 w-7 rounded-full ${i === 1 ? "bg-indigo-400 ring-2 ring-indigo-200" : "bg-gray-300"}`} />
        ))}
      </div>
    );
  }
  if (type === "floating-bottom") {
    return (
      <div className="flex h-14 flex-col justify-end rounded-lg bg-[#f5f5f7] p-1.5">
        <div className="flex h-7 w-5/6 mx-auto items-center justify-around rounded-full bg-gray-900 px-2 py-0.5 shadow-sm">
          <div className="h-5 w-5 rounded-full bg-white shrink-0" />
          <div className="h-1.5 w-2.5 rounded bg-gray-500" />
          <div className="h-1.5 w-2.5 rounded bg-gray-500" />
          <div className="h-1.5 w-2.5 rounded bg-gray-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-14 items-center gap-1.5 overflow-hidden rounded-lg bg-[#f5f5f7] px-2">
      <div className="h-6 shrink-0 rounded-full bg-indigo-500 px-3" />
      <div className="h-6 shrink-0 rounded-full bg-gray-300 px-3" />
      <div className="h-6 shrink-0 rounded-full bg-gray-300 px-3" />
      <div className="ml-auto h-6 w-6 shrink-0 rounded-full bg-gray-300" />
    </div>
  );
}

function ProductCardPreview({ style }: { style: ProductCardStyle }) {
  if (style === "layout-clean") {
    return (
      <div className="relative h-[92px] overflow-hidden rounded-xl bg-[#0f0f12] shadow-md">
        <div className="absolute inset-0 bg-white/10" />
        <div className="absolute bottom-0 left-0 top-8 w-7 bg-white shadow-sm" />
        <div className="absolute bottom-2 left-9 right-2 flex items-center justify-between">
          <div className="h-2 w-10 rounded-full bg-white/90" />
          <div className="h-6 w-6 rounded-full bg-white" />
        </div>
      </div>
    );
  }
  if (style === "layout-detailed") {
    return (
      <div className="flex h-[92px] flex-col overflow-hidden rounded-xl border border-white/20 bg-white shadow-md">
        <div className="h-0.5 bg-indigo-500" />
        <div className="relative h-[50%] bg-gradient-to-b from-gray-100 to-gray-200">
          <div className="absolute left-1.5 top-1.5 h-2 w-6 rounded-full bg-red-500" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 px-2">
          <div className="h-2 w-4/5 rounded-full bg-gray-800" />
          <div className="flex justify-between">
            <div className="h-2 w-8 rounded-full bg-gray-600" />
            <div className="h-4 w-12 rounded-full bg-indigo-600" />
          </div>
        </div>
      </div>
    );
  }
  if (style === "layout-horizontal") {
    return (
      <div className="flex h-[72px] overflow-hidden rounded-xl bg-[#141418] shadow-md">
        <div className="w-1 shrink-0 bg-indigo-500" />
        <div className="w-[36%] shrink-0 border-r border-white/10 bg-[#232328]" />
        <div className="flex flex-1 flex-col justify-center gap-1 p-2">
          <div className="h-2 w-4/5 rounded-full bg-white/85" />
          <div className="h-3 w-14 rounded-full bg-indigo-500" />
        </div>
      </div>
    );
  }
  if (style === "layout-sidebar") {
    return (
      <div className="flex h-[92px] flex-col overflow-hidden rounded-xl bg-[#101014] shadow-md">
        <div className="relative h-[62%] bg-[#1c1c20]">
          <div className="absolute right-0 top-0 flex h-full w-6 flex-col items-center justify-center gap-1 bg-black/50">
            <div className="h-4 w-4 rounded-full border border-white/30" />
            <div className="h-4 w-4 rounded-full border border-white/30" />
          </div>
        </div>
        <div className="flex flex-1 items-center px-2">
          <div className="h-2 w-3/4 rounded-full bg-white/80" />
        </div>
      </div>
    );
  }
  if (style === "layout-rappi") {
    return (
      <div className="flex h-[92px] flex-col overflow-hidden rounded-xl bg-white shadow-md">
        <div className="mx-2 mt-2 h-[48%] rounded-lg bg-gray-100" />
        <div className="flex flex-1 items-center justify-between px-2 pb-2">
          <div className="space-y-1">
            <div className="h-2 w-16 rounded-full bg-gray-800" />
            <div className="h-2 w-8 rounded-full bg-gray-500" />
          </div>
          <div className="h-7 w-7 rounded-full bg-green-500" />
        </div>
      </div>
    );
  }
  if (style === "layout-sneaker") {
    return (
      <div className="flex h-[92px] flex-col overflow-hidden rounded-xl bg-gradient-to-b from-[#1c1c22] to-[#0a0a0c] shadow-md">
        <div className="flex flex-1 items-end justify-center pb-1">
          <div className="h-10 w-16 rounded-lg bg-white/15" />
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-2 py-1.5">
          <div className="h-2.5 w-10 rounded-full bg-white/90" />
          <div className="h-6 w-6 rounded-lg bg-white" />
        </div>
      </div>
    );
  }
  if (style === "layout-skew") {
    return (
      <div className="relative flex h-[92px] flex-col overflow-hidden rounded-xl bg-gradient-to-br from-purple-950 to-[#0c0c10] p-2 shadow-md">
        <div className="absolute right-1 top-1 text-[10px] font-black text-white/10">GM</div>
        <div className="my-1 flex-1 skew-y-[-3deg] rounded-lg bg-purple-500/30" />
        <div className="h-2 w-2/3 rounded-full bg-white/80" />
      </div>
    );
  }
  if (style === "layout-food") {
    return (
      <div className="relative flex h-[92px] flex-col overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950 to-[#121214] p-2 shadow-md border border-white/5">
        <div className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full bg-white/15 flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-9 w-14 rounded-lg bg-white/10" />
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="h-2.5 w-10 rounded bg-white/85" />
          <div className="h-4.5 w-4.5 rounded bg-white flex items-center justify-center" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-[92px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#18181b]">
      <div className="h-[55%] bg-white/10" />
      <div className="flex flex-1 items-center justify-between p-2">
        <div className="h-2 w-12 rounded-full bg-white/70" />
        <div className="h-5 w-5 rounded-full bg-indigo-500" />
      </div>
    </div>
  );
}

type NavbarPickerProps = {
  value: string | undefined;
  onChange: (navbarType: NavbarType) => void;
  disabled?: boolean;
};

export const StoreThemeNavbarPicker = memo(function StoreThemeNavbarPicker({
  value,
  onChange,
  disabled,
}: NavbarPickerProps) {
  const selected = normalizeNavbarType(value);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Tipo de barra de navegación</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NAVBAR_OPTIONS.map((option) => {
          const isActive = selected === option.value;
          return (
            <label
              key={option.value}
              className={`relative rounded-xl border-2 p-3 text-left transition-colors cursor-pointer block ${
                isActive
                  ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                  : "border-[#e5e5ea] bg-white hover:border-[#d2d2d7]"
              }`}
            >
              <input
                type="radio"
                name="navbarType"
                value={option.value}
                checked={isActive}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <NavbarPreview type={option.value} />
              <p className="mt-2 text-xs font-semibold text-[#1d1d1f]">{option.label}</p>
              <p className="text-[10px] text-[#6e6e73]">{option.description}</p>
              {isActive && (
                <CheckCircle2
                  size={16}
                  className="absolute right-2 top-2 text-indigo-500"
                  aria-hidden
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
});

type ProductCardPickerProps = {
  value: string | undefined;
  onChange: (style: ProductCardStyle) => void;
  disabled?: boolean;
};

export const StoreThemeProductCardPicker = memo(function StoreThemeProductCardPicker({
  value,
  onChange,
  disabled,
}: ProductCardPickerProps) {
  const selected = normalizeProductCardStyle(value);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Estilo de tarjeta de producto</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {PRODUCT_CARD_OPTIONS.map((option) => {
          const isActive = selected === option.value;
          return (
            <label
              key={option.value}
              className={`relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-colors cursor-pointer ${
                isActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-[#e5e5ea] hover:border-[#d2d2d7]"
              }`}
            >
              <input
                type="radio"
                name="productCardStyle"
                value={option.value}
                checked={isActive}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div className="p-2">
                <ProductCardPreview style={option.value} />
              </div>
              <p className="border-t border-[#f0f0f5] px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[#6e6e73]">
                {option.label}
              </p>
              {isActive && (
                <CheckCircle2
                  size={14}
                  className="absolute right-1.5 top-1.5 text-indigo-500"
                  aria-hidden
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
});

function ProductDetailsPreview({ mode }: { mode: ProductDetailsMode }) {
  if (mode === "modal-premium") {
    return (
      <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col justify-end">
        {/* Wireframe background representing product grid behind modal */}
        <div className="absolute inset-0 p-2 grid grid-cols-3 gap-1.5 opacity-30 select-none pointer-events-none">
          <div className="rounded bg-slate-400 h-10" />
          <div className="rounded bg-slate-400 h-10" />
          <div className="rounded bg-slate-400 h-10" />
          <div className="rounded bg-slate-400 h-10" />
          <div className="rounded bg-slate-400 h-10" />
          <div className="rounded bg-slate-400 h-10" />
        </div>

        {/* Dim overlay representing backdrop */}
        <div className="absolute inset-0 bg-slate-900/10 transition-opacity duration-300 group-hover:bg-slate-900/20" />

        {/* Bottom sheet popup */}
        <div
          className="relative h-[70%] w-full rounded-t-lg bg-white p-2 border-t border-x border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex flex-col gap-1.5 transform translate-y-2.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0"
        >
          {/* Top handle bar */}
          <div className="w-6 h-1 rounded-full bg-slate-200 mx-auto" />
          
          <div className="flex gap-2 items-center">
            {/* Thumbnail representation */}
            <div className="h-5 w-5 rounded bg-indigo-50 shrink-0 border border-indigo-100 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2 w-4/5 rounded bg-slate-700" />
              <div className="h-1.5 w-1/2 rounded bg-slate-300" />
            </div>
          </div>
          <div className="mt-auto h-3 w-full rounded bg-indigo-600/90" />
        </div>
      </div>
    );
  }

  // Inline expansion classical
  return (
    <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-200/60 p-2 flex flex-col justify-start">
      {/* Container simulating the list item */}
      <div className="w-full rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:shadow-md">
        {/* Main card row representation */}
        <div className="p-2 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2 items-center">
            <div className="h-5 w-5 rounded bg-slate-200 shrink-0" />
            <div className="space-y-1">
              <div className="h-2 w-16 rounded bg-slate-700" />
              <div className="h-1.5 w-8 rounded bg-slate-300" />
            </div>
          </div>
          {/* Action indicator */}
          <div className="h-3.5 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-indigo-600 select-none">Ver</span>
          </div>
        </div>

        {/* Dynamic expansion block */}
        <div className="h-0 group-hover:h-8 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden bg-white px-2 py-0 group-hover:py-1.5 space-y-1 flex flex-col justify-between">
          <div className="h-1.5 w-11/12 rounded bg-slate-400" />
          <div className="h-1 w-2/3 rounded bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

type ProductDetailsPickerProps = {
  value: string | undefined;
  onChange: (mode: ProductDetailsMode) => void;
  disabled?: boolean;
};

export const StoreThemeProductDetailsPicker = memo(function StoreThemeProductDetailsPicker({
  value,
  onChange,
  disabled,
}: ProductDetailsPickerProps) {
  const selected = normalizeProductDetailsMode(value);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Modo de Detalles del Producto</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRODUCT_DETAILS_OPTIONS.map((option) => {
          const isActive = selected === option.value;
          return (
            <label
              key={option.value}
              className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-colors cursor-pointer ${
                isActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-[#e5e5ea] hover:border-[#d2d2d7]"
              }`}
            >
              <input
                type="radio"
                name="productDetailsMode"
                value={option.value}
                checked={isActive}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div className="p-3 w-full">
                <ProductDetailsPreview mode={option.value} />
              </div>
              <div className="w-full border-t border-[#f0f0f5] p-3 text-left">
                <p className="text-xs font-semibold text-[#1d1d1f]">{option.label}</p>
                <p className="mt-1 text-[10px] text-[#6e6e73] leading-relaxed">{option.description}</p>
              </div>
              {isActive && (
                <CheckCircle2
                  size={16}
                  className="absolute right-2 top-2 text-indigo-500"
                  aria-hidden
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
});

function ProductGridPreview({ style }: { style: ProductGridStyle }) {
  if (style === "cols-2") {
    return (
      <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 h-full">
          <div className="rounded bg-slate-300 border border-slate-200/40" />
          <div className="rounded bg-slate-300 border border-slate-200/40" />
        </div>
      </div>
    );
  }
  if (style === "cols-3") {
    return (
      <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col justify-between">
        <div className="grid grid-cols-3 gap-1.5 h-full">
          <div className="rounded bg-slate-300 border border-slate-200/40" />
          <div className="rounded bg-slate-300 border border-slate-200/40" />
          <div className="rounded bg-slate-300 border border-slate-200/40" />
        </div>
      </div>
    );
  }
  if (style === "cols-1") {
    return (
      <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col gap-2 justify-center">
        <div className="rounded bg-slate-300 border border-slate-200/40 h-8" />
        <div className="rounded bg-slate-300 border border-slate-200/40 h-8 opacity-40" />
      </div>
    );
  }
  if (style === "cols-list") {
    return (
      <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col gap-1.5 justify-center">
        <div className="rounded bg-slate-300 border border-slate-200/40 h-5 flex items-center px-1.5 gap-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-slate-400 shrink-0" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-400" />
        </div>
        <div className="rounded bg-slate-300 border border-slate-200/40 h-5 flex items-center px-1.5 gap-1.5 opacity-60">
          <div className="h-3.5 w-3.5 rounded-full bg-slate-400 shrink-0" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-400" />
        </div>
        <div className="rounded bg-slate-300 border border-slate-200/40 h-5 flex items-center px-1.5 gap-1.5 opacity-30">
          <div className="h-3.5 w-3.5 rounded-full bg-slate-400 shrink-0" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-400" />
        </div>
      </div>
    );
  }
  // "auto"
  return (
    <div className="relative h-[92px] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/60 p-2 flex flex-col justify-between">
      <div className="grid grid-cols-4 gap-1.5 h-full">
        <div className="rounded bg-slate-300 border border-slate-200/40" />
        <div className="rounded bg-slate-300 border border-slate-200/40" />
        <div className="rounded bg-slate-300 border border-slate-200/40" />
        <div className="rounded bg-indigo-400/80 border border-indigo-300" />
      </div>
    </div>
  );
}

type ProductGridPickerProps = {
  value: string | undefined;
  onChange: (gridStyle: ProductGridStyle) => void;
  disabled?: boolean;
};

export const StoreThemeProductGridPicker = memo(function StoreThemeProductGridPicker({
  value,
  onChange,
  disabled,
}: ProductGridPickerProps) {
  const selected = normalizeProductGridStyle(value);

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Distribución de cuadrícula</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_GRID_OPTIONS.map((option) => {
          const isActive = selected === option.value;
          return (
            <label
              key={option.value}
              className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-colors cursor-pointer ${
                isActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-[#e5e5ea] hover:border-[#d2d2d7]"
              }`}
            >
              <input
                type="radio"
                name="productGridStyle"
                value={option.value}
                checked={isActive}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <div className="p-3 w-full">
                <ProductGridPreview style={option.value} />
              </div>
              <div className="w-full border-t border-[#f0f0f5] p-3 text-left">
                <p className="text-xs font-semibold text-[#1d1d1f]">{option.label}</p>
                <p className="mt-1 text-[10px] text-[#6e6e73] leading-relaxed">{option.description}</p>
              </div>
              {isActive && (
                <CheckCircle2
                  size={16}
                  className="absolute right-2 top-2 text-indigo-500"
                  aria-hidden
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
});

export function useStoreThemeLayoutHandlers(
  setStoreThemeDraft: Dispatch<SetStateAction<StoreThemeConfig | null>>,
) {
  const setNavbarType = useCallback(
    (navbarType: NavbarType) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, navbarType } : prev));
    },
    [setStoreThemeDraft],
  );

  const setProductCardStyle = useCallback(
    (productCardStyle: ProductCardStyle) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, productCardStyle } : prev));
    },
    [setStoreThemeDraft],
  );

  const setNavigationMode = useCallback(
    (navigationMode: string) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, navigationMode } : prev));
    },
    [setStoreThemeDraft],
  );

  const setProductDetailsMode = useCallback(
    (productDetailsMode: ProductDetailsMode) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, productDetailsMode } : prev));
    },
    [setStoreThemeDraft],
  );

  const setProductGridStyle = useCallback(
    (productGridStyle: ProductGridStyle) => {
      setStoreThemeDraft((prev) => (prev ? { ...prev, productGridStyle } : prev));
    },
    [setStoreThemeDraft],
  );

  return { setNavbarType, setProductCardStyle, setNavigationMode, setProductDetailsMode, setProductGridStyle };
}
