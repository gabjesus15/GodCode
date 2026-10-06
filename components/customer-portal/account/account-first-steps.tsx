"use client";

import { ArrowRight, Check } from "lucide-react";

import type { FirstStep } from "@/lib/tenant/account-first-steps";
import type { PortalTab } from "../shared/customer-account-types";
import { Card } from "../ui/Card";

export function AccountFirstSteps({
	steps,
	storeUrl,
	onNavigate,
}: {
	steps: FirstStep[];
	storeUrl: string;
	onNavigate: (tab: PortalTab) => void;
}) {
	const done = steps.filter((s) => s.done).length;
	if (steps.length === 0 || done === steps.length) return null;
	const nextId = steps.find((s) => !s.done)?.id;

	const open = (step: FirstStep) => {
		if (step.target === "store") {
			if (storeUrl) window.open(storeUrl, "_blank", "noopener,noreferrer");
			return;
		}
		onNavigate(step.target);
	};

	return (
		<Card compact>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<p className="text-sm font-semibold text-[#1d1d1f]">Primeros pasos</p>
					<p className="mt-0.5 text-[13px] text-[#6e6e73]">Lo que le falta a tu tienda para empezar a vender.</p>
				</div>
				<p className="text-xs font-medium text-[#6e6e73]">
					{done} de {steps.length} listos
				</p>
			</div>
			<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f5f5f7]" aria-hidden>
				<div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.round((done / steps.length) * 100)}%` }} />
			</div>
			<ol className="mt-3 divide-y divide-[#f5f5f7]">
				{steps.map((step) => (
					<li key={step.id} className="flex items-center gap-3 py-2.5">
						<span
							className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
								step.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#d2d2d7] text-transparent"
							}`}
							aria-hidden
						>
							<Check className="h-3.5 w-3.5" />
						</span>
						<div className="min-w-0 flex-1">
							<p className={`text-sm font-medium ${step.done ? "text-[#a1a1a6] line-through" : "text-[#1d1d1f]"}`}>{step.title}</p>
							{!step.done && <p className="text-xs text-[#6e6e73]">{step.detail}</p>}
							<span className="sr-only">{step.done ? "Listo" : "Pendiente"}</span>
						</div>
						{!step.done && (step.target !== "store" || storeUrl) && (
							<button
								type="button"
								onClick={() => open(step)}
								className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
									step.id === nextId ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-indigo-600 hover:bg-indigo-50"
								}`}
							>
								{step.actionLabel}
								<ArrowRight className="h-3.5 w-3.5" aria-hidden />
							</button>
						)}
					</li>
				))}
			</ol>
		</Card>
	);
}
