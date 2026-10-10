"use client";

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/utils/cn";

export type SetupButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "soft";
export type SetupButtonSize = "sm" | "md" | "lg";

const BASE =
	"group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] " +
	"transition-[background-color,box-shadow,transform,color,opacity] duration-150 ease-out active:scale-[0.97] " +
	"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--su-accent)/25 " +
	"disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent]";

const VARIANTS: Record<SetupButtonVariant, string> = {
	primary:
		"bg-(--su-ink) text-white hover:bg-[#2a2a30] " +
		"shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(17,17,19,0.24),0_6px_16px_-8px_rgba(17,17,19,0.5)]",
	accent:
		"bg-(--su-accent) text-white hover:bg-(--su-accent-hover) " +
		"shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(79,91,255,0.3),0_8px_20px_-8px_rgba(79,91,255,0.65)]",
	secondary:
		"bg-(--su-surface) text-(--su-ink) ring-1 ring-inset ring-(--su-line-strong) hover:bg-(--su-surface-sunken) " +
		"shadow-[0_1px_2px_rgba(17,17,19,0.05)]",
	ghost: "text-(--su-muted) hover:bg-black/[0.045] hover:text-(--su-ink)",
	soft: "bg-(--su-accent-soft) text-(--su-accent) hover:bg-[#e2e5ff]",
};

const SIZES: Record<SetupButtonSize, string> = {
	sm: "h-9 rounded-[10px] px-3.5 text-[13px]",
	md: "h-11 rounded-xl px-5 text-[15px]",
	lg: "h-[52px] rounded-2xl px-6 text-base",
};

const ICON_ONLY: Record<SetupButtonSize, string> = {
	sm: "w-9 px-0",
	md: "w-11 px-0",
	lg: "w-[52px] px-0",
};

export function setupButtonClass({
	variant = "primary",
	size = "md",
	iconOnly = false,
	className,
}: {
	variant?: SetupButtonVariant;
	size?: SetupButtonSize;
	iconOnly?: boolean;
	className?: string;
} = {}): string {
	return cn(BASE, VARIANTS[variant], SIZES[size], iconOnly && ICON_ONLY[size], className);
}

function Spinner() {
	return (
		<span className="absolute inset-0 flex items-center justify-center" aria-hidden>
			<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
		</span>
	);
}

type CommonProps = {
	variant?: SetupButtonVariant;
	size?: SetupButtonSize;
	/** Ícono antes del texto. */
	icon?: ReactNode;
	/** Ícono después del texto (una flecha, por ejemplo). */
	trailingIcon?: ReactNode;
	iconOnly?: boolean;
	children?: ReactNode;
};

export type SetupButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps & { loading?: boolean };

/**
 * Botón del asistente. Al cargar conserva su ancho (el texto queda invisible bajo el
 * spinner), para que nada salte de lugar.
 */
export const SetupButton = forwardRef<HTMLButtonElement, SetupButtonProps>(function SetupButton(
	{ variant, size, icon, trailingIcon, iconOnly, loading = false, disabled, className, children, type = "button", ...props },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			className={setupButtonClass({ variant, size, iconOnly, className })}
			{...props}
		>
			<span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
				{icon ? <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">{icon}</span> : null}
				{children}
				{trailingIcon ? <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">{trailingIcon}</span> : null}
			</span>
			{loading ? <Spinner /> : null}
		</button>
	);
});

export type SetupLinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps;

/** El mismo botón, como enlace (abrir el menú, compartir por WhatsApp…). */
export function SetupLinkButton({ variant, size, icon, trailingIcon, iconOnly, className, children, ...props }: SetupLinkButtonProps) {
	return (
		<a className={setupButtonClass({ variant, size, iconOnly, className })} {...props}>
			{icon ? <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">{icon}</span> : null}
			{children}
			{trailingIcon ? <span className="shrink-0 [&>svg]:h-[1.1em] [&>svg]:w-[1.1em]">{trailingIcon}</span> : null}
		</a>
	);
}
