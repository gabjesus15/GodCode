"use client";

import { useState } from "react";

import { MenuTemplatePicker } from "@/components/customer-portal/store-theme/menu-template-picker";
import type { MenuTemplateId } from "@/lib/store-theme/menu-templates";

export function PickerPlayground({ sector }: { sector: string | null }) {
	const [value, setValue] = useState<MenuTemplateId | null>(null);
	return (
		<main className="min-h-screen bg-[#fbfbfd] p-4 sm:p-8">
			<div className="mx-auto max-w-4xl rounded-2xl border border-[#e5e5ea] bg-white p-4 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Plantilla del menú</p>
				<p className="mb-3 mt-1 text-sm text-[#6e6e73]">
					Elige cómo se ve tu menú. Cambia tarjetas, letra y colores de una vez; tu logo y tu nombre se quedan.
				</p>
				<MenuTemplatePicker sector={sector} value={value} onChange={setValue} />
			</div>
		</main>
	);
}
