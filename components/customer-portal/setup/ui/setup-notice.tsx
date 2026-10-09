"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/utils/cn";

export type SetupNoticeTone = "danger" | "success" | "warning" | "info";

const TONES: Record<SetupNoticeTone, { box: string; icon: ReactNode }> = {
	danger: { box: "bg-(--su-danger-soft) text-[#8f1d1d]", icon: <CircleAlert className="h-[18px] w-[18px] text-(--su-danger)" aria-hidden /> },
	success: { box: "bg-(--su-success-soft) text-[#14532d]", icon: <CircleCheck className="h-[18px] w-[18px] text-(--su-success)" aria-hidden /> },
	warning: { box: "bg-(--su-warning-soft) text-[#7c3a06]", icon: <TriangleAlert className="h-[18px] w-[18px] text-(--su-warning)" aria-hidden /> },
	info: { box: "bg-(--su-accent-soft) text-[#28308f]", icon: <Info className="h-[18px] w-[18px] text-(--su-accent)" aria-hidden /> },
};

/** Aviso en línea: error al guardar, resultado de una carga, algo para revisar. */
export function SetupNotice({
	tone,
	title,
	children,
	action,
	onDismiss,
	className,
}: {
	tone: SetupNoticeTone;
	title?: string;
	children?: ReactNode;
	action?: ReactNode;
	onDismiss?: () => void;
	className?: string;
}) {
	const style = TONES[tone];
	return (
		<motion.div
			role={tone === "danger" ? "alert" : "status"}
			initial={{ opacity: 0, y: -6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
			className={cn("flex items-start gap-3 rounded-2xl px-4 py-3.5", style.box, className)}
		>
			<span className="mt-px shrink-0">{style.icon}</span>
			<div className="min-w-0 flex-1 text-[13.5px] leading-relaxed">
				{title ? <p className="font-semibold">{title}</p> : null}
				{children ? <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div> : null}
				{action ? <div className="mt-3">{action}</div> : null}
			</div>
			{onDismiss ? (
				<button
					type="button"
					onClick={onDismiss}
					aria-label="Cerrar aviso"
					className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-60 transition hover:bg-black/5 hover:opacity-100"
				>
					<X className="h-4 w-4" aria-hidden />
				</button>
			) : null}
		</motion.div>
	);
}
