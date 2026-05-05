import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Shield,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PortalTab } from "./customer-account-types";

export const PORTAL_TAB_ORDER: PortalTab[] = [
  "resumen",
  "tienda",
  "plan",
  "sucursales",
  "facturacion",
  "soporte",
  "seguridad",
];

export const PORTAL_TAB_LABELS: Record<PortalTab, string> = {
  resumen: "Resumen",
  tienda: "Tienda",
  plan: "Plan y extras",
  sucursales: "Sucursales",
  facturacion: "Facturación",
  soporte: "Soporte",
  seguridad: "Seguridad",
};

/** Etiquetas breves para la barra inferior en móvil. */
export const PORTAL_TAB_MOBILE_LABELS: Record<PortalTab, string> = {
  resumen: "Inicio",
  tienda: "Tienda",
  plan: "Plan",
  sucursales: "Locales",
  facturacion: "Pagos",
  soporte: "Ayuda",
  seguridad: "Seguridad",
};

export const PORTAL_TAB_ICONS: Record<PortalTab, LucideIcon> = {
  resumen: LayoutDashboard,
  tienda: Palette,
  plan: CreditCard,
  sucursales: Store,
  facturacion: FileText,
  soporte: LifeBuoy,
  seguridad: Shield,
};

/** Alineado con super-admin / companies (mismas claves que `subscription_status` en BD). */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  suspended: "Suspendida",
  payment_pending: "Pago pendiente",
  trial: "Prueba",
  trialing: "Prueba",
  pending: "Pendiente",
  past_due: "Pago atrasado",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  unpaid: "Sin pago",
  incomplete: "Incompleto",
  paused: "Pausada",
  expired: "Vencida",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  pending_validation: "Pendiente de validación",
  payment_pending: "Pago pendiente",
  payment_validated: "Pago validado",
  paid: "Pagado",
  validacion: "En validación",
  completed: "Completado",
  failed: "Fallido",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  rejected: "Rechazado",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  waiting_customer: "Esperando respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

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

export const ADDON_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  pending: "Pendiente",
  inactive: "Inactivo",
  expired: "Vencido",
  cancelled: "Cancelado",
  canceled: "Cancelado",
};
