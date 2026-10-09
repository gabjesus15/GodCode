"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/utils/cn";

/**
 * Etiqueta, ayuda y error alrededor de un control. El hijo recibe el `id` por
 * `children(id)` para que la etiqueta y los mensajes queden enlazados.
 */
export function SetupField({
	label,
	hint,
	error,
	counter,
	optional = false,
	className,
	children,
}: {
	label: string;
	hint?: ReactNode;
	error?: string | null;
	counter?: string;
	optional?: boolean;
	className?: string;
	children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}) {
	const id = useId();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-medium text-(--su-ink)">
					{label}
					{optional ? <span className="ml-1.5 font-normal text-(--su-subtle)">opcional</span> : null}
				</label>
				{counter ? <span className="text-xs tabular-nums text-(--su-subtle)">{counter}</span> : null}
			</div>
			{children({ id, describedBy })}
			{error ? (
				<p id={errorId} role="alert" className="flex items-start gap-1.5 text-[13px] leading-snug text-(--su-danger)">
					<CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
					{error}
				</p>
			) : hint ? (
				<p id={hintId} className="text-[13px] leading-snug text-(--su-muted)">
					{hint}
				</p>
			) : null}
		</div>
	);
}

export type SetupInputProps = InputHTMLAttributes<HTMLInputElement> & {
	leading?: ReactNode;
	trailing?: ReactNode;
	invalid?: boolean;
	wrapperClassName?: string;
};

/**
 * Campo de texto de 48px. En el teléfono la letra es de 16px para que iOS no haga zoom
 * al tocarlo.
 */
export const SetupInput = forwardRef<HTMLInputElement, SetupInputProps>(function SetupInput(
	{ leading, trailing, invalid = false, wrapperClassName, className, disabled, ...props },
	ref,
) {
	return (
		<div
			className={cn(
				"group flex h-12 items-center rounded-xl bg-(--su-surface) ring-1 ring-inset transition-[box-shadow] duration-150",
				invalid ? "ring-(--su-danger)" : "ring-(--su-line-strong) hover:ring-[#c4c4cc]",
				"focus-within:ring-2 focus-within:ring-(--su-accent) focus-within:shadow-(--su-shadow-focus)",
				invalid && "focus-within:ring-(--su-danger) focus-within:shadow-[0_0_0_4px_rgba(220,38,38,0.14)]",
				disabled && "opacity-60",
				wrapperClassName,
			)}
		>
			{leading ? (
				<span className="flex h-full shrink-0 items-center pl-3.5 text-(--su-subtle) group-focus-within:text-(--su-ink) [&>svg]:h-[18px] [&>svg]:w-[18px]">
					{leading}
				</span>
			) : null}
			<input
				ref={ref}
				disabled={disabled}
				aria-invalid={invalid || undefined}
				className={cn(
					"h-full min-w-0 flex-1 bg-transparent px-3.5 text-base text-(--su-ink) outline-none placeholder:text-(--su-subtle) sm:text-[15px]",
					leading && "pl-2.5",
					className,
				)}
				{...props}
			/>
			{trailing ? <span className="flex h-full shrink-0 items-center pr-3 text-(--su-subtle)">{trailing}</span> : null}
		</div>
	);
});
