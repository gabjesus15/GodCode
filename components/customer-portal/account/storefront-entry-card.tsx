"use client";

import { useEffect, useState } from "react";

import type { StorefrontEntry } from "@/lib/tenant/home-page/home-page-config";
import { Switch } from "../home-page/home-editor-controls";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const ENDPOINT = "/api/customer-account/storefront-entry";

/** Switch de la pestaña Tienda. Sin el plan que lo incluye no se muestra. */
export function StorefrontEntryCard() {
	const [canChoose, setCanChoose] = useState(false);
	const [entry, setEntry] = useState<StorefrontEntry>("home");
	const [savedEntry, setSavedEntry] = useState<StorefrontEntry>("home");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const res = await fetch(ENDPOINT, { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as { storefrontEntry: StorefrontEntry; canChooseStorefrontEntry: boolean };
				if (cancelled) return;
				setEntry(data.storefrontEntry);
				setSavedEntry(data.storefrontEntry);
				setCanChoose(data.canChooseStorefrontEntry === true);
			} catch {
				// Sin respuesta no se puede saber si el plan lo incluye: la tarjeta sigue oculta.
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	if (!canChoose) return null;

	const dirty = entry !== savedEntry;
	const directToMenu = entry === "menu-panel";

	const save = async () => {
		setSaving(true);
		setError(null);
		setOk(null);
		try {
			const res = await fetch(ENDPOINT, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ storefrontEntry: entry }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error || "No se pudo guardar la entrada de la tienda.");
				return;
			}
			setSavedEntry(entry);
			setOk("Entrada de la tienda guardada.");
		} catch {
			setError("No se pudo guardar la entrada de la tienda.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card className="space-y-4 p-4 sm:p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-base font-semibold text-[#1d1d1f]">Entrada de la tienda</h2>
					<p className="text-sm text-[#6e6e73]">Qué ve tu cliente al abrir tu enlace o tu QR.</p>
				</div>
				{dirty ? <Badge variant="warning">Cambios sin guardar</Badge> : null}
			</div>

			{error ? <Alert variant="danger">{error}</Alert> : null}
			{ok ? <Alert variant="success">{ok}</Alert> : null}

			<div className="space-y-2 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-3.5">
				<Switch
					checked={directToMenu}
					disabled={saving}
					label="Entrar directo a la carta"
					onChange={(checked) => {
						setOk(null);
						setEntry(checked ? "menu-panel" : "home");
					}}
				/>
				<p className="text-sm text-[#6e6e73]">
					{directToMenu
						? "Tu cliente entra directo a la carta y encuentra tus enlaces en el panel lateral."
						: "Tu cliente ve primero tu página de inicio, con tus enlaces."}
				</p>
			</div>

			<div className="flex justify-end">
				<Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
					{saving ? "Guardando…" : "Guardar entrada"}
				</Button>
			</div>
		</Card>
	);
}
