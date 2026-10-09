"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { Check, CircleCheck, ImageUp, Pipette, RefreshCw } from "lucide-react";

import { SetupButton } from "../ui/setup-button";
import { SetupField, SetupInput } from "../ui/setup-field";

import type { BrandColorChoice } from "@/lib/owner-setup/effective-theme";
import { contrastRatio } from "@/lib/store-theme/store-theme-utils";
import { brandButtonColors, pickBrandColors, pickButtonColor } from "@/lib/tenant/logo-colors";
import { cn } from "@/utils/cn";

const NAME_MAX = 60;
const LOGO_TYPES = "image/png,image/jpeg,image/webp";

/** Lee los píxeles de una imagen (achicada) para sacar sus colores. */
async function colorsFromImage(src: string): Promise<string[]> {
	const img = new Image();
	img.crossOrigin = "anonymous";
	img.decoding = "async";
	img.src = src;
	await img.decode();
	const scale = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
	canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) return [];
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return pickBrandColors(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}

/** Blanco o negro, lo que más se lea sobre el color. */
function inkOn(hex: string): string {
	const white = contrastRatio(hex, "#ffffff") ?? 0;
	const black = contrastRatio(hex, "#111113") ?? 0;
	return white >= black ? "#ffffff" : "#111113";
}

function Swatch({ color, selected, onSelect, label }: { color: string; selected: boolean; onSelect: () => void; label: string }) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={label}
			title={color.toUpperCase()}
			onClick={onSelect}
			className={cn(
				"relative h-11 w-11 shrink-0 rounded-full transition-[transform,box-shadow] duration-150 hover:scale-[1.06] active:scale-95",
				"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
				selected
					? "shadow-[0_0_0_2px_var(--su-surface),0_0_0_4px_var(--su-ink)]"
					: "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
			)}
			style={{ background: color }}
		>
			{selected ? (
				<motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
					<Check className="h-5 w-5" strokeWidth={2.75} style={{ color: inkOn(color) }} aria-hidden />
				</motion.span>
			) : null}
		</button>
	);
}

function LogoDropzone({
	logoPreviewUrl,
	uploading,
	onPick,
}: {
	logoPreviewUrl: string | null;
	uploading: boolean;
	onPick: (file: File) => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const choose = () => input.current?.click();
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		setDragging(false);
		const file = event.dataTransfer.files?.[0];
		if (file) onPick(file);
	};
	const dragProps = {
		onDragOver: (event: DragEvent) => {
			event.preventDefault();
			setDragging(true);
		},
		onDragLeave: () => setDragging(false),
		onDrop,
	};
	const fileInput = (
		<input
			ref={input}
			type="file"
			accept={LOGO_TYPES}
			className="sr-only"
			tabIndex={-1}
			aria-hidden
			onChange={(event) => {
				const file = event.target.files?.[0];
				event.currentTarget.value = "";
				if (file) onPick(file);
			}}
		/>
	);

	if (!logoPreviewUrl) {
		return (
			<>
				<button
					type="button"
					onClick={choose}
					disabled={uploading}
					{...dragProps}
					className={cn(
						"group relative flex w-full flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-dashed px-6 py-10 text-center transition-colors duration-200",
						"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
						dragging ? "border-(--su-accent) bg-(--su-accent-soft)" : "border-(--su-line-strong) bg-(--su-surface) hover:border-[#b9b9c2] hover:bg-[#fbfbfd]",
					)}
				>
					<span
						className={cn(
							"flex h-14 w-14 items-center justify-center rounded-2xl bg-(--su-accent-soft) text-(--su-accent) transition-transform duration-300",
							dragging ? "scale-110" : "group-hover:-translate-y-0.5",
						)}
					>
						{uploading ? (
							<span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
						) : (
							<ImageUp className="h-6 w-6" aria-hidden />
						)}
					</span>
					<span>
						<span className="block text-[15px] font-semibold text-(--su-ink)">
							{uploading ? "Subiendo tu logo…" : dragging ? "Suéltalo aquí" : "Sube tu logo"}
						</span>
						<span className="mt-1 block text-[13px] text-(--su-muted)">
							Arrástralo aquí o tócalo para elegirlo · PNG, JPG o WebP, hasta 3 MB
						</span>
					</span>
				</button>
				{fileInput}
			</>
		);
	}

	return (
		<div
			{...dragProps}
			className={cn(
				"flex items-center gap-4 rounded-[22px] bg-(--su-surface) p-3 pr-4 ring-1 ring-inset transition-colors sm:gap-5 sm:p-4",
				dragging ? "ring-2 ring-(--su-accent)" : "ring-(--su-line)",
			)}
		>
			<div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(17,17,19,0.06),0_4px_14px_-6px_rgba(17,17,19,0.25)] sm:h-[88px] sm:w-[88px]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={logoPreviewUrl} alt="Tu logo" className="h-full w-full object-contain p-1.5" />
				{uploading ? (
					<span className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
						<span className="h-5 w-5 animate-spin rounded-full border-2 border-(--su-ink) border-t-transparent" aria-hidden />
					</span>
				) : null}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-[15px] font-semibold text-(--su-ink)">Tu logo</p>
				<p className={cn("mt-0.5 flex items-start gap-1.5 text-[13px] leading-snug", uploading ? "text-(--su-muted)" : "text-(--su-success)")}>
					{uploading ? (
						"Subiendo…"
					) : (
						<>
							<CircleCheck className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
							Listo, ya sale en tu menú
						</>
					)}
				</p>
				<button
					type="button"
					onClick={choose}
					disabled={uploading}
					className="mt-2 inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-(--su-accent) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25 disabled:opacity-50 sm:hidden"
				>
					<RefreshCw className="h-3.5 w-3.5" aria-hidden />
					Cambiar logo
				</button>
			</div>
			<SetupButton variant="secondary" size="sm" onClick={choose} disabled={uploading} icon={<RefreshCw aria-hidden />} className="hidden sm:inline-flex">
				Cambiar
			</SetupButton>
			{fileInput}
		</div>
	);
}

export function BrandStep({
	displayName,
	onDisplayNameChange,
	logoPreviewUrl,
	logoColorUrl,
	onPickLogo,
	uploading,
	brandColor,
	onBrandColorChange,
	templateColor,
}: {
	displayName: string;
	onDisplayNameChange: (value: string) => void;
	/** El logo ya subido (URL firmada). */
	logoPreviewUrl: string | null;
	/** De dónde se leen los colores: el archivo recién elegido o el logo guardado. */
	logoColorUrl: string | null;
	onPickLogo: (file: File) => void;
	uploading: boolean;
	brandColor: BrandColorChoice;
	onBrandColorChange: (value: string | null) => void;
	/** El color de los botones del diseño elegido. */
	templateColor: string | null;
}) {
	const [suggested, setSuggested] = useState<string[]>([]);
	const [readFailed, setReadFailed] = useState(false);

	useEffect(() => {
		setReadFailed(false);
		if (!logoColorUrl) {
			setSuggested([]);
			return;
		}
		let cancelled = false;
		colorsFromImage(logoColorUrl)
			.then((colors) => {
				if (cancelled) return;
				setSuggested(colors);
				// Si todavía no eligió, se propone el color del logo que mejor queda en los botones.
				const proposed = pickButtonColor(colors);
				if (proposed && brandColor === undefined) onBrandColorChange(proposed);
			})
			.catch(() => {
				if (cancelled) return;
				setSuggested([]);
				setReadFailed(true);
			});
		return () => {
			cancelled = true;
		};
		// Solo al cambiar el logo: elegir otro color no debe volver a leerlo.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [logoColorUrl]);

	const customColor = brandColor && !suggested.includes(brandColor) ? brandColor : null;
	const buttonColor = (brandColor ? brandButtonColors(brandColor)?.primaryColor : null) ?? templateColor ?? "#111113";

	return (
		<div className="space-y-9">
			<LogoDropzone logoPreviewUrl={logoPreviewUrl} uploading={uploading} onPick={onPickLogo} />

			<SetupField
				label="Nombre de tu negocio"
				hint="Así aparece arriba en tu menú."
				counter={`${displayName.length}/${NAME_MAX}`}
			>
				{({ id, describedBy }) => (
					<SetupInput
						id={id}
						aria-describedby={describedBy}
						value={displayName}
						onChange={(event) => onDisplayNameChange(event.target.value)}
						maxLength={NAME_MAX}
						autoComplete="organization"
						placeholder="Ej: Rica Pizza"
					/>
				)}
			</SetupField>

			<section className="space-y-3.5" aria-labelledby="brand-color-title">
				<div>
					<h3 id="brand-color-title" className="text-sm font-medium text-(--su-ink)">
						Color de tus botones
					</h3>
					<p className="mt-0.5 text-[13px] text-(--su-muted)">
						{suggested.length > 0
							? "Lo sacamos de tu logo. Elige el que más te guste."
							: !logoColorUrl
								? "Sube tu logo y te proponemos sus colores."
								: readFailed
									? "No pudimos leer los colores de tu logo. Elige uno o usa los del diseño."
									: "Tu logo no tiene un color marcado. Elige uno o usa los del diseño."}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{suggested.map((color) => (
						<Swatch
							key={color}
							color={color}
							selected={brandColor === color}
							onSelect={() => onBrandColorChange(color)}
							label={`Usar el color ${color.toUpperCase()} de tu logo`}
						/>
					))}
					{customColor ? (
						<Swatch color={customColor} selected onSelect={() => onBrandColorChange(customColor)} label={`Color elegido ${customColor.toUpperCase()}`} />
					) : null}
					<label
						className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.06] focus-within:ring-4 focus-within:ring-(--su-accent)/25"
						style={{ background: "conic-gradient(from 180deg, #ff5f6d, #ffc371, #f9f871, #4ade80, #22d3ee, #6366f1, #d946ef, #ff5f6d)" }}
						title="Otro color"
					>
						<span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-(--su-ink)">
							<Pipette className="h-4 w-4" aria-hidden />
						</span>
						<input
							type="color"
							value={brandColor ?? buttonColor}
							onChange={(event) => onBrandColorChange(event.target.value)}
							aria-label="Elegir otro color"
							className="absolute inset-0 cursor-pointer opacity-0"
						/>
					</label>
					<span className="mx-1 hidden h-7 w-px bg-(--su-line) sm:block" aria-hidden />
					<button
						type="button"
						aria-pressed={brandColor === null}
						onClick={() => onBrandColorChange(null)}
						className={cn(
							"inline-flex h-11 items-center gap-2 rounded-full pl-2 pr-4 text-[13.5px] font-medium transition",
							"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25",
							brandColor === null
								? "bg-(--su-ink) text-white"
								: "bg-(--su-surface) text-(--su-ink) ring-1 ring-inset ring-(--su-line-strong) hover:bg-(--su-surface-sunken)",
						)}
					>
						<span className="h-7 w-7 rounded-full ring-2 ring-white/80" style={{ background: templateColor ?? "#111113" }} aria-hidden />
						Los del diseño
					</button>
				</div>

				<div className="flex items-center gap-3.5 rounded-2xl bg-(--su-surface-sunken) px-4 py-3">
					<motion.span
						layout
						className="inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)]"
						animate={{ backgroundColor: buttonColor }}
						transition={{ duration: 0.3 }}
					>
						Agregar al pedido
					</motion.span>
					<span className="min-w-0 text-[13px] leading-snug text-(--su-muted)">
						Así se ven tus botones.
						<span className="ml-1.5 font-mono text-[12px] text-(--su-subtle)">{buttonColor.toUpperCase()}</span>
					</span>
				</div>
			</section>
		</div>
	);
}
