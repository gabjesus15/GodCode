"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { Drawer } from "@/components/ui/drawer";
import { AdminCommandPalette, openAdminCommandPalette } from "./admin-command-palette";
import { AdminHeaderClock } from "./admin-header-clock";
import { AdminShortcutsHelp } from "./admin-shortcuts-help";
import { SaasLogo } from "./SaasLogo";
import { Sidebar } from "./sidebar";
import { Toaster } from "sileo";
import "sileo/styles.css";
import { Toaster as SonnerToaster } from "sonner";

const maintenanceBanner =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SAAS_ADMIN_MAINTENANCE_BANNER?.trim() ?? "" : "";

interface AdminShellProps {
  children: React.ReactNode;
}

/**
 * Marco del panel: barra superior a todo el ancho, barra lateral plana sobre el fondo gris
 * y el contenido de cada página en un panel blanco.
 */
export function AdminShell({ children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { readOnly } = useAdminRole();

  return (
    <div className="min-h-screen bg-zinc-100/70 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-zinc-100/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-100/75 dark:bg-zinc-950/90 sm:gap-3 sm:px-4">
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-700 transition hover:bg-zinc-200/60 dark:text-zinc-200 dark:hover:bg-zinc-800 md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5 shrink-0" />
        </button>
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center rounded-lg px-1 md:w-60 md:px-2"
          aria-label="Ir al inicio del panel"
        >
          <SaasLogo size="sm" />
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={openAdminCommandPalette}
            className="inline-flex h-9 w-full max-w-xl items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-500 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:border-zinc-300 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700"
            aria-label="Buscar páginas o empresas"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Buscar empresa o página</span>
            <kbd className="ml-auto hidden rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700 sm:inline">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <AdminHeaderClock />
          <AdminShortcutsHelp />
        </div>
      </header>

      <div className="flex min-w-0">
        {/* Con muchas secciones la barra puede ser más alta que la ventana: se desplaza sola. */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [scrollbar-width:thin] md:block">
          <Sidebar />
        </aside>

        <main className="mb-3 min-h-[calc(100dvh-4.25rem)] min-w-0 flex-1 overflow-x-hidden rounded-none border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-6 md:mr-3 md:rounded-2xl md:border md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px]">
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
          </div>
        </main>
      </div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        direction="left"
        contentClassName="flex min-h-0 max-w-none flex-1 flex-col"
        containerClassName="bg-zinc-50 p-0 dark:bg-zinc-950 sm:p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <SaasLogo size="sm" />
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
