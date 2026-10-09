"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { OWNER_SETUP_STEP_META, type OwnerSetupStep } from "@/lib/owner-setup/steps";
import { cn } from "@/utils/cn";

type ProgressProps = {
	steps: readonly OwnerSetupStep[];
	current: OwnerSetupStep;
	done: Record<OwnerSetupStep, boolean>;
	onSelect: (step: OwnerSetupStep) => void;
	disabled?: (step: OwnerSetupStep) => boolean;
};

/** Barra de pasos con nombres (escritorio). Cada paso se puede tocar para ir a él. */
export function SetupProgress({ steps, current, done, onSelect, disabled }: ProgressProps) {
	const currentIndex = steps.indexOf(current);
	return (
		<nav aria-label="Pasos">
			<ol className="flex items-start gap-2">
				{steps.map((step, index) => {
					const isCurrent = step === current;
					const reached = index <= currentIndex;
					const isDone = done[step] && !isCurrent;
					return (
						<li key={step} className="w-[7.25rem]">
							<button
								type="button"
								onClick={() => onSelect(step)}
								disabled={disabled?.(step)}
								aria-current={isCurrent ? "step" : undefined}
								className="group block w-full rounded-lg pb-1 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<span className={cn("relative block h-[3px] overflow-hidden rounded-full transition-colors", done[step] ? "bg-(--su-accent)/25" : "bg-(--su-line)")}>
									<motion.span
										className="absolute inset-y-0 left-0 rounded-full bg-(--su-accent)"
										initial={false}
										animate={{ width: reached ? "100%" : "0%" }}
										transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
									/>
								</span>
								<span
									className={cn(
										"mt-2 flex items-center gap-1.5 text-[12.5px] transition-colors",
										isCurrent ? "font-semibold text-(--su-ink)" : "text-(--su-subtle) group-hover:text-(--su-ink)",
									)}
								>
									{isDone ? (
										<span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-(--su-success)">
											<Check className="h-2.5 w-2.5 text-white" strokeWidth={3} aria-hidden />
										</span>
									) : (
										<span className="tabular-nums">{index + 1}</span>
									)}
									{OWNER_SETUP_STEP_META[step].label}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

/** La misma barra, compacta, para el teléfono. */
export function SetupProgressCompact({ steps, current }: Pick<ProgressProps, "steps" | "current">) {
	const currentIndex = steps.indexOf(current);
	return (
		<div
			className="flex w-full gap-1"
			role="progressbar"
			aria-valuemin={1}
			aria-valuemax={steps.length}
			aria-valuenow={currentIndex + 1}
			aria-label={`Paso ${currentIndex + 1} de ${steps.length}`}
		>
			{steps.map((step, index) => (
				<span key={step} className="relative h-1 flex-1 overflow-hidden rounded-full bg-(--su-line)">
					<motion.span
						className="absolute inset-y-0 left-0 rounded-full bg-(--su-accent)"
						initial={false}
						animate={{ width: index <= currentIndex ? "100%" : "0%" }}
						transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
					/>
				</span>
			))}
		</div>
	);
}
