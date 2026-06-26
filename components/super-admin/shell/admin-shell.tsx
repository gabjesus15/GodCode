"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { Drawer } from "@/components/ui/drawer";
import { AdminCommandPalette } from "./admin-command-palette";
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#ffffff_45%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#09090b_50%,_#111827_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:flex-row lg:px-8">
        <aside className="hidden w-64 shrink-0 self-start rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 md:sticky md:top-6 md:block md:rounded-3xl md:p-6">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
          <header className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-3 py-3 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 sm:rounded-3xl sm:px-5 sm:py-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">
                Administración
              </h1>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">Panel de control</p>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
              <AdminHeaderClock />
              <AdminShortcutsHelp />
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menu"
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
        <div className="flex h-full flex-col p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-end sm:mb-4">
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 dark:text-zinc-200"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Sidebar />
        </div>
      </Drawer>

      <AdminCommandPalette />
      <Toaster position="top-right" theme="system" />
      <SonnerToaster position="bottom-right" richColors />
    </div>
  );
}
