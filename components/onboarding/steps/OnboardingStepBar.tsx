import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import { fillCopy, getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import { cn } from "@/utils/cn";

/**
 * Registro → Plan → Pago. En móvil, «Paso 2 de 3» con una barra; en escritorio, los tres.
 * `compact` quita la descripción de cada paso (páginas angostas).
 */
export function OnboardingStepBar({
	current,
	className,
	compact = false,
}: {
	current: 1 | 2 | 3;
	className?: string;
	compact?: boolean;
}) {
	const t = getOnboardingUiCopy(useLocale()).steps;

	return (
		<nav aria-label={t.aria} className={cn("mb-8 sm:mb-10", className)}>
			<div className="sm:hidden">
				<p className="text-xs font-medium text-slate-500">
					{fillCopy(t.progress, { n: current })} · <span className="text-slate-900">{t.items[current - 1].title}</span>
				</p>
				<div className="mt-2 flex gap-1.5" aria-hidden>
					{[1, 2, 3].map((n) => (
						<span key={n} className={cn("h-1 flex-1 rounded-full", n <= current ? "bg-slate-900" : "bg-slate-200")} />
					))}
				</div>
			</div>

			<ol className="hidden items-center gap-4 sm:flex">
				{t.items.map((item, index) => {
					const n = index + 1;
					const done = n < current;
					const active = n === current;
					return (
						<li key={item.title} className="flex items-center gap-4" aria-current={active ? "step" : undefined}>
							<div className="flex items-center gap-3">
								<span
									className={cn(
										"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
										done && "bg-slate-900 text-white",
										active && "bg-slate-900 text-white ring-4 ring-slate-900/10",
										!done && !active && "border border-slate-300 bg-white text-slate-500",
									)}
								>
									{done ? <Check className="h-4 w-4" aria-hidden /> : n}
								</span>
								<span className="leading-tight">
									<span className={cn("block text-sm font-semibold", active || done ? "text-slate-900" : "text-slate-500")}>{item.title}</span>
									{compact ? null : <span className="block text-xs text-slate-500">{item.hint}</span>}
								</span>
							</div>
							{index < t.items.length - 1 ? (
								<span className={cn("h-px w-8 lg:w-14", done ? "bg-slate-900" : "bg-slate-200")} aria-hidden />
							) : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
