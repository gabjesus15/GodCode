"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { SaasCheckbox } from "@/components/super-admin/shared/saas-checkbox";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";
import { Field, SectionCard, SectionSaveBar, useCompanySection } from "./company-section";
import type { CompanyDetail, CompanyPlanOption } from "./company-detail-types";

const BrandingPreview = dynamic(
  () => import("@/components/super-admin/branches/branding-preview").then((mod) => mod.BrandingPreview),
  { ssr: false },
);

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Color principal" },
  { key: "secondaryColor", label: "Color secundario" },
  { key: "priceColor", label: "Precios" },
  { key: "discountColor", label: "Descuentos" },
  { key: "hoverColor", label: "Botones al pasar el mouse" },
  { key: "backgroundColor", label: "Fondo" },
] as const;

type AssetField = "logoUrl" | "backgroundImageUrl";

export function CompanyBrandingSection({
  company,
  previewUrls: initialPreviewUrls,
}: {
  company: CompanyDetail;
  previewUrls: { logoUrl?: string; backgroundImageUrl?: string };
}) {
  const { readOnly } = useAdminRole();
  const theme = company.theme_config ?? {};
  const section = useCompanySection({
    displayName: theme.displayName ?? "",
    primaryColor: theme.primaryColor ?? "#111827",
    secondaryColor: theme.secondaryColor ?? theme.primaryColor ?? "#111827",
    priceColor: theme.priceColor ?? "#ff4757",
    discountColor: theme.discountColor ?? "#25d366",
    hoverColor: theme.hoverColor ?? "#ff2e40",
    backgroundColor: theme.backgroundColor ?? "#0a0a0a",
    logoUrl: theme.logoUrl ?? "",
    backgroundImageUrl: theme.backgroundImageUrl ?? "",
  });
  const v = section.values;
  const [previewUrls, setPreviewUrls] = useState({
    logoUrl: initialPreviewUrls.logoUrl ?? "",
    backgroundImageUrl: initialPreviewUrls.backgroundImageUrl ?? "",
  });
  const [uploading, setUploading] = useState<AssetField | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (file: File | null, field: AssetField) => {
    if (!file) return;
    setUploading(field);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("field", field);
      const res = await fetch(`/api/super-admin/companies/${company.id}`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; path?: string; signedUrl?: string };
      if (!res.ok || !data.path) {
        setUploadError(data.error ?? "No se pudo subir la imagen.");
        return;
      }
      section.set(field, data.path);
      setPreviewUrls((prev) => ({ ...prev, [field]: data.signedUrl || data.path || "" }));
    } catch {
      setUploadError("No se pudo subir la imagen.");
    } finally {
      setUploading(null);
    }
  };

  const onSave = () => void section.save((current) => ({ themePatch: current }));

  return (
    <SectionCard
      title="Marca del menú"
      description="Colores, logo y fondo del menú público. El dueño puede ajustarlos desde /cuenta; si tiene cambios sin publicar, se conservan."
      footer={<SectionSaveBar {...section} onSave={onSave} onReset={section.reset} saveLabel="Guardar y publicar" />}
    >
      <fieldset disabled={readOnly || section.saving} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="Nombre visible" className="sm:col-span-2">
            <Input value={v.displayName} onChange={(e) => section.set("displayName", e.target.value)} placeholder={company.name ?? ""} />
          </Field>
          {COLOR_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <div className="flex h-10 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
                <input
                  type="color"
                  value={v[key]}
                  onChange={(e) => section.set(key, e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
                  aria-label={label}
                />
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{v[key]}</span>
              </div>
            </Field>
          ))}
          <Field label="Logo" hint={uploading === "logoUrl" ? "Subiendo…" : "JPG, PNG, WebP o GIF."}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void upload(e.target.files?.[0] ?? null, "logoUrl")}
              disabled={uploading != null}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          <Field label="Imagen de fondo" hint={uploading === "backgroundImageUrl" ? "Subiendo…" : "Opcional."}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void upload(e.target.files?.[0] ?? null, "backgroundImageUrl")}
              disabled={uploading != null}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
          {v.backgroundImageUrl ? (
            <button
              type="button"
              onClick={() => {
                section.set("backgroundImageUrl", "");
                setPreviewUrls((prev) => ({ ...prev, backgroundImageUrl: "" }));
              }}
              className="justify-self-start text-sm font-medium text-red-600 hover:underline dark:text-red-400 sm:col-span-2"
            >
              Quitar imagen de fondo
            </button>
          ) : null}
          {uploadError ? <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2" role="alert">{uploadError}</p> : null}
        </div>
        <div className="rounded-2xl border border-zinc-100 p-3 dark:border-zinc-800">
          <BrandingPreview
            displayName={v.displayName}
            name={company.name ?? ""}
            publicSlug={company.public_slug ?? ""}
            primaryColor={v.primaryColor}
            secondaryColor={v.secondaryColor}
            backgroundColor={v.backgroundColor}
            backgroundImageUrl={v.backgroundImageUrl ? previewUrls.backgroundImageUrl || v.backgroundImageUrl : ""}
            logoUrl={previewUrls.logoUrl || v.logoUrl}
            priceColor={v.priceColor}
            discountColor={v.discountColor}
            hoverColor={v.hoverColor}
          />
        </div>
      </fieldset>
    </SectionCard>
  );
}

export function CompanyPanelAccessSection({ company, plans }: { company: CompanyDetail; plans: CompanyPlanOption[] }) {
  const plan = plans.find((item) => item.id === company.plan_id) ?? null;
  const access = buildCompanyPanelAccessFromPlanFeatures(plan?.features);
  return (
    <SectionCard
      title="Secciones del panel del negocio"
      description={`Las define el plan${plan?.name ? ` ${plan.name}` : ""}. Para cambiarlas, edita las funciones del plan en «Planes».`}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {TENANT_ADMIN_TAB_OPTIONS.map((tab) => (
          <SaasCheckbox key={tab.id} checked={access.includes(tab.id)} label={tab.label} disabled readOnly />
        ))}
      </div>
    </SectionCard>
  );
}
