"use client";

import { CreditCard, FileText, Home, LifeBuoy, Lock, Store, CalendarClock, ArrowRight, ExternalLink, UtensilsCrossed } from "lucide-react";
import type {
  AccountActivityItem,
  BranchSummary,
  CompanySnapshot,
  PaymentSummary,
  PortalTab,
  TicketSummary,
} from "../../shared/customer-account-types";
import { displayStatus, fmtDate, fmtDay, fmtUsd } from "../../shared/customer-account-format";
import { PUBLIC_MENU_TABS, SUBSCRIPTION_STATUS_LABELS } from "../../shared/customer-account-constants";
import { Alert } from "../../ui/Alert";
import { Badge, subscriptionStatusVariant } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { StatCard } from "../../ui/StatCard";
import { EmptyState } from "../../ui/EmptyState";

import { getTenantMenuUrl } from "@/utils/tenant-url";
import type { FirstStep } from "@/lib/tenant/account-first-steps";
import { resolveSalesPanelUrl } from "@/lib/tenant/panel-url";
import { AccountFirstSteps } from "../account-first-steps";

export type AccountAlert = {
  id: string;
  tone: "warn" | "info" | "ok";
  title: string;
  description: string;
};

export type AccountResumenTabProps = {
  company: CompanySnapshot;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  activeEntitlementsCount: number;
  activeBranchesCount: number;
  openTicketsCount: number;
  branches: BranchSummary[];
  tickets: TicketSummary[];
  /** Último pago confirmado (los pendientes no cuentan). */
  latestPayment: PaymentSummary | null;
  /** Cupo de sucursales (con extras); `null` = ilimitado o aún sin cargar. */
  branchCapacity: number | null;
  accountAlerts: AccountAlert[];
  expiryDays: number | null;
  cancellationScheduled: boolean;
  filteredActivityTimeline: AccountActivityItem[];
  activityFilter: "all" | "pago" | "ticket" | "extra";
  setActivityFilter: (v: "all" | "pago" | "ticket" | "extra") => void;
  onNavigate: (tab: PortalTab) => void;
  firstSteps?: FirstStep[];
  /** «Arma y paga»: la tienda sigue en vista previa y el panel CEO se habilita al publicarla. */
  storeDraft?: boolean;
};

const toneToVariant = (tone: AccountAlert["tone"]) =>
  tone === "warn" ? "danger" : tone === "info" ? "warning" : "success";

const activityFilterOptions = [
  { value: "all",    label: "Todo"     },
  { value: "pago",   label: "Pagos"    },
  { value: "ticket", label: "Tickets"  },
  { value: "extra",  label: "Extras"   },
] as const;

const typeIcon: Record<AccountActivityItem["type"], React.ReactNode> = {
  pago:   <CreditCard  className="h-3.5 w-3.5 text-[#a1a1a6]" aria-hidden />,
  ticket: <LifeBuoy    className="h-3.5 w-3.5 text-[#a1a1a6]" aria-hidden />,
  extra:  <Store       className="h-3.5 w-3.5 text-[#a1a1a6]" aria-hidden />,
};

const quickActions: Array<{ tab: PortalTab; label: string; sub: string; icon: React.ElementType }> = [
  { tab: "menu",       label: "Mi menú",                 sub: "Cargar productos desde una foto o un ejemplo", icon: UtensilsCrossed },
  { tab: "perfil",       label: "Página de inicio",        sub: "WhatsApp, Instagram, horarios", icon: Home         },
  { tab: "plan",       label: "Plan y extras",           sub: "Renovar, cambiar de plan, extras", icon: CreditCard    },
  { tab: "facturacion",label: "Facturación",             sub: "Pagos y comprobantes",           icon: FileText      },
  { tab: "sucursales", label: "Sucursales",              sub: "Agregar o editar sucursales",    icon: Store         },
  { tab: "soporte",    label: "Soporte",                 sub: "Escríbenos o responde un ticket", icon: LifeBuoy      },
];

export function AccountResumenTab({
  company,
  subscriptionStatus,
  subscriptionEndsAt,
  activeEntitlementsCount,
  activeBranchesCount,
  openTicketsCount,
  branches,
  tickets,
  latestPayment,
  branchCapacity,
  accountAlerts,
  expiryDays,
  cancellationScheduled,
  filteredActivityTimeline,
  activityFilter,
  setActivityFilter,
  onNavigate,
  firstSteps = [],
  storeDraft = false,
}: AccountResumenTabProps) {
  // «Solo panel CEO»: sin menú público, ni su enlace ni sus secciones.
  const hasPublicMenu = company.hasPublicMenu !== false;
  const menuUrl = hasPublicMenu && company.publicSlug ? getTenantMenuUrl(company.publicSlug, company.customDomain) : "";
  const shortcuts = hasPublicMenu ? quickActions : quickActions.filter((action) => !PUBLIC_MENU_TABS.includes(action.tab));
  // Panel CEO: el mismo destino que el botón de la página de inicio del negocio. En vista
  // previa todavía no hay acceso, así que se dice cuándo llega en vez de dar un enlace.
  const salesPanelUrl = storeDraft ? "" : resolveSalesPanelUrl(company.publicSlug);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Resumen"
        description="Estado actual de tu cuenta, plan y actividad reciente."
      />

      <AccountFirstSteps steps={firstSteps} storeUrl={menuUrl} onNavigate={onNavigate} />

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard
          label="Plan actual"
          value={company.planName ?? "Sin plan"}
          sub={company.planPrice ? `${fmtUsd(company.planPrice, company.locale)} al mes` : undefined}
          icon={CreditCard}
          accent="indigo"
          onClick={() => onNavigate("plan")}
        />
        <StatCard
          label="Sucursales"
          value={activeBranchesCount}
          sub={
            branchCapacity != null && branchCapacity < 999
              ? `de ${branchCapacity} en tu plan${activeEntitlementsCount > 0 ? " (con extras)" : ""}`
              : `${branches.length} ${branches.length === 1 ? "registrada" : "registradas"}`
          }
          icon={Store}
          accent="emerald"
          onClick={() => onNavigate("sucursales")}
        />
        <StatCard
          label="Tickets abiertos"
          value={openTicketsCount}
          sub={openTicketsCount > 0 ? "Te respondemos aquí y por correo" : tickets.length > 0 ? "Todo respondido" : "Sin conversaciones"}
          icon={LifeBuoy}
          accent={openTicketsCount > 0 ? "amber" : "sky"}
          onClick={() => onNavigate("soporte")}
        />
        <StatCard
          label="Último pago"
          value={latestPayment ? fmtUsd(latestPayment.amount_paid, company.locale) : "-"}
          sub={latestPayment ? fmtDay(latestPayment.payment_date, company.timezone) : "Sin pagos"}
          icon={FileText}
          accent="sky"
          onClick={() => onNavigate("facturacion")}
        />
      </div>

      {/* ── Alerts ── */}
      <div className="space-y-2">
        {accountAlerts.map((alert) => (
          <Alert key={alert.id} variant={toneToVariant(alert.tone)} title={alert.title}>
            {alert.description}
          </Alert>
        ))}
      </div>

      {/* ── Two-column grid: Suscripcion + Actividad ── */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_1.8fr]">

        {/* ── Left: Plan card + Quick actions ── */}
        <div className="space-y-4">
          <Card compact>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Suscripción</p>
                <Badge variant={subscriptionStatusVariant(subscriptionStatus)} dot className="mt-2">
                  {/* Igual que la cabecera de la cuenta: en vista previa no es una prueba gratis. */}
                  {storeDraft ? "Vista previa" : displayStatus(subscriptionStatus, SUBSCRIPTION_STATUS_LABELS)}
                </Badge>
              </div>
              <div className="text-right">
                {subscriptionEndsAt ? (
                  <>
                    <p className="text-xs text-[#a1a1a6]">{expiryDays != null && expiryDays < 0 ? "Venció" : "Vence"}</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f]">{fmtDay(subscriptionEndsAt, company.timezone)}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-[#6e6e73]">Sin vencimiento</p>
                )}
                {expiryDays != null && (
                  <p className={`mt-0.5 text-xs font-medium ${expiryDays <= 7 ? "text-red-600" : "text-[#6e6e73]"}`}>
                    {expiryDays >= 0
                      ? `${expiryDays === 1 ? "Queda 1 día" : `Quedan ${expiryDays} días`}`
                      : `Venció hace ${Math.abs(expiryDays)} ${Math.abs(expiryDays) === 1 ? "día" : "días"}`}
                  </p>
                )}
                {cancellationScheduled && (
                  <p className="mt-1 text-xs text-amber-600">Cancelación programada</p>
                )}
              </div>
            </div>
          </Card>

          {/* Quick actions & External Links */}
          <Card compact noPadding>
            <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Accesos rápidos</p>
            <nav className="mt-2 divide-y divide-[#f5f5f7]">
              {shortcuts.map(({ tab, label, sub, icon: Icon }) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onNavigate(tab)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f5f5f7]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="h-4 w-4 text-indigo-600" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1d1d1f]">{label}</p>
                    <p className="text-xs text-[#a1a1a6]">{sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#d2d2d7]" aria-hidden />
                </button>
              ))}
            </nav>

            <div className="border-t border-[#e5e5ea] mt-2 pt-3 pb-1">
              <p className="px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Enlaces externos</p>
              <nav className="mt-2 divide-y divide-[#f5f5f7]">
                {menuUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(menuUrl, "_blank", "noopener,noreferrer")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f5f5f7]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <Store className="h-4 w-4 text-emerald-600" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1d1d1f]">{storeDraft ? "Ver la vista previa" : "Ver mi tienda"}</p>
                      <p className="text-xs text-[#a1a1a6]">{storeDraft ? "Solo tú la ves hasta que la publiques" : "Tu menú, como lo ven tus clientes"}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#d2d2d7]" aria-hidden />
                  </button>
                )}
                {storeDraft ? (
                  <div className="flex w-full items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7]">
                      <Lock className="h-4 w-4 text-[#a1a1a6]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#6e6e73]">Panel CEO</p>
                      <p className="text-xs text-[#a1a1a6]">Disponible cuando publiques tu tienda</p>
                    </div>
                  </div>
                ) : salesPanelUrl ? (
                  <button
                    type="button"
                    onClick={() => window.open(salesPanelUrl, "_blank", "noopener,noreferrer")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f5f5f7]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                      <CreditCard className="h-4 w-4 text-sky-600" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1d1d1f]">Ir al panel CEO</p>
                      <p className="text-xs text-[#a1a1a6]">La caja, los pedidos y los productos de tu negocio</p>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#d2d2d7]" aria-hidden />
                  </button>
                ) : null}
              </nav>
            </div>
          </Card>
        </div>

        {/* ── Right: Activity timeline ── */}
        <Card compact>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1d1d1f]">Actividad reciente</p>
              <p className="text-xs text-[#a1a1a6]">Pagos, tickets y compras de extras</p>
            </div>
            <SegmentedControl
              options={activityFilterOptions as unknown as Array<{ value: typeof activityFilter; label: string }>}
              value={activityFilter}
              onChange={(v) => setActivityFilter(v as typeof activityFilter)}
              size="sm"
            />
          </div>

          <div className="mt-4 max-h-[min(28rem,65vh)] space-y-1.5 overflow-y-auto pr-0.5 sm:pr-1">
            {filteredActivityTimeline.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Sin actividad" description="No hay eventos que mostrar con el filtro seleccionado." />
            ) : filteredActivityTimeline.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-[#f5f5f7] sm:gap-3 sm:px-3 sm:py-2.5">
                <div className="mt-0.5 shrink-0">{typeIcon[item.type]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1d1d1f]">{item.title}</p>
                  <p className="text-xs text-[#6e6e73]">{item.detail}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-[#a1a1a6]">{fmtDate(item.occurredAt, company.timezone)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
