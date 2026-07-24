import type { ReactNode } from "react";
import type { HeroBanner } from "../home/hero-carousel";
import type { Json } from "../../../types/supabase-database";
import type { OrderChannelMode } from "@/lib/tenant/menu-settings";

export interface BranchInfo {
	id: string;
	name: string | null;
	address: string | null;
	phone: string | null;
	schedule?: string | null;
	company_id?: string | null;
	country?: string | null;
	currency?: string | null;
	bank_name?: string | null;
	account_type?: string | null;
	account_number?: string | null;
	account_rut?: string | null;
	account_email?: string | null;
	account_holder?: string | null;
	payment_methods?: string[];
	efectivo?: unknown;
	tarjeta?: unknown;
	pago_movil?: {
		banco?: string;
		telefono?: string;
		identificacion?: string;
	} | null;
	zelle?: {
		email?: string;
		name?: string;
	} | null;
	transferencia_bancaria?: {
		banco?: string;
		nro_cuenta?: string;
		tipo_cuenta?: string;
		identificacion?: string;
		titular?: string;
		email?: string;
	} | null;
	stripe?: { [key: string]: string } | null;
	mercadopago?: { [key: string]: string } | null;
	paypal?: { [key: string]: string } | null;
	delivery_settings?: Json | null;
	origin_lat?: number | null;
	origin_lng?: number | null;
	order_intake_paused?: boolean | null;
	order_intake_pause_message?: string | null;
	whatsapp_url?: string | null;
	instagram_url?: string | null;
	map_url?: string | null;
}

export interface BranchModalItem {
	id: string;
	name: ReactNode;
	address: string | null;
	phone: string | null;
	schedule?: string | null;
	company_id?: string | null;
	bank_name?: string | null;
	account_type?: string | null;
	account_number?: string | null;
	account_rut?: string | null;
	account_email?: string | null;
	account_holder?: string | null;
	disabled?: boolean;
}

export interface MenuCategory {
	id: string;
	name: string;
	order?: number | null;
}

export interface MenuProduct {
	id: string;
	name: string | null;
	description: string | null;
	image_url: string | null;
	category_id: string | null;
	price: number;
	has_discount: boolean;
	discount_price: number | null;
	is_special: boolean;
}

export interface MenuClientProps {
	name: string;
	logoUrl?: string | null;
	businessInfo?: {
		name?: string | null;
		address?: string | null;
		phone?: string | null;
		schedule?: string | null;
		bank_name?: string | null;
		account_type?: string | null;
		account_number?: string | null;
		account_rut?: string | null;
		account_email?: string | null;
		account_holder?: string | null;
	} | null;
	branches: BranchInfo[];
	openBranchIds?: string[];
	categories: MenuCategory[];
	products: MenuProduct[];
	selectedBranchId?: string | null;
	banners?: HeroBanner[];
	country?: string;
	currency?: string;
	navbarType?: string;
	navigationMode?: string;
	productCardStyle?: string;
	productDetailsMode?: string;
	onlineOrderingEnabled?: boolean;
	orderChannel?: OrderChannelMode;
	/** public_slug del negocio (path o dominio custom). */
	tenantSlug?: string | null;
}

export type PreviewThemePayload = {
	displayName?: string;
	logoUrl?: string;
	primaryColor?: string;
	secondaryColor?: string;
	priceColor?: string;
	discountColor?: string;
	hoverColor?: string;
	backgroundColor?: string;
	backgroundImageUrl?: string;
	navbarType?: string;
	navigationMode?: string;
	productCardStyle?: string;
	productDetailsMode?: string;
};

export type BottomNavTab = "home" | "cart" | "contact";

export type CategoryListItem = {
	id: string;
	name: string;
	icon: string | null;
};
