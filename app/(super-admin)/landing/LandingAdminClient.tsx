"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, LayoutTemplate, MoveDown, MoveUp, RefreshCcw, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SaasMetricCard } from "@/components/super-admin/shared/saas-metric-card";
import { SaasChartCard } from "@/components/super-admin/shared/saas-chart-card";
import { AppleMultiAreaChart } from "@/components/super-admin/shared/apple-multi-area-chart";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { SaasSegmentedTabs } from "@/components/super-admin/shared/saas-segmented-tabs";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasSwitch } from "@/components/super-admin/shared/saas-switch";
import { uploadImage } from "@/components/tenant/utils/cloudinary";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";

type LeadItem = {
  id: string;
  email: string;
  status: "new" | "contacted" | "closed";
  source: string;
  createdAt: string;
};

type ContactItem = {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  status: "new" | "contacted" | "closed";
  source: string;
  createdAt: string;
};

type MediaRow = {
  key: string;
  src: string;
  alt: string | null;
  label: string | null;
  sub: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type WebhookItem = {
  id: string;
  name: string;
  destinationType: "slack" | "email";
  url: string;
  events: string[];
  isActive: boolean;
  secret: string | null;
};

type Overview = {
  metrics: {
    leadsTotal: number;
    contactsTotal: number;
    inboxTotal: number;
    leadsByStatus: Record<string, number>;
    contactsByStatus: Record<string, number>;
    landingViews30d?: number;
    landingUniqueVisitors30d?: number;
    tenantViews30d?: number;
    tenantUniqueVisitors30d?: number;
    tenantTop30d?: Array<{
      companyId: string | null;
      tenantSlug: string;
      companyName: string;
      views: number;
      uniqueVisitors: number;
    }>;
    countryTop30d?: Array<{
      countryCode: string;
      views: number;
      uniqueVisitors: number;
    }>;
  };
  series: { date: string; leads: number; contacts: number; landingViews?: number; tenantViews?: number }[];
};

type TabKey = "overview" | "inbox" | "media" | "webhooks";

const STATUS_VALUES = ["new", "contacted", "closed"] as const;

const emptyWebhook = {
  id: "",
  name: "",
  destinationType: "slack" as "slack" | "email",
  url: "",
  events: ["lead.created", "contact.created"],
  isActive: true,
  secret: "",
};

const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

function isCloudinaryUrl(url: string): boolean {
  try {
    const absoluteUrl = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(absoluteUrl);
    const isValidHost = parsed.hostname === "res.cloudinary.com" || parsed.hostname.endsWith(".res.cloudinary.com");
    return isValidHost && url.includes(CLOUDINARY_UPLOAD_SEGMENT);
  } catch {
    return false;
  }
}

function replaceCloudinaryTransform(url: string, transform: string | null): string {
  if (!isCloudinaryUrl(url)) return url;
  const [base, query] = url.split("?");
  const idx = base.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (idx < 0) return url;

  const prefix = base.slice(0, idx + CLOUDINARY_UPLOAD_SEGMENT.length);
  const tail = base.slice(idx + CLOUDINARY_UPLOAD_SEGMENT.length);
  const parts = tail.split("/").filter(Boolean);
  if (parts.length === 0) return url;

  let versionSegment = "";
  let current = parts[0] || "";

  if (/^v\d+$/.test(current)) {
    versionSegment = current;
    parts.shift();
    current = parts[0] || "";
  }

  if (current.includes("_") || current.includes(",")) {
    parts.shift();
  }

  const rebuilt = [prefix.replace(/\/$/, "")];
  if (transform?.trim()) rebuilt.push(transform.trim());
  if (versionSegment) rebuilt.push(versionSegment);
  rebuilt.push(...parts);

  const out = rebuilt.join("/");
  return query ? `${out}?${query}` : out;
}

function mediaGroupForKey(key: string): "hero" | "features" | "slides" | "otros" {
  if (key.startsWith("hero.")) return "hero";
  if (key.startsWith("feature.")) return "features";
  if (key.startsWith("slide.")) return "slides";
  return "otros";
}

function mediaTitleFromKey(key: string): string {
  if (key === "hero.laptop") return "Hero laptop";
  if (key === "hero.phone") return "Hero phone";
  if (key === "feature.menu") return "Feature menu";
  if (key === "feature.pos") return "Feature POS";
  if (key === "feature.inventory") return "Feature inventario";
  if (key.startsWith("slide.")) return `Slide ${key.replace("slide.", "")}`;
  return key;
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function LandingAdminClient() {
  const { readOnly } = useAdminRole();
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [savingMedia, setSavingMedia] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [webhookForm, setWebhookForm] = useState(emptyWebhook);
  const [selectedMediaKey, setSelectedMediaKey] = useState<string>("");
  const [mediaPreset, setMediaPreset] = useState<"hero" | "feature" | "mobile" | "custom">("feature");
  const [mediaWidth, setMediaWidth] = useState<string>("1400");
  const [mediaHeight, setMediaHeight] = useState<string>("900");
  const [mediaCrop, setMediaCrop] = useState<string>("fill");
  const [mediaGravity, setMediaGravity] = useState<string>("auto");
  const [mediaQuality, setMediaQuality] = useState<string>("auto");
  const [mediaFormat, setMediaFormat] = useState<string>("auto");

  const [leadFilter, setLeadFilter] = useState<string>("all");
  const [contactFilter, setContactFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, leadsRes, contactsRes, mediaRes, webhooksRes] = await Promise.all([
        fetch("/api/super-admin/landing/overview", { cache: "no-store" }),
        fetch("/api/super-admin/landing/leads?limit=100", { cache: "no-store" }),
        fetch("/api/super-admin/landing/contacts?limit=100", { cache: "no-store" }),
        fetch("/api/super-admin/landing/media", { cache: "no-store" }),
        fetch("/api/super-admin/landing/webhooks", { cache: "no-store" }),
      ]);

      const [overviewData, leadsData, contactsData, mediaData, webhooksData] = await Promise.all([
        overviewRes.json().catch(() => ({})),
        leadsRes.json().catch(() => ({})),
        contactsRes.json().catch(() => ({})),
        mediaRes.json().catch(() => ({})),
        webhooksRes.json().catch(() => ({})),
      ]);

      if (!overviewRes.ok) throw new Error(overviewData.error ?? "No se pudo cargar métricas");
      if (!leadsRes.ok) throw new Error(leadsData.error ?? "No se pudo cargar leads");
      if (!contactsRes.ok) throw new Error(contactsData.error ?? "No se pudo cargar contactos");
      if (!mediaRes.ok) throw new Error(mediaData.error ?? "No se pudo cargar assets");
      if (!webhooksRes.ok) throw new Error(webhooksData.error ?? "No se pudo cargar webhooks");

      setOverview(overviewData as Overview);
      setLeads((leadsData.data ?? []) as LeadItem[]);
      setContacts((contactsData.data ?? []) as ContactItem[]);
      setMediaRows((mediaData.rows ?? []) as MediaRow[]);
      setWebhooks((webhooksData.data ?? []) as WebhookItem[]);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo cargar landing admin" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleLeads = useMemo(
    () => (leadFilter === "all" ? leads : leads.filter((item) => item.status === leadFilter)),
    [leads, leadFilter],
  );
  const visibleContacts = useMemo(
    () => (contactFilter === "all" ? contacts : contacts.filter((item) => item.status === contactFilter)),
    [contacts, contactFilter],
  );

  const orderedMediaRows = useMemo(
    () => [...mediaRows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.key.localeCompare(b.key)),
    [mediaRows],
  );

  const selectedMediaRow = useMemo(
    () => orderedMediaRows.find((row) => row.key === selectedMediaKey) ?? null,
    [orderedMediaRows, selectedMediaKey],
  );

  const groupedMediaRows = useMemo(() => {
    const groups = {
      hero: [] as MediaRow[],
      features: [] as MediaRow[],
      slides: [] as MediaRow[],
      otros: [] as MediaRow[],
    };
    for (const row of orderedMediaRows) {
      groups[mediaGroupForKey(row.key)].push(row);
    }
    return groups;
  }, [orderedMediaRows]);

  useEffect(() => {
    if (orderedMediaRows.length === 0) {
      setSelectedMediaKey("");
      return;
    }
    if (!selectedMediaKey || !orderedMediaRows.some((row) => row.key === selectedMediaKey)) {
      setSelectedMediaKey(orderedMediaRows[0].key);
    }
  }, [orderedMediaRows, selectedMediaKey]);

  const tremorSeries = useMemo(
    () =>
      (overview?.series ?? []).map((row) => ({
        date: row.date.slice(5),
        Leads: row.leads,
        Contactos: row.contacts,
        "Visitas landing": row.landingViews ?? 0,
        "Visitas negocios": row.tenantViews ?? 0,
      })),
    [overview],
  );

  const onLeadStatus = async (id: string, status: string) => {
    if (readOnly) return;
    try {
      const res = await fetch("/api/super-admin/landing/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar lead");
      setLeads((prev) => prev.map((row) => (row.id === id ? { ...row, status: status as LeadItem["status"] } : row)));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo actualizar lead" });
    }
  };

  const onContactStatus = async (id: string, status: string) => {
    if (readOnly) return;
    try {
      const res = await fetch("/api/super-admin/landing/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar contacto");
      setContacts((prev) => prev.map((row) => (row.id === id ? { ...row, status: status as ContactItem["status"] } : row)));
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo actualizar contacto" });
    }
  };

  const saveMedia = async () => {
    if (readOnly) return;
    setSavingMedia(true);
    try {
      const res = await fetch("/api/super-admin/landing/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mediaRows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudieron guardar los assets");
      setMessage({ type: "success", text: "Assets guardados. La landing ya usa estos valores." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudieron guardar los assets" });
    } finally {
      setSavingMedia(false);
    }
  };

  const updateMediaRow = useCallback((key: string, patch: Partial<MediaRow>) => {
    setMediaRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const moveMediaRow = useCallback((key: string, dir: -1 | 1) => {
    setMediaRows((prev) => {
      const list = [...prev].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.key.localeCompare(b.key));
      const idx = list.findIndex((row) => row.key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= list.length) return prev;

      const copy = [...list];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((row, i) => ({ ...row, sort_order: (i + 1) * 10 }));
    });
  }, []);

  const applyMediaPreset = () => {
    if (mediaPreset === "hero") {
      setMediaWidth("1920");
      setMediaHeight("1080");
      setMediaCrop("fill");
      setMediaGravity("auto");
    } else if (mediaPreset === "feature") {
      setMediaWidth("1400");
      setMediaHeight("900");
      setMediaCrop("fill");
      setMediaGravity("auto");
    } else if (mediaPreset === "mobile") {
      setMediaWidth("900");
      setMediaHeight("1800");
      setMediaCrop("fill");
      setMediaGravity("auto");
    }
  };

  const applyCloudinaryAdjustments = () => {
    if (!selectedMediaRow) return;
    if (!isCloudinaryUrl(selectedMediaRow.src)) {
      setMessage({ type: "error", text: "Esta herramienta de ajuste funciona con URLs de Cloudinary." });
      return;
    }

    const parts = [
      mediaFormat ? `f_${mediaFormat}` : null,
      mediaQuality ? `q_${mediaQuality}` : null,
      mediaWidth ? `w_${mediaWidth}` : null,
      mediaHeight ? `h_${mediaHeight}` : null,
      mediaCrop ? `c_${mediaCrop}` : null,
      mediaGravity ? `g_${mediaGravity}` : null,
    ].filter(Boolean) as string[];

    const updatedSrc = replaceCloudinaryTransform(selectedMediaRow.src, parts.join(","));
    updateMediaRow(selectedMediaRow.key, { src: updatedSrc });
    setMessage({ type: "success", text: "Ajustes aplicados en URL. Revisa visualmente y guarda assets." });
  };

  const resetCloudinaryAdjustments = () => {
    if (!selectedMediaRow) return;
    if (!isCloudinaryUrl(selectedMediaRow.src)) return;
    const updatedSrc = replaceCloudinaryTransform(selectedMediaRow.src, null);
    updateMediaRow(selectedMediaRow.key, { src: updatedSrc });
    setMessage({ type: "success", text: "Transformaciones removidas para este asset." });
  };

  const uploadAsset = async (key: string, file: File | null) => {
    if (!file || readOnly) return;
    setUploadingKey(key);
    try {
      const url = await uploadImage(file, "landing");
      setMediaRows((prev) => prev.map((row) => (row.key === key ? { ...row, src: url } : row)));
      setMessage({ type: "success", text: `Imagen subida para ${key}. Falta guardar cambios.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo subir la imagen" });
    } finally {
      setUploadingKey(null);
    }
  };

  const saveWebhook = async () => {
    if (readOnly) return;
    try {
      const res = await fetch("/api/super-admin/landing/webhooks", {
        method: webhookForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar webhook");
      setWebhookForm(emptyWebhook);
      await loadData();
      setMessage({ type: "success", text: "Webhook guardado" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo guardar webhook" });
    }
  };

  const testWebhook = async (id: string) => {
    if (readOnly) return;
    setTestingWebhookId(id);
    try {
      const res = await fetch("/api/super-admin/landing/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, event: "lead.created" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar prueba");
      setMessage({ type: "success", text: "Prueba enviada correctamente al webhook" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo enviar prueba" });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const exportCsv = (type: "leads" | "contacts", status: string) => {
    const sp = new URLSearchParams({ type, status });
    const url = `/api/super-admin/landing/export?${sp.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const deleteWebhook = async (id: string) => {
    if (readOnly) return;
    if (!confirm("¿Eliminar webhook?")) return;
    try {
      const res = await fetch("/api/super-admin/landing/webhooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar webhook");
      await loadData();
      setMessage({ type: "success", text: "Webhook eliminado" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "No se pudo eliminar webhook" });
    }
  };

  const tabs = [
    { id: "overview", label: "Métricas" },
    { id: "inbox", label: "Leads & Contactos" },
    { id: "media", label: "Imágenes landing" },
    { id: "webhooks", label: "Webhooks" },
  ];

  return (
    <div className="space-y-6">
      <SaasPageHeader
        title="Landing admin"
        description="Métricas, leads/contactos, assets y notificaciones del landing público."
        icon={LayoutTemplate}
      />

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <SaasSegmentedTabs tabs={tabs} value={tab} onChange={(value) => setTab(value as TabKey)} />

      {loading ? <Card className="p-4 text-sm text-zinc-500">Cargando módulo landing...</Card> : null}

      {!loading && tab === "overview" && overview ? (
        <div className="space-y-4">
          <Card className="rounded-3xl border border-zinc-200/60 bg-white p-4 dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resumen landing (30 días)</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Inbox, tráfico y conversiones del landing público.</p>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SaasMetricCard label="Inbox total" value={`${overview.metrics.inboxTotal}`} />
            <SaasMetricCard label="Leads" value={`${overview.metrics.leadsTotal}`} />
            <SaasMetricCard label="Contactos" value={`${overview.metrics.contactsTotal}`} />
            <SaasMetricCard
              label="Actividad inbox (30d)"
              value={`${overview.series.reduce((acc, d) => acc + d.leads + d.contacts, 0)}`}
            />
            <SaasMetricCard label="Visitas landing (30d)" value={`${overview.metrics.landingViews30d ?? 0}`} />
            <SaasMetricCard label="Visitantes únicos landing (30d)" value={`${overview.metrics.landingUniqueVisitors30d ?? 0}`} />
            <SaasMetricCard label="Visitas negocios (30d)" value={`${overview.metrics.tenantViews30d ?? 0}`} />
            <SaasMetricCard label="Visitantes únicos negocios (30d)" value={`${overview.metrics.tenantUniqueVisitors30d ?? 0}`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4 sm:col-span-1">
              <p className="text-sm font-semibold">Estado de leads</p>
              <p className="mt-2 text-xs text-zinc-500">new: {overview.metrics.leadsByStatus.new ?? 0} · contacted: {overview.metrics.leadsByStatus.contacted ?? 0} · closed: {overview.metrics.leadsByStatus.closed ?? 0}</p>
            </Card>
            <Card className="p-4 sm:col-span-1">
              <p className="text-sm font-semibold">Estado de contactos</p>
              <p className="mt-2 text-xs text-zinc-500">new: {overview.metrics.contactsByStatus.new ?? 0} · contacted: {overview.metrics.contactsByStatus.contacted ?? 0} · closed: {overview.metrics.contactsByStatus.closed ?? 0}</p>
            </Card>
          </div>

          <SaasChartCard title="Actividad diaria (30 días)" description="Inbox + tráfico landing y negocios">
            <AppleMultiAreaChart
              data={tremorSeries}
              indexKey="date"
              series={[
                { key: "Leads", label: "Leads", color: "#6366f1" },
                { key: "Contactos", label: "Contactos", color: "#06b6d4" },
                { key: "Visitas landing", label: "Visitas landing", color: "#10b981" },
                { key: "Visitas negocios", label: "Visitas negocios", color: "#f59e0b" },
              ]}
            />
          </SaasChartCard>

          <Card className="p-4 sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-semibold">Top negocios por visitas (30 días)</p>
            <div className="mt-3 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                    <th className="px-2 py-2 text-left">Negocio</th>
                    <th className="px-2 py-2 text-left">Slug</th>
                    <th className="px-2 py-2 text-left">Visitas</th>
                    <th className="px-2 py-2 text-left">Visitantes únicos</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.metrics.tenantTop30d ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-zinc-500">Aún sin datos de visitas por negocio.</td>
                    </tr>
                  ) : (
                    (overview.metrics.tenantTop30d ?? []).map((row) => (
                      <tr key={`${row.companyId ?? row.tenantSlug}`} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-2 py-2">{row.companyName}</td>
                        <td className="px-2 py-2 text-zinc-500">{row.tenantSlug}</td>
                        <td className="px-2 py-2 font-semibold">{row.views}</td>
                        <td className="px-2 py-2">{row.uniqueVisitors}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-semibold">Top países por visitas (30 días)</p>
            <div className="mt-3 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                    <th className="px-2 py-2 text-left">País</th>
                    <th className="px-2 py-2 text-left">Visitas</th>
                    <th className="px-2 py-2 text-left">Visitantes únicos</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview.metrics.countryTop30d ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 text-zinc-500">Aún sin datos de país.</td>
                    </tr>
                  ) : (
                    (overview.metrics.countryTop30d ?? []).map((row) => (
                      <tr key={row.countryCode} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-2 py-2 font-semibold">{row.countryCode}</td>
                        <td className="px-2 py-2">{row.views}</td>
                        <td className="px-2 py-2">{row.uniqueVisitors}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {!loading && tab === "inbox" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Leads</p>
              <div className="flex items-center gap-2">
                <SaasSelect
                  value={leadFilter}
                  onChange={setLeadFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    ...STATUS_VALUES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => exportCsv("leads", leadFilter)}>
                  Exportar CSV
                </Button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                    <th className="px-2 py-2 text-left">Email</th>
                    <th className="px-2 py-2 text-left">Estado</th>
                    <th className="px-2 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLeads.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-2 py-2">{item.email}</td>
                      <td className="px-2 py-2">
                        <SaasSelect
                          value={item.status}
                          onChange={(value) => void onLeadStatus(item.id, value)}
                          disabled={readOnly}
                          options={STATUS_VALUES.map((s) => ({ value: s, label: s }))}
                        />
                      </td>
                      <td className="px-2 py-2">{prettyDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Contactos</p>
              <div className="flex items-center gap-2">
                <SaasSelect
                  value={contactFilter}
                  onChange={setContactFilter}
                  options={[
                    { value: "all", label: "Todos" },
                    ...STATUS_VALUES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => exportCsv("contacts", contactFilter)}>
                  Exportar CSV
                </Button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                    <th className="px-2 py-2 text-left">Contacto</th>
                    <th className="px-2 py-2 text-left">Mensaje</th>
                    <th className="px-2 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleContacts.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800 align-top">
                      <td className="px-2 py-2">
                        <p className="font-medium">{item.name || "Sin nombre"}</p>
                        <p className="text-zinc-500">{item.email || "Sin email"}</p>
                        <p className="mt-1 text-zinc-400">{prettyDate(item.createdAt)}</p>
                      </td>
                      <td className="px-2 py-2">{item.message}</td>
                      <td className="px-2 py-2">
                        <SaasSelect
                          value={item.status}
                          onChange={(value) => void onContactStatus(item.id, value)}
                          disabled={readOnly}
                          options={STATUS_VALUES.map((s) => ({ value: s, label: s }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {!loading && tab === "media" ? (
        <Card className="p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Editor visual de assets</p>
              <p className="text-xs text-zinc-500">
                Selecciona una imagen, ajusta su composición, revisa el preview y guarda cambios.
              </p>
            </div>
            <Button onClick={() => void saveMedia()} disabled={readOnly || savingMedia}>
              <Save className="mr-2 h-4 w-4" />
              {savingMedia ? "Guardando..." : "Guardar assets"}
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr]">
            <div className="space-y-4">
              {([
                ["hero", "Hero"],
                ["features", "Features"],
                ["slides", "Slides"],
                ["otros", "Otros"],
              ] as const).map(([groupKey, title]) => {
                const list = groupedMediaRows[groupKey];
                if (list.length === 0) return null;
                return (
                  <div key={groupKey} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
                    <div className="space-y-2">
                      {list.map((row) => {
                        const active = row.key === selectedMediaKey;
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => setSelectedMediaKey(row.key)}
                            className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition ${
                              active
                                ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                                : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                            }`}
                          >
                            <div className="relative h-12 w-16 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                              <Image src={row.src} alt={row.alt || row.key} fill sizes="64px" className="object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">{mediaTitleFromKey(row.key)}</p>
                              <p className="truncate text-[11px] text-zinc-500">{row.key}</p>
                            </div>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${row.is_active !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                              {row.is_active !== false ? "on" : "off"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              {selectedMediaRow ? (
                <>
                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{mediaTitleFromKey(selectedMediaRow.key)}</p>
                        <p className="text-xs text-zinc-500">{selectedMediaRow.key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700"
                          onClick={() => moveMediaRow(selectedMediaRow.key, -1)}
                          disabled={readOnly}
                          title="Mover arriba"
                        >
                          <MoveUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700"
                          onClick={() => moveMediaRow(selectedMediaRow.key, 1)}
                          disabled={readOnly}
                          title="Mover abajo"
                        >
                          <MoveDown className="h-4 w-4" />
                        </button>
                        <SaasSwitch
                          checked={selectedMediaRow.is_active !== false}
                          onChange={(checked) => updateMediaRow(selectedMediaRow.key, { is_active: checked })}
                          label="Activo"
                          disabled={readOnly}
                        />
                        <a
                          href={selectedMediaRow.src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded border border-zinc-200 px-2 text-xs dark:border-zinc-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          abrir
                        </a>
                      </div>
                    </div>

                    <div className="relative mb-3 h-64 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <Image
                        src={selectedMediaRow.src}
                        alt={selectedMediaRow.alt || selectedMediaRow.key}
                        fill
                        sizes="(max-width: 768px) 100vw, 720px"
                        className="object-cover"
                      />
                    </div>

                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                      <Input
                        value={selectedMediaRow.src}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { src: e.target.value })}
                        placeholder="URL imagen"
                        disabled={readOnly}
                      />
                      <Input
                        value={selectedMediaRow.alt ?? ""}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { alt: e.target.value })}
                        placeholder="Alt"
                        disabled={readOnly}
                      />
                      <Input
                        value={selectedMediaRow.label ?? ""}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { label: e.target.value })}
                        placeholder="Label (slides)"
                        disabled={readOnly}
                      />
                      <Input
                        value={selectedMediaRow.sub ?? ""}
                        onChange={(e) => updateMediaRow(selectedMediaRow.key, { sub: e.target.value })}
                        placeholder="Subtexto (slides)"
                        disabled={readOnly}
                      />
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700">
                        {uploadingKey === selectedMediaRow.key ? "Subiendo..." : "Subir imagen"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void uploadAsset(selectedMediaRow.key, e.target.files?.[0] ?? null)}
                          disabled={readOnly || uploadingKey === selectedMediaRow.key}
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        <Wand2 className="h-3.5 w-3.5" />
                        Ajustes rápidos (Cloudinary)
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <SaasSelect
                          value={mediaPreset}
                          onChange={(value) => setMediaPreset(value as "hero" | "feature" | "mobile" | "custom")}
                          options={[
                            { value: "hero", label: "Preset hero" },
                            { value: "feature", label: "Preset feature" },
                            { value: "mobile", label: "Preset mobile" },
                            { value: "custom", label: "Custom" },
                          ]}
                        />
                        <Input value={mediaWidth} onChange={(e) => setMediaWidth(e.target.value)} placeholder="w" className="h-9 text-xs" />
                        <Input value={mediaHeight} onChange={(e) => setMediaHeight(e.target.value)} placeholder="h" className="h-9 text-xs" />
                        <Input value={mediaCrop} onChange={(e) => setMediaCrop(e.target.value)} placeholder="crop" className="h-9 text-xs" />
                        <Input value={mediaGravity} onChange={(e) => setMediaGravity(e.target.value)} placeholder="gravity" className="h-9 text-xs" />
                        <Input value={mediaQuality} onChange={(e) => setMediaQuality(e.target.value)} placeholder="quality" className="h-9 text-xs" />
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Input value={mediaFormat} onChange={(e) => setMediaFormat(e.target.value)} placeholder="format" className="h-9 text-xs" />
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 text-xs font-medium dark:border-zinc-700"
                          onClick={applyMediaPreset}
                        >
                          aplicar preset
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={applyCloudinaryAdjustments} disabled={readOnly}>
                          Aplicar ajuste
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={resetCloudinaryAdjustments} disabled={readOnly}>
                          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                          Limpiar transform
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Preview rápido de landing</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="relative h-32 w-full">
                          <Image src={(orderedMediaRows.find((r) => r.key === "hero.laptop")?.src) || selectedMediaRow.src} alt="Hero laptop preview" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" />
                        </div>
                        <p className="px-2 py-1 text-[11px] text-zinc-500">Hero laptop</p>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="relative h-32 w-full">
                          <Image src={(orderedMediaRows.find((r) => r.key === "hero.phone")?.src) || selectedMediaRow.src} alt="Hero phone preview" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" />
                        </div>
                        <p className="px-2 py-1 text-[11px] text-zinc-500">Hero phone</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                  Selecciona un asset para abrir el editor visual.
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && tab === "webhooks" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold">Nuevo / editar webhook</p>
            <div className="space-y-2">
              <Input value={webhookForm.name} onChange={(e) => setWebhookForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre" disabled={readOnly} />
              <SaasSelect
                value={webhookForm.destinationType}
                onChange={(value) => setWebhookForm((p) => ({ ...p, destinationType: value as "slack" | "email" }))}
                options={[
                  { value: "slack", label: "Slack" },
                  { value: "email", label: "Email (vía webhook)" },
                ]}
                disabled={readOnly}
              />
              <Input value={webhookForm.url} onChange={(e) => setWebhookForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." disabled={readOnly} />
              <Input value={webhookForm.secret} onChange={(e) => setWebhookForm((p) => ({ ...p, secret: e.target.value }))} placeholder="Secret opcional" disabled={readOnly} />
              <SaasSwitch
                checked={webhookForm.isActive}
                onChange={(checked) => setWebhookForm((p) => ({ ...p, isActive: checked }))}
                label="Activo"
                disabled={readOnly}
              />
              <div className="flex gap-2">
                <Button onClick={() => void saveWebhook()} disabled={readOnly}>Guardar webhook</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWebhookForm(emptyWebhook)}
                  disabled={readOnly}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold">Webhooks configurados</p>
            <div className="space-y-2">
              {webhooks.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.destinationType} · {item.isActive ? "activo" : "inactivo"}</p>
                      <p className="mt-1 text-xs text-zinc-600 break-all">{item.url}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWebhookForm({
                            id: item.id,
                            name: item.name,
                            destinationType: item.destinationType,
                            url: item.url,
                            events: item.events,
                            isActive: item.isActive,
                            secret: item.secret ?? "",
                          })
                        }
                        disabled={readOnly}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void testWebhook(item.id)}
                        disabled={readOnly || testingWebhookId === item.id}
                      >
                        {testingWebhookId === item.id ? "Probando..." : "Probar"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void deleteWebhook(item.id)} disabled={readOnly}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
