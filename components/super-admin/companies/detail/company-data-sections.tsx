"use client";

import { Input } from "@/components/ui/input";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from "@/lib/super-admin/form-options";
import { slugify } from "@/utils/slugify";
import { getTenantBaseDomainStatic } from "@/utils/tenant-url";
import { Field, SectionCard, SectionSaveBar, useCompanySection } from "./company-section";
import type { CompanyDetail, CompanyBusinessInfo } from "./company-detail-types";

/** Si la base tiene un valor que no está en la lista (datos antiguos), se muestra igual. */
function withCurrent(options: Array<{ value: string; label: string }>, current: string) {
  if (!current || options.some((option) => option.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

function taxIdLabel(country: string): string {
  const c = country.toUpperCase();
  if (c === "CL" || c === "CHILE") return "RUT";
  if (c === "VE" || c === "VENEZUELA") return "RIF o cédula";
  return "Identificación fiscal";
}

export function CompanyGeneralSection({ company }: { company: CompanyDetail }) {
  const { readOnly } = useAdminRole();
  const baseDomain = getTenantBaseDomainStatic();
  const section = useCompanySection({
    name: company.name ?? "",
    legal_rut: company.legal_rut ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    country: company.country ?? "",
    currency: company.currency ?? "",
    public_slug: company.public_slug ?? "",
    custom_domain: company.custom_domain ?? "",
  });
  const v = section.values;

  const onSave = () =>
    void section.save(
      (current) => ({ company: current }),
      (response, current) => ({
        ...current,
        public_slug: String(response.company?.public_slug ?? current.public_slug),
        custom_domain: String(response.company?.custom_domain ?? ""),
      }),
    );

  return (
    <SectionCard
      title="Datos de la empresa"
      description="Datos fiscales y de contacto. No se muestran en el menú público."
      footer={<SectionSaveBar {...section} onSave={onSave} onReset={section.reset} />}
    >
      <fieldset disabled={readOnly || section.saving} className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <Input value={v.name} onChange={(e) => section.set("name", e.target.value)} required maxLength={120} />
        </Field>
        <Field label={taxIdLabel(v.country)}>
          <Input value={v.legal_rut} onChange={(e) => section.set("legal_rut", e.target.value)} maxLength={30} />
        </Field>
        <Field label="Correo">
          <Input type="email" value={v.email} onChange={(e) => section.set("email", e.target.value)} placeholder="contacto@empresa.com" />
        </Field>
        <Field label="Teléfono">
          <Input value={v.phone} onChange={(e) => section.set("phone", e.target.value)} placeholder="+56 9 1234 5678" />
        </Field>
        <Field label="Dirección fiscal" className="md:col-span-2">
          <Input value={v.address} onChange={(e) => section.set("address", e.target.value)} />
        </Field>
        <SaasSelect
          label="País"
          value={v.country}
          onChange={(value) => section.set("country", value)}
          options={withCurrent([{ value: "", label: "Sin país" }, ...COUNTRY_OPTIONS], v.country)}
        />
        <SaasSelect
          label="Moneda de la tienda"
          value={v.currency}
          onChange={(value) => section.set("currency", value)}
          options={withCurrent([{ value: "", label: "Según el país" }, ...CURRENCY_OPTIONS], v.currency)}
        />
        <Field
          label="Subdominio"
          hint={
            v.public_slug !== (company.public_slug ?? "")
              ? "Ojo: cambiar el subdominio rompe los enlaces y códigos QR que ya compartió el negocio."
              : undefined
          }
        >
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
            <Input
              className="h-10 border-none px-0 focus:border-none dark:bg-transparent"
              value={v.public_slug}
              onChange={(e) => section.set("public_slug", slugify(e.target.value, { maxLength: 80 }))}
              required
            />
            <span className="shrink-0 text-xs text-zinc-400">.{baseDomain}</span>
          </div>
        </Field>
        <Field
          label="Dominio propio"
          hint={
            v.custom_domain.trim()
              ? "Debe estar configurado en Vercel y en el DNS del cliente. Vence junto con la suscripción."
              : `Sin dominio propio: el menú está en ${v.public_slug || "subdominio"}.${baseDomain}`
          }
        >
          <Input
            value={v.custom_domain}
            onChange={(e) => section.set("custom_domain", e.target.value)}
            placeholder="menu.tunegocio.com"
          />
        </Field>
      </fieldset>
    </SectionCard>
  );
}

export function CompanyPublicInfoSection({ businessInfo, companyName }: { businessInfo: CompanyBusinessInfo | null; companyName: string }) {
  const { readOnly } = useAdminRole();
  const section = useCompanySection({
    name: businessInfo?.name ?? "",
    phone: businessInfo?.phone ?? "",
    address: businessInfo?.address ?? "",
    instagram: businessInfo?.instagram ?? "",
    schedule: businessInfo?.schedule ?? "",
  });
  const v = section.values;
  const onSave = () => void section.save((current) => ({ businessInfo: current }));

  return (
    <SectionCard
      title="Información pública"
      description="Lo que ven los clientes en la página de inicio del negocio. El dueño también la edita desde /cuenta."
      footer={<SectionSaveBar {...section} onSave={onSave} onReset={section.reset} />}
    >
      <fieldset disabled={readOnly || section.saving} className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre público">
          <Input value={v.name} onChange={(e) => section.set("name", e.target.value)} placeholder={companyName} />
        </Field>
        <Field label="Teléfono o WhatsApp">
          <Input value={v.phone} onChange={(e) => section.set("phone", e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={v.address} onChange={(e) => section.set("address", e.target.value)} />
        </Field>
        <Field label="Instagram">
          <Input value={v.instagram} onChange={(e) => section.set("instagram", e.target.value)} placeholder="@negocio" />
        </Field>
        <Field label="Horario" className="md:col-span-2">
          <Input value={v.schedule} onChange={(e) => section.set("schedule", e.target.value)} placeholder="Lun a dom: 12:00 a 23:00" />
        </Field>
      </fieldset>
    </SectionCard>
  );
}
