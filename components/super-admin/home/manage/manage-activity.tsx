import { CalendarClock, Receipt, ShoppingBag, Store, type LucideIcon } from "lucide-react";

import { createSupabaseServerClient } from "@/utils/supabase/server";

/** Moneda de la tienda: las ventas del negocio no son en dólares. */
function formatSales(value: number, currency: string | null | undefined): string {
	const code = String(currency ?? "").trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(code)) return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
	try {
		const noDecimals = ["CLP", "COP", "ARS", "PYG", "VES"].includes(code);
		return new Intl.NumberFormat("es-CL", { style: "currency", currency: code, maximumFractionDigits: noDecimals ? 0 : 2 }).format(value);
	} catch {
		return `${code} ${value.toFixed(0)}`;
	}
}

const dayFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" });

function Tile({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string; helper: string }) {
	return (
		<div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
			<div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
				<Icon className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
				<p className="truncate text-[13px]">{label}</p>
			</div>
			<p className="mt-2 truncate text-xl font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
			<p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">{helper}</p>
		</div>
	);
}

/** Actividad del negocio (pedidos y ventas de su tienda), para ver si la está usando. */
export async function ManageActivity({ companyId, currency }: { companyId: string; currency: string | null }) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.rpc("get_company_health", { p_company_id: companyId });
	const metrics = (data as Array<{
		total_orders?: number | null;
		total_revenue?: number | string | null;
		last_order_at?: string | null;
		active_branches?: number | null;
	}> | null)?.[0];

	return (
		<section aria-labelledby="manage-activity-title">
			<h3 id="manage-activity-title" className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
				Actividad del negocio
			</h3>
			<p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Pedidos y ventas de su tienda, para ver si la está usando.</p>
			{error ? (
				<p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
					No se pudo cargar la actividad del negocio.
				</p>
			) : (
				<div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
					<Tile icon={ShoppingBag} label="Pedidos" value={(metrics?.total_orders ?? 0).toLocaleString("es-CL")} helper="Desde el inicio" />
					<Tile icon={Receipt} label="Ventas" value={formatSales(Number(metrics?.total_revenue ?? 0), currency)} helper="Total acumulado" />
					<Tile
						icon={CalendarClock}
						label="Último pedido"
						value={metrics?.last_order_at ? dayFmt.format(new Date(metrics.last_order_at)).replace(/\./g, "") : "Sin pedidos"}
						helper="Última actividad"
					/>
					<Tile icon={Store} label="Sucursales activas" value={`${metrics?.active_branches ?? 0}`} helper="En operación" />
				</div>
			)}
		</section>
	);
}
