"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { Drawer } from "@/components/ui/drawer";
import { resolveActiveNav } from "@/lib/super-admin/super-admin-nav";
import { AdminCommandPalette, openAdminCommandPalette } from "./admin-command-palette";
import { AdminHeaderClock } from "./admin-header-clock";
import { AdminShortcutsHelp } from "./admin-shortcuts-help";
import { Sidebar } from "./sidebar";
import { Toaster } from "sileo";
import "sileo/styles.css";
import { Toaster as SonnerToaster } from "sonner";

const maintenanceBanner =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SAAS_ADMIN_MAINTENANCE_BANNER?.trim() ?? "" : "";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { readOnly } = useAdminRole();
  const active = resolveActiveNav(usePathname());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#ffffff_45%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#09090b_50%,_#111827_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:flex-row lg:px-8">
        {/* Con muchas secciones la barra puede ser más alta que la ventana: se desplaza sola. */}
        <aside className="hidden w-64 shrink-0 self-start overflow-y-auto overscroll-contain [scrollbar-width:thin] rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 md:sticky md:top-6 md:block md:max-h-[calc(100dvh-3rem)] md:rounded-3xl md:p-5">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
          <header className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 sm:rounded-3xl sm:px-5 sm:py-3">
            <nav aria-label="Ubicación" className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                {active?.group.label ?? "Gcode Admin"}
              </p>
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
                {active?.item.label ?? "Panel de administración"}
              </p>
            </nav>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={openAdminCommandPalette}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 text-sm text-zinc-500 shadow-sm transition hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:px-3"
                aria-label="Buscar páginas o empresas"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden lg:inline">Buscar empresa o página</span>
                <kbd className="hidden rounded-md border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700 lg:inline">
                  Ctrl K
                </kbd>
              </button>
              <AdminHeaderClock />
              <AdminShortcutsHelp />
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5 shrink-0" />
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden">
            {maintenanceBanner ? (
              <div
                className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
                role="status"
              >
                {maintenanceBanner}
              </div>
            ) : null}
            {readOnly ? (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                role="status"
              >
                Modo soporte: solo lectura. No puedes crear ni modificar datos desde este rol.
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        direction="left"
        contentClassName="max-w-none"
        containerClassName="p-0 sm:p-0"
      >
        <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-end sm:mb-4">
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 dark:text-zinc-200"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Al elegir una sección el menú se cierra (antes quedaba abierto sobre la página nueva). */}
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      </Drawer>

      <AdminCommandPalette />
      <Toaster position="top-right" theme="system" />
      <SonnerToaster position="bottom-right" richColors />
    </div>
  );
}
