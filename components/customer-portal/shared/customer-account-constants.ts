import {
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Palette,
  Shield,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  PAYMENT_STATUSES,
  statusLabels,
  SUBSCRIPTION_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/status/status-labels";
import type { PortalTab } from "./customer-account-types";

export const PORTAL_TAB_ORDER: PortalTab[] = [
  "resumen",
  "menu",
  "perfil",
  "tienda",
  "plan",
  "sucursales",
  "facturacion",
  "soporte",
  "correo",
  "seguridad",
];

/** Secciones del menú público. Con «solo panel CEO» no hay menú, así que no se muestran. */
export const PUBLIC_MENU_TABS: PortalTab[] = ["menu", "perfil", "tienda"];

export function visiblePortalTabs(hasPublicMenu: boolean): PortalTab[] {
  return hasPublicMenu ? PORTAL_TAB_ORDER : PORTAL_TAB_ORDER.filter((tab) => !PUBLIC_MENU_TABS.includes(tab));
}

export const PORTAL_TAB_LABELS: Record<PortalTab, string> = {
  resumen: "Resumen",
  menu: "Mi menú",
  perfil: "Página de inicio",
  tienda: "Tienda",
  plan: "Plan y extras",
  sucursales: "Sucursales",
  facturacion: "Facturación",
  soporte: "Soporte",
  correo: "Correo de cupones",
  seguridad: "Seguridad",
};

/** Etiquetas breves para la barra inferior en móvil. */
export const PORTAL_TAB_MOBILE_LABELS: Record<PortalTab, string> = {
  resumen: "Resumen",
  menu: "Menú",
  perfil: "Inicio web",
  tienda: "Tienda",
  plan: "Plan",
  sucursales: "Locales",
  facturacion: "Pagos",
  soporte: "Ayuda",
  correo: "Correo",
  seguridad: "Seguridad",
};

export const PORTAL_TAB_ICONS: Record<PortalTab, LucideIcon> = {
  resumen: LayoutDashboard,
  menu: UtensilsCrossed,
  perfil: Home,
  tienda: Palette,
  plan: CreditCard,
  sucursales: Store,
  facturacion: FileText,
  soporte: LifeBuoy,
  correo: Mail,
  seguridad: Shield,
};

/** Mismos nombres que el super admin: salen del mapa común `lib/status/status-labels`. */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = statusLabels(SUBSCRIPTION_STATUSES);

export const PAYMENT_STATUS_LABELS: Record<string, string> = statusLabels(PAYMENT_STATUSES);

export const TICKET_STATUS_LABELS: Record<string, string> = statusLabels(TICKET_STATUSES);

export const TICKET_PRIORITY_LABELS: Record<string, string> = statusLabels(TICKET_PRIORITIES);

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Facturación",
  technical: "Técnico",
  product: "Producto",
  account: "Cuenta",
};

export const BRANCH_ENTITLEMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  active: "Activa",
  expired: "Vencida",
  canceled: "Cancelada",
  cancelled: "Cancelada",
};
