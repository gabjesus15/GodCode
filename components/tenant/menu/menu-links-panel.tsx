"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown, Clock, X } from "lucide-react";

import { HomeLinkIconGlyph } from "@/components/tenant/home/home-icons";
import { LANDING_BRAND_NAME } from "@/lib/landing/brand";
import type { HomeViewLink, HomeViewModel } from "@/lib/tenant/home-page/resolve-home-page";
import { buildPoweredByHref } from "@/lib/tenant/powered-by";

import "@/components/tenant/home/home-page.css";
import "./menu-links-panel.css";

/** Cuánto queda abierto el panel al entrar si el cliente no lo toca. */
const AUTO_CLOSE_MS = 10_000;
/** Respiro para que la carta pinte y se vea el panel entrar. */
const AUTO_OPEN_DELAY_MS = 350;
const SEEN_KEY = "gc-menu-links-seen";

/** Una sola vez por pestaña: al volver de Mi Cuenta o del pago no reaparece. */
function claimAutoOpen(): boolean {
	try {
		if (window.sessionStorage.getItem(SEEN_KEY)) return false;
		window.sessionStorage.setItem(SEEN_KEY, "1");
		return true;
	} catch {
		return false;
	}
}

function isExternalHref(href: string): boolean {
	return /^https?:\/\//i.test(href);
}

function externalProps(href: string) {
	return isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

type MenuLinksPanelProps = {
	model: HomeViewModel;
	publicSlug: string;
	mounted: boolean;
	open: boolean;
	autoOpen: boolean;
	onOpen: () => void;
	onClose: () => void;
};

export function MenuLinksPanel({ model, publicSlug, mounted, open, autoOpen, onOpen, onClose }: MenuLinksPanelProps) {
	const t = useTranslations("tenant.home");
	const closeRef = useRef<HTMLButtonElement>(null);
	const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

	const cancelAutoClose = () => {
		if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
		autoCloseTimer.current = null;
	};

	useEffect(() => {
		if (!autoOpen) return;
		const openTimer = setTimeout(() => {
			if (!claimAutoOpen()) return;
			onOpen();
			autoCloseTimer.current = setTimeout(onClose, AUTO_CLOSE_MS);
		}, AUTO_OPEN_DELAY_MS);
		return () => {
			clearTimeout(openTimer);
			if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
		};
		// Solo al entrar a la carta.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	const statusLabel = useMemo(() => {
		const status = model.status;
		if (!status) return null;
		if (status.open === 0) return { open: false, text: t("status.closed") };
		if (status.open === status.total) return { open: true, text: t("status.open") };
		return { open: true, text: t("status.partial", { open: status.open, total: status.total }) };
	}, [model.status, t]);

	const close = () => {
		cancelAutoClose();
		onClose();
	};

	const labelOf = (link: Exclude<HomeViewLink, { type: "menu" }>) =>
		link.label || (link.kind === "custom" ? "" : t(`links.${link.kind}`));

	const style = {
		"--gh-accent": model.brand.accent,
		"--gh-on-accent": model.brand.onAccent,
		"--gh-name-font": model.brand.nameFont,
		"--gh-name-weight": model.brand.nameWeight,
		...(model.brand.nameColor ? { "--gh-name-color": model.brand.nameColor } : {}),
	} as CSSProperties;

	const logoUrl = model.logoUrl && failedLogoUrl !== model.logoUrl ? model.logoUrl : null;
	const links = model.links.filter((link): link is Exclude<HomeViewLink, { type: "menu" }> => link.type !== "menu");

	// La barra y el pie viven en una capa propia por encima de la carta: el panel va en la misma.
	const portalRoot = mounted ? document.getElementById("modal-root") : null;
	if (!portalRoot) return null;

	return createPortal(
		<div
			className="gh mlp"
			data-scheme={model.scheme}
			data-style={model.buttonStyle}
			data-shape={model.buttonShape}
			data-open={open ? "" : undefined}
			style={style}
		>
			<div className="mlp-scrim" aria-hidden onClick={close} />
			<aside
				className="mlp-panel"
				role="dialog"
				aria-label={t("linksAria", { name: model.name })}
				inert={!open || undefined}
				// Si el cliente empieza a usar el panel, ya no se le cierra en la cara.
				onPointerDown={cancelAutoClose}
				onFocusCapture={cancelAutoClose}
			>
				<button ref={closeRef} type="button" className="mlp-close" onClick={close} aria-label={t("branches.close")}>
					<X size={20} aria-hidden />
				</button>

				<header className="mlp-head">
					<div className="mlp-logo">
						{logoUrl ? (
							<Image
								src={logoUrl}
								alt={t("logoAlt", { name: model.name })}
								width={72}
								height={72}
								className="gh-logo__img"
								onError={() => setFailedLogoUrl(logoUrl)}
								// Fuera de pantalla hasta abrirse: en diferido entraría sin logo.
								loading="eager"
								unoptimized
							/>
						) : (
							<span className="gh-logo__initials" role="img" aria-label={t("logoAlt", { name: model.name })}>
								{model.initials}
							</span>
						)}
					</div>
					<p className="mlp-name">{model.name}</p>
					{statusLabel ? (
						<p className="gh-status mlp-status" data-open={statusLabel.open ? "" : undefined}>
							<span className="gh-status__dot" aria-hidden />
							{statusLabel.text}
						</p>
					) : null}
				</header>

				<nav className="mlp-links">
					<ul>
						{links.map((link) => {
							const className = `gh-door${link.featured ? " is-featured" : ""}`;
							const content = (
								<>
									<span className="gh-door__icon">
										<HomeLinkIconGlyph icon={link.icon} />
									</span>
									<span className="gh-door__label">{labelOf(link)}</span>
								</>
							);

							if (link.type === "branches") {
								const expanded = expandedId === link.id;
								return (
									<li key={link.id}>
										<button
											type="button"
											className={className}
											aria-expanded={expanded}
											onClick={() => setExpandedId(expanded ? null : link.id)}
										>
											{content}
											<span className="gh-door__end mlp-chevron" data-expanded={expanded ? "" : undefined} aria-hidden>
												<ChevronDown size={18} />
											</span>
										</button>
										{expanded ? (
											<ul className="mlp-branches">
												{link.targets.map((target) => (
													<li key={target.branchId}>
														<a href={target.href} className="mlp-branch" {...externalProps(target.href)}>
															{target.branchName || t("branches.unnamed")}
															<ArrowUpRight size={15} aria-hidden />
														</a>
													</li>
												))}
											</ul>
										) : null}
									</li>
								);
							}

							return (
								<li key={link.id}>
									<a href={link.href} className={className} {...externalProps(link.href)}>
										{content}
										<span className="gh-door__end" aria-hidden>
											{isExternalHref(link.href) ? <ArrowUpRight size={17} /> : null}
										</span>
									</a>
								</li>
							);
						})}
					</ul>
				</nav>

				{model.schedule.length > 0 ? (
					<section className="mlp-schedule">
						<h2 className="gh-schedule__title">
							<Clock size={15} aria-hidden />
							{t("schedule.title")}
						</h2>
						<ul>
							{model.schedule.map((line, index) => (
								<li key={`${index}-${line}`}>{line}</li>
							))}
						</ul>
					</section>
				) : null}

				<footer className="mlp-gcode">
					<a
						href={buildPoweredByHref({ tenantSlug: publicSlug, surface: "home" })}
						className="gh-door gh-door--gcode"
						rel="noopener noreferrer"
						aria-label={t("gcode.aria", { brand: LANDING_BRAND_NAME })}
					>
						<span className="gh-door__icon">
							<Image src="/favicon-32.png" alt="" width={22} height={22} className="gh-gcode-mark" />
						</span>
						<span className="gh-door__label">{t("gcode.label")}</span>
						<span className="gh-door__end" aria-hidden>
							<ArrowUpRight size={17} />
						</span>
					</a>
					<p className="mlp-credit">Gcode.labs</p>
				</footer>
			</aside>
		</div>,
		portalRoot,
	);
}
