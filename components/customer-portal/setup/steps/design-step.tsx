"use client";

import { Check } from "lucide-react";

import type { BusinessSector } from "@/lib/onboarding/business-sectors";
import { templatesForSector, type MenuTemplate } from "@/lib/store-theme/menu-templates";

const SECTOR_NOUN: Record<BusinessSector, string> = {
	Pizzería: "tu pizzería",
	Sushi: "tu local de sushi",
	Hamburguesas: "tu hamburguesería",
	"Comida rápida": "tu local de comida rápida",
	Restaurante: "tu restaurante",
	Cafetería: "tu cafetería",
	"Panadería y pastelería": "tu panadería",
	Otro: "tu negocio",
};

/** Dibujo chico del menú con los colores de la plantilla, mientras no haya captura. */
function TemplateSketch({ template, brandColor }: { template: MenuTemplate; brandColor: string | null }) {
	const t = template.theme;
	const accent = brandColor ?? t.primaryColor ?? "#111827";
	const light = t.surfaceScheme === "light";
	const card = light ? "#ffffff" : "rgba(255,255,255,0.08)";
	const line = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
	return (
		<div className="flex h-36 flex-col gap-2 p-3" style={{ background: t.backgroundColor ?? "#111" }} aria-hidden>
			<div className="flex items-center gap-1.5">
				<span className="h-4 w-4 rounded-full" style={{ background: accent }} />
				<span className="h-2 w-16 rounded-full" style={{ background: line }} />
			</div>
			<div className="flex gap-1.5">
				<span className="h-3 w-10 rounded-full" style={{ background: accent }} />
				<span className="h-3 w-10 rounded-full" style={{ background: line }} />
				<span className="h-3 w-8 rounded-full" style={{ background: line }} />
			</div>
			<div className={t.productCardStyle === "layout-clean" || t.productCardStyle === "layout-horizontal" ? "flex flex-col gap-1.5" : "grid grid-cols-2 gap-1.5"}>
				{[0, 1].map((i) => (
					<div key={i} className="flex items-center gap-1.5 rounded-md p-1.5" style={{ background: card }}>
						<span className="h-7 w-7 shrink-0 rounded" style={{ background: line }} />
						<span className="flex-1 space-y-1">
							<span className="block h-1.5 w-full rounded-full" style={{ background: line }} />
							<span className="block h-1.5 w-1/2 rounded-full" style={{ background: t.priceColor ?? accent }} />
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function DesignStep({
	sector,
	selectedId,
	onSelect,
	brandColor,
}: {
	sector: BusinessSector;
	selectedId: string;
	onSelect: (templateId: string) => void;
	brandColor: string | null;
}) {
	const templates = templatesForSector(sector);
	const recommended = templates.filter((template) => template.sectors.includes(sector));
	const others = templates.filter((template) => !template.sectors.includes(sector));

	const renderCard = (template: MenuTemplate, isRecommended: boolean) => {
		const selected = template.id === selectedId;
		return (
			<button
				key={template.id}
				type="button"
				aria-pressed={selected}
				onClick={() => onSelect(template.id)}
				className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? "border-indigo-500 ring-2 ring-indigo-500/25" : "border-[#e5e5ea] hover:border-[#c7c7cc]"}`}
			>
				{template.previewImageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={template.previewImageUrl} alt="" className="h-36 w-full object-cover object-top" />
				) : (
					<TemplateSketch template={template} brandColor={brandColor} />
				)}
				<div className="space-y-1 p-3.5">
					<div className="flex items-center justify-between gap-2">
						<p className="font-semibold text-[#1d1d1f]">{template.name}</p>
						{selected && (
							<span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
								<Check className="h-3 w-3 text-white" aria-hidden />
							</span>
						)}
					</div>
					<p className="text-xs leading-relaxed text-[#6e6e73]">{template.description}</p>
					{isRecommended && (
						<p className="pt-1 text-[11px] font-medium text-indigo-600">Recomendado para {SECTOR_NOUN[sector]}</p>
					)}
				</div>
			</button>
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">Cómo se ve tu menú</h2>
				<p className="mt-1 text-sm text-[#6e6e73]">
					Elige un diseño y míralo en el teléfono con tu logo. Lo puedes cambiar cuando quieras desde «Tienda».
				</p>
			</div>

			{recommended.length > 0 && (
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-[#1d1d1f]">Para {SECTOR_NOUN[sector]}</h3>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{recommended.map((template) => renderCard(template, true))}</div>
				</section>
			)}

			{others.length > 0 && (
				<section className="space-y-3">
					<h3 className="text-sm font-semibold text-[#1d1d1f]">{recommended.length > 0 ? "Otros diseños" : "Diseños"}</h3>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{others.map((template) => renderCard(template, false))}</div>
				</section>
			)}
		</div>
	);
}
