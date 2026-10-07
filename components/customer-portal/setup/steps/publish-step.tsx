"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, ExternalLink, MessageCircle } from "lucide-react";

import { Button } from "../../ui/Button";

const LINK_BUTTON =
	"inline-flex h-8 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[#1d1d1f] transition-all hover:bg-[#f5f5f7]";

export type SetupChecklistItem = { label: string; done: boolean };

export function PublishStep({
	storeUrl,
	published,
	publishing,
	onPublish,
	onFinish,
	finishing,
	checklist,
}: {
	storeUrl: string;
	published: boolean;
	publishing: boolean;
	onPublish: () => void;
	onFinish: () => void;
	finishing: boolean;
	checklist: SetupChecklistItem[];
}) {
	const [copied, setCopied] = useState(false);
	const qrRef = useRef<HTMLDivElement>(null);
	/** El QR en PNG grande, para imprimirlo en las mesas o el mostrador. */
	const downloadQr = async () => {
		const svg = qrRef.current?.querySelector("svg");
		if (!svg) return;
		const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
		try {
			const img = new Image();
			img.src = svgUrl;
			await img.decode();
			const size = 1200;
			const margin = 80;
			const canvas = document.createElement("canvas");
			canvas.width = size + margin * 2;
			canvas.height = size + margin * 2;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(img, margin, margin, size, size);
			const link = document.createElement("a");
			link.href = canvas.toDataURL("image/png");
			link.download = "qr-menu.png";
			link.click();
		} finally {
			URL.revokeObjectURL(svgUrl);
		}
	};
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(storeUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	};
	const shareText = `¡Ya puedes pedir en nuestro menú online! ${storeUrl}`;

	if (!published) {
		const pending = checklist.filter((item) => !item.done);
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">Listo para publicar</h2>
					<p className="mt-1 text-sm text-[#6e6e73]">Al publicar, tus clientes ven tu menú con este diseño en tu dirección.</p>
				</div>
				<ul className="space-y-2">
					{checklist.map((item) => (
						<li key={item.label} className="flex items-center gap-2.5 text-sm">
							<span
								className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-emerald-500" : "border border-[#c7c7cc]"}`}
							>
								{item.done && <Check className="h-3 w-3 text-white" aria-hidden />}
							</span>
							<span className={item.done ? "text-[#1d1d1f]" : "text-[#86868b]"}>{item.label}</span>
						</li>
					))}
				</ul>
				{pending.length > 0 && (
					<p className="text-sm text-[#6e6e73]">Puedes publicar igual y completar lo que falta después desde tu cuenta.</p>
				)}
				<Button onClick={onPublish} loading={publishing} className="w-full sm:w-auto">
					Publicar mi tienda
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold tracking-[-0.01em] text-[#1d1d1f]">¡Tu tienda está publicada!</h2>
				<p className="mt-1 text-sm text-[#6e6e73]">Comparte el enlace o imprime el código QR para las mesas y el mostrador.</p>
			</div>

			<div className="flex flex-col items-center gap-5 rounded-2xl border border-[#e5e5ea] bg-white p-5 sm:flex-row sm:items-start">
				<div ref={qrRef} className="rounded-xl border border-[#e5e5ea] bg-white p-3">
					<QRCodeSVG value={storeUrl} size={148} level="M" marginSize={0} />
				</div>
				<div className="min-w-0 flex-1 space-y-3">
					<p className="break-all rounded-lg bg-[#f5f5f7] px-3 py-2 font-mono text-sm text-[#1d1d1f]">{storeUrl}</p>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="secondary"
							size="sm"
							onClick={copy}
							icon={copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
						>
							{copied ? "Copiado" : "Copiar enlace"}
						</Button>
						<Button variant="secondary" size="sm" onClick={() => void downloadQr()} icon={<Download className="h-3.5 w-3.5" aria-hidden />}>
							Descargar QR
						</Button>
						<a
							href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
							target="_blank"
							rel="noreferrer"
							className={LINK_BUTTON}
						>
							<MessageCircle className="h-3.5 w-3.5" aria-hidden />
							Compartir por WhatsApp
						</a>
						<a
							href={storeUrl}
							target="_blank"
							rel="noreferrer"
							className={LINK_BUTTON}
						>
							<ExternalLink className="h-3.5 w-3.5" aria-hidden />
							Abrir mi menú
						</a>
					</div>
				</div>
			</div>

			<Button onClick={onFinish} loading={finishing} className="w-full sm:w-auto">
				Ir a mi cuenta
			</Button>
		</div>
	);
}
