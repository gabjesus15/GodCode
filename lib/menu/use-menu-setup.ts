import { useCallback, useState } from "react";

import type { MenuSetupSummary } from "@/components/customer-portal/shared/customer-account-types";
import { toEditableDraft, type EditableDraft } from "@/lib/menu/editable-draft";
import { resolveSampleSector } from "@/lib/menu/sample-menus";

/**
 * Cargar el menú desde la cuenta: leer una carta, cargar el ejemplo, crear lo revisado y
 * borrar los ejemplos. Lo usan «Mi menú» y el paso «Tu menú» del asistente, cada uno con
 * su pantalla. No toca el navegador (una app puede usarlo igual).
 */

export type MenuStatus = Pick<MenuSetupSummary, "productCount" | "sampleCount" | "categoryCount">;
export type MenuFeedback = { tone: "success" | "danger" | "warning"; title: string; text: string } | null;
export type MenuDraftCategory = { name: string; products: Array<{ name: string; description: string; price: number }> };
export type MenuBusy = "import" | "sample" | "create" | "delete" | null;

type CreateResponse = {
	productsCreated?: number;
	categoriesCreated?: number;
	productsDeleted?: number;
	skipped?: number;
	errors?: string[];
	status?: MenuStatus;
	error?: string;
};

export function pluralize(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

export function useMenuSetup({
	menuSetup,
	onStatusChange,
	prepareFile,
	baseUrl = "",
}: {
	menuSetup: MenuSetupSummary;
	onStatusChange?: (status: MenuStatus) => void;
	/** Para achicar las fotos antes de subirlas (en la web, con canvas). */
	prepareFile?: (file: File) => Promise<File>;
	baseUrl?: string;
}) {
	const [status, setStatusState] = useState<MenuStatus>(menuSetup);
	const [sector, setSector] = useState<string>(resolveSampleSector(menuSetup.sector));
	const [busy, setBusy] = useState<MenuBusy>(null);
	const [feedback, setFeedback] = useState<MenuFeedback>(null);
	const [draft, setDraft] = useState<EditableDraft | null>(null);
	const [draftNote, setDraftNote] = useState("");

	const setStatus = useCallback(
		(next: MenuStatus) => {
			setStatusState(next);
			onStatusChange?.(next);
		},
		[onStatusChange],
	);

	const applyCreateResponse = useCallback(
		async (res: Response, okTitle: string): Promise<boolean> => {
			const data = (await res.json().catch(() => ({}))) as CreateResponse;
			if (data.status) setStatus(data.status);
			const created = data.productsCreated ?? 0;
			const errors = data.errors ?? [];
			if (!res.ok && created === 0) {
				setFeedback({ tone: "danger", title: "No pudimos crear los productos", text: data.error ?? errors[0] ?? "Intenta de nuevo en un momento." });
				return false;
			}
			const parts = [`Creamos ${pluralize(created, "producto", "productos")}`];
			if (data.categoriesCreated) parts.push(`en ${pluralize(data.categoriesCreated, "categoría nueva", "categorías nuevas")}`);
			const extra = [
				data.skipped ? `${pluralize(data.skipped, "ya existía", "ya existían")} y no se repitió.` : "",
				errors.length ? `${pluralize(errors.length, "no se pudo crear", "no se pudieron crear")}: ${errors[0]}` : "",
			].filter(Boolean);
			setFeedback({
				tone: errors.length ? "warning" : "success",
				title: okTitle,
				text: `${parts.join(" ")}. Ya están en tu tienda.${extra.length ? ` ${extra.join(" ")}` : ""}`,
			});
			return true;
		},
		[setStatus],
	);

	const loadSample = useCallback(async () => {
		setBusy("sample");
		setFeedback(null);
		try {
			const res = await fetch(`${baseUrl}/api/customer-account/menu`, {
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
	}, [applyCreateResponse, baseUrl, sector]);

	/** Borra los ejemplos que el dueño no cambió. Pedir confirmación es cosa de la pantalla. */
	const deleteSamples = useCallback(async () => {
		setBusy("delete");
		setFeedback(null);
		try {
			const res = await fetch(`${baseUrl}/api/customer-account/menu`, { method: "DELETE" });
			const data = (await res.json().catch(() => ({}))) as CreateResponse;
			if (data.status) setStatus(data.status);
			setFeedback(
				res.ok
					? { tone: "success", title: "Ejemplos borrados", text: `Borramos ${pluralize(data.productsDeleted ?? 0, "producto", "productos")} de ejemplo.` }
					: { tone: "danger", title: "No pudimos borrar los ejemplos", text: data.error ?? "Intenta de nuevo en un momento." },
			);
		} catch {
			setFeedback({ tone: "danger", title: "No pudimos borrar los ejemplos", text: "Revisa tu conexión e intenta de nuevo." });
		} finally {
			setBusy(null);
		}
	}, [baseUrl, setStatus]);

	const readMenuFile = useCallback(
		async (file: File) => {
			setBusy("import");
			setFeedback(null);
			setDraft(null);
			try {
				const body = new FormData();
				body.append("file", prepareFile ? await prepareFile(file) : file);
				const res = await fetch(`${baseUrl}/api/customer-account/menu/import`, { method: "POST", body });
				const data = (await res.json().catch(() => ({}))) as {
					draft?: { categories: MenuDraftCategory[] };
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
						data.dropped ? `${pluralize(data.dropped, "fila quedó fuera", "filas quedaron fuera")} por no tener precio o estar repetida.` : "",
						data.truncated ? `${pluralize(data.truncated, "producto pasó", "productos pasaron")} el máximo de una carga: súbelos en otra.` : "",
					]
						.filter(Boolean)
						.join(" "),
				);
			} catch {
				setFeedback({ tone: "danger", title: "No pudimos leer la carta", text: "Revisa tu conexión e intenta de nuevo." });
			} finally {
				setBusy(null);
			}
		},
		[baseUrl, prepareFile],
	);

	const createFromDraft = useCallback(
		async (categories: EditableDraft): Promise<boolean> => {
			setBusy("create");
			setFeedback(null);
			try {
				const res = await fetch(`${baseUrl}/api/customer-account/menu`, {
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
				const ok = await applyCreateResponse(res, "Tu menú ya está cargado");
				if (ok) setDraft(null);
				return ok;
			} catch {
				setFeedback({ tone: "danger", title: "No pudimos crear los productos", text: "Revisa tu conexión e intenta de nuevo." });
				return false;
			} finally {
				setBusy(null);
			}
		},
		[applyCreateResponse, baseUrl],
	);

	return {
		status,
		realProducts: Math.max(0, status.productCount - status.sampleCount),
		sector,
		setSector,
		busy,
		feedback,
		clearFeedback: () => setFeedback(null),
		draft,
		setDraft,
		draftNote,
		cancelDraft: () => setDraft(null),
		loadSample,
		deleteSamples,
		readMenuFile,
		createFromDraft,
	};
}
