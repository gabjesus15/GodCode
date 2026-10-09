"use client";

import { useRef } from "react";
import { ExternalLink, FileUp, Lock, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";

import type { CompanySnapshot, MenuSetupSummary } from "../../shared/customer-account-types";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { shrinkImage } from "../../shared/shrink-image";
import { MenuImportReview } from "./menu-import-review";

import { pluralize as plural, useMenuSetup, type MenuStatus } from "@/lib/menu/use-menu-setup";
import { SAMPLE_MENU_SECTORS } from "@/lib/menu/sample-menus";
import { resolveSalesPanelUrl } from "@/lib/tenant/panel-url";
import { getTenantMenuUrl } from "@/utils/tenant-url";

export type { MenuStatus };

export const DELETE_SAMPLES_CONFIRM = "Se borran los productos de ejemplo que no hayas cambiado. ¿Continuar?";

export type AccountMenuTabProps = {
	company: Pick<CompanySnapshot, "publicSlug" | "customDomain">;
	menuSetup: MenuSetupSummary;
	/** «Arma y paga»: la tienda sigue en vista previa y el panel CEO se habilita al publicarla. */
	storeDraft?: boolean;
	/** Avisa cuántos productos hay después de cada cambio. */
	onStatusChange?: (status: MenuStatus) => void;
};

export function AccountMenuTab({ company, menuSetup, storeDraft = false, onStatusChange }: AccountMenuTabProps) {
	const menu = useMenuSetup({ menuSetup, onStatusChange, prepareFile: shrinkImage });
	const { status, sector, setSector, busy, feedback, draft, draftNote, realProducts } = menu;
	const fileInput = useRef<HTMLInputElement>(null);

	// En vista previa no hay acceso al panel CEO: se muestra cuándo llega en vez del enlace.
	const panelUrl = storeDraft ? "" : resolveSalesPanelUrl(company.publicSlug, { tab: "products" });
	const storeUrl = company.publicSlug ? getTenantMenuUrl(company.publicSlug, company.customDomain) : "";

	async function deleteSamples() {
		if (!window.confirm(DELETE_SAMPLES_CONFIRM)) return;
		await menu.deleteSamples();
	}

	async function readMenuFile(file: File) {
		await menu.readMenuFile(file);
		if (fileInput.current) fileInput.current.value = "";
	}

	return (
		<div className="space-y-5 sm:space-y-6">
			<PageHeader
				title="Mi menú"
				description={
					storeDraft
						? "Carga tus productos de una vez. Cuando publiques tu tienda, cambias fotos, precios y variantes en el panel CEO."
						: "Carga tus productos de una vez. Después cambias fotos, precios y variantes cuando quieras en el panel CEO."
				}
				aside={
					panelUrl ? (
						<a
							href={panelUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
						>
							Abrir el panel CEO
							<ExternalLink className="h-4 w-4" aria-hidden />
						</a>
					) : null
				}
			/>

			<Card compact>
				<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#6e6e73]">
					<p>
						<span className="text-lg font-semibold text-[#1d1d1f]">{realProducts}</span> {realProducts === 1 ? "producto" : "productos"} tuyos
					</p>
					<p>
						<span className="text-lg font-semibold text-[#1d1d1f]">{status.categoryCount}</span> {status.categoryCount === 1 ? "categoría" : "categorías"}
					</p>
					{status.sampleCount > 0 && (
						<p>
							<span className="text-lg font-semibold text-amber-600">{status.sampleCount}</span> de ejemplo
						</p>
					)}
					{storeUrl && status.productCount > 0 && (
						<a href={storeUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
							{storeDraft ? "Ver la vista previa" : "Ver mi tienda"}
							<ExternalLink className="h-3.5 w-3.5" aria-hidden />
						</a>
					)}
				</div>
			</Card>

			{feedback && (
				<Alert variant={feedback.tone} title={feedback.title} onDismiss={menu.clearFeedback}>
					{feedback.text}
				</Alert>
			)}

			{status.sampleCount > 0 && (
				<Alert
					variant="warning"
					title={`Tienes ${plural(status.sampleCount, "producto", "productos")} de ejemplo`}
					action={
						<Button variant="secondary" size="sm" loading={busy === "delete"} disabled={busy != null} onClick={() => void deleteSamples()} icon={<Trash2 className="h-3.5 w-3.5" />}>
							Borrar ejemplos
						</Button>
					}
				>
					{storeDraft
						? "Salen en tu vista previa. Bórralos cuando cargues los tuyos."
						: "Tus clientes los ven en tu tienda. Cámbiales nombre, foto y precio en el panel CEO, o bórralos cuando cargues los tuyos."}
				</Alert>
			)}

			{draft ? (
				<MenuImportReview
					draft={draft}
					note={draftNote}
					busy={busy === "create"}
					onChange={menu.setDraft}
					onCancel={menu.cancelDraft}
					onConfirm={(categories) => void menu.createFromDraft(categories)}
				/>
			) : (
				<div className="grid gap-3 md:grid-cols-3">
					{menuSetup.importEnabled && (
						<Card compact className="flex flex-col gap-3">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
								<FileUp className="h-4 w-4 text-indigo-600" aria-hidden />
							</div>
							<div>
								<p className="text-sm font-semibold text-[#1d1d1f]">Sube tu carta</p>
								<p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">
									Una foto, un PDF o un Excel. La leemos y te mostramos los productos para que los revises antes de crearlos.
								</p>
							</div>
							<input
								ref={fileInput}
								type="file"
								accept="image/*,application/pdf,.pdf,.xlsx,.csv"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) void readMenuFile(file);
								}}
							/>
							<Button className="mt-auto self-start" loading={busy === "import"} disabled={busy != null} onClick={() => fileInput.current?.click()}>
								{busy === "import" ? "Leyendo tu carta…" : "Elegir archivo"}
							</Button>
							{busy === "import" && <p className="text-xs text-[#a1a1a6]">Puede tardar hasta un minuto.</p>}
						</Card>
					)}

					<Card compact className="flex flex-col gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
							<Sparkles className="h-4 w-4 text-amber-600" aria-hidden />
						</div>
						<div>
							<p className="text-sm font-semibold text-[#1d1d1f]">Empieza con un ejemplo</p>
							<p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">
								Cargamos productos de muestra para tu tipo de negocio, para que veas cómo queda tu tienda.
							</p>
						</div>
						<label className="text-xs font-medium text-[#6e6e73]">
							Tipo de negocio
							<select
								value={sector}
								onChange={(e) => setSector(e.target.value)}
								className="mt-1 block h-9 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f]"
							>
								{SAMPLE_MENU_SECTORS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<Button variant="secondary" className="mt-auto self-start" loading={busy === "sample"} disabled={busy != null} onClick={() => void menu.loadSample()}>
							Cargar ejemplo
						</Button>
					</Card>

					<Card compact className="flex flex-col gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
							<UtensilsCrossed className="h-4 w-4 text-emerald-600" aria-hidden />
						</div>
						<div>
							<p className="text-sm font-semibold text-[#1d1d1f]">Crea tus productos uno por uno</p>
							<p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">
								En el panel CEO agregas fotos, descripciones, variantes y precios por sucursal.
							</p>
						</div>
						{storeDraft ? (
							<p className="mt-auto inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[#6e6e73]">
								<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
								Disponible cuando publiques tu tienda
							</p>
						) : panelUrl ? (
							<a
								href={panelUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-auto inline-flex h-9 items-center gap-2 self-start rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
							>
								Abrir el panel CEO
								<ExternalLink className="h-4 w-4" aria-hidden />
							</a>
						) : null}
					</Card>
				</div>
			)}
		</div>
	);
}
