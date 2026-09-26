import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CommissionCalculator } from "@/components/landing-v3/commission-calculator";
import { FloatingSocialDock } from "@/components/landing-v3/floating-social-dock";
import { Footer } from "@/components/landing-v3/footer";
import { LandingConversionTracker } from "@/components/landing-v3/landing-conversion-tracker";
import { Navbar } from "@/components/landing-v3/navbar";
import { SectionGlow } from "@/components/landing-v3/section-light";
import { Ticker } from "@/components/landing-v3/ticker";
import { getCountryFromHeaders } from "@/lib/geo/landing-geo-plans";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getLandingSocialLinks } from "@/lib/landing/contact-server";
import { getOrganizationId } from "@/lib/landing/json-ld";
import { resolveLowestPlanPrice } from "@/lib/landing/price";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";

const PATH = "/calculadora-comisiones";
const TITLE = "Calculadora de comisiones de apps de delivery";
const DESCRIPTION =
	"Calcula cuánto le pagas cada mes a PedidosYa, Uber Eats, Rappi u otra app de delivery, y cuánto ahorrarías vendiendo desde tu propia tienda sin comisiones.";

/** Visible en la página y en FAQPage: mismas palabras en los dos lados, como pide Google. */
const FAQ = [
	{
		question: "¿Cuánto cobran las apps de delivery?",
		answer:
			"Depende de la app, del país y de tu contrato. Suele ser un porcentaje de cada pedido, y a veces se suman cargos por envío o por publicidad. Tu porcentaje exacto está en el contrato o en la liquidación que te envía la app.",
	},
	{
		question: "¿Tengo que dejar las apps de delivery?",
		answer:
			"No. Muchos negocios siguen en las apps para que los encuentren clientes nuevos, y llevan a su propia tienda a los que ya los conocen: los que repiten, los que llegan desde Instagram y los que piden en la mesa.",
	},
	{
		question: "¿Qué incluye el cálculo?",
		answer: `La comisión que dejarías de pagar por los pedidos que pasen a tu tienda, menos el plan mensual de ${LANDING_PRODUCT_NAME}. No incluye envíos ni la comisión de tu medio de pago.`,
	},
];

export async function generateMetadata(): Promise<Metadata> {
	const host = (await headers()).get("host") || "";
	if (!isMainDomain(host)) return {};

	const base = getAppUrl();
	const url = `${base}${PATH}`;
	const ogImage = { url: `${base}/api/system/og`, width: 1200, height: 630, type: "image/png", alt: TITLE };

	return {
		metadataBase: new URL(base),
		// La plantilla raíz añade "· Gcode Labs".
		title: TITLE,
		description: DESCRIPTION,
		alternates: { canonical: url },
		openGraph: {
			title: TITLE,
			description: DESCRIPTION,
			url,
			siteName: LANDING_COMPANY_NAME,
			locale: "es_LA",
			type: "website",
			images: [ogImage],
		},
		twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [ogImage.url] },
		robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	};
}

export default async function CalculadoraComisionesPage() {
	const hdrs = await headers();
	if (!isMainDomain(hdrs.get("host") || "")) notFound();

	const country = getCountryFromHeaders(hdrs);
	const [plans, socialLinks] = await Promise.all([getPublicPlansForLanding(DEFAULT_LOCALE), getLandingSocialLinks()]);
	const plan = resolveLowestPlanPrice(plans, country);
	const floatingSocialLinks = socialLinks.filter((link) => link.kind === "instagram" || link.kind === "whatsapp");

	const base = getAppUrl();
	const ld = [
		{
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: TITLE,
			url: `${base}${PATH}`,
			description: DESCRIPTION,
			applicationCategory: "BusinessApplication",
			operatingSystem: "Web",
			isAccessibleForFree: true,
			inLanguage: "es",
			publisher: { "@id": getOrganizationId(base) },
		},
		{
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: LANDING_PRODUCT_NAME, item: `${base}/` },
				{ "@type": "ListItem", position: 2, name: "Calculadora de comisiones", item: `${base}${PATH}` },
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: FAQ.map((item) => ({
				"@type": "Question",
				name: item.question,
				acceptedAnswer: { "@type": "Answer", text: item.answer },
			})),
		},
	];

	return (
		<div className="landing-v3 min-h-screen">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
				dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
			/>
			<Navbar />
			<main>
				<section
					data-landing-hero
					className="relative z-10 overflow-hidden rounded-b-[2rem] border-b border-[#4f5bff]/25 bg-[#080808] shadow-[0_24px_60px_-24px_rgba(79,91,255,0.45)] md:rounded-b-[3rem]"
				>
					<div
						aria-hidden
						className="pointer-events-none absolute -right-[15%] top-[5%] h-[70vh] w-[70vw] max-w-[900px] rounded-full opacity-60 blur-[90px]"
						style={{ background: "radial-gradient(ellipse at center, rgba(79,91,255,0.4) 0%, transparent 70%)" }}
					/>
					<div className="v3-container relative grid gap-12 pt-32 pb-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16 lg:pt-36 lg:pb-24">
						<div className="text-center lg:text-left">
							<h1 className="font-display text-[clamp(2.9rem,10vw,5.25rem)] leading-[0.92] text-white text-balance">
								¿Cuánto te cobran las <span className="text-[#4f5bff]">apps de delivery</span>?
							</h1>
							<p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[#a1a1aa] text-pretty lg:mx-0">
								Calcula cuánto pagas cada mes en comisiones y cuánto ahorrarías vendiendo desde tu propia tienda.
							</p>
							<p className="mx-auto mt-4 max-w-md text-sm text-[#71717a] lg:mx-0">
								Sirve para PedidosYa, Uber Eats, Rappi o cualquier otra app.
							</p>
						</div>
						<CommissionCalculator plan={plan} />
					</div>
				</section>

				<section className="v3-section-dark py-24 md:py-32">
					<SectionGlow className="left-1/2 top-1/3 h-[520px] w-[min(1000px,150vw)] -translate-x-1/2" intensity={0.1} />
					<div className="v3-container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
						<h2 data-reveal className="font-display text-5xl leading-[0.95] text-[#f4f4f5] md:text-6xl lg:sticky lg:top-28 lg:self-start">
							Preguntas sobre las comisiones
						</h2>
						<dl data-reveal className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
							{FAQ.map((item) => (
								<div key={item.question} className="py-7">
									<dt className="text-lg font-medium text-[#f4f4f5]">{item.question}</dt>
									<dd className="mt-3 max-w-2xl leading-relaxed text-[#a1a1aa] text-pretty">{item.answer}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<Ticker socialLinks={socialLinks} />
			</main>
			<Footer socialLinks={socialLinks} />
			<FloatingSocialDock links={floatingSocialLinks} />
			<LandingConversionTracker />
		</div>
	);
}
