"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
type TenantUiClassProps = {
	className?: string;
	children?: React.ReactNode;
};

function cx(...parts: Array<string | false | undefined | null>) {
	return parts.filter(Boolean).join(" ");
}

/**
 * Un número que cambia (cantidad, artículos del pedido) entra rodando desde
 * abajo si sube y desde arriba si baja, en vez de cambiar de golpe. El primer
 * valor se pinta quieto: solo se anima lo que cambia mientras se mira.
 */
export function MotionCount({ value, className }: { value: number; className?: string }) {
	const [previous, setPrevious] = React.useState(value);
	const [direction, setDirection] = React.useState<"up" | "down" | null>(null);
	if (previous !== value) {
		setPrevious(value);
		setDirection(value > previous ? "up" : "down");
	}
	return (
		<span key={value} className={cx("menu-tick", className)} data-dir={direction ?? undefined}>
			{value}
		</span>
	);
}

export type TenantBadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "special" | "promo";

export type TenantBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
	variant?: TenantBadgeVariant;
};

export const TenantBadge = React.forwardRef<HTMLSpanElement, TenantBadgeProps>(
	function TenantBadge({ className, variant = "default", ...props }, ref) {
		return (
			<span
				ref={ref}
				className={cx("tenant-ui-badge", `tenant-ui-badge--${variant}`, className)}
				{...props}
			/>
		);
	},
);

export type TenantButtonVariant = "default" | "secondary" | "outline" | "ghost";
export type TenantButtonSize = "default" | "sm" | "icon";

export type TenantButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: TenantButtonVariant;
	size?: TenantButtonSize;
};

export const TenantButton = React.forwardRef<HTMLButtonElement, TenantButtonProps>(
	function TenantButton({ className, variant = "default", size = "default", type = "button", ...props }, ref) {
		return (
			<button
				ref={ref}
				type={type}
				className={cx(
					"tenant-ui-btn",
					`tenant-ui-btn--${variant}`,
					size !== "default" && `tenant-ui-btn--${size}`,
					className,
				)}
				{...props}
			/>
		);
	},
);

export type TenantStepperProps = {
	quantity: number;
	onDecrease: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onIncrease: (e: React.MouseEvent<HTMLButtonElement>) => void;
	className?: string;
	compact?: boolean;
};

export const TenantStepper = React.memo(function TenantStepper({
	quantity,
	onDecrease,
	onIncrease,
	className,
	compact = false,
}: TenantStepperProps) {
	const t = useTranslations("tenant.menu");
	const iconSize = compact ? 14 : 16;
	const isGlass = className?.includes("stepper-control");

	return (
		<div
			className={className}
			role="group"
			aria-label={t("card.quantityAria")}
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				className={isGlass ? "step-btn minus" : undefined}
				onClick={onDecrease}
				aria-label={t("card.removeOne")}
			>
				<Minus size={iconSize} strokeWidth={2.5} />
			</button>
			<span className={isGlass ? "step-count" : undefined} aria-live="polite">
				<MotionCount value={quantity} />
			</span>
			<button
				type="button"
				className={isGlass ? "step-btn plus" : undefined}
				onClick={onIncrease}
				aria-label={t("card.addOne")}
			>
				<Plus size={iconSize} strokeWidth={2.5} />
			</button>
		</div>
	);
});
export function TenantOfferBadgeStack({ className, children }: TenantUiClassProps) {
	return <div className={cx("tenant-ui-offer-badges", className)}>{children}</div>;
}
