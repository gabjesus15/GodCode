"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

import type { BusinessSector } from "@/lib/onboarding/business-sectors";
import { templatesForSector, type MenuTemplate } from "@/lib/store-theme/menu-templates";
import { STORE_THEME_FONTS } from "@/lib/store-theme/theme-config";
import { cn } from "@/utils/cn";

export const SECTOR_NOUN: Record<BusinessSector, string> = {
	Pizzería: "tu pizzería",
	Sushi: "tu local de sushi",
	Hamburguesas: "tu hamburguesería",
	"Comida rápida": "tu local de comida rápida",
	Restaurante: "tu restaurante",
	Cafetería: "tu cafetería",
	"Panadería y pastelería": "tu panadería",
	Otro: "tu negocio",
};

/** Dos productos de muestra por negocio, para que la miniatura se sienta suya. */
const SAMPLE_ITEMS: Record<BusinessSector, [string, string]> = {
	Pizzería: ["Margarita", "Pepperoni"],
	Sushi: ["Acevichado", "Tempura roll"],
	Hamburguesas: ["Clásica", "Doble queso"],
	"Comida rápida": ["Combo 1", "Papas fritas"],
	Restaurante: ["Lomo saltado", "Risotto"],
	Cafetería: ["Latte", "Croissant"],
	"Panadería y pastelería": ["Torta tres leches", "Croissant"],
	Otro: ["Especial", "Del día"],
};

/** Fotos de mentira: degradados cálidos, distintos para cada producto. */
const FOOD_GRADIENTS = [
	"radial-gradient(circle at 35% 35%, #ffcf8a 0%, #e8823a 45%, #9a3f16 100%)",
	"radial-gradient(circle at 60% 40%, #ffe0a6 0%, #d9622b 50%, #7a2c10 100%)",
	"radial-gradient(circle at 40% 60%, #fff1c9 0%, #e9a546 45%, #8f4b1a 100%)",
];

function fontStack(id: string | undefined): string {
	const font = STORE_THEME_FONTS.find((item) => item.id === id);
	return font ? `var(${font.cssVar}), ${font.generic}` : "inherit";
}

/** Un menú en miniatura con los colores, la letra y las tarjetas de la plantilla. */
function TemplateMiniMenu({
	template,
	accent,
	logoUrl,
	name,
	items,
}: {
	template: MenuTemplate;
	accent: string;
	logoUrl: string | null;
	name: string;
	items: [string, string];
}) {
	const t = template.theme;
	const light = t.surfaceScheme === "light";
	const fg = light ? "#151515" : "#f5f4f2";
	const fg2 = light ? "rgba(21,21,21,0.5)" : "rgba(245,244,242,0.55)";
	const card = light ? "#ffffff" : "rgba(255,255,255,0.07)";
	const line = light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
	const price = t.priceColor || accent;
	const list = t.productCardStyle === "layout-clean" || t.productCardStyle === "layout-horizontal";
	const prices = ["$12", "$14"];

	return (
		<div className="flex h-full w-full flex-col gap-2 overflow-hidden px-2.5 pb-2 pt-2" style={{ background: t.backgroundColor ?? "#111", color: fg }} aria-hidden>
			<div className="flex items-center justify-between px-0.5 text-[7px] font-semibold opacity-70">
				<span>9:41</span>
				<span className="h-[5px] w-3 rounded-[2px] border border-current" />
			</div>
			<div className="flex items-center gap-1.5">
				<span className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white" style={{ boxShadow: `0 0 0 1.5px ${accent}` }}>
					{logoUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={logoUrl} alt="" className="h-full w-full object-contain" />
					) : (
						<span className="block h-full w-full" style={{ background: accent }} />
					)}
				</span>
				<span className="truncate text-[10px] font-bold uppercase leading-none tracking-[0.02em]" style={{ fontFamily: fontStack(t.fontFamily), color: accent }}>
					{name}
				</span>
			</div>
			<div className="flex gap-1">
				<span className="rounded-full px-2 py-[3px] text-[7px] font-semibold text-white" style={{ background: accent }}>
					Todo
				</span>
				<span className="rounded-full px-2 py-[3px] text-[7px]" style={{ boxShadow: `inset 0 0 0 1px ${line}`, color: fg2 }}>
					Combos
				</span>
				<span className="rounded-full px-2 py-[3px] text-[7px]" style={{ boxShadow: `inset 0 0 0 1px ${line}`, color: fg2 }}>
					Bebidas
				</span>
			</div>
			<div className={list ? "flex flex-col gap-1.5" : "grid grid-cols-2 gap-1.5"}>
				{[0, 1, 2, 3].slice(0, list ? 3 : 4).map((index) => (
					<div
						key={index}
						className={cn("overflow-hidden rounded-[7px]", list ? "flex items-center gap-1.5 p-1" : "flex flex-col")}
						style={{ background: card, boxShadow: light ? "0 1px 3px rgba(0,0,0,0.08)" : undefined }}
					>
						<span
							className={cn("block shrink-0", list ? "h-8 w-8 rounded-[5px]" : "aspect-[4/3] w-full")}
							style={{ background: FOOD_GRADIENTS[index % FOOD_GRADIENTS.length] }}
						/>
						<span className={cn("flex min-w-0 flex-1 flex-col gap-[3px]", list ? "pr-1" : "p-1.5")}>
							<span className="truncate text-[8px] font-semibold leading-tight">{items[index % 2]}</span>
							<span className="block h-[3px] w-4/5 rounded-full" style={{ background: line }} />
							<span className="mt-[1px] flex items-center justify-between">
								<span className="text-[8px] font-bold" style={{ color: price }}>
									{prices[index % 2]}
								</span>
								<span className="flex h-3 w-3 items-center justify-center rounded-full text-[8px] leading-none text-white" style={{ background: accent }}>
									+
								</span>
							</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function TemplateCard({
	template,
	selected,
	recommended,
	onSelect,
	accent,
	logoUrl,
	name,
	items,
}: {
	template: MenuTemplate;
	selected: boolean;
	recommended: boolean;
	onSelect: () => void;
	accent: string | null;
	logoUrl: string | null;
	name: string;
	items: [string, string];
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				"group relative flex flex-col rounded-[22px] bg-(--su-surface) p-2 text-left transition-[transform,box-shadow] duration-200 ease-out",
				"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
				selected
					? "shadow-[0_0_0_2px_var(--su-accent),0_12px_28px_-14px_rgba(79,91,255,0.55)]"
					: "shadow-[0_0_0_1px_var(--su-line),0_1px_2px_rgba(17,17,19,0.04)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--su-line-strong),0_14px_30px_-16px_rgba(17,17,19,0.3)]",
			)}
		>
			<div className="relative aspect-[4/5] w-full overflow-hidden rounded-[15px]">
				{template.previewImageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={template.previewImageUrl} alt="" className="h-full w-full object-cover object-top" />
				) : (
					<TemplateMiniMenu template={template} accent={accent ?? template.theme.primaryColor ?? "#111113"} logoUrl={logoUrl} name={name} items={items} />
				)}
				{selected ? (
					<motion.span
						initial={{ scale: 0.3, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: "spring", stiffness: 500, damping: 26 }}
						className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-(--su-accent) text-white shadow-[0_4px_12px_rgba(79,91,255,0.5)] ring-2 ring-white"
					>
						<Check className="h-4 w-4" strokeWidth={3} aria-hidden />
					</motion.span>
				) : null}
			</div>
			<div className="px-1.5 pb-1.5 pt-3">
				<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold tracking-[-0.01em] text-(--su-ink)">
					{template.name}
					{recommended ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-(--su-accent-soft) px-1.5 py-0.5 text-[10.5px] font-semibold tracking-normal text-(--su-accent)">
							<Sparkles className="h-3 w-3" aria-hidden />
							Para ti
						</span>
					) : null}
				</p>
				<p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-(--su-muted)">{template.description}</p>
			</div>
		</button>
	);
}

export function DesignStep({
	sector,
	selectedId,
	onSelect,
	brandColor,
	logoUrl,
	displayName,
}: {
	sector: BusinessSector;
	selectedId: string;
	onSelect: (templateId: string) => void;
	/** El color de los botones de la marca, si eligió uno. */
	brandColor: string | null;
	logoUrl: string | null;
	displayName: string;
}) {
	// Las recomendadas para el negocio van primero (así las ordena templatesForSector).
	const templates = templatesForSector(sector);
	const items = SAMPLE_ITEMS[sector];
	const name = displayName.trim() || "Tu tienda";

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
			{templates.map((template) => (
				<TemplateCard
					key={template.id}
					template={template}
					selected={template.id === selectedId}
					recommended={template.sectors.includes(sector)}
					onSelect={() => onSelect(template.id)}
					accent={brandColor}
					logoUrl={logoUrl}
					name={name}
					items={items}
				/>
			))}
		</div>
	);
}
