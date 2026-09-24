"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronsUpDown, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { signOutAndRedirect } from "@/lib/auth/sign-out-client";
import {
  resolveActiveNav,
  SUPER_ADMIN_NAV_GROUPS,
  type SuperAdminNavGroup,
  type SuperAdminNavItem,
} from "@/lib/super-admin/super-admin-nav";
import { cn } from "@/utils/cn";

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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  support: "Soporte",
};

export type SidebarProps = {
  /** Se llama al elegir una sección (el menú móvil se cierra). */
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  // Solo guarda lo que la persona plegó o desplegó a mano; el grupo de la página actual
  // arranca abierto sin tener que sincronizar estado al navegar.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const solicitudesCount = useBadgeCount("solicitudes", "/api/super-admin/solicitudes/summary");
  const paymentsCount = useBadgeCount("payments", "/api/super-admin/payments/summary");
  // Las solicitudes de alta se revisan desde el Inicio: su contador va ahí.
  const badgeCounts: Record<string, number> = {
    "/dashboard": solicitudesCount,
    "/dashboard/pagos": paymentsCount,
  };

  const renderItem = (item: SuperAdminNavItem, nested: boolean) => (
    <NavLink
      key={item.href}
      item={item}
      nested={nested}
      active={active?.item.href === item.href}
      badgeCount={badgeCounts[item.href] ?? 0}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-0.5 pb-4">
        {SUPER_ADMIN_NAV_GROUPS.map((group, index) =>
          group.icon ? (
            <NavGroup
              key={group.label}
              group={group}
              open={toggled[group.label] ?? active?.group.label === group.label}
              onToggle={(open) => setToggled((prev) => ({ ...prev, [group.label]: open }))}
              hasActive={active?.group.label === group.label}
            >
              {group.items.map((item) => (
                <li key={item.href}>{renderItem(item, true)}</li>
              ))}
            </NavGroup>
          ) : (
            <ul key={group.label} className={cn("mb-3 flex flex-col gap-0.5", index > 0 && "mt-3")}>
              {group.items.map((item) => (
                <li key={item.href}>{renderItem(item, false)}</li>
              ))}
            </ul>
          ),
        )}
      </nav>
      <AccountMenu />
    </div>
  );
}

function NavLink({
  item,
  nested,
  active,
  badgeCount,
  onNavigate,
}: {
  item: SuperAdminNavItem;
  nested: boolean;
  active: boolean;
  badgeCount: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 min-w-0 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-zinc-100/30",
        nested && "pl-10",
        active
          ? "bg-zinc-200/70 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
          : "text-zinc-700 hover:bg-zinc-200/40 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50",
      )}
    >
      {nested ? null : (
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0", active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500")}
          strokeWidth={1.75}
          aria-hidden
        />
      )}
      <span className="truncate">{item.label}</span>
      {badgeCount > 0 ? (
        <span
          className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold leading-none text-white"
          aria-label={`${badgeCount} pendientes`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroup({
  group,
  open,
  onToggle,
  hasActive,
  children,
}: {
  group: SuperAdminNavGroup;
  open: boolean;
  onToggle: (open: boolean) => void;
  hasActive: boolean;
  children: React.ReactNode;
}) {
  const Icon = group.icon!;
  const listId = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-zinc-200/40 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-100/30",
          hasActive && !open ? "font-medium text-zinc-950 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{group.label}</span>
        <ChevronDown
          className={cn("ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <ul id={listId} hidden={!open} className="mt-0.5 flex flex-col gap-0.5">
        {children}
      </ul>
    </div>
  );
}

function AccountMenu() {
  const { email, role } = useAdminRole();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOutAndRedirect("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = (email.split("@")[0] ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "GA";
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div ref={rootRef} className="relative border-t border-zinc-200 pt-3 dark:border-zinc-800">
      {open ? (
        <div
          id={menuId}
          className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="truncate px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{email || "Sesión de administración"}</p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {loggingOut ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:hover:bg-zinc-800/60"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          aria-hidden
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{email || "Mi cuenta"}</span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      </button>
    </div>
  );
}
