"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
type TenantUiClassProps = {
	className?: string;
	children?: React.ReactNode;
};

function cx(...parts: Array<string | false | undefined | null>) {
	return parts.filter(Boolean).join(" ");
}

export type TenantCardProps = React.HTMLAttributes<HTMLElement> & {
	as?: "article" | "div";
};

export const TenantCard = React.forwardRef<HTMLElement, TenantCardProps>(
	function TenantCard({ as = "article", className, ...props }, ref) {
		const Tag = as;
		return <Tag ref={ref as never} className={cx("tenant-ui-card", className)} {...props} />;
	},
);

export const TenantCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function TenantCardHeader({ className, ...props }, ref) {
		return <div ref={ref} className={cx("tenant-ui-card__header", className)} {...props} />;
	},
);

export const TenantCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
	function TenantCardTitle({ className, ...props }, ref) {
		return <h3 ref={ref} className={cx("tenant-ui-card__title", className)} {...props} />;
	},
);

export const TenantCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	function TenantCardDescription({ className, ...props }, ref) {
		return <p ref={ref} className={cx("tenant-ui-card__description", className)} {...props} />;
	},
);

export const TenantCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function TenantCardContent({ className, ...props }, ref) {
		return <div ref={ref} className={cx("tenant-ui-card__content", className)} {...props} />;
	},
);

export const TenantCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	function TenantCardFooter({ className, ...props }, ref) {
		return <div ref={ref} className={cx("tenant-ui-card__footer", className)} {...props} />;
	},
);

export type TenantBadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success";

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
	const iconSize = compact ? 14 : 16;
	const isGlass = className?.includes("stepper-control");

	return (
		<div
			className={className}
			role="group"
			aria-label="Cantidad en carrito"
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				className={isGlass ? "step-btn minus" : undefined}
				onClick={onDecrease}
				aria-label="Quitar uno"
			>
				<Minus size={iconSize} strokeWidth={2.5} />
			</button>
			<span className={isGlass ? "step-count" : undefined} aria-live="polite">
				{quantity}
			</span>
			<button
				type="button"
				className={isGlass ? "step-btn plus" : undefined}
				onClick={onIncrease}
				aria-label="Agregar uno"
			>
				<Plus size={iconSize} strokeWidth={2.5} />
			</button>
		</div>
	);
});
export function TenantOfferBadgeStack({ className, children }: TenantUiClassProps) {
	return <div className={cx("tenant-ui-offer-badges", className)}>{children}</div>;
}
