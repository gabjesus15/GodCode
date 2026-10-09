"use client";

import { cn } from "@/utils/cn";

/** Interruptor tipo iOS. Toda la fila se puede tocar. */
export function SetupSwitch({
	checked,
	onChange,
	label,
	description,
	disabled = false,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	description?: string;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className="group flex w-full items-start gap-4 rounded-2xl p-1 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25 disabled:opacity-50"
		>
			<span className="min-w-0 flex-1">
				<span className="block text-[15px] font-medium text-(--su-ink)">{label}</span>
				{description ? <span className="mt-0.5 block text-[13px] leading-snug text-(--su-muted)">{description}</span> : null}
			</span>
			<span
				aria-hidden
				className={cn(
					"relative mt-0.5 inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200",
					checked ? "bg-(--su-success)" : "bg-[#e3e3e8]",
				)}
			>
				<span
					className={cn(
						"h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
						checked ? "translate-x-5" : "translate-x-0",
					)}
				/>
			</span>
		</button>
	);
}
