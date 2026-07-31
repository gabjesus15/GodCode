"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { CompanySectionCard } from "./company-section-card";
import { CompanyUserManagement } from "./company-user-management";
import { CompanyUberCredentialsForm } from "./company-uber-credentials-form";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasCheckbox } from "@/components/super-admin/shared/saas-checkbox";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { logAdminAction } from "@/utils/audit";
import { requireAdminRole, roleSets } from "@/utils/admin";
import { getTenantBaseDomainStatic } from "@/utils/tenant-url";
import { slugify } from "@/utils/slugify";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";
import {
  buildCompanyPanelAccessFromPlanFeatures,
  normalizeCompanyPanelAccess,
} from "@/lib/super-admin/company-panel-access";
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "@/lib/super-admin/form-options";

const BrandingPreview = dynamic(
  () =>
    import("@/components/super-admin/branches/branding-preview").then(
      (mod) => mod.BrandingPreview,
    ),
  { ssr: false }
);

interface PlanOption {
  id: string;
  name: string | null;
  price: number | null;
  max_branches: number | null;
  features?: unknown;
}

interface CompanyData {
  id: string;
  name: string | null;
  legal_rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  public_slug: string | null;
  custom_domain?: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  country?: string | null;
  currency?: string | null;
  subscription_ends_at?: string | null;
  updated_at?: string | null;
  theme_config?: {
    primaryColor?: string;
    secondaryColor?: string;
    priceColor?: string;
    discountColor?: string;
    hoverColor?: string;
    logoUrl?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    displayName?: string;
    panelAccess?: string[];
    roleNavPermissions?: Record<string, string[]>;
  } | null;
}

interface BusinessInfo {
  name: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  schedule: string | null;
  country?: string | null;
  currency?: string | null;
}

interface PaymentHistory {
  id: string;
  amount_paid: number | null;
  payment_method: string | null;
  status: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  months_paid: number | null;
  reference_file_url?: string | null;
}

interface CompanyGlobalFormProps {
  company: CompanyData;
  businessInfo: BusinessInfo | null;
  plans: PlanOption[];
  payments: PaymentHistory[];
  brandingPreviewUrls?: {
    logoUrl?: string;
    backgroundImageUrl?: string;
  };
  uberIntegration: {
    clientId: string;
    hasClientSecret: boolean;
    allowTenantExternalDelivery: boolean;
  };
}

export function CompanyGlobalForm({
  company,
  businessInfo,
  plans,
  payments,
  brandingPreviewUrls,
  uberIntegration,
}: CompanyGlobalFormProps) {
  const { readOnly } = useAdminRole();
  const router = useRouter();
  const baseDomain = getTenantBaseDomainStatic();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<"stripe" | "mp" | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundUploadError, setBackgroundUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState({
    logoUrl: brandingPreviewUrls?.logoUrl ?? "",
    backgroundImageUrl: brandingPreviewUrls?.backgroundImageUrl ?? "",
  });

  const [companyForm, setCompanyForm] = useState({
    name: company.name ?? "",
    legal_rut: company.legal_rut ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    public_slug: company.public_slug ?? "",
    custom_domain: company.custom_domain ?? "",
    plan_id: company.plan_id ?? "",
    subscription_status: company.subscription_status ?? "active",
    country: company.country ?? "",
    currency: company.currency ?? "",
  });

  const [businessForm, setBusinessForm] = useState<BusinessInfo>({
    name: businessInfo?.name ?? "",
    phone: businessInfo?.phone ?? "",
    address: businessInfo?.address ?? "",
    instagram: businessInfo?.instagram ?? "",
    schedule: businessInfo?.schedule ?? "",
    country: businessInfo?.country ?? company.country ?? "",
    currency: businessInfo?.currency ?? company.currency ?? "",
  });

  const [themeForm, setThemeForm] = useState({
    displayName: company.theme_config?.displayName ?? "",
    primaryColor: company.theme_config?.primaryColor ?? "#111827",
    secondaryColor: company.theme_config?.secondaryColor ?? company.theme_config?.primaryColor ?? "#111827",
    priceColor: company.theme_config?.priceColor ?? "#ff4757",
    discountColor: company.theme_config?.discountColor ?? "#25d366",
    hoverColor: company.theme_config?.hoverColor ?? "#ff2e40",
    backgroundColor: company.theme_config?.backgroundColor ?? "#0a0a0a",
    backgroundImageUrl: company.theme_config?.backgroundImageUrl ?? "",
    logoUrl: company.theme_config?.logoUrl ?? "",
    panelAccess: normalizeCompanyPanelAccess(
      company.theme_config?.panelAccess ?? company.theme_config?.roleNavPermissions
    ),
  });

  const [monthsToAdd, setMonthsToAdd] = useState(1);
  const [monthsToBill, setMonthsToBill] = useState(1);

  const initialPlanId = company.plan_id;
  const initialStatus = company.subscription_status;

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }),
    []
  );

  const statusMap: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
    paid: "success",
    approved: "success",
    pending: "warning",
    pending_validation: "warning",
    rejected: "destructive",
    cancelled: "destructive",
  };

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === companyForm.plan_id) ?? null,
    [plans, companyForm.plan_id]
  );

  const planOptions = useMemo(
    () => [
      { value: "", label: "Sin plan" },
      ...plans.map((plan) => ({
        value: plan.id,
        label: `${plan.name ?? "Plan"} - ${currency.format(Number(plan.price ?? 0))}`,
      })),
    ],
    [plans, currency]
  );

  const isDevPlan = selectedPlan?.name?.toLowerCase().includes("dev") ?? false;
  const isBetaPlan = selectedPlan?.name?.toLowerCase().includes("beta") ?? false;
  const currentEndsAt = company.subscription_ends_at ? new Date(company.subscription_ends_at) : null;

  const panelAccessByPlan = useMemo(
    () => buildCompanyPanelAccessFromPlanFeatures(selectedPlan?.features),
    [selectedPlan?.features]
  );

  useEffect(() => {
    setPreviewUrls({
      logoUrl: brandingPreviewUrls?.logoUrl ?? "",
      backgroundImageUrl: brandingPreviewUrls?.backgroundImageUrl ?? "",
    });
  }, [brandingPreviewUrls?.logoUrl, brandingPreviewUrls?.backgroundImageUrl]);

  // Sincronizar businessForm si cambia la prop (refresh)
  useEffect(() => {
    setBusinessForm({
      name: businessInfo?.name ?? "",
      phone: businessInfo?.phone ?? "",
      address: businessInfo?.address ?? "",
      instagram: businessInfo?.instagram ?? "",
      schedule: businessInfo?.schedule ?? "",
      country: businessInfo?.country ?? company.country ?? "",
      currency: businessInfo?.currency ?? company.currency ?? "",
    });
  }, [businessInfo, company.country, company.currency]);

  useEffect(() => {
    setThemeForm({
      displayName: company.theme_config?.displayName ?? "",
      primaryColor: company.theme_config?.primaryColor ?? "#111827",
      secondaryColor:
        company.theme_config?.secondaryColor ?? company.theme_config?.primaryColor ?? "#111827",
      priceColor: company.theme_config?.priceColor ?? "#ff4757",
      discountColor: company.theme_config?.discountColor ?? "#25d366",
      hoverColor: company.theme_config?.hoverColor ?? "#ff2e40",
      backgroundColor: company.theme_config?.backgroundColor ?? "#0a0a0a",
      backgroundImageUrl: company.theme_config?.backgroundImageUrl ?? "",
      logoUrl: company.theme_config?.logoUrl ?? "",
      panelAccess: normalizeCompanyPanelAccess(
        company.theme_config?.panelAccess ?? company.theme_config?.roleNavPermissions,
      ),
    });
    setCompanyForm({
      name: company.name ?? "",
      legal_rut: company.legal_rut ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      public_slug: company.public_slug ?? "",
      custom_domain: company.custom_domain ?? "",
      plan_id: company.plan_id ?? "",
      subscription_status: company.subscription_status ?? "active",
      country: company.country ?? "",
      currency: company.currency ?? "",
    });
  }, [company]);

  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const uploadStorefrontAsset = async (
    file: File,
    field: "logoUrl" | "backgroundImageUrl",
  ): Promise<{ path: string; signedUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);
    const response = await fetch(`/api/super-admin/companies/${company.id}`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      path?: string;
      signedUrl?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || "No se pudo subir la imagen.");
    }
    const path = String(payload.path ?? "").trim();
    if (!path) throw new Error("El almacenamiento no devolvio el path.");
    return { path, signedUrl: String(payload.signedUrl ?? "").trim() };
  };

  const handleBackgroundUpload = async (file: File | null) => {
    if (!file) return;
    setBackgroundUploading(true);
    setBackgroundUploadError(null);
    try {
      const { path, signedUrl } = await uploadStorefrontAsset(file, "backgroundImageUrl");
      setThemeForm((prev) => ({ ...prev, backgroundImageUrl: path }));
      setPreviewUrls((prev) => ({ ...prev, backgroundImageUrl: signedUrl || path }));
    } catch (err) {
      setBackgroundUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setBackgroundUploading(false);
    }
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    setLogoUploading(true);
    setLogoUploadError(null);
    try {
      const { path, signedUrl } = await uploadStorefrontAsset(file, "logoUrl");
      setThemeForm((prev) => ({ ...prev, logoUrl: path }));
      setPreviewUrls((prev) => ({ ...prev, logoUrl: signedUrl || path }));
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : "No se pudo subir el logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCheckout = async (provider: "stripe" | "mp") => {
    setBillingError(null);
    setBillingLoading(provider);
    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);
      if (!selectedPlan?.id) throw new Error("Selecciona un plan antes de cobrar.");
      if (isDevPlan) throw new Error("El plan interno no se puede cobrar.");
      if (monthsToBill <= 0) throw new Error("Define una cantidad válida de meses.");

      const supabase = createSupabaseBrowserClient("super-admin");
      const functionName = provider === "stripe" ? "stripe-checkout" : "mercadopago-preference";
      const { data, error: invokeError } = await supabase.functions.invoke(functionName, {
        body: {
          company_id: company.id,
          plan_id: selectedPlan.id,
          months: monthsToBill,
        },
      });

      if (invokeError) throw invokeError;
      const url = provider === "stripe" ? (data?.url as string) : (data?.init_point as string);
      if (!url) throw new Error("No se pudo generar el link de pago.");

      await logAdminAction({
        action: "billing.checkout",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: { provider, months: monthsToBill },
      });

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "No se pudo iniciar el cobro.");
    } finally {
      setBillingLoading(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);

      const response = await fetch(`/api/super-admin/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: company.updated_at ?? null,
          company: {
            name: companyForm.name.trim(),
            legal_rut: companyForm.legal_rut.trim(),
            email: companyForm.email.trim(),
            phone: companyForm.phone.trim(),
            address: companyForm.address.trim(),
            public_slug: companyForm.public_slug.trim(),
            custom_domain: companyForm.custom_domain.trim() || null,
            plan_id: companyForm.plan_id || null,
            subscription_status: companyForm.subscription_status,
            country: companyForm.country || null,
            currency: companyForm.currency || null,
          },
          businessInfo: {
            name: businessForm.name?.trim() || null,
            phone: businessForm.phone?.trim() || null,
            address: businessForm.address?.trim() || null,
            instagram: businessForm.instagram?.trim() || null,
            schedule: businessForm.schedule?.trim() || null,
            country: businessForm.country || null,
            currency: businessForm.currency || null,
          },
          themePatch: {
            displayName: themeForm.displayName.trim() || null,
            primaryColor: themeForm.primaryColor,
            secondaryColor: themeForm.secondaryColor,
            priceColor: themeForm.priceColor,
            discountColor: themeForm.discountColor,
            hoverColor: themeForm.hoverColor,
            logoUrl: themeForm.logoUrl,
            backgroundColor: themeForm.backgroundColor,
            backgroundImageUrl: themeForm.backgroundImageUrl.trim() || null,
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudieron guardar los cambios.");
      }

      await logAdminAction({
        action: "company.update",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: {
          plan_changed: initialPlanId !== companyForm.plan_id,
          status_changed: initialStatus !== companyForm.subscription_status,
          via: "api",
        },
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    setExtendLoading(true);
    setExtendError(null);
    try {
      const permission = await requireAdminRole(roleSets.billing);
      if (!permission.ok) throw new Error(permission.error);
      if (isDevPlan) throw new Error("El plan interno no requiere vencimiento.");
      if (monthsToAdd <= 0) throw new Error("Define una cantidad válida de meses.");

      const supabase = createSupabaseBrowserClient("super-admin");
      const now = new Date();
      const baseDate = currentEndsAt && currentEndsAt > now ? currentEndsAt : now;
      const newEndsAt = addDays(baseDate, monthsToAdd * 30);
      const amount = Number(selectedPlan?.price ?? 0) * monthsToAdd;

      const { error: updateError } = await supabase
        .from("companies")
        .update({
          subscription_ends_at: newEndsAt.toISOString(),
          subscription_status: "active",
          updated_at: now.toISOString(),
          ...(company.custom_domain?.trim()
            ? { custom_domain_expires_at: newEndsAt.toISOString() }
            : {}),
        })
        .eq("id", company.id);

      if (updateError) throw updateError;

      const { error: paymentError } = await supabase.from("payments_history").insert({
        company_id: company.id,
        plan_id: selectedPlan?.id ?? companyForm.plan_id ?? null,
        amount_paid: amount,
        payment_method: "manual",
        payment_reference: "admin-extension",
        payment_date: now.toISOString(),
        status: "paid",
        months_paid: monthsToAdd,
      });

      if (paymentError) throw paymentError;

      await logAdminAction({
        action: "billing.extend",
        targetType: "company",
        targetId: company.id,
        companyId: company.id,
        metadata: { months: monthsToAdd, amount },
      });

      router.refresh();
    } catch (err) {
      setExtendError(err instanceof Error ? err.message : "No se pudo extender la suscripción.");
    } finally {
      setExtendLoading(false);
    }
  };

  return (
    <form className="mx-auto flex w-full max-w-6xl flex-col gap-6" onSubmit={handleSubmit}>
      <fieldset disabled={loading} className="flex flex-col gap-6">
        {/* Datos generales */}
        <CompanySectionCard title="Datos generales" description="Información fiscal y de contacto del tenant.">
          <div className="grid gap-4 md:grid-cols-2">
            <SaasSelect
              label="País"
              value={companyForm.country}
              onChange={(value) => setCompanyForm((prev) => ({ ...prev, country: value }))}
              options={COUNTRY_OPTIONS}
            />
            <SaasSelect
              label="Moneda"
              value={companyForm.currency}
              onChange={(value) => setCompanyForm((prev) => ({ ...prev, currency: value }))}
              options={CURRENCY_OPTIONS}
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre
              <Input
                value={companyForm.name}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre comercial"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              RUT legal
              <Input
                value={companyForm.legal_rut}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, legal_rut: e.target.value }))}
                placeholder="99.999.999-9"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
              <Input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@empresa.com"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Teléfono
              <Input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dirección
              <Input
                value={companyForm.address}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Av. Siempre Viva 742"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Public slug
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
                <Input
                  className="h-10 border-none px-0 focus:border-none dark:bg-transparent"
                  value={companyForm.public_slug}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({ ...prev, public_slug: slugify(e.target.value) }))
                  }
                  placeholder="empresa-demo"
                  required
                />
                <span className="text-xs text-zinc-400">.{baseDomain}</span>
              </div>
            </label>
            <SaasSelect
              label="Estado de suscripción"
              value={companyForm.subscription_status}
              onChange={(value) => setCompanyForm((prev) => ({ ...prev, subscription_status: value }))}
              options={SUBSCRIPTION_STATUS_OPTIONS}
            />
            <SaasSelect
              label="Plan"
              value={companyForm.plan_id}
              onChange={(value) => setCompanyForm((prev) => ({ ...prev, plan_id: value }))}
              options={planOptions}
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">
              Dominio personalizado (opcional)
              <Input
                value={companyForm.custom_domain}
                onChange={(e) => setCompanyForm((prev) => ({ ...prev, custom_domain: e.target.value }))}
                placeholder="menu.tunegocio.com (sin https://)"
              />
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                Si está vacío, el negocio sigue usando{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {companyForm.public_slug}.{baseDomain}
                </span>
                . Añade el mismo host en Vercel y en DNS. La vigencia del dominio personalizado sigue la{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  fecha de vencimiento de la suscripción
                </span>
                .
              </span>
            </label>
          </div>
        </CompanySectionCard>

        {/* Información pública del negocio */}
        <CompanySectionCard
          title="Información pública del negocio"
          description="Datos que se muestran en el menú y la ficha pública del negocio."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre público
              <Input
                value={businessForm.name ?? ""}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={companyForm.name || "Nombre público"}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Teléfono público
              <Input
                value={businessForm.phone ?? ""}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Dirección pública
              <Input
                value={businessForm.address ?? ""}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Av. Siempre Viva 742"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Instagram
              <Input
                value={businessForm.instagram ?? ""}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, instagram: e.target.value }))}
                placeholder="@empresa"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">
              Horario
              <Input
                value={businessForm.schedule ?? ""}
                onChange={(e) => setBusinessForm((prev) => ({ ...prev, schedule: e.target.value }))}
                placeholder="Lun - Dom: 10:00 - 22:00"
              />
            </label>
          </div>
        </CompanySectionCard>

        {/* Branding */}
        <CompanySectionCard title="Branding" description="Colores, logo e imagen de fondo del tenant.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre visible
              <Input
                value={themeForm.displayName}
                onChange={(e) => setThemeForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder={companyForm.name || "Nombre visible"}
              />
            </label>
            <ColorField
              label="Color primario"
              value={themeForm.primaryColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, primaryColor: value }))}
            />
            <ColorField
              label="Color secundario"
              value={themeForm.secondaryColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, secondaryColor: value }))}
            />
            <ColorField
              label="Color precio"
              value={themeForm.priceColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, priceColor: value }))}
            />
            <ColorField
              label="Color descuento"
              value={themeForm.discountColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, discountColor: value }))}
            />
            <ColorField
              label="Color hover botones"
              value={themeForm.hoverColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, hoverColor: value }))}
            />
            <ColorField
              label="Fondo principal"
              value={themeForm.backgroundColor}
              onChange={(value) => setThemeForm((prev) => ({ ...prev, backgroundColor: value }))}
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subir imagen de fondo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleBackgroundUpload(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900"
                disabled={backgroundUploading}
              />
              {backgroundUploading && <span className="text-xs text-zinc-500">Subiendo...</span>}
              {backgroundUploadError && <span className="text-xs text-red-600">{backgroundUploadError}</span>}
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subir logo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900"
                disabled={logoUploading}
              />
              {logoUploading && <span className="text-xs text-zinc-500">Subiendo...</span>}
              {logoUploadError && <span className="text-xs text-red-600">{logoUploadError}</span>}
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-100 p-3 dark:border-zinc-800">
            <BrandingPreview
              displayName={themeForm.displayName}
              name={companyForm.name}
              publicSlug={companyForm.public_slug}
              primaryColor={themeForm.primaryColor}
              secondaryColor={themeForm.secondaryColor}
              backgroundColor={themeForm.backgroundColor}
              backgroundImageUrl={previewUrls.backgroundImageUrl || themeForm.backgroundImageUrl}
              logoUrl={previewUrls.logoUrl || themeForm.logoUrl}
              priceColor={themeForm.priceColor}
              discountColor={themeForm.discountColor}
              hoverColor={themeForm.hoverColor}
            />
          </div>
        </CompanySectionCard>

        {/* Accesos del panel */}
        <CompanySectionCard
          title="Accesos del panel de la empresa"
          description="Secciones disponibles según el plan seleccionado."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {TENANT_ADMIN_TAB_OPTIONS.map((tab) => {
              const checked = panelAccessByPlan.includes(tab.id);
              return <SaasCheckbox key={tab.id} checked={checked} label={tab.label} disabled readOnly />;
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Para cambiar estos accesos, edita las funciones del plan en la sección de Planes.
          </p>
        </CompanySectionCard>

        <CompanyUberCredentialsForm
          companyId={company.id}
          initialClientId={uberIntegration.clientId}
          hasClientSecret={uberIntegration.hasClientSecret}
          initialAllowTenantExternalDelivery={uberIntegration.allowTenantExternalDelivery}
        />

        {/* Suscripción */}
        <CompanySectionCard
          title="Suscripción"
          description="Extiende el acceso manualmente usando meses de 30 días."
        >
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Vence:</span>
            {isDevPlan ? (
              <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                Ilimitado (interno)
              </span>
            ) : currentEndsAt ? (
              <span>{dateFormatter.format(currentEndsAt)}</span>
            ) : (
              <span>Sin fecha definida</span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Meses a agregar
              <Input
                type="number"
                min={1}
                value={monthsToAdd}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMonthsToAdd(Number.isNaN(value) ? 0 : value);
                }}
                disabled={isDevPlan}
              />
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleExtend}
                loading={extendLoading}
                disabled={readOnly || isDevPlan || monthsToAdd <= 0}
              >
                Extender suscripción
              </Button>
            </div>
            <div className="mb-2 self-end text-xs text-zinc-500 dark:text-zinc-400">
              Se calcula desde hoy o desde la fecha de vencimiento actual.
            </div>
          </div>

          {extendError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {extendError}
            </div>
          )}
        </CompanySectionCard>

        {/* Cobros */}
        <CompanySectionCard title="Cobros" description="Genera links de pago con Stripe o MercadoPago.">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Meses a cobrar
              <Input
                type="number"
                min={1}
                value={monthsToBill}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setMonthsToBill(Number.isNaN(value) ? 0 : value);
                }}
                disabled={!selectedPlan?.id || isDevPlan}
              />
            </label>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                onClick={() => handleCheckout("stripe")}
                loading={billingLoading === "stripe"}
                disabled={readOnly || !selectedPlan?.id || isDevPlan || monthsToBill <= 0}
              >
                Pagar con Stripe
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckout("mp")}
                loading={billingLoading === "mp"}
                disabled={readOnly || !selectedPlan?.id || isDevPlan || monthsToBill <= 0}
              >
                Pagar con MercadoPago
              </Button>
            </div>
            <div className="mb-2 self-end text-xs text-zinc-500 dark:text-zinc-400">
              El cobro usa la regla de 30 días por mes.
            </div>
          </div>

          {billingError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {billingError}
            </div>
          )}
        </CompanySectionCard>

        {/* Historial de pagos */}
        <CompanySectionCard title="Historial de pagos" description="Últimos movimientos registrados.">
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              No hay pagos registrados.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
              {payments.map((payment) => {
                const statusKey = payment.status?.toLowerCase() ?? "neutral";
                const badge = statusMap[statusKey] ?? "neutral";
                return (
                  <div
                    key={payment.id}
                    className="grid gap-3 px-4 py-3 text-sm md:grid-cols-5"
                  >
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Fecha</p>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {payment.payment_date ? dateFormatter.format(new Date(payment.payment_date)) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Monto</p>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {currency.format(Number(payment.amount_paid ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Método</p>
                      <p className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                        {payment.payment_method ?? "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Estado</p>
                      <Badge variant={badge} className="capitalize">
                        {payment.status ?? "--"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Referencia</p>
                      <p
                        className="truncate font-medium text-zinc-900 dark:text-zinc-100"
                        title={payment.payment_reference ?? ""}
                      >
                        {payment.payment_reference ?? "--"}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {payment.months_paid ? `${payment.months_paid} mes(es)` : ""}
                      </p>
                      {payment.reference_file_url && (
                        <a
                          href={payment.reference_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                        >
                          Ver comprobante
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CompanySectionCard>

        {/* Usuarios y roles */}
        <CompanySectionCard title="Usuarios y roles" description="Gestiona los correos y roles asignados a esta empresa.">
          <CompanyUserManagement companyId={company.id} />
        </CompanySectionCard>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}
      </fieldset>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <Button
          type="submit"
          loading={loading}
          disabled={readOnly}
          className="shadow-lg shadow-zinc-200 dark:shadow-zinc-900"
          size="lg"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
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
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700"
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{value}</span>
      </div>
    </label>
  );
}
