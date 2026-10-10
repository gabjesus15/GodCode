"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ChevronDown, ExternalLink, FileUp, LayoutList, Lock, Trash2, UtensilsCrossed } from "lucide-react";

import { MenuImportReview } from "../../account/tabs/menu-import-review";
import type { CompanySnapshot, MenuSetupSummary } from "../../shared/customer-account-types";
import { shrinkImage } from "../../shared/shrink-image";
import { SetupButton, SetupLinkButton } from "../ui/setup-button";
import { SetupNotice } from "../ui/setup-notice";

import { SAMPLE_MENU_SECTORS } from "@/lib/menu/sample-menus";
import { pluralize, useMenuSetup, type MenuStatus } from "@/lib/menu/use-menu-setup";
import { resolveSalesPanelUrl } from "@/lib/tenant/panel-url";
import { cn } from "@/utils/cn";

const MENU_FILE_TYPES = "image/*,application/pdf,.pdf,.xlsx,.csv";

function Stat({ value, label, tone = "ink" }: { value: number; label: string; tone?: "ink" | "warning" }) {
	return (
		<div className="rounded-2xl bg-(--su-surface) px-4 py-3.5 ring-1 ring-inset ring-(--su-line)">
			<p className={cn("text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums", tone === "warning" ? "text-(--su-warning)" : "text-(--su-ink)")}>
				{value}
			</p>
			<p className="mt-1.5 text-[12.5px] text-(--su-muted)">{label}</p>
		</div>
	);
}

function OptionRow({ icon, iconClass, title, description, children }: { icon: ReactNode; iconClass: string; title: string; description: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
			<div className="flex min-w-0 flex-1 items-start gap-3.5">
				<span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]", iconClass)}>{icon}</span>
				<div className="min-w-0">
					<p className="text-[15px] font-semibold text-(--su-ink)">{title}</p>
					<p className="mt-0.5 text-[13px] leading-snug text-(--su-muted)">{description}</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2 pl-[54px] sm:pl-0">{children}</div>
		</div>
	);
}

export function MenuStep({
	company,
	menuSetup,
	storeDraft = false,
	onStatusChange,
}: {
	company: Pick<CompanySnapshot, "publicSlug">;
	menuSetup: MenuSetupSummary;
	/** «Arma y paga»: la tienda sigue en vista previa y el panel CEO se habilita al publicarla. */
	storeDraft?: boolean;
	onStatusChange: (status: MenuStatus) => void;
}) {
	const menu = useMenuSetup({ menuSetup, onStatusChange, prepareFile: shrinkImage });
	const { status, busy } = menu;
	const fileInput = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	// Borrar ejemplos pide un segundo toque en vez de un cuadro del navegador.
	const [confirmDelete, setConfirmDelete] = useState(false);
	useEffect(() => {
		if (!confirmDelete) return;
		const timer = setTimeout(() => setConfirmDelete(false), 4000);
		return () => clearTimeout(timer);
	}, [confirmDelete]);

	// En vista previa no hay acceso al panel CEO: se muestra cuándo llega en vez del enlace.
	const panelUrl = storeDraft ? "" : resolveSalesPanelUrl(company.publicSlug, { tab: "products" });
	const readFile = (file: File) => {
		void menu.readMenuFile(file).finally(() => {
			if (fileInput.current) fileInput.current.value = "";
		});
	};
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragging(false);
		const file = event.dataTransfer.files?.[0];
		if (file && busy == null) readFile(file);
	};

	return (
		<div className="space-y-6">
			{status.productCount > 0 ? (
				<div className="grid grid-cols-3 gap-2.5">
					<Stat value={menu.realProducts} label={menu.realProducts === 1 ? "producto tuyo" : "productos tuyos"} />
					<Stat value={status.categoryCount} label={status.categoryCount === 1 ? "categoría" : "categorías"} />
					<Stat value={status.sampleCount} label="de ejemplo" tone={status.sampleCount > 0 ? "warning" : "ink"} />
				</div>
			) : null}

			{menu.feedback ? (
				<SetupNotice tone={menu.feedback.tone} title={menu.feedback.title} onDismiss={menu.clearFeedback}>
					{menu.feedback.text}
				</SetupNotice>
			) : null}

			{status.sampleCount > 0 ? (
				<SetupNotice
					tone="warning"
					title={`Tienes ${pluralize(status.sampleCount, "producto", "productos")} de ejemplo`}
					action={
						<SetupButton
							variant={confirmDelete ? "primary" : "secondary"}
							size="sm"
							loading={busy === "delete"}
							disabled={busy != null && busy !== "delete"}
							icon={<Trash2 aria-hidden />}
							onClick={() => {
								if (!confirmDelete) return setConfirmDelete(true);
								setConfirmDelete(false);
								void menu.deleteSamples();
							}}
						>
							{confirmDelete ? "Toca otra vez para borrarlos" : "Borrar ejemplos"}
						</SetupButton>
					}
				>
					{storeDraft
						? "Salen en tu vista previa. Bórralos cuando cargues los tuyos."
						: "Tus clientes los ven en tu tienda. Cámbialos en el panel CEO o bórralos cuando cargues los tuyos."}
				</SetupNotice>
			) : null}

			{menu.draft ? (
				<MenuImportReview
					draft={menu.draft}
					note={menu.draftNote}
					busy={busy === "create"}
					onChange={menu.setDraft}
					onCancel={menu.cancelDraft}
					onConfirm={(categories) => void menu.createFromDraft(categories)}
				/>
			) : (
				<>
					{menuSetup.importEnabled ? (
						<div
							onDragOver={(event) => {
								event.preventDefault();
								setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={onDrop}
							className={cn(
								"relative overflow-hidden rounded-[22px] bg-(--su-surface) p-5 ring-1 ring-inset transition-shadow sm:p-6",
								dragging ? "ring-2 ring-(--su-accent)" : "ring-(--su-line)",
							)}
						>
							<h3 className="relative text-[18px] font-semibold tracking-[-0.015em] text-(--su-ink)">Sube tu carta y la leemos por ti</h3>
							<p className="relative mt-1 max-w-md text-[14px] leading-relaxed text-(--su-muted)">
								Una foto, un PDF o un Excel. Te mostramos los productos para que los revises antes de crearlos.
							</p>
							{busy === "import" ? (
								<div className="relative mt-5 space-y-2" role="status">
									<div className="h-1.5 overflow-hidden rounded-full bg-(--su-surface-sunken)">
										<span className="block h-full w-1/3 animate-[setup-indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-(--su-accent)" />
									</div>
									<p className="text-[13px] text-(--su-muted)">Leyendo tu carta… puede tardar hasta un minuto.</p>
								</div>
							) : (
								<div className="relative mt-5 flex flex-wrap items-center gap-3">
									<SetupButton variant="accent" icon={<FileUp aria-hidden />} disabled={busy != null} onClick={() => fileInput.current?.click()}>
										Elegir archivo
									</SetupButton>
									<span className="hidden text-[13px] text-(--su-subtle) sm:inline">o arrástralo aquí</span>
								</div>
							)}
							<input
								ref={fileInput}
								type="file"
								accept={MENU_FILE_TYPES}
								className="sr-only"
								tabIndex={-1}
								aria-hidden
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) readFile(file);
								}}
							/>
						</div>
					) : null}

					<div className="divide-y divide-(--su-line) overflow-hidden rounded-[22px] bg-(--su-surface) ring-1 ring-inset ring-(--su-line)">
						<OptionRow
							icon={<LayoutList aria-hidden />}
							iconClass="bg-(--su-surface-sunken) text-(--su-ink2)"
							title="Empieza con un ejemplo"
							description="Productos de muestra para ver cómo queda. Los cambias cuando quieras."
						>
							<span className="relative">
								<select
									value={menu.sector}
									onChange={(event) => menu.setSector(event.target.value)}
									aria-label="Tipo de negocio del ejemplo"
									className="h-9 appearance-none rounded-[10px] bg-(--su-surface-sunken) pl-3 pr-8 text-[13px] font-medium text-(--su-ink) outline-none transition focus-visible:ring-4 focus-visible:ring-(--su-accent)/25"
								>
									{SAMPLE_MENU_SECTORS.map((sector) => (
										<option key={sector} value={sector}>
											{sector}
										</option>
									))}
								</select>
								<ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--su-muted)" aria-hidden />
							</span>
							<SetupButton variant="secondary" size="sm" loading={busy === "sample"} disabled={busy != null} onClick={() => void menu.loadSample()}>
								Cargar
							</SetupButton>
						</OptionRow>
						{storeDraft || panelUrl ? (
							<OptionRow
								icon={<UtensilsCrossed aria-hidden />}
								iconClass="bg-(--su-surface-sunken) text-(--su-ink2)"
								title="Créalos uno por uno"
								description="En el panel CEO agregas fotos, variantes y precios por sucursal."
							>
								{panelUrl ? (
									<SetupLinkButton href={panelUrl} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" trailingIcon={<ExternalLink aria-hidden />}>
										Abrir el panel CEO
									</SetupLinkButton>
								) : (
									<span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--su-muted)">
										<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
										Disponible cuando publiques tu tienda
									</span>
								)}
							</OptionRow>
						) : null}
					</div>
				</>
			)}
		</div>
	);
}
