/**
 * Utilidades de color y validación para el editor de tema de tienda.
 * Extraídas del monolito CustomerAccountClient para ser reutilizadas en hooks y tests.
 */

import { STORE_THEME_FIELD_LABELS } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
import type { StoreThemeAssetField, StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import { parseThemeColor } from "@/lib/store-theme/apply-theme-css-vars";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";

// ─── Color math ──────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] | null {
  const parsed = parseThemeColor(hex);
  // Fondo transparente: no hay contraste útil contra el color.
  if (parsed.alpha < 0.05) return null;
  const expanded = parsed.hex.slice(1);
  if (expanded.length !== 6) return null;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const ch = (v: number) => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = rgb;
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrastRatio(hexA: string, hexB: string): number | null {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  if (l1 == null || l2 == null) return null;
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

export function blendRgb(
  from: [number, number, number],
  to:   [number, number, number],
  t:    number
): [number, number, number] {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
}

export function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function suggestAccessibleColorNearTarget(
  targetHex:  string,
  againstHex: string,
  minRatio:   number,
  primaryHex: string
): string {
  const targetRgb  = hexToRgb(targetHex);
  const primaryRgb = hexToRgb(primaryHex);
  const againstRgb = hexToRgb(againstHex);
  if (!targetRgb || !againstRgb) return targetHex;

  const basePrimary = primaryRgb ?? targetRgb;
  const bases: Array<[number, number, number]> = [
    targetRgb,
    blendRgb(targetRgb, basePrimary, 0.25),
    blendRgb(targetRgb, basePrimary, 0.5),
  ];

  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  let bestHex   = targetHex;
  let bestScore = Number.POSITIVE_INFINITY;

  const evaluate = (candidateRgb: [number, number, number], penalty: number) => {
    const hex   = rgbToHex(candidateRgb[0], candidateRgb[1], candidateRgb[2]);
    const ratio = contrastRatio(hex, againstHex) ?? 0;
    if (ratio < minRatio) return;
    const score = colorDistance(candidateRgb, targetRgb) + penalty;
    if (score < bestScore) { bestScore = score; bestHex = hex; }
  };

  evaluate(targetRgb, 0);
  for (let i = 0; i < bases.length; i++) {
    for (let step = 0; step <= 1; step += 0.04) {
      evaluate(blendRgb(bases[i], white, step), i * 6);
      evaluate(blendRgb(bases[i], black, step), i * 6);
    }
  }
  return bestHex;
}

// ─── Theme utils ─────────────────────────────────────────────────────────────

export function getStoreThemeSignature(theme: StoreThemeConfig | null): string {
  if (!theme) return "";
  return JSON.stringify(theme);
}

export function normalizeStoreThemeInput(input: unknown, fallbackName: string): StoreThemeConfig {
  return normalizeStoreThemeConfig(input, fallbackName);
}

// ─── Asset validation ─────────────────────────────────────────────────────────

async function getImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = new globalThis.Image();
    probe.onload  = () => { const { naturalWidth: width, naturalHeight: height } = probe; URL.revokeObjectURL(objectUrl); resolve({ width, height }); };
    probe.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("No se pudo leer la imagen.")); };
    probe.src = objectUrl;
  });
}

export async function validateStoreThemeAssetFile(
  field: StoreThemeAssetField,
  file:  File
): Promise<{ ok: boolean; error?: string; hint?: string }> {
  const maxMb    = field === "logoUrl" ? 3 : 7;
  const maxBytes = maxMb * 1024 * 1024;
  if (!file.type.startsWith("image/"))  return { ok: false, error: "El archivo debe ser una imagen valida." };
  if (file.size > maxBytes) return { ok: false, error: `El archivo excede ${maxMb} MB. Comprime la imagen e intenta nuevamente.` };

  try {
    const { width, height } = await getImageFileDimensions(file);
    if (field === "logoUrl") {
      if (width < 256 || height < 256) return { ok: false, error: "El logo debe tener al menos 256x256 px para verse nitido." };
      const ratio = width / height;
      if (ratio < 0.7 || ratio > 1.4) return { ok: true, hint: "Recomendacion: usa un logo casi cuadrado para mejor encuadre en navbar." };
    } else {
      if (width / height < 1.5) return { ok: true, hint: "Recomendacion: usa imagen panoramica (16:9 aprox) para mejor resultado." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo validar dimensiones de la imagen." };
  }
}

// ─── Checklist & contrast suggestions ────────────────────────────────────────

export type ThemeChecklistItem = { id: string; title: string; ok: boolean; detail: string };

export function buildStoreThemeChecklist(draft: StoreThemeConfig | null): ThemeChecklistItem[] {
  if (!draft) return [];
  const ctaContrast      = contrastRatio(draft.primaryColor, "#ffffff");
  const priceContrast    = contrastRatio(draft.priceColor,   draft.backgroundColor);
  const discountContrast = contrastRatio(draft.discountColor, draft.backgroundColor);
  return [
    {
      id:     "cta-contrast",
      title:  "Contraste CTA principal",
      ok:     (ctaContrast ?? 0) >= 4.5,
      detail: ctaContrast == null ? "No se pudo calcular" : `Ratio ${ctaContrast.toFixed(2)} (objetivo >= 4.5)`,
    },
    {
      id:     "price-contrast",
      title:  "Contraste color de precio",
      ok:     (priceContrast ?? 0) >= 3,
      detail: priceContrast == null ? "No se pudo calcular" : `Ratio ${priceContrast.toFixed(2)} (objetivo >= 3.0)`,
    },
    {
      id:     "discount-contrast",
      title:  "Contraste color de descuento",
      ok:     (discountContrast ?? 0) >= 3,
      detail: discountContrast == null ? "No se pudo calcular" : `Ratio ${discountContrast.toFixed(2)} (objetivo >= 3.0)`,
    },
    {
      id:     "display-name",
      title:  "Nombre visible definido",
      ok:     draft.displayName.trim().length > 1,
      detail: draft.displayName.trim().length > 1 ? "Nombre correcto" : "Define un nombre visible",
    },
    {
      id:     "logo",
      title:  "Logo configurado",
      ok:     draft.logoUrl.trim().length > 0,
      detail: draft.logoUrl.trim().length > 0 ? "Logo listo" : "Recomendado para una marca consistente",
    },
  ];
}

export type ContrastSuggestions = {
  changes: Array<{ key: keyof StoreThemeConfig; label: string; from: string; to: string; ratio: number | null; min: number }>;
  nextTheme: StoreThemeConfig | null;
};

export function buildContrastSuggestions(draft: StoreThemeConfig | null): ContrastSuggestions {
  if (!draft) return { changes: [], nextTheme: null };

  const rules: Array<{ key: keyof StoreThemeConfig; against: string; minRatio: number }> = [
    { key: "primaryColor",  against: "#ffffff",              minRatio: 4.5 },
    { key: "priceColor",    against: draft.backgroundColor,  minRatio: 3   },
    { key: "discountColor", against: draft.backgroundColor,  minRatio: 3   },
  ];

  const nextTheme: StoreThemeConfig = { ...draft };
  const changes: ContrastSuggestions["changes"] = [];

  rules.forEach((rule) => {
    const currentColor = draft[rule.key] as string;
    const currentRatio = contrastRatio(currentColor, rule.against);
    if ((currentRatio ?? 0) >= rule.minRatio) return;
    const suggested = suggestAccessibleColorNearTarget(currentColor, rule.against, rule.minRatio, draft.primaryColor);
    if (suggested.toLowerCase() === currentColor.toLowerCase()) return;
    nextTheme[rule.key] = suggested as never;
    changes.push({
      key:   rule.key,
      label: STORE_THEME_FIELD_LABELS[rule.key],
      from:  currentColor,
      to:    suggested,
      ratio: contrastRatio(suggested, rule.against),
      min:   rule.minRatio,
    });
  });

  return { changes, nextTheme: changes.length > 0 ? nextTheme : null };
}
