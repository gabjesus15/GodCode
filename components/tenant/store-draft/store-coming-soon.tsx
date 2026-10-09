import { sanitizeHexColor } from "@/lib/store-theme/apply-theme-css-vars";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { getAppUrl } from "@/lib/tenant/app-url";
import { brandInitials } from "@/lib/tenant/brand-initials";

type ComingSoonCompany = {
	id: string | number;
	name?: string | null;
	theme_config?: unknown;
};

/**
 * Lo que ve cualquiera que abre una tienda en vista previa sin ser su dueño: neutra, con
 * la marca que el dueño ya eligió, sin pinta de error. No promete fecha ni enseña el menú.
 */
export async function StoreComingSoon({ company }: { company: ComingSoonCompany }) {
	const stored = normalizeStoreThemeConfig(company.theme_config, company.name ?? "");
	const theme = await resolveStorefrontThemeAssets(stored, String(company.id));
	const name = theme.displayName?.trim() || company.name?.trim() || "Esta tienda";
	const accent = sanitizeHexColor(theme.primaryColor, "#4F5BFF");
	const logoUrl = theme.logoUrl?.trim() || null;

	return (
		// Rellenos y márgenes en línea: la hoja base de la tienda (`* { margin: 0; padding: 0 }`)
		// pisa las utilidades de Tailwind.
		<main
			style={{ padding: "80px 20px" }}
			className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#FAFAF8] text-slate-900"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16] blur-3xl"
				style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
			/>
			<div className="flex w-full max-w-sm flex-col items-center text-center">
				{logoUrl ? (
					// eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin optimizador
					<img
						src={logoUrl}
						alt=""
						style={{ padding: 8 }}
						className="h-20 w-20 rounded-[1.4rem] bg-white object-contain shadow-[0_1px_2px_rgba(15,23,42,0.06),0_16px_40px_-18px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5"
					/>
				) : (
					<span
						aria-hidden
						className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] text-2xl font-semibold text-white shadow-[0_16px_40px_-18px_rgba(15,23,42,0.45)]"
						style={{ background: accent }}
					>
						{brandInitials(name, { fallback: "G" })}
					</span>
				)}
				<p style={{ marginTop: 28, padding: "4px 12px" }} className="inline-flex items-center gap-2 rounded-full bg-white text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
					<span className="relative flex h-1.5 w-1.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
						<span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
					</span>
					Abre pronto
				</p>
				<h1 style={{ marginTop: 16 }} className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
				<p style={{ marginTop: 12 }} className="text-pretty text-[15px] leading-relaxed text-slate-600">
					Esta tienda abre pronto. Están terminando de preparar el menú: vuelve a visitarla en unos días.
				</p>
			</div>
			<footer className="absolute inset-x-0 bottom-6 text-center text-xs text-slate-400">
				Hecha con{" "}
				<a href={`${getAppUrl()}/onboarding`} className="font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline">
					Gcode
				</a>
			</footer>
		</main>
	);
}
