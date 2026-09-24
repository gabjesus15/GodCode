"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { signOutAndRedirect } from "@/lib/auth/sign-out-client";
import { resolveActiveNav, SUPER_ADMIN_NAV_GROUPS } from "@/lib/super-admin/super-admin-nav";
import { cn } from "@/utils/cn";
import { SaasLogo } from "./SaasLogo";

function useBadgeCount(key: string, url: string): number {
  const { data } = useQuery<{ pendingCount: number }>({
    queryKey: ["admin", key, "summary"],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo cargar ${key}`);
      return res.json() as Promise<{ pendingCount: number }>;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  return data?.pendingCount ?? 0;
}

export type SidebarProps = {
  /** Se llama al elegir una sección (el menú móvil se cierra). */
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  const [loggingOut, setLoggingOut] = useState(false);

  const solicitudesCount = useBadgeCount("solicitudes", "/api/super-admin/solicitudes/summary");
  const paymentsCount = useBadgeCount("payments", "/api/super-admin/payments/summary");
  const badgeCounts: Record<string, number> = {
    "/onboarding/solicitudes": solicitudesCount,
    "/dashboard/pagos": paymentsCount,
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOutAndRedirect("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="mb-1 mt-1 flex justify-center md:mb-2 md:mt-2">
        <SaasLogo size="lg" />
      </div>
      <nav aria-label="Secciones del panel" className="flex flex-col gap-3">
        {SUPER_ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500 md:px-3">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active?.item.href === item.href;
                const badgeCount = badgeCounts[item.href] ?? 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition md:gap-3 md:rounded-xl md:px-3",
                        isActive
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {badgeCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className="ml-auto min-w-6 justify-center px-1.5 text-[11px] leading-none"
                          aria-label={`${badgeCount} pendientes`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40 md:gap-3 md:rounded-xl md:px-3"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{loggingOut ? "Cerrando…" : "Cerrar sesión"}</span>
        </button>
      </div>
    </div>
  );
}
