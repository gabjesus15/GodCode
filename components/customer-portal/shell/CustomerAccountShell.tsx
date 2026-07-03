"use client";

import { useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { SaasLogo } from "@/components/super-admin/shell/SaasLogo";
import { Badge, subscriptionStatusVariant } from "../ui/Badge";
import {
  PORTAL_TAB_ICONS,
  PORTAL_TAB_LABELS,
  PORTAL_TAB_MOBILE_LABELS,
  PORTAL_TAB_ORDER,
} from "../shared/customer-account-constants";
import { cn } from "@/utils/cn";
import { signOutAndRedirect } from "@/lib/auth/sign-out-client";
import type { PortalTab } from "../shared/customer-account-types";

export type CustomerAccountShellProps = {
  companyName: string;
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  subscriptionStatus: string | null;
  subscriptionStatusLabel: string;
  lastRealtimeSyncAt: string | null;
  /** true mientras la solicitud de snapshot está en vuelo. */
  isSyncing?: boolean;
  onManualRefresh?: () => void;
  children: React.ReactNode;
};

export function CustomerAccountShell({
  companyName,
  activeTab,
  onTabChange,
  subscriptionStatus,
  subscriptionStatusLabel,
  lastRealtimeSyncAt,
  isSyncing = false,
  onManualRefresh,
  children,
}: CustomerAccountShellProps) {
  const badgeVariant = subscriptionStatusVariant(subscriptionStatus);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await signOutAndRedirect("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const syncLabel = isSyncing
    ? "Sincronizando…"
    : lastRealtimeSyncAt
    ? `Sync ${new Date(lastRealtimeSyncAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`
    : "Sin datos de sync";

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:py-5 md:flex-row md:gap-6 md:px-5 lg:px-8">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden w-60 shrink-0 self-start md:sticky md:top-6 md:block">
          <div className="rounded-2xl border border-[#e5e5ea] bg-white p-5 shadow-sm">

            <div className="mb-5 border-b border-[#e5e5ea] pb-5">
              <SaasLogo />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a1a1a6]">
                Portal de cuenta
              </p>
            </div>

            <nav className="flex flex-col gap-0.5" aria-label="Secciones del portal">
              {PORTAL_TAB_ORDER.map((key) => {
                const Icon = PORTAL_TAB_ICONS[key];
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onTabChange(key)}
                    className={`relative flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                      active
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "font-medium text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-pill"
                        className="absolute inset-0 rounded-xl bg-indigo-50"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icon
                      className={`relative h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-[#a1a1a6]"}`}
                      aria-hidden
                    />
                    <span className="relative truncate">{PORTAL_TAB_LABELS[key]}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 border-t border-[#e5e5ea] pt-5 space-y-3">
              <div className="rounded-xl bg-[#fbfbfd] p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={badgeVariant} dot className="text-xs">
                    {subscriptionStatusLabel}
                  </Badge>
                  <div
                    className={`flex items-center gap-1 text-[10px] text-[#a1a1a6] ${onManualRefresh ? "cursor-pointer hover:text-[#6e6e73]" : ""}`}
                    title={lastRealtimeSyncAt ?? "Sin sync"}
                    onClick={onManualRefresh}
                    onKeyDown={onManualRefresh ? (e) => { if (e.key === "Enter" || e.key === " ") onManualRefresh(); } : undefined}
                    role={onManualRefresh ? "button" : undefined}
                    tabIndex={onManualRefresh ? 0 : undefined}
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${isSyncing ? "animate-spin" : ""}`} aria-hidden />
                    <span>{syncLabel}</span>
                  </div>
                </div>
                <p className="mt-1.5 truncate text-xs font-medium text-[#1d1d1f]">{companyName}</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                <span>{loggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Área principal ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">

          {/* Header: visible en todos los tamaños */}
          <header className="rounded-2xl border border-[#e5e5ea] bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-[#1d1d1f] sm:text-lg md:text-xl">
                  {companyName}
                </h1>
                <p className="mt-0.5 text-[11px] font-medium text-[#6e6e73] md:hidden">
                  {PORTAL_TAB_LABELS[activeTab]}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={badgeVariant} dot className="text-[11px] sm:text-xs">
                  {subscriptionStatusLabel}
                </Badge>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  title="Cerrar sesión"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 active:bg-red-100 transition disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

          </header>

          {/* Contenido de la tab activa — padding inferior en móvil para la barra fija */}
          <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-5 sm:space-y-6"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Navegación inferior — solo móvil */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#ececf0] bg-white/[0.97] pb-[env(safe-area-inset-bottom,0px)] pt-0.5 shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-16px_48px_rgba(15,23,42,0.06)] backdrop-blur-lg backdrop-saturate-150 md:hidden overflow-x-auto portal-scrollbar-none"
        aria-label="Secciones del portal"
      >
        <div className="flex min-w-full items-stretch justify-start gap-1 px-2 py-1 flex-nowrap">
          {PORTAL_TAB_ORDER.map((key) => {
            const Icon = PORTAL_TAB_ICONS[key];
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-[4.25rem] flex-1 shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors active:bg-[#f5f5f7]/80",
                  active ? "text-indigo-600" : "text-[#8e8e93]",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-1.5 top-0 h-[2px] rounded-full bg-indigo-500"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-[11px] transition-colors sm:h-10 sm:w-10",
                    active ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10" : "text-[#8e8e93]",
                  )}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-center text-[9px] font-semibold leading-[1.2] tracking-tight sm:text-[10px]",
                    active ? "text-indigo-700" : "text-[#6e6e73]",
                  )}
                >
                  {PORTAL_TAB_MOBILE_LABELS[key]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
