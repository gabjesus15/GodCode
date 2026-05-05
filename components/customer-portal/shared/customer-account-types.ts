/** Tipos compartidos del portal de cuenta cliente (`/cuenta`). */

export type PlanOption = {
  id: string;
  name: string;
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

export type BranchSummary = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean | null;
};

export type PaymentSummary = {
  id: string;
  amount_paid: number | null;
  status: string | null;
  payment_date: string | null;
  payment_method: string | null;
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
  planId: string | null;
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  planName: string | null;
  planPrice: number | null;
  planMaxBranches: number | null;
  planMaxUsers: number | null;
  supportEmail: string;
  tenantAdminUrl: string | null;
  country: string | null;
  currency: string;
  locale: string;
  timezone: string;
};

export type CustomerAccountClientProps = {
  company: CompanySnapshot;
  branches: BranchSummary[];
  payments: PaymentSummary[];
  activeAddons: ActiveAddon[];
  availablePlans: PlanOption[];
  availableAddons: AddonOption[];
  initialTickets: TicketSummary[];
  initialBranchEntitlements: BranchEntitlementSummary[];
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
  activeBranchCount: number;
  maxBranches: number | null;
  extraBranchEntitlements?: number;
  effectiveMaxBranches?: number | null;
  requiresPaymentForExpansion: boolean;
  branchExpansionPriceMonthly: number;
  coTermWithSubscription?: boolean;
  daysUntilPlanEnd?: number | null;
  paymentMethods: BillingMethodOption[];
};

export type BillingPaymentResponse = {
  ok: boolean;
  payment: {
    id: string;
    amount_paid: number;
    months_paid: number;
    payment_reference: string;
    status: string | null;
    payment_method: string | null;
    payment_method_slug: string | null;
    payment_date: string | null;
    reference_file_url: string | null;
  };
  instructions: {
    method: {
      slug: string;
      name: string;
      config: Record<string, string>;
    };
    summary: {
      unitPrice: number;
      quantity: number;
      months: number;
      firstCycleFactor?: number;
      effectiveMonths?: number;
      coTermWithSubscription?: boolean;
      daysUntilPlanEnd?: number | null;
      amount: number;
      requiresManualProof: boolean;
    };
  };
};

export type PlanChangePreview = {
  company: {
    id: string;
    name: string;
    plan_id: string | null;
  };
  currentPlan: {
    id: string;
    name: string;
    price: number | null;
    max_branches: number | null;
    max_users: number | null;
  } | null;
  targetPlan: {
    id: string;
    name: string;
    price: number | null;
    max_branches: number | null;
    max_users: number | null;
  };
  counts: {
    activeBranches: number;
    activeUsers: number;
    activeExtraBranchEntitlements: number;
    targetEffectiveBranches: number | null;
  };
  pricing: {
    currentPrice: number;
    targetPrice: number;
    monthlyDiff: number;
    months: number;
    amountDue: number;
    requiresPayment: boolean;
  };
  execution?: {
    mode: "immediate" | "scheduled_cycle_end";
    effectiveAt: string | null;
    existingSchedule?: {
      id: string;
      targetPlanId: string;
      effectiveAt: string;
    } | null;
  };
  impacts: Array<{
    id: string;
    level: "warn" | "block";
    title: string;
    detail: string;
  }>;
  paymentMethods: Array<{
    id: string;
    slug: string;
    name: string;
    auto_verify: boolean;
    config: Record<string, string>;
  }>;
};

export type AddonPurchasePreview = {
  company: {
    id: string;
    name: string;
    country: string | null;
    plan_id: string | null;
    subscription_ends_at: string | null;
  };
  addon: {
    id: string;
    slug: string;
    name: string;
    type: string | null;
    description: string | null;
    price_one_time: number | null;
    price_monthly: number | null;
  };
  existingActive: boolean;
  planOffer?: {
    status: "available" | "included" | "blocked";
    reason: string;
    matchedBy: "feature_policy" | "heuristic" | "default";
  };
  singleInstance: boolean;
  pricing: {
    isMonthly: boolean;
    unitPrice: number;
    quantity: number;
    months: number;
    amountDue: number;
    requiresPayment: boolean;
  };
  impacts: Array<{
    id: string;
    level: "warn" | "block";
    title: string;
    detail: string;
  }>;
  paymentMethods: Array<{
    id: string;
    slug: string;
    name: string;
    auto_verify: boolean;
    config: Record<string, string>;
  }>;
};

export type RealtimeSnapshotResponse = {
  company: {
    id: string;
    subscription_status: string | null;
    subscription_ends_at: string | null;
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
  backgroundImageUrl: string;
  logoUrl: string;
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
};

export type StoreThemeAutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export type StoreThemeAssetField = "logoUrl" | "backgroundImageUrl";

export type PortalTab = "resumen" | "tienda" | "plan" | "sucursales" | "facturacion" | "soporte" | "seguridad";
