"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { HelpCircle, X } from "lucide-react";

function typingTarget(el: EventTarget | null): boolean {
	if (!el || !(el instanceof HTMLElement)) return false;
	return Boolean(
		el.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
	);
}

export function AdminShortcutsHelp() {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const gPressAt = useRef<number>(0);

	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && open) {
				e.preventDefault();
				close();
				return;
			}

			if (typingTarget(e.target)) {
				return;
			}

			if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				gPressAt.current = Date.now();
				return;
			}
			if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				const delta = Date.now() - gPressAt.current;
				if (delta > 0 && delta < 900) {
					e.preventDefault();
					gPressAt.current = 0;
					router.push("/dashboard");
				}
				return;
			}

			if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, close, router]);

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	const overlay =
		open && typeof document !== "undefined" ? (
			<div
				className="fixed inset-0 z-[190] flex items-start justify-center px-4 pt-[10vh] sm:pt-[12vh]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="admin-shortcuts-title"
			>
				<button
					type="button"
					className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
					onClick={close}
					aria-label="Cerrar ayuda"
				/>
				<div className="relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900">
					<div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
						<h2
							id="admin-shortcuts-title"
							className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
						>
							Atajos del panel
						</h2>
						<button
							type="button"
							onClick={close}
							className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
					<ul className="max-h-[min(70vh,420px)] space-y-3 overflow-y-auto p-4 text-sm text-zinc-700 dark:text-zinc-300">
						<li className="flex justify-between gap-3">
							<span>Abrir o cerrar búsqueda / ir a…</span>
							<kbd className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
								Ctrl+K
							</kbd>
						</li>
						<li className="flex justify-between gap-3">
							<span>Mostrar u ocultar esta ayuda</span>
							<kbd className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
								?
							</kbd>
						</li>
						<li className="flex justify-between gap-3">
							<span>Cerrar menú móvil o esta ventana</span>
							<kbd className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
								Esc
							</kbd>
						</li>
						<li className="flex justify-between gap-3">
							<span>Ir al dashboard (pulsar g y luego d)</span>
							<kbd className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">
								g d
							</kbd>
						</li>
					</ul>
					<p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
						Los atajos no se activan mientras escribes en un campo de texto.
					</p>
				</div>
			</div>
		) : null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
				aria-label="Atajos de teclado"
				title="Atajos (?)"
			>
				<HelpCircle className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
			</button>
			{overlay ? createPortal(overlay, document.body) : null}
		</>
	);
}
