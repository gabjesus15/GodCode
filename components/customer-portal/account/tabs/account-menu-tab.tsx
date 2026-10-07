"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileUp, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";

import type { CompanySnapshot, MenuSetupSummary } from "../../shared/customer-account-types";
import { resolveCajaUrl } from "../../shared/caja-url";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { PageHeader } from "../../ui/PageHeader";
import { MenuImportReview, type EditableDraft, toEditableDraft } from "./menu-import-review";

import { resolveSampleSector, SAMPLE_MENU_SECTORS } from "@/lib/menu/sample-menus";
import { getTenantMenuUrl } from "@/utils/tenant-url";

export type MenuStatus = Pick<MenuSetupSummary, "productCount" | "sampleCount" | "categoryCount">;
type Feedback = { tone: "success" | "danger" | "warning"; title: string; text: string } | null;

type CreateResponse = {
	productsCreated?: number;
	categoriesCreated?: number;
	productsDeleted?: number;
	skipped?: number;
	errors?: string[];
	status?: MenuStatus;
	error?: string;
};

const IMAGE_MAX_EDGE = 2000;

/** Las fotos del teléfono pesan 5-10 MB: se achican a JPEG antes de subirlas. */
async function shrinkImage(file: File): Promise<File> {
	if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
		return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
	} catch {
		return file;
	}
}

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

export type AccountMenuTabProps = {
	company: Pick<CompanySnapshot, "tenantAdminUrl" | "publicSlug" | "customDomain">;
	menuSetup: MenuSetupSummary;
	/** Dentro de «Configura tu tienda»: sin el encabezado de la sección. */
	embedded?: boolean;
	/** Avisa cuántos productos hay después de cada cambio. */
	onStatusChange?: (status: MenuStatus) => void;
};

export function AccountMenuTab({ company, menuSetup, embedded = false, onStatusChange }: AccountMenuTabProps) {
	const [status, setStatusState] = useState<MenuStatus>(menuSetup);
	const setStatus = (next: MenuStatus) => {
		setStatusState(next);
		onStatusChange?.(next);
	};
	const [sector, setSector] = useState<string>(resolveSampleSector(menuSetup.sector));
	const [busy, setBusy] = useState<"import" | "sample" | "create" | "delete" | null>(null);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [draft, setDraft] = useState<EditableDraft | null>(null);
	const [draftNote, setDraftNote] = useState<string>("");
	const fileInput = useRef<HTMLInputElement>(null);

	const cajaUrl = resolveCajaUrl(company, "products");
	const storeUrl = company.publicSlug ? getTenantMenuUrl(company.publicSlug, company.customDomain) : "";
	const realProducts = Math.max(0, status.productCount - status.sampleCount);

	async function applyCreateResponse(res: Response, okTitle: string) {
		const data = (await res.json().catch(() => ({}))) as CreateResponse;
		if (data.status) setStatus(data.status);
		const created = data.productsCreated ?? 0;
		const errors = data.errors ?? [];
		if (!res.ok && created === 0) {
			setFeedback({ tone: "danger", title: "No pudimos crear los productos", text: data.error ?? errors[0] ?? "Intenta de nuevo en un momento." });
			return false;
		}
		const parts = [`Creamos ${plural(created, "producto", "productos")}`];
		if (data.categoriesCreated) parts.push(`en ${plural(data.categoriesCreated, "categoría nueva", "categorías nuevas")}`);
		const extra = [
			data.skipped ? `${plural(data.skipped, "ya existía", "ya existían")} y no se repitió.` : "",
			errors.length ? `${plural(errors.length, "no se pudo crear", "no se pudieron crear")}: ${errors[0]}` : "",
		].filter(Boolean);
		setFeedback({
			tone: errors.length ? "warning" : "success",
			title: okTitle,
			text: `${parts.join(" ")}. Ya están en tu tienda.${extra.length ? ` ${extra.join(" ")}` : ""}`,
		});
		return true;
	}

	async function loadSample() {
		setBusy("sample");
		setFeedback(null);
		try {
			const res = await fetch("/api/customer-account/menu", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "sample", sector }),
			});
			await applyCreateResponse(res, "Listo, cargamos el menú de ejemplo");
		} catch {
			setFeedback({ tone: "danger", title: "No pudimos cargar el ejemplo", text: "Revisa tu conexión e intenta de nuevo." });
		} finally {
			setBusy(null);
		}
	}

	async function deleteSamples() {
		if (!window.confirm("Se borran los productos de ejemplo que no hayas cambiado. ¿Continuar?")) return;
		setBusy("delete");
		setFeedback(null);
		try {
			const res = await fetch("/api/customer-account/menu", { method: "DELETE" });
			const data = (await res.json().catch(() => ({}))) as CreateResponse;
			if (data.status) setStatus(data.status);
			setFeedback(
				res.ok
					? { tone: "success", title: "Ejemplos borrados", text: `Borramos ${plural(data.productsDeleted ?? 0, "producto", "productos")} de ejemplo.` }
					: { tone: "danger", title: "No pudimos borrar los ejemplos", text: data.error ?? "Intenta de nuevo en un momento." },
			);
		} catch {
			setFeedback({ tone: "danger", title: "No pudimos borrar los ejemplos", text: "Revisa tu conexión e intenta de nuevo." });
		} finally {
			setBusy(null);
		}
	}

	async function readMenuFile(file: File) {
		setBusy("import");
		setFeedback(null);
		setDraft(null);
		try {
			const body = new FormData();
			body.append("file", await shrinkImage(file));
			const res = await fetch("/api/customer-account/menu/import", { method: "POST", body });
			const data = (await res.json().catch(() => ({}))) as {
				draft?: { categories: Array<{ name: string; products: Array<{ name: string; description: string; price: number }> }> };
				dropped?: number;
				truncated?: number;
				notes?: string;
				error?: string;
			};
			if (!res.ok || !data.draft) {
				setFeedback({ tone: "danger", title: "No pudimos leer la carta", text: data.error ?? "Intenta con otra foto o un PDF." });
				return;
			}
			setDraft(toEditableDraft(data.draft));
			setDraftNote(
				[
					data.notes ?? "",
					data.dropped ? `${plural(data.dropped, "fila quedó fuera", "filas quedaron fuera")} por no tener precio o estar repetida.` : "",
					data.truncated ? `${plural(data.truncated, "producto pasó", "productos pasaron")} el máximo de una carga: súbelos en otra.` : "",
				]
					.filter(Boolean)
					.join(" "),
			);
		} catch {
			setFeedback({ tone: "danger", title: "No pudimos leer la carta", text: "Revisa tu conexión e intenta de nuevo." });
		} finally {
			setBusy(null);
			if (fileInput.current) fileInput.current.value = "";
		}
	}

	async function createFromDraft(categories: EditableDraft) {
		setBusy("create");
		setFeedback(null);
		try {
			const res = await fetch("/api/customer-account/menu", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "create",
					draft: {
						categories: categories.map((c) => ({
							name: c.name,
							products: c.products.map((p) => ({ name: p.name, description: p.description, price: p.price })),
						})),
					},
				}),
			});
			if (await applyCreateResponse(res, "Tu menú ya está cargado")) setDraft(null);
		} catch {
			setFeedback({ tone: "danger", title: "No pudimos crear los productos", text: "Revisa tu conexión e intenta de nuevo." });
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="space-y-5 sm:space-y-6">
			{!embedded && <PageHeader
				title="Mi menú"
				description="Carga tus productos de una vez. Después cambias fotos, precios y variantes cuando quieras en la Caja."
				aside={
					cajaUrl ? (
						<a
							href={cajaUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
						>
							Abrir la Caja
							<ExternalLink className="h-4 w-4" aria-hidden />
						</a>
					) : null
				}
			/>}

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
							Ver mi tienda
							<ExternalLink className="h-3.5 w-3.5" aria-hidden />
						</a>
					)}
				</div>
			</Card>

			{feedback && (
				<Alert variant={feedback.tone} title={feedback.title} onDismiss={() => setFeedback(null)}>
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
					Tus clientes los ven en la tienda. Cámbiales nombre, foto y precio en la Caja, o bórralos cuando cargues los tuyos.
				</Alert>
			)}

			{draft ? (
				<MenuImportReview
					draft={draft}
					note={draftNote}
					busy={busy === "create"}
					onChange={setDraft}
					onCancel={() => setDraft(null)}
					onConfirm={(categories) => void createFromDraft(categories)}
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
						<Button variant="secondary" className="mt-auto self-start" loading={busy === "sample"} disabled={busy != null} onClick={() => void loadSample()}>
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
								En la Caja agregas fotos, descripciones, variantes y precios por sucursal.
							</p>
						</div>
						{cajaUrl && (
							<a
								href={cajaUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-auto inline-flex h-9 items-center gap-2 self-start rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
							>
								Abrir la Caja
								<ExternalLink className="h-4 w-4" aria-hidden />
							</a>
						)}
					</Card>
				</div>
			)}
		</div>
	);
}
