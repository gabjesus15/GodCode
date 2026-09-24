"use client";

import { useState } from "react";

import type { HomeCompanyRow } from "@/lib/super-admin/home-overview-types";
import { cn } from "@/utils/cn";

// Zona fija: el servidor y el navegador deben pintar la misma fecha al hidratar.
const dateFmt = new Intl.DateTimeFormat("es-CL", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "America/Santiago",
});

export function fmtDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return Number.isFinite(d.getTime()) ? dateFmt.format(d).replace(/\./g, "") : "—";
}

export function expiryHint(row: HomeCompanyRow): { text: string; tone: string } {
	if (row.kind === "application") return { text: "Aún no es empresa", tone: "text-zinc-400" };
	if (!row.endsAt) return { text: "Sin vencimiento", tone: "text-zinc-400" };
	if (row.daysLeft == null) return { text: "Vencido", tone: "text-red-600 dark:text-red-400" };
	const text = row.daysLeft === 1 ? "Vence mañana" : `En ${row.daysLeft} días`;
	return { text, tone: row.daysLeft <= 7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400" };
}

/** Logo de la empresa; si no hay o no carga, su inicial. */
export function CompanyLogo({ row, size = "md" }: { row: HomeCompanyRow; size?: "md" | "lg" }) {
	const [failed, setFailed] = useState(false);
	const box = size === "lg" ? "h-12 w-12 rounded-xl text-base" : "h-8 w-8 rounded-lg text-xs";
	if (row.logoUrl && !failed) {
		return (
			// eslint-disable-next-line @next/next/no-img-element -- logos firmados de Storage, con URL que cambia
			<img
				src={row.logoUrl}
				alt=""
				className={cn("shrink-0 border border-zinc-100 bg-white object-contain dark:border-zinc-800", box)}
				loading="lazy"
				onError={() => setFailed(true)}
			/>
		);
	}
	return (
		<span
			className={cn(
				"flex shrink-0 items-center justify-center bg-zinc-100 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
				box,
			)}
			aria-hidden
		>
			{row.name.slice(0, 1).toUpperCase()}
		</span>
	);
}
