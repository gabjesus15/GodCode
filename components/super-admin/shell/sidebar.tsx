"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { SaasLogo } from "./SaasLogo";

import { SUPER_ADMIN_NAV } from "@/lib/super-admin/super-admin-nav";
import { signOutAndRedirect } from "@/lib/auth/sign-out-client";

export function Sidebar() {
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: solicitudesData } = useQuery<{ pendingCount: number }>({
    queryKey: ["admin", "solicitudes", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/solicitudes/summary");
      if (!res.ok) throw new Error("Failed to load solicitudes summary");
      return res.json() as Promise<{ pendingCount: number }>;
    },
    staleTime: 60_000,  // refetch at most every 60 s (or on window focus)
    refetchInterval: 60_000,
  });

  const pendingCount = solicitudesData?.pendingCount ?? 0;

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOutAndRedirect("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 md:gap-10">
      <div className="mb-2 mt-1 flex justify-center md:mb-4 md:mt-2">
        <SaasLogo size="lg" />
      </div>
      <nav className="flex flex-col gap-1 sm:gap-2">
        {SUPER_ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isSolicitudes = item.href === "/onboarding/solicitudes";
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 md:gap-3 md:rounded-xl md:px-3"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isSolicitudes && pendingCount > 0 ? (
                <Badge variant="destructive" className="ml-auto min-w-6 justify-center px-1.5 text-[11px] leading-none">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-3 md:pt-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40 md:gap-3 md:rounded-xl md:px-3"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">{loggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
        </button>
      </div>
    </div>
  );
}
