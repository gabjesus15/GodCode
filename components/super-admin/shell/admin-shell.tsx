"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { AdminCommandPalette } from "./admin-command-palette";
import { AdminHeaderClock } from "./admin-header-clock";
import { AdminShortcutsHelp } from "./admin-shortcuts-help";
import { SaasLogo } from "./SaasLogo";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const maintenanceBanner =
	typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SAAS_ADMIN_MAINTENANCE_BANNER?.trim() ?? "" : "";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { readOnly } = useAdminRole();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = drawerRef.current;
    const focusables = () => {
      if (!root) return [] as HTMLElement[];
      const nodes = root.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])",
      );
      return Array.from(nodes).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    queueMicrotask(() => closeButtonRef.current?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                Panel de control
              </p>
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
              <AdminHeaderClock />
              <AdminShortcutsHelp />
              <ThemeToggle />
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

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.aside
              ref={drawerRef}
              className="absolute left-0 top-0 h-full w-[min(100vw-3rem,320px)] max-w-[85vw] overflow-y-auto bg-white p-4 shadow-2xl dark:bg-zinc-900 sm:w-72 sm:p-6"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(event) => event.stopPropagation()}
              onTouchStart={(event) => {
                touchStartX.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const start = touchStartX.current;
                touchStartX.current = null;
                if (start == null) return;
                const end = event.changedTouches[0]?.clientX;
                if (end == null) return;
                if (end - start < -48) setOpen(false);
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
                <SaasLogo size="sm" />
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 dark:text-zinc-200"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <AdminCommandPalette />
    </div>
  );
}
