/** Tipos compartidos del portal de cuenta cliente (`/cuenta`). */

import type { PlanChangeQuote, RenewalQuote, SubscriptionPhase } from "@/lib/billing/portal-pricing";

export type { SubscriptionPhase };

export type PlanOption = {
  id: string;
  name: string;
  /** Precio mensual en USD para el país del negocio (el mismo que cobra el alta). */
  price: number | null;
  max_branches: number | null;
  max_users: number | null;
  features?: unknown;
  marketing_lines?: unknown;
};

export type AddonOption = {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  type: string | null;
  price_monthly: number | null;
  price_one_time: number | null;
};

export type BusinessInfoSummary = {
  name: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  schedule: string | null;
};

export type BranchSummary = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean | null;
  phone?: string | null;
  schedule?: string | null;
  instagram_url?: string | null;
  whatsapp_url?: string | null;
  map_url?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  payment_methods?: string[] | null;
  pago_movil?: Record<string, unknown> | null;
  zelle?: Record<string, unknown> | null;
  transferencia_bancaria?: Record<string, unknown> | null;
  stripe?: Record<string, unknown> | null;
  mercadopago?: Record<string, unknown> | null;
  paypal?: Record<string, unknown> | null;
  order_intake_paused?: boolean | null;
  order_intake_pause_message?: string | null;
  order_intake_paused_at?: string | null;
  order_intake_paused_by?: string | null;
};

/** Fila de `payments_history`: un pago hecho o un pedido del portal por pagar. */
export type PaymentSummary = {
  id: string;
  amount_paid: number | null;
  status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_method_slug?: string | null;
  plan_id?: string | null;
  months_paid: number | null;
  payment_reference: string | null;
  reference_file_url: string | null;
};

export type TicketSummary = {
  id: string;
  subject: string;
  description: string;
  category: "general" | "billing" | "technical" | "product" | "account";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_type: "tenant" | "super_admin" | "system";
  author_email: string | null;
  is_internal: boolean;
  message: string;
  created_at: string;
};

export type ActiveAddon = {
  id: string;
  addonId: string;
  addonSlug: string;
  addonType: string;
  status: string;
  expires_at: string | null;
  addonName: string;
};

export type BranchEntitlementSummary = {
  id: string;
  quantity: number;
  monthsPurchased: number;
  amountPaid: number;
  unitPrice: number;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  paymentReference: string | null;
};

export type AccountActivityItem = {
  id: string;
  type: "pago" | "ticket" | "extra";
  title: string;
  detail: string;
  status: string;
  occurredAt: string;
  amount?: number | null;
};

export type CompanySnapshot = {
  id: string;
  name: string;
  publicSlug: string | null;
  customDomain: string | null;
  planId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  planName: string | null;
  /** Precio mensual del plan en USD para el país del negocio. */
  planPrice: number | null;
  planMaxBranches: number | null;
  planMaxUsers: number | null;
  supportEmail: string;
  tenantAdminUrl: string | null;
  country: string | null;
  currency: string;
  locale: string;
  timezone: string;
  /** Cambio a un plan menor programado para el vencimiento. */
  scheduledPlanChange: ScheduledPlanChange | null;
};

export type ScheduledPlanChange = {
  targetPlanId: string;
  targetPlanName: string | null;
  effectiveAt: string;
};

export type CustomerAccountClientProps = {
  /** Sección con la que abre (`/cuenta?tab=plan`, desde los correos). */
  initialTab?: PortalTab;
  company: CompanySnapshot;
  branches: BranchSummary[];
  businessInfo: BusinessInfoSummary | null;
  payments: PaymentSummary[];
  activeAddons: ActiveAddon[];
  availablePlans: PlanOption[];
  availableAddons: AddonOption[];
  initialTickets: TicketSummary[];
  initialBranchEntitlements: BranchEntitlementSummary[];
  initialBillingOptions?: BillingOptionsResponse | null;
  initialSyncedAt?: string | null;
};

export type BillingMethodOption = {
  id: string;
  slug: string;
  name: string;
  auto_verify: boolean;
  config: Record<string, string>;
};

export type BillingOptionsResponse = {
  companyId: string;
  phase: SubscriptionPhase;
  activeBranchCount: number;
  maxBranches: number | null;
  extraBranchEntitlements?: number;
  effectiveMaxBranches?: number | null;
  requiresPaymentForExpansion: boolean;
  branchExpansionPriceMonthly: number;
  /** Lo que cuesta hoy una sucursal extra (hasta el vencimiento); `null` sin periodo vigente. */
  expansionQuote: { remainingDays: number; amountPerBranch: number; coversUntil: string } | null;
  /** Métodos manuales (transferencia y similares) con sus datos de cobro. */
  paymentMethods: BillingMethodOption[];
  /** Client ID para los botones de PayPal; `null` si PayPal no está disponible. */
  paypalClientId: string | null;
};

export type BranchExpansionResponse = {
  ok: true;
  order: PaymentSummary;
  summary: { unitPrice: number; quantity: number; amount: number; remainingDays: number; coversUntil: string };
};

export type PortalImpact = {
  id: string;
  level: "block" | "info";
  title: string;
  detail: string;
};

export type PlanChangePreview = {
  phase: SubscriptionPhase;
  currentPlan: { id: string; name: string; monthly: number } | null;
  targetPlan: { id: string; name: string; monthly: number; max_branches: number | null; max_users: number | null };
  quote: PlanChangeQuote;
  counts: {
    activeBranches: number;
    activeUsers: number;
    extraBranches: number;
    targetEffectiveBranches: number | null;
  };
  impacts: PortalImpact[];
  scheduledChange: { id: string; targetPlanId: string; targetPlanName: string | null; effectiveAt: string } | null;
  openOrderId: string | null;
};

export type AddonPurchasePreview = {
  addon: {
    id: string;
    name: string;
    description: string | null;
    isMonthly: boolean;
    unitPrice: number;
    singleInstance: boolean;
  };
  owned: boolean;
  quantity: number;
  pricing: { amount: number; coversUntil: string | null; remainingDays: number | null };
  impacts: PortalImpact[];
};

export type RenewalQuoteResponse = {
  ok: true;
  phase: SubscriptionPhase;
  plan: { id: string; name: string; monthly: number };
  quote: RenewalQuote;
  openOrderId: string | null;
};

export type RealtimeSnapshotResponse = {
  company: {
    id: string;
    subscription_status: string | null;
    subscription_ends_at: string | null;
    plan_id?: string | null;
    scheduled_plan_change?: ScheduledPlanChange | null;
  } | null;
  payments: PaymentSummary[];
  tickets: TicketSummary[];
  branchEntitlements: BranchEntitlementSummary[];
  activeAddons: Array<{
    id: string;
    status: string;
    expires_at: string | null;
    addon_id: string | null;
    slug: string | null;
    name: string | null;
    type: string | null;
  }>;
};

export type StoreThemeConfig = {
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  priceColor: string;
  discountColor: string;
  hoverColor: string;
  backgroundColor: string;
  /** Brillo de la imagen de fondo (0.2–1.8). `null` = automático según opacidad del color. */
  backgroundBrightness: number | null;
  backgroundImageUrl: string;
  logoUrl: string;
  navbarType?: string;
  navigationMode?: string;
  productCardStyle?: string;
  productDetailsMode?: string;
  /** Claro u oscuro para tarjetas y cromo del menú; "auto" sigue al color de fondo. */
  surfaceScheme?: string;
  /** "image" (imagen + color) o "solid" (solo color liso, sin imagen). */
  backgroundMode?: string;
  /** Color del nombre del local en el header; vacío = color primario. */
  brandNameColor?: string;
  /** Tipografía del menú público (id de STORE_THEME_FONTS). */
  fontFamily?: string;
};

export type StoreThemeResponse = {
  company: {
    id: string;
    name: string;
  };
  published: StoreThemeConfig;
  draft: {
    theme: StoreThemeConfig;
    updatedAt: string | null;
    updatedByEmail: string | null;
    hasUnpublishedChanges: boolean;
  };
  versions: Array<{
    id: string;
    theme: StoreThemeConfig;
    createdAt: string;
    createdByEmail: string | null;
  }>;
  assetUrls?: {
    published: Record<StoreThemeAssetField, string | null>;
    draft: Record<StoreThemeAssetField, string | null>;
  };
};

export type StoreThemeAutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type StoreThemeAssetField = "logoUrl" | "backgroundImageUrl";

export type PortalTab = "resumen" | "perfil" | "tienda" | "plan" | "sucursales" | "facturacion" | "soporte" | "seguridad";
