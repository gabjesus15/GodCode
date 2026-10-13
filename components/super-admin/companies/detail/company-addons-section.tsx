"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { formatAdminDay } from "@/lib/super-admin/admin-format";
import { TENANT_ADMIN_TAB_OPTIONS } from "@/lib/super-admin/tenant-admin-tabs";
import { cn } from "@/utils/cn";

import { SectionCard } from "./company-section";

type AddonInfo = {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	type: string | null;
	price_monthly: number | string | null;
	price_one_time: number | string | null;
	unlocks_tabs: string[] | null;
	panel_module: string | null;
	company_id: string | null;
	is_active: boolean;
};

/** Extra que existe en el panel de caja pero todavía no en el catálogo. */
type PanelModule = { id: string; label: string; description: string | null };

type OwnedRow = {
	id: string;
	addon_id: string;
	status: string;
	expires_at: string | null;
};

const TAB_LABELS = new Map<string, string>(TENANT_ADMIN_TAB_OPTIONS.map((tab) => [tab.id, tab.label]));

/** Igual que el panel de caja: activo y sin vencer. */
function isLive(row: OwnedRow | undefined): boolean {
	if (!row || row.status !== "active") return false;
	return !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
}

function priceLabel(addon: AddonInfo): string | null {
	const monthly = Number(addon.price_monthly ?? 0);
	if (monthly > 0) return `${formatUsd(monthly)}/mes`;
	const once = Number(addon.price_one_time ?? 0);
	return once > 0 ? `${formatUsd(once)} único` : null;
}

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: () => void; label: string }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={onChange}
			className={cn(
				"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
				checked ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-700",
			)}
		>
			<span
				className={cn(
					"inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform dark:bg-zinc-900",
					checked ? "translate-x-[22px]" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}

type RowProps = {
	title: string;
	badges: ReactNode;
	info: (string | null | undefined)[];
	live: boolean;
	busy: boolean;
	readOnly: boolean;
	expiry: string;
	onExpiry: (value: string) => void;
	onToggle: () => void;
};

function ExtraRow({ title, badges, info, live, busy, readOnly, expiry, onExpiry, onToggle }: RowProps) {
	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
			<div className="min-w-0 flex-1">
				<p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
					{title}
					{badges}
				</p>
				<p className="mt-0.5 text-xs text-zinc-500">{info.filter(Boolean).join(" · ")}</p>
			</div>
			<div className="flex items-center gap-2">
				{!live && !readOnly ? (
					<Input
						type="date"
						aria-label={`Vencimiento de ${title} (opcional)`}
						title="Vence (opcional)"
						className="h-8 w-[150px] rounded-lg text-xs"
						value={expiry}
						onChange={(e) => onExpiry(e.target.value)}
						disabled={busy}
					/>
				) : null}
				<Toggle checked={live} disabled={readOnly || busy} label={live ? `Quitar ${title}` : `Activar ${title}`} onChange={onToggle} />
			</div>
		</li>
	);
}

/**
 * Todos los extras del catálogo (los de todos y los hechos a medida para esta empresa), con
 * un interruptor para activarlos o quitarlos. Activo, el extra aparece en el panel de caja:
 * en «Addons», con las pestañas que desbloquea y, si abre un módulo de `src/addons/`, con su
 * propia pestaña. Al validar un pago se activan solos.
 *
 * También salen los extras nuevos del panel (`src/addons/` de GodCode-Panel) que aún no están en
 * el catálogo: al activarlos se agregan solos, sin precio y sin ofrecerse en /cuenta.
 */
export function CompanyAddonsSection({ companyId }: { companyId: string }) {
	const { readOnly } = useAdminRole();
	const [owned, setOwned] = useState<OwnedRow[] | null>(null);
	const [catalog, setCatalog] = useState<AddonInfo[]>([]);
	const [panelModules, setPanelModules] = useState<PanelModule[]>([]);
	const [panelError, setPanelError] = useState<string | null>(null);
	const [expiry, setExpiry] = useState<Record<string, string>>({});
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const url = `/api/super-admin/companies/${companyId}/addons`;

	const load = useCallback(async () => {
		try {
			const res = await fetch(url, { cache: "no-store" });
			const data = (await res.json()) as {
				owned?: OwnedRow[];
				catalog?: AddonInfo[];
				panelModules?: PanelModule[];
				panelError?: string | null;
				error?: string;
			};
			if (!res.ok) throw new Error(data.error ?? "No se pudo leer");
			setOwned(data.owned ?? []);
			setCatalog(data.catalog ?? []);
			setPanelModules(data.panelModules ?? []);
			setPanelError(data.panelError ?? null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo leer");
		}
	}, [url]);

	useEffect(() => {
		void load();
	}, [load]);

	const send = async (key: string, request: () => Promise<Response>) => {
		setBusyId(key);
		setError(null);
		try {
			const res = await request();
			const data = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo guardar");
		} finally {
			setBusyId(null);
		}
	};

	const expiresAtFor = (key: string) => (expiry[key] ? `${expiry[key]}T23:59:59` : null);
	const post = (payload: Record<string, unknown>) =>
		fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
	const setExpiryFor = (key: string) => (value: string) => setExpiry((prev) => ({ ...prev, [key]: value }));

	const toggle = (addon: AddonInfo, live: boolean) => {
		if (live && !window.confirm(`¿Quitar «${addon.name}» a esta empresa? Deja de verlo en su panel.`)) return;
		void send(addon.id, () =>
			live
				? fetch(`${url}?addonId=${encodeURIComponent(addon.id)}`, { method: "DELETE" })
				: post({ addonId: addon.id, expiresAt: expiresAtFor(addon.id) }),
		);
	};

	const activatePanelModule = (item: PanelModule) => {
		const key = `module:${item.id}`;
		void send(key, () => post({ panelModule: item.id, expiresAt: expiresAtFor(key) }));
	};

	const description =
		"Todos los extras que ofrecemos y los que hay en el panel de caja. Al activarlo, la empresa lo ve en su panel (Addons y, si trae módulo, su propia pestaña).";

	if (!owned) {
		return (
			<SectionCard title="Extras" description={description}>
				{error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : <p className="text-sm text-zinc-500">Cargando…</p>}
			</SectionCard>
		);
	}

	const ownedById = new Map(owned.map((row) => [row.addon_id, row]));

	return (
		<SectionCard title="Extras" description={description}>
			<div className="flex flex-col gap-3">
				{catalog.length === 0 && panelModules.length === 0 ? (
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Todavía no hay extras en el catálogo ni en el panel. Créalos en Servicios extra.
					</p>
				) : (
					<ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
						{catalog.map((addon) => {
							const row = ownedById.get(addon.id);
							const live = isLive(row);
							const expired = row?.status === "active" && !live;
							const tabs = (addon.unlocks_tabs ?? []).map((id) => TAB_LABELS.get(id) ?? id);
							return (
								<ExtraRow
									key={addon.id}
									title={addon.name}
									badges={
										<>
											{live ? <SaasStatusBadge label="Activo" variant="success" /> : null}
											{expired ? <SaasStatusBadge label="Vencido" variant="warning" /> : null}
											{addon.company_id ? <SaasStatusBadge label="A medida" variant="info" /> : null}
											{!addon.is_active ? <SaasStatusBadge label="No se ofrece" variant="neutral" /> : null}
										</>
									}
									info={[
										priceLabel(addon),
										addon.panel_module ? `Abre en el panel: ${addon.panel_module}` : "Sin pantalla en el panel",
										tabs.length > 0 ? `Desbloquea: ${tabs.join(", ")}` : null,
										live ? (row?.expires_at ? `Vence el ${formatAdminDay(row.expires_at)}` : "Sin vencimiento") : null,
									]}
									live={live}
									busy={busyId === addon.id}
									readOnly={readOnly}
									expiry={expiry[addon.id] ?? ""}
									onExpiry={setExpiryFor(addon.id)}
									onToggle={() => toggle(addon, live)}
								/>
							);
						})}
						{panelModules.map((item) => {
							const key = `module:${item.id}`;
							return (
								<ExtraRow
									key={key}
									title={item.label}
									badges={<SaasStatusBadge label="Nuevo en el panel" variant="info" />}
									info={[item.description, `Abre en el panel: ${item.id}`, "Se agrega al catálogo al activarlo (sin precio)"]}
									live={false}
									busy={busyId === key}
									readOnly={readOnly}
									expiry={expiry[key] ?? ""}
									onExpiry={setExpiryFor(key)}
									onToggle={() => activatePanelModule(item)}
								/>
							);
						})}
					</ul>
				)}
				{panelError ? (
					<p className="text-xs text-amber-700 dark:text-amber-400">
						{panelError} Solo se muestran los extras que ya están en el catálogo.
					</p>
				) : null}
				{error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
			</div>
		</SectionCard>
	);
}
