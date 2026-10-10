"use client";

import type { CSSProperties } from "react";
import { Check } from "lucide-react";

import {
	describeSectorForCopy,
	orderMenuTemplatesForSector,
	recommendMenuTemplate,
	type MenuTemplate,
	type MenuTemplateId,
} from "@/lib/store-theme/menu-templates";
import { STORE_THEME_FONTS } from "@/lib/store-theme/theme-config";

/**
 * Selector de plantillas del menú: una tarjeta por plantilla con una miniatura
 * del menú pintada con sus colores, su letra y su forma de tarjeta. La
 * recomendada para el tipo de negocio del local va primero y marcada.
 *
 * Es solo presentación: quien lo monta decide qué hacer al elegir (en «Tienda»
 * aplica la plantilla al borrador; en el alta, la deja elegida).
 */
export function MenuTemplatePicker({
	sector,
	value,
	onChange,
	disabled = false,
}: {
	/** Tipo de negocio del alta ("Pizzería", "Sushi"…); null si no se sabe. */
	sector?: string | null;
	/** Plantilla elegida ahora, si hay. */
	value?: string | null;
	onChange: (id: MenuTemplateId) => void;
	disabled?: boolean;
}) {
	const templates = orderMenuTemplatesForSector(sector);
	const recommended = sector ? recommendMenuTemplate(sector) : null;

	return (
		// Botones normales con `aria-pressed`: todos entran en el orden de tabulación y
		// la elegida se anuncia como pulsada, sin la mecánica de flechas de un radiogroup.
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="group" aria-label="Plantillas del menú">
			{templates.map((template) => {
				const selected = value === template.id;
				const isRecommended = recommended === template.id;
				return (
					<button
						key={template.id}
						type="button"
						aria-pressed={selected}
						disabled={disabled}
						onClick={() => onChange(template.id)}
						className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 ${
							selected ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-[#e5e5ea] hover:border-[#c7c7cc]"
						}`}
					>
						<MenuTemplateThumbnail template={template} />
						<span className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
							<span className="flex items-center gap-1.5">
								<span className="text-sm font-semibold text-[#1d1d1f]">{template.name}</span>
								{selected ? (
									<span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
										<Check className="h-3 w-3" aria-hidden />
									</span>
								) : null}
							</span>
							{isRecommended ? (
								<span className="w-fit rounded-md bg-[#f5f5f7] px-1.5 py-0.5 text-[11px] font-medium text-[#6e6e73]">
									Recomendada para {describeSectorForCopy(sector)}
								</span>
							) : null}
							<span className="text-xs leading-snug text-[#6e6e73]">{template.description}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

function fontStack(fontId: string): string {
	const font = STORE_THEME_FONTS.find((entry) => entry.id === fontId) ?? STORE_THEME_FONTS[0];
	return `var(${font.cssVar}), "${font.label}", ${font.generic}`;
}

/**
 * Miniatura del menú: cabecera con el nombre, las categorías, los destacados si
 * van en carrusel, dos productos con la forma de tarjeta de la plantilla y el
 * carrito (botón redondo o barra con el total). No usa fotos: los platos son
 * manchas de color, para que se juzgue el estilo y no la comida.
 */
export function MenuTemplateThumbnail({ template }: { template: MenuTemplate }) {
	const { theme } = template;
	const dark = theme.surfaceScheme === "dark";
	const surface = dark ? "#1b1b1e" : "#ffffff";
	const fg = dark ? "#f7f6f4" : "#1b1b1b";
	const muted = dark ? "rgba(245,244,242,0.45)" : "rgba(27,27,27,0.4)";
	const line = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
	const accent = theme.primaryColor;
	const font = fontStack(theme.fontFamily);
	const fontWeight = STORE_THEME_FONTS.find((entry) => entry.id === theme.fontFamily)?.weight ?? "700";
	const dishes = [
		`radial-gradient(circle at 50% 50%, ${accent}cc 0 32%, #f3d9a4 33% 46%, ${dark ? "#2a2a2f" : "#ece7df"} 47%)`,
		`radial-gradient(circle at 50% 55%, #e9b872 0 30%, #8a5a2b 31% 40%, ${dark ? "#26262b" : "#efe9e1"} 41%)`,
	];
	const floating: CSSProperties = { background: accent, boxShadow: "0 2px 6px rgba(0,0,0,0.25)" };

	const root: CSSProperties = { background: theme.backgroundColor, color: fg };

	return (
		<span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-[#f0f0f2]" style={root} aria-hidden>
			{theme.headerStyle === "cover" ? (
				<span className="relative block h-9" style={{ background: `linear-gradient(135deg, ${accent}, ${theme.secondaryColor})` }}>
					<span
						className="absolute -bottom-2.5 left-2.5 h-5 w-5 rounded-[6px]"
						style={{ background: surface, boxShadow: `0 0 0 2px ${theme.backgroundColor}` }}
					/>
				</span>
			) : null}
			<span
				className={`flex items-center gap-1.5 px-2.5 ${theme.headerStyle === "cover" ? "pt-3" : "pt-2"}`}
				style={{ background: theme.headerStyle === "cover" ? "transparent" : dark ? "#151518" : "rgba(255,255,255,0.7)" }}
			>
				{theme.headerStyle === "cover" ? null : <span className="h-3.5 w-3.5 rounded-[4px]" style={{ background: accent }} />}
				<span
					className="truncate text-[11px] leading-none"
					style={{ fontFamily: font, fontWeight: Number(fontWeight), color: theme.headerStyle === "cover" ? fg : accent }}
				>
					{template.name}
				</span>
			</span>
			<span
				className="flex gap-1.5 px-2.5 pb-1.5 pt-1.5"
				style={{ background: theme.headerStyle === "cover" ? "transparent" : dark ? "#151518" : "rgba(255,255,255,0.7)" }}
			>
				{theme.navbarType === "icon-list" || theme.navbarType === "floating-bottom" ? (
					[0, 1, 2, 3].map((i) => (
						<span
							key={i}
							className="h-4 w-4 rounded-full"
							style={{ background: i === 0 ? dishes[0] : line, boxShadow: i === 0 ? `0 0 0 1.5px ${accent}` : undefined }}
						/>
					))
				) : theme.navbarType === "mega-menu" ? (
					<span className="ml-auto h-2.5 w-10 rounded-full" style={{ background: line }} />
				) : theme.navbarType === "underline-tabs" || theme.navbarType === "sidebar-categories" ? (
					<>
						<span className="flex flex-col gap-0.5">
							<span className="h-1.5 w-6 rounded-full" style={{ background: fg, opacity: 0.85 }} />
							<span className="h-[2px] w-6 rounded-full" style={{ background: accent }} />
						</span>
						<span className="h-1.5 w-5 rounded-full" style={{ background: muted }} />
						<span className="h-1.5 w-5 rounded-full" style={{ background: muted }} />
					</>
				) : (
					<>
						<span className="h-2 w-7 rounded-full" style={{ background: accent }} />
						<span className="h-2 w-6 rounded-full" style={{ background: line }} />
						<span className="h-2 w-5 rounded-full" style={{ background: line }} />
					</>
				)}
			</span>
			{theme.featuredStyle === "carousel" ? (
				// Destacados en carrusel: una fila de tarjetitas que sigue fuera del borde.
				<span className="flex gap-1.5 overflow-hidden px-2.5 pt-1.5">
					{[dishes[0], dishes[1], dishes[0]].map((dish, i) => (
						<span
							key={i}
							className="flex w-[38%] shrink-0 items-center gap-1 rounded-md p-1"
							style={{ background: surface, border: `1px solid ${line}`, opacity: i === 2 ? 0.6 : 1 }}
						>
							<span className="h-4 w-4 shrink-0 rounded" style={{ background: dish }} />
							<span className="flex flex-1 flex-col gap-0.5">
								<span className="h-1 w-4/5 rounded-full" style={{ background: fg, opacity: 0.85 }} />
								<span className="h-1 w-1/2 rounded-full" style={{ background: accent }} />
							</span>
						</span>
					))}
				</span>
			) : null}
			{theme.productCardStyle === "layout-carta" || theme.productCardStyle === "glass-row" ? (
				<span className="flex flex-col gap-1.5 px-2.5 pt-2">
					{[...dishes, dishes[0]].map((dish, i) => (
						<span
							key={i}
							className={`flex items-center gap-2 rounded-lg p-1.5 ${theme.productCardStyle === "glass-row" ? "flex-row-reverse" : ""}`}
							style={{ background: surface, border: `1px solid ${line}` }}
						>
							<span className="flex flex-1 flex-col gap-1">
								<span className="h-1.5 w-3/4 rounded-full" style={{ background: fg, opacity: 0.85 }} />
								<span className="h-1 w-full rounded-full" style={{ background: muted }} />
								<span className="h-1.5 w-1/3 rounded-full" style={{ background: accent }} />
							</span>
							<span className="h-8 w-8 shrink-0 rounded-md" style={{ background: dish }} />
						</span>
					))}
				</span>
			) : (
				<span className="grid grid-cols-2 gap-1.5 px-2.5 pt-2">
					{dishes.map((dish, i) =>
						theme.productCardStyle === "layout-cartel" ? (
							<span key={i} className="relative block aspect-[4/5] overflow-hidden rounded-lg" style={{ background: dish }}>
								<span className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }} />
								<span
									className="absolute bottom-3.5 left-1.5 text-[9px] uppercase leading-none text-white"
									style={{ fontFamily: font, fontWeight: Number(fontWeight) }}
								>
									{i === 0 ? "Especial" : "Clásica"}
								</span>
								<span className="absolute bottom-1 left-1.5 h-1.5 w-6 rounded-full bg-white" />
								<span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
							</span>
						) : (
							<span
								key={i}
								className="flex flex-col overflow-hidden"
								style={{
									background: surface,
									border: `1px solid ${line}`,
									borderRadius: theme.productCardStyle === "layout-nori" ? 6 : 9,
									padding: theme.productCardStyle === "layout-vitrina" ? 3 : 0,
								}}
							>
								<span
									className="block aspect-square"
									style={{ background: dish, borderRadius: theme.productCardStyle === "layout-vitrina" ? 6 : 0 }}
								/>
								<span className="flex items-center gap-1 p-1">
									<span className="flex flex-1 flex-col gap-0.5">
										<span className="h-1.5 w-4/5 rounded-full" style={{ background: fg, opacity: 0.85 }} />
										<span className="h-1.5 w-1/2 rounded-full" style={{ background: fg, opacity: 0.5 }} />
									</span>
									<span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
								</span>
							</span>
						),
					)}
				</span>
			)}
			{theme.cartStyle === "bar" ? (
				// Barra fina abajo con la cantidad, el texto y el total, como en el menú.
				<span className="absolute inset-x-2.5 bottom-2 flex h-4 items-center gap-1 rounded-md px-1" style={floating}>
					<span className="h-2.5 w-3 rounded-sm bg-black/20" />
					<span className="h-1 flex-1 rounded-full bg-white/80" />
					<span className="h-1 w-4 rounded-full bg-white" />
				</span>
			) : (
				<span className="absolute bottom-2 right-2.5 h-4 w-4 rounded-full" style={floating} />
			)}
		</span>
	);
}
