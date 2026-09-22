"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { AlertCircle, MapPin, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTenantSurfaceScheme } from "@/lib/tenant/hooks/use-tenant-surface-scheme";
import { useSheetDismiss } from "../hooks/use-sheet-dismiss";

export type CartNotice = { tone: "error" | "warning"; message: string } | null;

export type CartStepDirection = "none" | "forward" | "back";

export type CartDialogShellProps = {
	panelRef: RefObject<HTMLDivElement | null>;
	phase: "summary" | "fulfillment" | "payment" | "success";
	/** Cambia con cada paso o subpaso: remonta el cuerpo para animar la transición. */
	bodyKey?: string;
	/** Hacia dónde se movió el último cambio de paso (define de qué lado entra el contenido). */
	direction?: CartStepDirection;
	/** El carrito ya se cerró en el store; el panel sigue montado para animar la salida. */
	closing?: boolean;
	ariaLabel: string;
	title: string;
	/** Unidades en el carrito; el contador solo se dibuja cuando hay algo. */
	itemCount: number;
	branchName?: string | null;
	notice?: CartNotice;
	/** Va entre la cabecera y el cuerpo: no se remonta al cambiar de paso, así que no se anima. */
	aside?: ReactNode;
	onClose: () => void;
	onOpenAccount?: () => void;
	children: ReactNode;
	footer?: ReactNode;
};

/**
 * Cascarón del panel: overlay, cabecera, aviso, cuerpo con scroll y pie fijo.
 * Cada paso del checkout solo decide qué va en el cuerpo y qué en el pie.
 */
export function CartDialogShell({
	panelRef,
	phase,
	bodyKey,
	direction = "none",
	closing = false,
	ariaLabel,
	title,
	itemCount,
	branchName,
	notice,
	aside,
	onClose,
	onOpenAccount,
	children,
	footer,
}: CartDialogShellProps) {
	const t = useTranslations("tenant.cart.modal");
	// El panel sigue al fondo del local: claro sobre menús claros, oscuro sobre oscuros.
	const scheme = useTenantSurfaceScheme();
	// En teléfono, arrastrar la cabecera hacia abajo cierra el panel.
	const headRef = useRef<HTMLElement>(null);
	useSheetDismiss(panelRef, headRef, { enabled: !closing, onDismiss: onClose });
	return (
		<div
			className="cart-overlay"
			data-scheme={scheme}
			data-closing={closing || undefined}
			onClick={onClose}
		>
			<div
				ref={panelRef}
				className="cart-panel"
				role="dialog"
				aria-modal="true"
				aria-label={ariaLabel}
				tabIndex={-1}
				data-phase={phase}
				onClick={(event) => event.stopPropagation()}
			>
				<header className="cart-head" ref={headRef}>
					<span className="cart-handle" aria-hidden />
					<div className="cart-head__main">
						<div className="cart-head__title-row">
							<h2 className="cart-head__title">{title}</h2>
							{itemCount > 0 ? (
								<span className="cart-head__count" aria-label={t("header.itemCount", { count: itemCount })}>
									{itemCount > 99 ? "99+" : itemCount}
								</span>
							) : null}
						</div>
						{branchName ? (
							<p className="cart-head__branch">
								<MapPin size={13} aria-hidden />
								<span>{branchName}</span>
							</p>
						) : null}
					</div>
					<div className="cart-head__actions">
						{onOpenAccount ? (
							<button
								type="button"
								className="cart-icon-btn"
								onClick={onOpenAccount}
								aria-label={t("header.account")}
								title={t("header.account")}
							>
								<UserRound size={18} aria-hidden />
							</button>
						) : null}
						<button
							type="button"
							className="cart-icon-btn"
							onClick={onClose}
							aria-label={t("actions.close")}
						>
							<X size={18} aria-hidden />
						</button>
					</div>
				</header>

				{notice ? (
					<div className="cart-notice" data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
						<AlertCircle size={16} aria-hidden />
						<span>{notice.message}</span>
					</div>
				) : null}

				{aside ? <div className="cart-aside">{aside}</div> : null}

				<div className="cart-body" key={bodyKey ?? phase} data-direction={direction}>
					{children}
				</div>

				{footer ? <footer className="cart-foot">{footer}</footer> : null}
			</div>
		</div>
	);
}
