"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, Star, Trash2 } from "lucide-react";

import { HomeLinkIconGlyph } from "@/components/tenant/home/home-icons";
import {
	HOME_CUSTOM_LINKS_MAX,
	HOME_LABEL_MAX,
	createHomeLinkId,
	phoneToTelHref,
	resolveHomeLinkIcon,
	sanitizeHomeUrl,
	type HomeBuiltinLinkKind,
	type HomeLinkConfig,
	type HomeLinkIcon,
} from "@/lib/tenant/home-page/home-page-config";
import type { HomeBranchInput } from "@/lib/tenant/home-page/resolve-home-page";

import { Switch } from "./home-editor-controls";

const DEFAULT_LABELS: Record<HomeBuiltinLinkKind, string> = {
	menu: "Ver el menú",
	whatsapp: "WhatsApp",
	instagram: "Instagram",
	location: "Cómo llegar",
	phone: "Llamar",
};

const ICON_OPTIONS: Array<[HomeLinkIcon, string]> = [
	["auto", "Automático"],
	["link", "Enlace"],
	["menu", "Menú"],
	["delivery", "Delivery"],
	["reviews", "Reseñas"],
	["calendar", "Reservas"],
	["gift", "Regalo o promo"],
	["mail", "Correo"],
	["phone", "Teléfono"],
	["location", "Ubicación"],
	["whatsapp", "WhatsApp"],
	["instagram", "Instagram"],
	["tiktok", "TikTok"],
	["facebook", "Facebook"],
	["youtube", "YouTube"],
	["x", "X"],
];

const inputClass =
	"h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60";

type HomeLinksEditorProps = {
	links: HomeLinkConfig[];
	branches: HomeBranchInput[];
	errors: Record<string, string>;
	disabled?: boolean;
	onChange: (links: HomeLinkConfig[]) => void;
	onClearError: (id: string) => void;
	onGoToBranches: () => void;
};

function countBranchesWith(kind: HomeBuiltinLinkKind, branches: HomeBranchInput[]): number {
	return branches.filter((branch) => {
		if (kind === "whatsapp") return Boolean(sanitizeHomeUrl(branch.whatsapp_url));
		if (kind === "instagram") return Boolean(sanitizeHomeUrl(branch.instagram_url));
		if (kind === "location") return Boolean(sanitizeHomeUrl(branch.map_url));
		if (kind === "phone") return Boolean(phoneToTelHref(branch.phone));
		return true;
	}).length;
}

export function HomeLinksEditor({ links, branches, errors, disabled, onChange, onClearError, onGoToBranches }: HomeLinksEditorProps) {
	const [armedId, setArmedId] = useState<string | null>(null);
	const [dragId, setDragId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [focusId, setFocusId] = useState<string | null>(null);
	const customCount = links.filter((link) => link.kind === "custom").length;

	const update = (id: string, patch: Partial<HomeLinkConfig>) => {
		onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
		onClearError(id);
	};

	const move = (from: number, to: number) => {
		if (to < 0 || to >= links.length || from === to) return;
		const next = [...links];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		onChange(next);
	};

	const addLink = () => {
		const id = createHomeLinkId();
		onChange([{ id, kind: "custom", enabled: true, label: "", url: "", icon: "auto", featured: false }, ...links]);
		setFocusId(id);
	};

	return (
		<div className="space-y-3">
			<button
				type="button"
				onClick={addLink}
				disabled={disabled || customCount >= HOME_CUSTOM_LINKS_MAX}
				className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] text-sm font-semibold text-white transition hover:bg-black active:scale-[0.99] disabled:opacity-50"
			>
				<Plus className="h-4 w-4" aria-hidden />
				Añadir enlace
			</button>
			{customCount >= HOME_CUSTOM_LINKS_MAX ? (
				<p className="text-xs text-[#6e6e73]">Llegaste al máximo de {HOME_CUSTOM_LINKS_MAX} enlaces propios.</p>
			) : null}

			{/* Lista con filas separadas por líneas, no cajas dentro de la tarjeta. */}
			<ol className="-mx-4 divide-y divide-[#f0f0f5] border-y border-[#f0f0f5] sm:-mx-5">
				{links.map((link, index) => {
					const isCustom = link.kind === "custom";
					const available = isCustom ? 1 : countBranchesWith(link.kind as HomeBuiltinLinkKind, branches);
					const error = errors[link.id];
					const icon = link.kind === "custom" ? resolveHomeLinkIcon(link.icon, link.url) : link.kind;

					let helper: ReactNode = null;
					if (link.kind === "menu") helper = "Lleva a tu carta digital.";
					else if (!isCustom && available === 0)
						helper = (
							<span className="text-amber-700">
								Ninguna sucursal lo tiene configurado, así que no se muestra.{" "}
								<button type="button" onClick={onGoToBranches} className="font-semibold underline underline-offset-2">
									Agregarlo
								</button>
							</span>
						);
					else if (!isCustom && available > 1) helper = `${available} sucursales: el cliente elige a cuál.`;
					else if (!isCustom) helper = "Sale de los datos de tu sucursal.";

					return (
						<li
							key={link.id}
							draggable={armedId === link.id}
							onDragStart={(event) => {
								setDragId(link.id);
								event.dataTransfer.effectAllowed = "move";
							}}
							onDragOver={(event) => {
								if (!dragId) return;
								event.preventDefault();
								setOverId(link.id);
							}}
							onDrop={(event) => {
								event.preventDefault();
								const from = links.findIndex((entry) => entry.id === dragId);
								move(from, index);
								setDragId(null);
								setOverId(null);
							}}
							onDragEnd={() => {
								setArmedId(null);
								setDragId(null);
								setOverId(null);
							}}
							className={`px-1 transition sm:px-2 ${
								overId === link.id && dragId !== link.id ? "bg-indigo-50 shadow-[inset_0_2px_0_0_#6366f1]" : link.enabled ? "bg-white" : "bg-[#fbfbfd]"
							} ${dragId === link.id ? "opacity-50" : ""}`}
						>
							<div className="space-y-2 p-3">
								<div className="flex items-center gap-2 sm:gap-3">
									<button
										type="button"
										aria-label="Arrastrar para ordenar"
										title="Arrastrar para ordenar"
										onPointerDown={() => setArmedId(link.id)}
										onPointerUp={() => setArmedId(null)}
										className="hidden w-4 cursor-grab touch-none text-[#6e6e73] hover:text-[#1d1d1f] active:cursor-grabbing sm:block"
									>
										<GripVertical className="h-4 w-4" aria-hidden />
									</button>

									<span
										className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
											link.featured ? "bg-indigo-600 text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"
										} ${link.enabled ? "" : "opacity-50"}`}
										aria-hidden
									>
										<HomeLinkIconGlyph icon={icon} size={17} />
									</span>

									<input
										value={link.label}
										maxLength={HOME_LABEL_MAX}
										onChange={(event) => update(link.id, { label: event.target.value })}
										placeholder={isCustom ? "Nombre del botón (ej. Reservas)" : DEFAULT_LABELS[link.kind as HomeBuiltinLinkKind]}
										aria-label={isCustom ? "Nombre del botón" : `Texto del botón ${DEFAULT_LABELS[link.kind as HomeBuiltinLinkKind]}`}
										aria-invalid={Boolean(error && !link.label.trim())}
										disabled={disabled}
										ref={(node) => {
											if (node && focusId === link.id) {
												node.focus();
												setFocusId(null);
											}
										}}
										className={`${inputClass} ${error && !link.label.trim() ? "border-red-400" : "border-[#d2d2d7] focus:border-indigo-500"} min-w-0 flex-1 font-semibold`}
									/>

									<Switch
										checked={link.enabled}
										onChange={(enabled) => update(link.id, { enabled })}
										label={link.enabled ? "Visible" : "Oculto"}
										disabled={disabled}
									/>
								</div>

								{isCustom ? (
									<div className="grid gap-2 pl-11 sm:grid-cols-[minmax(0,1fr)_10rem] sm:pl-[4.75rem]">
										<input
											value={link.url}
											type="url"
											inputMode="url"
											spellCheck={false}
											onChange={(event) => update(link.id, { url: event.target.value })}
											placeholder="https://…"
											aria-label="Enlace del botón"
											aria-invalid={Boolean(error && link.label.trim())}
											disabled={disabled}
											className={`${inputClass} ${error && link.label.trim() ? "border-red-400" : "border-[#d2d2d7] focus:border-indigo-500"}`}
										/>
										<select
											value={link.icon}
											onChange={(event) => update(link.id, { icon: event.target.value as HomeLinkIcon })}
											aria-label="Ícono del botón"
											disabled={disabled}
											className={`${inputClass} border-[#d2d2d7] focus:border-indigo-500`}
										>
											{ICON_OPTIONS.map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
									</div>
								) : null}

								<div className="flex items-center justify-between gap-2 pl-11 sm:pl-[4.75rem]">
									<div className="min-w-0 text-xs">
										{error ? (
											<p className="font-medium text-red-600">{error}</p>
										) : helper ? (
											<p className="text-[#6e6e73]">{helper}</p>
										) : null}
									</div>
									<div className="flex shrink-0 items-center gap-0.5">
										<IconButton
											label={link.featured ? "Quitar destacado" : "Destacar con tu color"}
											pressed={link.featured}
											onClick={() => update(link.id, { featured: !link.featured })}
											disabled={disabled}
										>
											<Star className={`h-4 w-4 ${link.featured ? "fill-indigo-600 text-indigo-600" : ""}`} aria-hidden />
										</IconButton>
										<IconButton label="Subir" onClick={() => move(index, index - 1)} disabled={disabled || index === 0}>
											<ArrowUp className="h-4 w-4" aria-hidden />
										</IconButton>
										<IconButton label="Bajar" onClick={() => move(index, index + 1)} disabled={disabled || index === links.length - 1}>
											<ArrowDown className="h-4 w-4" aria-hidden />
										</IconButton>
										{isCustom ? (
											<IconButton
												label="Eliminar enlace"
												onClick={() => onChange(links.filter((entry) => entry.id !== link.id))}
												disabled={disabled}
												danger
											>
												<Trash2 className="h-4 w-4" aria-hidden />
											</IconButton>
										) : null}
									</div>
								</div>
							</div>
						</li>
					);
				})}

				<li className="flex items-center gap-3 bg-[#fbfbfd] px-4 py-3 text-[#6e6e73] sm:px-5">
					<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5f5f7]" aria-hidden>
						<Lock className="h-4 w-4" />
					</span>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-[#1d1d1f]">Crea tu menú</p>
						<p className="text-xs">Botón de Gcode, siempre al final de tu página.</p>
					</div>
				</li>
			</ol>
		</div>
	);
}

function IconButton({
	label,
	onClick,
	disabled,
	pressed,
	danger,
	children,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	pressed?: boolean;
	danger?: boolean;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			aria-pressed={pressed}
			title={label}
			className={`grid h-8 w-8 place-items-center rounded-lg text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:pointer-events-none disabled:opacity-30 ${
				danger ? "hover:!bg-red-50 hover:!text-red-600" : ""
			}`}
		>
			{children}
		</button>
	);
}
