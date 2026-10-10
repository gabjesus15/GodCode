"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Copy, Download, ExternalLink, Globe, Lock, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { WhatsAppIcon } from "../ui/brand-icons";
import { ConfettiBurst } from "../ui/confetti-burst";
import { SetupButton } from "../ui/setup-button";

import type { OwnerSetupStep } from "@/lib/owner-setup/steps";
import { brandInitials } from "@/lib/tenant/brand-initials";
import { cn } from "@/utils/cn";

export type SetupChecklistItem = { step: OwnerSetupStep; label: string; done: boolean };

const subscribeNothing = () => () => {};

function prettyUrl(url: string): string {
	return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function LogoBadge({ logoUrl, name, size }: { logoUrl: string | null; name: string; size: number }) {
	return (
		<span
			className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[15px] font-semibold text-(--su-ink) shadow-[0_0_0_1px_rgba(17,17,19,0.06),0_4px_14px_-6px_rgba(17,17,19,0.3)]"
			style={{ width: size, height: size }}
		>
			{logoUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
			) : (
				// El mismo monograma que muestra la tienda sin logo («Rica Pizza» → «RP»).
				brandInitials(name, { fallback: "G" })
			)}
		</span>
	);
}

function ActionTile({ icon, label, onClick, href }: { icon: ReactNode; label: string; onClick?: () => void; href?: string }) {
	const className = cn(
		"flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-(--su-surface) px-1.5 text-center text-[12.5px] font-medium leading-tight text-(--su-ink) ring-1 ring-inset ring-(--su-line)",
		"transition-[background-color,transform] duration-150 hover:bg-(--su-surface-sunken) active:scale-[0.97]",
		"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25 [&_svg]:h-5 [&_svg]:w-5",
	);
	if (href) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={className}>
				{icon}
				{label}
			</a>
		);
	}
	return (
		<button type="button" onClick={onClick} className={className}>
			{icon}
			{label}
		</button>
	);
}

/** La tarjeta para las mesas en PNG: nombre, QR y dirección, lista para imprimir. */
async function downloadTableCard(svg: SVGSVGElement, name: string, url: string) {
	const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
	try {
		const img = new Image();
		img.src = svgUrl;
		await img.decode();
		const width = 1200;
		const height = 1560;
		const qr = 860;
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, width, height);
		ctx.textAlign = "center";
		ctx.fillStyle = "#111113";
		ctx.font = "700 72px system-ui, -apple-system, 'Segoe UI', sans-serif";
		ctx.fillText(name, width / 2, 190, width - 160);
		ctx.fillStyle = "#6b6b73";
		ctx.font = "400 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
		ctx.fillText("Escanea para ver el menú y pedir", width / 2, 262, width - 160);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, (width - qr) / 2, 340, qr, qr);
		ctx.fillStyle = "#9a9aa2";
		ctx.font = "500 34px ui-monospace, SFMono-Regular, Menlo, monospace";
		ctx.fillText(prettyUrl(url), width / 2, 340 + qr + 110, width - 160);
		const link = document.createElement("a");
		link.href = canvas.toDataURL("image/png");
		link.download = "qr-menu-mesas.png";
		link.click();
	} finally {
		URL.revokeObjectURL(svgUrl);
	}
}

export function PublishStep({
	storeUrl,
	published,
	businessName,
	logoUrl,
	accentColor,
	checklist,
	draft,
	onGoToStep,
}: {
	storeUrl: string;
	published: boolean;
	businessName: string;
	logoUrl: string | null;
	/** Color de la marca, para el confeti de la celebración. */
	accentColor: string;
	checklist: SetupChecklistItem[];
	/** «Arma y paga»: la tienda sigue en vista previa (publicar es elegir plan y pagar). */
	draft?: { paymentInReview: boolean } | null;
	onGoToStep: (step: OwnerSetupStep) => void;
}) {
	const [copied, setCopied] = useState(false);
	const qrRef = useRef<HTMLDivElement>(null);
	const canShare = useSyncExternalStore(
		subscribeNothing,
		() => typeof navigator !== "undefined" && typeof navigator.share === "function",
		() => false,
	);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(storeUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	};
	const shareText = `Ya puedes ver nuestro menú y hacer tu pedido aquí: ${storeUrl}`;
	const pending = checklist.filter((item) => !item.done);

	if (!published) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4 rounded-[22px] bg-(--su-surface) p-4 ring-1 ring-inset ring-(--su-line) sm:p-5">
					<LogoBadge logoUrl={logoUrl} name={businessName} size={56} />
					<div className="min-w-0 flex-1">
						<p className="truncate text-[16px] font-semibold tracking-[-0.01em] text-(--su-ink)">{businessName}</p>
						<p className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-(--su-surface-sunken) px-2.5 py-1 text-[12.5px] text-(--su-muted)">
							{draft ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />}
							<span className="truncate">{prettyUrl(storeUrl)}</span>
						</p>
					</div>
				</div>

				<ul className="divide-y divide-(--su-line) overflow-hidden rounded-[22px] bg-(--su-surface) ring-1 ring-inset ring-(--su-line)">
					{checklist.map((item) => (
						<li key={item.step} className="flex min-h-[60px] items-center gap-3.5 px-4 py-3 sm:px-5">
							{item.done ? (
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--su-success)">
									<Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
								</span>
							) : (
								<span className="h-6 w-6 shrink-0 rounded-full border-[1.5px] border-dashed border-[#c4c4cc]" aria-hidden />
							)}
							<span className={cn("min-w-0 flex-1 text-[15px]", item.done ? "text-(--su-ink)" : "text-(--su-muted)")}>
								{item.label}
								<span className="sr-only">{item.done ? " (listo)" : " (falta)"}</span>
							</span>
							{!item.done ? (
								<SetupButton variant="ghost" size="sm" onClick={() => onGoToStep(item.step)} trailingIcon={<ChevronRight aria-hidden />} className="-mr-2">
									Completar
								</SetupButton>
							) : null}
						</li>
					))}
				</ul>

				{draft ? (
					// El link no queda reservado para siempre: como dicen los Términos, una tienda sin
					// publicar se puede borrar a los 30 días.
					<p className="text-[13px] leading-relaxed text-(--su-muted)">
						{draft.paymentInReview
							? "Recibimos tu comprobante. Te avisamos por correo apenas tu tienda quede abierta."
							: pending.length > 0
								? "Puedes publicar igual y completar lo que falta después. Tu link queda reservado 30 días desde que creaste tu tienda."
								: "Tu link queda reservado 30 días desde que creaste tu tienda. Puedes cambiar de plan cuando quieras."}
					</p>
				) : pending.length > 0 ? (
					<p className="text-[13px] leading-relaxed text-(--su-muted)">Puedes publicar igual y completar lo que falta después desde tu cuenta.</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="relative flex flex-col gap-6">
			<ConfettiBurst accent={accentColor} />

			<motion.div
				initial={{ opacity: 0, y: 16, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
				className="mx-auto w-full max-w-[380px] rounded-[28px] bg-white px-6 pb-6 pt-7 text-center shadow-[0_0_0_1px_rgba(17,17,19,0.05),0_24px_60px_-28px_rgba(17,17,19,0.35)]"
			>
				<div className="flex flex-col items-center">
					<LogoBadge logoUrl={logoUrl} name={businessName} size={52} />
					<p className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-(--su-ink)">{businessName}</p>
					<p className="mt-0.5 text-[13px] text-(--su-muted)">Escanea para ver el menú y pedir</p>
				</div>
				<div ref={qrRef} className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 ring-1 ring-inset ring-(--su-line)">
					<QRCodeSVG value={storeUrl} size={188} level="M" marginSize={0} fgColor="#111113" />
				</div>
				<p className="mt-4 truncate font-mono text-[12px] text-(--su-subtle)">{prettyUrl(storeUrl)}</p>
			</motion.div>

			<SetupButton
				variant="secondary"
				size="lg"
				className="w-full"
				icon={<Download aria-hidden />}
				onClick={() => {
					const svg = qrRef.current?.querySelector("svg");
					if (svg) void downloadTableCard(svg, businessName, storeUrl);
				}}
			>
				Descargar QR para las mesas
			</SetupButton>

			{/* En el teléfono compartir va primero, a mano del pulgar. */}
			<div className={cn("grid gap-2.5 max-sm:order-first", canShare ? "grid-cols-4" : "grid-cols-3")}>
				<ActionTile
					onClick={() => void copy()}
					label={copied ? "Enlace copiado" : "Copiar enlace"}
					icon={
						<AnimatePresence mode="wait" initial={false}>
							<motion.span key={copied ? "ok" : "copy"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
								{copied ? <Check className="text-(--su-success)" aria-hidden /> : <Copy aria-hidden />}
							</motion.span>
						</AnimatePresence>
					}
				/>
				<ActionTile href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} label="WhatsApp" icon={<WhatsAppIcon className="text-(--su-whatsapp)" />} />
				{canShare ? (
					<ActionTile onClick={() => void navigator.share({ title: businessName, text: shareText, url: storeUrl }).catch(() => null)} label="Compartir" icon={<Share2 aria-hidden />} />
				) : null}
				<ActionTile href={storeUrl} label="Abrir menú" icon={<ExternalLink aria-hidden />} />
			</div>
		</div>
	);
}
