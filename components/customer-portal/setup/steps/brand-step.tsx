"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus } from "lucide-react";

import { Button } from "../../ui/Button";

import { pickBrandColors, pickButtonColor } from "@/lib/tenant/logo-colors";

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

export function BrandStep({
	displayName,
	onDisplayNameChange,
	logoPreviewUrl,
	onUploadLogo,
	uploading,
	brandColor,
	onBrandColorChange,
}: {
	displayName: string;
	onDisplayNameChange: (value: string) => void;
	logoPreviewUrl: string | null;
	onUploadLogo: (file: File) => void;
	uploading: boolean;
	/** `undefined` = todavía no eligió; `null` = los colores del diseño. */
	brandColor: string | null | undefined;
	onBrandColorChange: (value: string | null) => void;
}) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [suggested, setSuggested] = useState<string[]>([]);
	const [readFailed, setReadFailed] = useState(false);

	useEffect(() => {
		setReadFailed(false);
		if (!logoPreviewUrl) {
			setSuggested([]);
			return;
		}
		let cancelled = false;
		colorsFromImage(logoPreviewUrl)
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
	}, [logoPreviewUrl]);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">Tu marca</h2>
				<p className="mt-1 text-sm text-[#6e6e73]">Tu logo y tu nombre salen arriba en el menú. Con el logo te proponemos los colores.</p>
			</div>

			<div className="flex flex-wrap items-center gap-5">
				<div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e5e5ea] bg-[#f5f5f7]">
					{logoPreviewUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={logoPreviewUrl} alt="Tu logo" className="h-full w-full object-contain p-2" />
					) : (
						<ImagePlus className="h-8 w-8 text-[#a1a1a6]" aria-hidden />
					)}
				</div>
				<div className="space-y-2">
					<Button variant={logoPreviewUrl ? "secondary" : "primary"} loading={uploading} onClick={() => fileInput.current?.click()}>
						{logoPreviewUrl ? "Cambiar logo" : "Subir mi logo"}
					</Button>
					<p className="text-xs text-[#86868b]">PNG con fondo transparente queda mejor. Hasta 3 MB.</p>
					<input
						ref={fileInput}
						type="file"
						accept="image/png,image/jpeg,image/webp"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							e.currentTarget.value = "";
							if (file) onUploadLogo(file);
						}}
					/>
				</div>
			</div>

			<label className="block">
				<span className="mb-1.5 block text-sm font-medium text-[#1d1d1f]">Nombre que ven tus clientes</span>
				<input
					value={displayName}
					onChange={(e) => onDisplayNameChange(e.target.value)}
					maxLength={60}
					className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				/>
			</label>

			<div>
				<p className="mb-2 text-sm font-medium text-[#1d1d1f]">Color de tu marca</p>
				{suggested.length === 0 ? (
					<p className="text-sm text-[#86868b]">
						{!logoPreviewUrl
							? "Sube tu logo y te proponemos sus colores."
							: readFailed
								? "No pudimos leer los colores de tu logo: usamos los del diseño que elijas."
								: "Tu logo no tiene un color marcado: usamos los del diseño que elijas."}
					</p>
				) : (
					<div className="flex flex-wrap gap-2.5">
						{suggested.map((color) => (
							<button
								key={color}
								type="button"
								aria-pressed={brandColor === color}
								onClick={() => onBrandColorChange(color)}
								className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${brandColor === color ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-[#d2d2d7] hover:bg-[#f5f5f7]"}`}
							>
								<span className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10" style={{ background: color }}>
									{brandColor === color && <Check className="h-3.5 w-3.5 text-white mix-blend-difference" aria-hidden />}
								</span>
								<span className="font-mono text-xs uppercase text-[#6e6e73]">{color}</span>
							</button>
						))}
						<button
							type="button"
							aria-pressed={brandColor === null}
							onClick={() => onBrandColorChange(null)}
							className={`rounded-xl border px-3 py-2 text-sm transition ${brandColor === null ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-[#d2d2d7] hover:bg-[#f5f5f7]"}`}
						>
							Los del diseño
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
