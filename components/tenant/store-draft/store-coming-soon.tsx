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
			<div className="flex w-full max-w-sm flex-col items-center text-center">
				{logoUrl ? (
					// eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin optimizador
					<img
						src={logoUrl}
						alt=""
						style={{ padding: 8 }}
						className="h-20 w-20 rounded-[1.4rem] bg-white object-contain shadow-sm ring-1 ring-slate-900/5"
					/>
				) : (
					<span
						aria-hidden
						className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] text-2xl font-semibold text-white"
						style={{ background: accent }}
					>
						{brandInitials(name, { fallback: "G" })}
					</span>
				)}
				<p style={{ marginTop: 28 }} className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
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
