"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ExternalLink,
	Home,
	Camera,
	MapPin,
	MessageCircle,
	Palette,
	Phone,
} from "lucide-react";

import type {
	BranchSummary,
	BusinessInfoSummary,
	CompanySnapshot,
	PortalTab,
	StoreThemeConfig,
} from "../../shared/customer-account-types";
import { getTenantHomeUrl } from "@/utils/tenant-url";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";

const inputClass =
	"h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-150";

type BranchContactDraft = {
	phone: string;
	address: string;
	schedule: string;
	whatsapp_url: string;
	instagram_url: string;
	map_url: string;
};

function branchToDraft(branch: BranchSummary): BranchContactDraft {
	return {
		phone: branch.phone ?? "",
		address: branch.address ?? "",
		schedule: branch.schedule ?? "",
		whatsapp_url: branch.whatsapp_url ?? "",
		instagram_url: branch.instagram_url ?? "",
		map_url: branch.map_url ?? "",
	};
}

export type AccountPerfilPublicoTabProps = {
	company: CompanySnapshot;
	branches: BranchSummary[];
	initialBusinessInfo: BusinessInfoSummary | null;
	storeThemePublished: StoreThemeConfig | null;
	onNavigate: (tab: PortalTab) => void;
};

export function AccountPerfilPublicoTab({
	company,
	branches,
	initialBusinessInfo,
	storeThemePublished,
	onNavigate,
}: AccountPerfilPublicoTabProps) {
	const router = useRouter();
	const [schedule, setSchedule] = useState(initialBusinessInfo?.schedule ?? "");
	const [branchDrafts, setBranchDrafts] = useState<Record<string, BranchContactDraft>>(() =>
		Object.fromEntries(branches.map((b) => [b.id, branchToDraft(b)])),
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	useEffect(() => {
		setSchedule(initialBusinessInfo?.schedule ?? "");
	}, [initialBusinessInfo]);

	useEffect(() => {
		setBranchDrafts(Object.fromEntries(branches.map((b) => [b.id, branchToDraft(b)])));
	}, [branches]);

	const homeUrl = useMemo(
		() => (company.publicSlug ? getTenantHomeUrl(company.publicSlug, company.customDomain) : ""),
		[company.customDomain, company.publicSlug],
	);

	const displayName = storeThemePublished?.displayName?.trim() || company.name;
	const logoUrl = storeThemePublished?.logoUrl?.trim() || "";

	const updateBranchDraft = useCallback((branchId: string, patch: Partial<BranchContactDraft>) => {
		setBranchDrafts((prev) => ({
			...prev,
			[branchId]: { ...prev[branchId], ...patch },
		}));
	}, []);

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		setOk(null);

		try {
			const businessRes = await fetch("/api/customer-account/business-info", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ schedule }),
			});
			const businessData = await businessRes.json().catch(() => ({}));
			if (!businessRes.ok) {
				throw new Error(businessData.error || "No se pudo guardar la información general");
			}

			const activeBranches = branches.filter((b) => b.is_active !== false);
			for (const branch of activeBranches) {
				const draft = branchDrafts[branch.id];
				if (!draft) continue;

				const res = await fetch("/api/customer-account/branches/contact", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						id: branch.id,
						phone: draft.phone,
						address: draft.address,
						schedule: draft.schedule,
						whatsapp_url: draft.whatsapp_url,
						instagram_url: draft.instagram_url,
						map_url: draft.map_url,
					}),
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(data.error || `No se pudo guardar ${branch.name}`);
				}
			}

			setOk("Perfil público actualizado. Los cambios ya se ven en tu página de inicio.");
			router.refresh();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error inesperado al guardar");
		} finally {
			setSaving(false);
		}
	};

	const activeBranches = branches.filter((b) => b.is_active !== false);

	return (
		<div className="space-y-5 sm:space-y-6">
			<PageHeader
				title="Página de inicio"
				description="Edita lo que ven tus clientes en la portada del negocio: frase, contacto y enlaces del menú."
			/>

			{error ? <Alert variant="danger">{error}</Alert> : null}
			{ok ? <Alert variant="success">{ok}</Alert> : null}

			<Card compact>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
							<Home className="h-5 w-5" aria-hidden />
						</div>
						<div>
							<p className="text-sm font-semibold text-[#1d1d1f]">{displayName}</p>
							<p className="text-xs text-[#6e6e73]">Vista previa del encabezado público</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{homeUrl ? (
							<a
								href={homeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e5ea] px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
							>
								Ver página <ExternalLink className="h-3.5 w-3.5" aria-hidden />
							</a>
						) : null}
						<Button variant="ghost" size="sm" icon={<Palette className="h-3.5 w-3.5" />} onClick={() => onNavigate("tienda")}>
							Nombre y logo
						</Button>
					</div>
				</div>
				{logoUrl ? (
					<p className="mt-3 text-[11px] text-[#a1a1a6]">
						Logo configurado en Tienda. Publica los cambios de tema para que se reflejen en la web.
					</p>
				) : (
					<p className="mt-3 text-[11px] text-amber-700">
						Aún no hay logo publicado. Configúralo en la pestaña Tienda.
					</p>
				)}
			</Card>

			<Card compact>
				<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Texto principal</p>
				<p className="mb-4 text-xs text-[#6e6e73]">
					La primera línea aparece debajo del nombre en la página de inicio. Puedes usar varias líneas para el horario completo.
				</p>
				<label className="block text-xs font-medium text-[#6e6e73]">
					Frase o horario de atención
					<textarea
						value={schedule}
						onChange={(e) => setSchedule(e.target.value)}
						rows={3}
						placeholder="Ej. Lun–Vie 11:00–22:00 · Delivery y retiro en local"
						className="mt-1.5 w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
						disabled={saving}
					/>
				</label>
			</Card>

			<Card compact>
				<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">
					Botones de la página de inicio
				</p>
				<p className="mb-4 text-xs text-[#6e6e73]">
					WhatsApp, Instagram y Ubicación se muestran como botones cuando tienen enlace. Si tienes varias sucursales, el cliente elige cuál contactar.
				</p>

				{activeBranches.length === 0 ? (
					<p className="text-sm text-[#6e6e73]">No hay sucursales activas. Agrega una en Sucursales.</p>
				) : (
					<div className="space-y-6">
						{activeBranches.map((branch) => {
							const draft = branchDrafts[branch.id] ?? branchToDraft(branch);
							return (
								<div key={branch.id} className="rounded-xl border border-[#e5e5ea] p-4">
									<p className="mb-3 text-sm font-semibold text-[#1d1d1f]">{branch.name}</p>
									<div className="grid gap-3 sm:grid-cols-2">
										<label className="block text-xs font-medium text-[#6e6e73] sm:col-span-2">
											<span className="mb-1 flex items-center gap-1.5">
												<MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
											</span>
											<input
												type="url"
												value={draft.whatsapp_url}
												onChange={(e) => updateBranchDraft(branch.id, { whatsapp_url: e.target.value })}
												placeholder="https://wa.me/5491123456789"
												className={inputClass}
												disabled={saving}
											/>
										</label>
										<label className="block text-xs font-medium text-[#6e6e73] sm:col-span-2">
											<span className="mb-1 flex items-center gap-1.5">
												<Camera className="h-3.5 w-3.5" aria-hidden /> Instagram
											</span>
											<input
												type="url"
												value={draft.instagram_url}
												onChange={(e) => updateBranchDraft(branch.id, { instagram_url: e.target.value })}
												placeholder="https://instagram.com/tu-negocio"
												className={inputClass}
												disabled={saving}
											/>
										</label>
										<label className="block text-xs font-medium text-[#6e6e73] sm:col-span-2">
											<span className="mb-1 flex items-center gap-1.5">
												<MapPin className="h-3.5 w-3.5" aria-hidden /> Google Maps
											</span>
											<input
												type="url"
												value={draft.map_url}
												onChange={(e) => updateBranchDraft(branch.id, { map_url: e.target.value })}
												placeholder="https://maps.app.goo.gl/..."
												className={inputClass}
												disabled={saving}
											/>
										</label>
										<label className="block text-xs font-medium text-[#6e6e73]">
											<span className="mb-1 flex items-center gap-1.5">
												<Phone className="h-3.5 w-3.5" aria-hidden /> Teléfono
											</span>
											<input
												type="tel"
												value={draft.phone}
												onChange={(e) => updateBranchDraft(branch.id, { phone: e.target.value })}
												placeholder="+54 9 11 2345 6789"
												className={inputClass}
												disabled={saving}
											/>
										</label>
										<label className="block text-xs font-medium text-[#6e6e73]">
											Dirección
											<input
												value={draft.address}
												onChange={(e) => updateBranchDraft(branch.id, { address: e.target.value })}
												placeholder="Calle y número, ciudad"
												className={`${inputClass} mt-1`}
												disabled={saving}
											/>
										</label>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Card>

			<div className="flex justify-end">
				<Button variant="primary" onClick={() => void handleSave()} loading={saving}>
					Guardar cambios
				</Button>
			</div>
		</div>
	);
}
