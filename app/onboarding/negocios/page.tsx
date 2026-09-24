import type { Metadata } from "next";
import Link from "next/link";
import { Store, ExternalLink } from "lucide-react";

import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";
import { getAppUrl } from "@/lib/tenant/app-url";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCurrentLocale } from "../../../lib/i18n/server";
import { getTenantUrl } from "../../../utils/tenant-url";

/** @service-role public-read
 *
 * Directorio público de negocios activos.
 */

const COPY = {
	es: {
		directory: "Directorio",
		title: `Negocios en ${LANDING_PRODUCT_NAME}`,
		desc: "Restaurantes y locales que ya venden con menú digital, pedidos online y delivery en su propio dominio, sin comisiones por venta.",
		seoBody:
			`${LANDING_PRODUCT_NAME}, de ${LANDING_COMPANY_NAME}, es la plataforma para crear tu tienda online: menú digital, pedidos online sin comisiones, punto de venta e inventario. Estos negocios ya confían en nosotros para gestionar pedidos, menú y caja.`,
		emptyTitle: "Aún no hay negocios publicados.",
		emptySub: "Sé el primero en unirte.",
		register: "Registrar mi negocio",
		visit: "Visitar",
		backRegister: "Volver al registro",
		aboutLink: `Sobre ${LANDING_COMPANY_NAME}`,
		homeLink: "Ir al inicio",
		metaTitle: `Negocios en ${LANDING_PRODUCT_NAME} | Menú digital y pedidos`,
		metaDescription:
			`Conoce restaurantes que venden online con ${LANDING_PRODUCT_NAME}: menú digital, pedidos y delivery con dominio propio, sin comisiones.`,
	},
	en: {
		directory: "Directory",
		title: `Businesses on ${LANDING_PRODUCT_NAME}`,
		desc: "Restaurants and shops already selling with a digital menu, online orders and delivery on their own domain — no commissions per sale.",
		seoBody:
			`${LANDING_PRODUCT_NAME}, by ${LANDING_COMPANY_NAME}, is the platform to build your online store: digital menu, commission-free online orders, POS and inventory. These businesses already trust us for orders, menu and checkout.`,
		emptyTitle: "There are no published businesses yet.",
		emptySub: "Be the first to join.",
		register: "Register my business",
		visit: "Visit",
		backRegister: "Back to registration",
		aboutLink: `About ${LANDING_COMPANY_NAME}`,
		homeLink: "Go to home",
		metaTitle: `Businesses on ${LANDING_PRODUCT_NAME} | Digital menu & orders`,
		metaDescription:
			`Discover restaurants selling online with ${LANDING_PRODUCT_NAME}: digital menu, orders and delivery on your own domain, no commissions.`,
	},
} as const;

type ThemeConfig = { displayName?: string; logoUrl?: string } | null;

type CompanyPublic = {
	id: string;
	name: string;
	slug: string;
	customDomain: string | null;
	logoUrl: string | null;
};

function getCopy(locale: string) {
	return locale.toLowerCase().startsWith("es") ? COPY.es : COPY.en;
}

async function fetchPublicCompanies(): Promise<CompanyPublic[]> {
	try {
		const { data, error } = await supabaseAdmin
			.from("companies")
			.select("id,name,public_slug,custom_domain,theme_config")
			.in("subscription_status", ["active", "trial"])
			.not("public_slug", "is", null)
			.order("name");

		if (error || !data) {
			return [];
		}

		const mapped = data
			.map((row) => {
				const theme = (row.theme_config as ThemeConfig) ?? null;
				const id = row.id as string;
				const slug = (row.public_slug as string | null) ?? "";
				const displayName = String(theme?.displayName ?? "").trim();
				const companyName = String(row.name ?? "").trim();
				const slugName = slug
					.split(/[-_]+/)
					.filter(Boolean)
					.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
					.join(" ");
				return {
					id,
					name: displayName || companyName || slugName || "Negocio",
					slug,
					customDomain: (row.custom_domain as string | null)?.trim() || null,
					rawLogo: theme?.logoUrl ?? null,
				};
			})
			.filter((item) => item.slug);

		return Promise.all(
			mapped.map(async ({ rawLogo, ...rest }) => {
				if (!rawLogo || isCloudinaryImageUrl(rawLogo)) {
					return { ...rest, logoUrl: null };
				}
				const logoUrl = (await createStorefrontAssetSignedUrl(rawLogo, rest.id)) || null;
				return { ...rest, logoUrl };
			}),
		);
	} catch {
		return [];
	}
}

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getCurrentLocale();
	const t = getCopy(locale);
	const base = getAppUrl();
	return {
		title: t.metaTitle,
		description: t.metaDescription,
		alternates: {
			canonical: `${base}/onboarding/negocios`,
		},
		openGraph: {
			title: t.metaTitle,
			description: t.metaDescription,
			url: `${base}/onboarding/negocios`,
			siteName: LANDING_COMPANY_NAME,
			type: "website",
			images: [
				{
					url: `${base}/api/system/og`,
					width: 1200,
					height: 630,
					type: "image/png",
					alt: t.metaTitle,
				},
			],
		},
		robots: {
			index: true,
			follow: true,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	};
}

export const revalidate = 600;

export default async function NegociosPage() {
	const locale = await getCurrentLocale();
	const t = getCopy(locale);
	const companies = await fetchPublicCompanies();

	return (
		<main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
			<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
				<div className="max-w-2xl">
					<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{t.title}</h1>
					<p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">{t.desc}</p>
				</div>
				<Link
					href="/onboarding"
					className="onboarding-btn-primary inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm"
				>
					{t.register}
				</Link>
			</div>

			{companies.length === 0 ? (
				<div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center sm:p-10">
					<Store className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
					<p className="mt-4 text-[15px] font-medium text-slate-800">{t.emptyTitle}</p>
					<p className="mt-1 text-sm text-slate-500">{t.emptySub}</p>
				</div>
			) : (
				<ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{companies.map((c) => (
						<li key={c.id}>
							<a
								href={getTenantUrl(c.slug, c.customDomain)}
								target="_blank"
								rel="noopener noreferrer"
								className="onboarding-option flex items-center gap-4 rounded-2xl p-4"
							>
								<span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
									{c.logoUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={c.logoUrl} alt="" className="h-full w-full object-contain" />
									) : (
										<Store className="h-5 w-5 text-slate-400" aria-hidden />
									)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
									<span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
										{t.visit}
										<ExternalLink className="h-3 w-3" aria-hidden />
									</span>
								</span>
							</a>
						</li>
					))}
				</ul>
			)}

			<div className="mt-14 border-t border-slate-200 pt-8">
				<p className="max-w-3xl text-sm leading-relaxed text-slate-600">{t.seoBody}</p>
				<nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={t.directory}>
					<Link href="/onboarding" className="onboarding-link font-medium">
						{t.backRegister}
					</Link>
					<Link href="/sobre-godcode" className="onboarding-link font-medium">
						{t.aboutLink}
					</Link>
					<Link href="/" className="onboarding-link font-medium">
						{t.homeLink}
					</Link>
				</nav>
			</div>
		</main>
	);
}
