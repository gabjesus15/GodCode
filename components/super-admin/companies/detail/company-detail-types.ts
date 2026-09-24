/** Datos que la página del detalle de empresa carga en el servidor y reparte a las pestañas. */

export type CompanyThemeConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  priceColor?: string;
  discountColor?: string;
  hoverColor?: string;
  logoUrl?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  displayName?: string;
  panelAccess?: string[];
  roleNavPermissions?: Record<string, string[]>;
};

export type CompanyDetail = {
  id: string;
  name: string | null;
  legal_rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  public_slug: string | null;
  custom_domain: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  updated_at: string | null;
  country: string | null;
  currency: string | null;
  theme_config: CompanyThemeConfig | null;
};

export type CompanyBusinessInfo = {
  name: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  schedule: string | null;
};

export type CompanyPlanOption = {
  id: string;
  name: string | null;
  price: number | null;
  max_branches: number | null;
  features?: unknown;
  is_active?: boolean | null;
  is_public?: boolean | null;
};

export type CompanyPayment = {
  id: string;
  amount_paid: number | null;
  payment_method: string | null;
  status: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  months_paid: number | null;
  plan_id: string | null;
  reference_file_url: string | null;
};

export type CompanyScheduledChange = {
  targetPlanName: string | null;
  effectiveAt: string;
} | null;
