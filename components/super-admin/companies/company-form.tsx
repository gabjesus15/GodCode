"use client";

import { useMemo, useState } from "react";
import rut from 'rut.js';
// import validator from 'validator';
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { CompanySectionCard } from "./company-section-card";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { logAdminAction } from "@/utils/audit";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { getTenantBaseDomainStatic } from "@/utils/tenant-url";
import { slugify } from "@/utils/slugify";
import { uploadImage } from "@/lib/storage/upload-image-client";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { buildCompanyPanelAccessFromPlanFeatures } from "@/lib/super-admin/company-panel-access";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from "@/lib/super-admin/form-options";

interface PlanOption {
  id: string;
  name: string | null;
  price: number | null;
  features?: unknown;
}

interface CompanyFormProps {
  plans: PlanOption[];
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <div className="flex h-10 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-10 cursor-pointer rounded border-none bg-transparent p-0"
        />
        <span className="text-xs text-zinc-500">{value}</span>
      </div>
    </label>
  );
}

export function CompanyForm({ plans }: CompanyFormProps) {
  const { readOnly } = useAdminRole();
  const router = useRouter();
  const baseDomain = useMemo(() => getTenantBaseDomainStatic(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundUploadError, setBackgroundUploadError] = useState<
    string | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    public_slug: "",
    plan_id: "",
    display_name: "",
    primary_color: "#111827",
    secondary_color: "#111827",
    price_color: "#ff4757",
    discount_color: "#25d366",
    hover_color: "#ff2e40",
    background_color: "#0a0a0a",
    background_image_url: "",
    logo_url: "",
    country: "",
    currency: "",
    document: "",
  });

  const handleBackgroundUpload = async (file: File | null) => {
    if (!file) return;
    setBackgroundUploading(true);
    setBackgroundUploadError(null);

    try {
      const url = await uploadImage(file, "tenant");
      setForm((prev) => ({
        ...prev,
        background_image_url: url,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir la imagen.";
      setBackgroundUploadError(message);
    } finally {
      setBackgroundUploading(false);
    }
  };

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.plan_id) ?? null,
    [plans, form.plan_id]
  );

  const panelAccessByPlan = useMemo(
    () => buildCompanyPanelAccessFromPlanFeatures(selectedPlan?.features),
    [selectedPlan?.features]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) {
        throw new Error(permission.error);
      }

      const supabase = createSupabaseBrowserClient("super-admin");
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("No se pudo validar el usuario actual.");
      }

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (userError || !userRow?.id) {
        throw new Error("No se encontro el usuario interno para crear la empresa.");
      }

      // Comentario: empaquetamos el branding dentro de theme_config antes de insertar.
      const { data: created, error: insertError } = await supabase.from("companies").insert({
        name: form.name.trim(),
        public_slug: form.public_slug,
        plan_id: form.plan_id || null,
        subscription_status: "active",
        created_by: userRow.id,
        // Antes el formulario los pedía pero no los guardaba.
        country: form.country || null,
        currency: form.currency || null,
        legal_rut: form.document.trim() || null,
        theme_config: {
          displayName: form.display_name.trim() || form.name,
          primaryColor: form.primary_color,
          secondaryColor: form.secondary_color,
          priceColor: form.price_color,
          discountColor: form.discount_color,
          hoverColor: form.hover_color,
          logoUrl: form.logo_url,
          backgroundColor: form.background_color,
          backgroundImageUrl: form.background_image_url.trim() || null,
          panelAccess: panelAccessByPlan,
        },
      }).select("id").single();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("Ese subdominio ya esta en uso.");
        }
        throw insertError;
      }

      await logAdminAction({
        action: "company.create",
        targetType: "company",
        targetId: created?.id ?? form.public_slug,
        metadata: { plan_id: form.plan_id, public_slug: form.public_slug },
      });

      // A la ficha: ahí se fija el vencimiento (Suscripción → Extender) y se crean las sucursales.
      router.push(created?.id ? `/dashboard/empresa/${created.id}` : "/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la empresa.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const countryOptions = [{ value: "", label: "Selecciona un país" }, ...COUNTRY_OPTIONS];
  const currencyOptions = [{ value: "", label: "Según el país" }, ...CURRENCY_OPTIONS];

  const planOptions = [
    { value: "", label: "Selecciona un plan" },
    ...plans.map((plan) => ({
      value: plan.id,
      label: `${plan.name ?? "Plan"} - ${currency.format(Number(plan.price ?? 0))}`,
    })),
  ];

  return (
    <form className="flex flex-col gap-5 sm:gap-6" onSubmit={handleSubmit}>
      <CompanySectionCard
        title="Información general"
        description="Datos básicos del negocio y su dirección web."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nombre
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => {
                  const nextName = event.target.value;
                  const nextDisplayName = displayNameTouched ? prev.display_name : nextName;
                  if (slugTouched) {
                    return {
                      ...prev,
                      name: nextName,
                      display_name: nextDisplayName,
                    };
                  }

                  // Comentario: el slug se auto-genera mientras no haya edicion manual.
                  return {
                    ...prev,
                    name: nextName,
                    display_name: nextDisplayName,
                    public_slug: slugify(nextName),
                  };
                })
              }
              placeholder="Oishi Sushi"
              className="h-10 rounded-xl"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Subdominio
            <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
              <Input
                className="h-full border-none bg-transparent px-0 focus:border-none focus-visible:ring-0"
                value={form.public_slug}
                onChange={(event) => {
                  if (!slugTouched) {
                    setSlugTouched(true);
                  }
                  setForm((prev) => ({
                    ...prev,
                    // Comentario: saneamos el slug en tiempo real.
                    public_slug: slugify(event.target.value),
                  }));
                }}
                placeholder="oishi"
                required
              />
              <span className="text-xs text-zinc-400">.{baseDomain}</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nombre visible
            <Input
              value={form.display_name}
              onChange={(event) => {
                setDisplayNameTouched(true);
                setForm((prev) => ({ ...prev, display_name: event.target.value }));
              }}
              placeholder={form.name || "Nombre visible"}
              className="h-10 rounded-xl"
            />
          </label>

          <SaasSelect
            label="Plan"
            options={planOptions}
            value={form.plan_id}
            onChange={(value) => setForm((prev) => ({ ...prev, plan_id: value }))}
          />
        </div>
      </CompanySectionCard>

      <CompanySectionCard
        title="Ubicación y documento"
        description="País, moneda y documento de identificación del negocio."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SaasSelect
            label="País"
            options={countryOptions}
            value={form.country}
            onChange={(value) => setForm((prev) => ({ ...prev, country: value }))}
          />

          <SaasSelect
            label="Moneda"
            options={currencyOptions}
            value={form.currency}
            onChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
          />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">
            {form.country === "CL" ? 'RUT' : form.country === "VE" ? 'Cédula de Identidad (CI)' : 'Documento'}
            <Input
              value={form.document}
              onChange={e => setForm(prev => ({ ...prev, document: e.target.value }))}
              placeholder={form.country === "CL" ? '12.345.678-9' : form.country === "VE" ? 'Ej: 12345678' : 'Documento'}
              type={form.country === "VE" ? 'number' : 'text'}
              maxLength={form.country === "CL" ? 12 : 20}
              className="h-10 rounded-xl"
              required
            />
            {form.document.length > 3 && !(
              (form.country === "CL" && rut.validate(form.document)) ||
              (form.country === "VE" && /^[0-9]+$/.test(form.document) && form.document.length >= 6 && form.document.length <= 9) ||
              (form.country !== "CL" && form.country !== "VE" && form.document.length > 4)
            ) && (
              <span className="text-xs text-red-600 dark:text-red-400">Documento inválido</span>
            )}
          </label>
        </div>
      </CompanySectionCard>

      <CompanySectionCard
        title="Branding"
        description="Colores, logo e imagen de fondo del negocio."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ColorField label="Color primario" value={form.primary_color} onChange={(v) => setForm((prev) => ({ ...prev, primary_color: v }))} />
          <ColorField label="Color secundario" value={form.secondary_color} onChange={(v) => setForm((prev) => ({ ...prev, secondary_color: v }))} />
          <ColorField label="Color precio" value={form.price_color} onChange={(v) => setForm((prev) => ({ ...prev, price_color: v }))} />
          <ColorField label="Color descuento" value={form.discount_color} onChange={(v) => setForm((prev) => ({ ...prev, discount_color: v }))} />
          <ColorField label="Color hover botones" value={form.hover_color} onChange={(v) => setForm((prev) => ({ ...prev, hover_color: v }))} />
          <ColorField label="Fondo principal" value={form.background_color} onChange={(v) => setForm((prev) => ({ ...prev, background_color: v }))} />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Imagen de fondo (URL)
            <Input
              value={form.background_image_url}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  background_image_url: event.target.value,
                }))
              }
              placeholder="https://.../background.webp"
              className="h-10 rounded-xl"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Subir imagen de fondo
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleBackgroundUpload(event.target.files?.[0] ?? null)
              }
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900"
              disabled={backgroundUploading}
            />
            {backgroundUploading ? (
              <span className="text-xs text-zinc-500">Subiendo...</span>
            ) : null}
            {backgroundUploadError ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {backgroundUploadError}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">
            Logo URL
            <Input
              value={form.logo_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, logo_url: event.target.value }))
              }
              placeholder="https://.../logo.png"
              className="h-10 rounded-xl"
            />
          </label>
        </div>

        {/* Antes había una maqueta con productos de ejemplo iguales para todos; el menú
            real solo existe tras crear la empresa, y ahí se ve en «Marca del menú». */}
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          La vista previa del menú aparece al abrir la empresa, cuando ya esté creada.
        </p>
      </CompanySectionCard>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={loading} disabled={readOnly}>
          Crear empresa
        </Button>
      </div>
    </form>
  );
}
