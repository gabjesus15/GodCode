"use client";

import { CircleAlert, ClipboardList, UserMinus, type LucideIcon } from "lucide-react";

import type { HomeAlertKind } from "@/lib/super-admin/home-overview-types";
import { cn } from "@/utils/cn";

const ALERT_STYLE: Record<HomeAlertKind, { icon: LucideIcon; box: string; iconTone: string; button: string }> = {
	cancellation: {
		icon: UserMinus,
		box: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
		iconTone: "text-amber-600 dark:text-amber-400",
		button: "bg-amber-900 text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100",
	},
	payment: {
		icon: CircleAlert,
		box: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
		iconTone: "text-red-600 dark:text-red-400",
		button: "bg-red-900 text-white hover:bg-red-800 dark:bg-red-200 dark:text-red-950 dark:hover:bg-red-100",
	},
	application: {
		icon: ClipboardList,
		box: "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-100",
		iconTone: "text-indigo-600 dark:text-indigo-400",
		button: "bg-indigo-900 text-white hover:bg-indigo-800 dark:bg-indigo-200 dark:text-indigo-950 dark:hover:bg-indigo-100",
	},
};

export type RowAlertBannerProps = {
	alert: { kind: HomeAlertKind; title: string; detail: string; href?: string; actionLabel?: string };
	onOpen?: (href: string) => void;
};

export function RowAlertBanner({ alert, onOpen }: RowAlertBannerProps) {
	const style = ALERT_STYLE[alert.kind];
	const Icon = style.icon;
	return (
		<div role="status" className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", style.box)}>
			<Icon className={cn("h-4 w-4 shrink-0", style.iconTone)} aria-hidden />
			<p className="min-w-0 flex-1 text-[13px] leading-snug">
				<span className="font-semibold">{alert.title}.</span> <span className="opacity-80">{alert.detail}</span>
			</p>
			{onOpen && alert.href && alert.actionLabel ? (
				<button
					type="button"
					onClick={() => onOpen(alert.href as string)}
					className={cn(
						"inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30",
						style.button,
					)}
				>
					{alert.actionLabel}
				</button>
			) : null}
		</div>
	);
}
