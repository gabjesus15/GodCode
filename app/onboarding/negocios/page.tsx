import type { Metadata } from "next";
import Link from "next/link";
import { Store, ExternalLink } from "lucide-react";

import { LANDING_BRAND_NAME } from "@/lib/landing/brand";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";
import { getAppUrl } from "@/lib/tenant/app-url";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCurrentLocale } from "../../../lib/i18n/server";
import { getTenantUrl } from "../../../utils/tenant-url";

const COPY = {
	es: {
		directory: "Directorio",
		title: `Negocios en ${LANDING_BRAND_NAME}`,
		desc: "Restaurantes y locales que ya venden con menú digital, pedidos online y delivery en su propio dominio, sin comisiones por venta.",
		seoBody:
			`${LANDING_BRAND_NAME} es la plataforma para crear tu tienda online: menú digital, pedidos online sin comisiones, punto de venta e inventario. Estos negocios ya confían en nosotros para gestionar pedidos, menú y caja.`,
		emptyTitle: "Aún no hay negocios publicados.",
		emptySub: "Sé el primero en unirte.",
		register: "Registrar mi negocio",
		visit: "Visitar",
		backRegister: "Volver al registro",
		aboutLink: `Sobre ${LANDING_BRAND_NAME}`,
		homeLink: "Ir al inicio",
		metaTitle: `Negocios en ${LANDING_BRAND_NAME} | Menú digital y pedidos`,
		metaDescription:
			`Conoce restaurantes que venden online con ${LANDING_BRAND_NAME}: menú digital, pedidos y delivery con dominio propio, sin comisiones.`,
	},
	en: {
		directory: "Directory",
		title: `Businesses on ${LANDING_BRAND_NAME}`,
		desc: "Restaurants and shops already selling with a digital menu, online orders and delivery on their own domain — no commissions per sale.",
		seoBody:
			`${LANDING_BRAND_NAME} is the platform to build your online store: digital menu, commission-free online orders, POS and inventory. These businesses already trust us for orders, menu and checkout.`,
		emptyTitle: "There are no published businesses yet.",
		emptySub: "Be the first to join.",
		register: "Register my business",
		visit: "Visit",
		backRegister: "Back to registration",
		aboutLink: `About ${LANDING_BRAND_NAME}`,
		homeLink: "Go to home",
		metaTitle: `Businesses on ${LANDING_BRAND_NAME} | Digital menu & orders`,
		metaDescription:
			`Discover restaurants selling online with ${LANDING_BRAND_NAME}: digital menu, orders and delivery on your own domain, no commissions.`,
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
			siteName: LANDING_BRAND_NAME,
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
		<div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-12 md:py-16">
			<div className="mb-8 text-center sm:mb-10">
				<div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
					<Store className="h-3.5 w-3.5 shrink-0" />
					{t.directory}
				</div>
				<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
					{t.title}
				</h1>
				<p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
					{t.desc}
				</p>
				<p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
					{t.seoBody}{" "}
					<Link href="/sobre-godcode" className="font-medium text-indigo-600 hover:underline">
						{t.aboutLink}
					</Link>
					{" · "}
					<Link href="/" className="font-medium text-indigo-600 hover:underline">
						{t.homeLink}
					</Link>
				</p>
			</div>

			{companies.length === 0 ? (
				<div className="onboarding-card mx-auto max-w-md p-8 text-center sm:p-10">
					<Store className="mx-auto h-10 w-10 text-slate-300" />
					<p className="mt-4 text-sm text-slate-600">{t.emptyTitle}</p>
					<p className="mt-1 text-xs text-slate-400">{t.emptySub}</p>
					<Link
						href="/onboarding"
						className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
					>
						{t.register}
					</Link>
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{companies.map((c) => (
						<a
							key={c.id}
							href={getTenantUrl(c.slug, c.customDomain)}
							target="_blank"
							rel="noopener noreferrer"
							className="onboarding-card flex items-center gap-4 p-4 transition hover:border-indigo-200 hover:shadow-lg"
						>
							<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
								{c.logoUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={c.logoUrl} alt="" className="h-full w-full object-contain" />
								) : (
									<Store className="h-6 w-6 text-slate-400" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
								<p className="flex items-center gap-1 text-xs text-slate-400">
									<ExternalLink className="h-3 w-3" />
									{t.visit}
								</p>
							</div>
						</a>
					))}
				</div>
			)}

			<div className="mt-10 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-5">
				<Link href="/" className="text-sm font-medium text-indigo-600 hover:underline">
					{t.homeLink}
				</Link>
				<span className="hidden text-slate-300 sm:inline" aria-hidden>
					·
				</span>
				<Link href="/sobre-godcode" className="text-sm font-medium text-indigo-600 hover:underline">
					{t.aboutLink}
				</Link>
				<span className="hidden text-slate-300 sm:inline" aria-hidden>
					·
				</span>
				<Link href="/onboarding" className="text-sm font-medium text-slate-500 hover:text-slate-900">
					← {t.backRegister}
				</Link>
			</div>
		</div>
	);
}
