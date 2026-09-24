"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUpRight, Check, ChevronRight, Clock, Copy, Settings, Share, X } from "lucide-react";

import { LANDING_BRAND_NAME } from "@/lib/landing/brand";
import { buildPoweredByHref } from "@/lib/tenant/powered-by";
import { canOptimizeRemoteImage } from "@/lib/tenant/images/can-optimize-remote-image";
import { brandCoverFill, type HomeContactChannel, type HomeViewLink, type HomeViewModel } from "@/lib/tenant/home-page/resolve-home-page";
import { getTenantScopedPath } from "../utils/tenant-route";
import { HomeLinkIconGlyph, HomeSocialGlyph } from "./home-icons";

type HomePageViewProps = {
	model: HomeViewModel;
	publicSlug: string;
	/** Acceso al panel del equipo (engranaje discreto). */
	adminHref?: string | null;
	/**
	 * Vista previa del editor: nada navega ni recibe foco, sin animaciones de
	 * entrada, y el QR apunta a la URL pública real en vez de la del portal.
	 */
	preview?: boolean;
	previewMenuUrl?: string;
};

type BranchPicker = Extract<HomeViewLink, { type: "branches" }>;

function isExternalHref(href: string): boolean {
	return /^https?:\/\//i.test(href);
}

const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readNoOrigin = () => "";

export function HomePageView({ model, publicSlug, adminHref = null, preview = false, previewMenuUrl }: HomePageViewProps) {
	const t = useTranslations("tenant.home");
	const pathname = usePathname();
	const menuPath = useMemo(() => getTenantScopedPath(pathname ?? "/", "/menu"), [pathname]);

	/* Se guarda la URL que falló, no un booleano: un logo nuevo (el dueño lo
	   cambia en el editor) vuelve a intentarse solo. */
	const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
	const [picker, setPicker] = useState<BranchPicker | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// El origen solo existe en el navegador; en el servidor el QR espera a hidratar.
	const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readNoOrigin);
	const menuUrl = previewMenuUrl ?? (origin ? `${origin}${menuPath}` : "");
	const logoUrl = model.logoUrl && failedLogoUrl !== model.logoUrl ? model.logoUrl : null;

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (picker && !dialog.open) dialog.showModal();
		if (!picker && dialog.open) dialog.close();
	}, [picker]);

	useEffect(() => () => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
	}, []);

	const showToast = useCallback((message: string) => {
		setToast(message);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 2200);
	}, []);

	const copy = useCallback(
		async (value: string) => {
			try {
				await navigator.clipboard.writeText(value);
				showToast(t("share.copied"));
			} catch {
				showToast(value);
			}
		},
		[showToast, t],
	);

	const share = useCallback(async () => {
		const url = window.location.href.split("#")[0];
		// Hoja nativa solo donde es la costumbre (móvil); en escritorio copiar es más directo.
		const coarse = window.matchMedia("(pointer: coarse)").matches;
		if (coarse && typeof navigator.share === "function") {
			try {
				await navigator.share({ title: model.name, url });
				return;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
			}
		}
		await copy(url);
	}, [copy, model.name]);

	const defaultLabel = (link: HomeViewLink): string => {
		if (link.label) return link.label;
		if (link.type === "menu") return t("links.menu");
		return link.kind === "custom" ? "" : t(`links.${link.kind}`);
	};

	const statusLabel = useMemo(() => {
		const status = model.status;
		if (!status) return null;
		if (status.open === 0) return { open: false, text: t("status.closed") };
		if (status.open === status.total) return { open: true, text: t("status.open") };
		return { open: true, text: t("status.partial", { open: status.open, total: status.total }) };
	}, [model.status, t]);

	const style = {
		"--gh-accent": model.brand.accent,
		"--gh-on-accent": model.brand.onAccent,
		"--gh-name-font": model.brand.nameFont,
		"--gh-name-weight": model.brand.nameWeight,
		...(model.brand.nameColor ? { "--gh-name-color": model.brand.nameColor } : {}),
		...(model.cover.kind === "brand" ? { "--gh-brand-fill": brandCoverFill(model.brand.accent, model.brand.glow) } : {}),
		...(model.brand.page ? { "--gh-page": model.brand.page } : {}),
	} as CSSProperties;

	const coverImage = model.cover.kind === "image" ? model.cover.url : null;
	const gcodeHref = buildPoweredByHref({ tenantSlug: publicSlug, surface: "home" });
	const menuUrlLabel = menuUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
	const pickerTargets = picker
		? [...picker.targets].sort((a, b) => Number(b.isOpen === true) - Number(a.isOpen === true))
		: [];

	return (
		<div
			className="gh"
			data-scheme={model.scheme}
			data-style={model.buttonStyle}
			data-shape={model.buttonShape}
			data-cover={model.cover.kind}
			data-preview={preview ? "" : undefined}
			style={style}
		>
			{/* `inert` en la vista previa: nada navega ni recibe foco dentro del editor. */}
			<div className="gh-layout" inert={preview || undefined}>
				{coverImage ? (
					<div className="gh-backdrop" aria-hidden>
						{/* Una miniatura basta: va desenfocada a 48px. */}
						<Image
							src={coverImage}
							alt=""
							fill
							sizes="96px"
							quality={70}
							className="gh-backdrop__img"
							unoptimized={!canOptimizeRemoteImage(coverImage)}
						/>
					</div>
				) : (
					<div className="gh-backdrop" aria-hidden />
				)}

				<div className="gh-stage">
					<main className="gh-sheet">
						<header className="gh-cover">
							{coverImage ? (
								<Image
									src={coverImage}
									alt=""
									fill
									priority={!preview}
									sizes="(min-width: 700px) 560px, 100vw"
									quality={80}
									className="gh-cover__img"
									unoptimized={!canOptimizeRemoteImage(coverImage)}
								/>
							) : null}
							<div className="gh-topbar">
								{adminHref ? (
									<a href={adminHref} className="gh-round" aria-label={t("admin")} title={t("admin")}>
										<Settings size={18} aria-hidden />
									</a>
								) : (
									<span />
								)}
								<button type="button" className="gh-round" onClick={() => void share()} aria-label={t("share.label")} title={t("share.label")}>
									<Share size={18} aria-hidden />
								</button>
							</div>
						</header>

						<section className="gh-profile gh-rise">
							<div className="gh-logo">
								{logoUrl ? (
									<Image
										src={logoUrl}
										alt={t("logoAlt", { name: model.name })}
										width={112}
										height={112}
										className="gh-logo__img"
										onError={() => setFailedLogoUrl(logoUrl)}
										priority={!preview}
										// En la vista previa escalada la carga diferida no detecta el viewport.
										loading={preview ? "eager" : undefined}
										// El logo es la marca del local: se sirve tal cual, sin recomprimir.
										unoptimized
									/>
								) : (
									<span className="gh-logo__initials" role="img" aria-label={t("logoAlt", { name: model.name })}>
										{model.initials}
									</span>
								)}
							</div>

							<h1 className="gh-name">{model.name}</h1>
							{model.bio ? <p className="gh-bio">{model.bio}</p> : null}

							{statusLabel ? (
								<p className="gh-status" data-open={statusLabel.open ? "" : undefined}>
									<span className="gh-status__dot" aria-hidden />
									{statusLabel.text}
								</p>
							) : null}

							{model.socials.length > 0 ? (
								<ul className="gh-socials">
									{model.socials.map((social) => (
										<li key={social.platform}>
											<a
												href={social.href}
												className="gh-social"
												{...(isExternalHref(social.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
												aria-label={t(`socials.${social.platform}`)}
												title={t(`socials.${social.platform}`)}
											>
												<HomeSocialGlyph platform={social.platform} />
											</a>
										</li>
									))}
								</ul>
							) : null}
						</section>

						<nav className="gh-links" aria-label={t("linksAria", { name: model.name })}>
							<ul>
								{model.links.map((link, index) => {
									const label = defaultLabel(link);
									const className = `gh-door${link.featured ? " is-featured" : ""}`;
									const rise = { "--gh-i": index } as CSSProperties;
									const content = (
										<>
											<span className="gh-door__icon">
												<HomeLinkIconGlyph icon={link.icon} />
											</span>
											<span className="gh-door__label">{label}</span>
										</>
									);

									if (link.type === "menu") {
										return (
											<li key={link.id} className="gh-rise" style={rise}>
												<Link href={menuPath} className={className}>
													{content}
													<span className="gh-door__end" aria-hidden>
														<ChevronRight size={18} />
													</span>
												</Link>
											</li>
										);
									}

									if (link.type === "branches") {
										return (
											<li key={link.id} className="gh-rise" style={rise}>
												<button type="button" className={className} aria-haspopup="dialog" onClick={() => setPicker(link)}>
													{content}
													<span className="gh-door__end gh-door__count" aria-hidden>
														{link.targets.length}
													</span>
													<span className="gh-sr">{t("branches.count", { count: link.targets.length })}</span>
												</button>
											</li>
										);
									}

									const external = isExternalHref(link.href);
									return (
										<li key={link.id} className="gh-rise" style={rise}>
											<a
												href={link.href}
												className={className}
												{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
											>
												{content}
												<span className="gh-door__end" aria-hidden>
													{external ? <ArrowUpRight size={17} /> : null}
												</span>
											</a>
										</li>
									);
								})}
							</ul>
						</nav>

						{model.schedule.length > 0 ? (
							<section className="gh-schedule gh-rise" aria-labelledby="gh-schedule-title">
								<h2 id="gh-schedule-title" className="gh-schedule__title">
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

						<footer className="gh-footer">
							<a href={gcodeHref} className="gh-door gh-door--gcode" rel="noopener noreferrer" aria-label={t("gcode.aria", { brand: LANDING_BRAND_NAME })}>
								<span className="gh-door__icon">
									<Image src="/favicon-32.png" alt="" width={22} height={22} className="gh-gcode-mark" />
								</span>
								<span className="gh-door__label">{t("gcode.label")}</span>
								<span className="gh-door__end" aria-hidden>
									<ArrowUpRight size={17} />
								</span>
							</a>
						</footer>
					</main>

					{model.showQr && menuUrl ? (
						<aside className="gh-qr" aria-labelledby="gh-qr-title">
							<div className="gh-qr__code">
								<QRCodeSVG value={menuUrl} level="M" marginSize={0} className="gh-qr__svg" title={t("qr.alt")} />
							</div>
							<h2 id="gh-qr-title" className="gh-qr__title">
								{t("qr.title")}
							</h2>
							<p className="gh-qr__hint">{t("qr.hint")}</p>
							<button type="button" className="gh-qr__url" onClick={() => void copy(menuUrl)} title={t("qr.copy")}>
								<span>{menuUrlLabel}</span>
								<Copy size={14} aria-hidden />
								<span className="gh-sr">{t("qr.copy")}</span>
							</button>
						</aside>
					) : null}
				</div>
			</div>

			<dialog
				ref={dialogRef}
				className="gh-picker"
				aria-labelledby="gh-picker-title"
				onClose={() => setPicker(null)}
				onClick={(event) => {
					// Un toque fuera del panel (sobre el fondo del diálogo) cierra.
					if (event.target === event.currentTarget) setPicker(null);
				}}
			>
				{picker ? (
					<div className="gh-picker__panel">
						<div className="gh-picker__head">
							<h2 id="gh-picker-title" className="gh-picker__title">
								{t(`branches.title.${picker.kind as HomeContactChannel}`)}
							</h2>
							<button type="button" className="gh-picker__close" onClick={() => setPicker(null)} aria-label={t("branches.close")}>
								<X size={18} aria-hidden />
							</button>
						</div>
						<ul className="gh-picker__list">
							{pickerTargets.map((target) => (
								<li key={target.branchId}>
									<a
										href={target.href}
										className="gh-picker__item"
										{...(isExternalHref(target.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
										onClick={() => setPicker(null)}
									>
										<span className="gh-picker__icon" aria-hidden>
											<HomeLinkIconGlyph icon={picker.icon} size={20} />
										</span>
										<span className="gh-picker__name">{target.branchName || t("branches.unnamed")}</span>
										{target.isOpen !== null ? (
											<span className="gh-picker__state" data-open={target.isOpen ? "" : undefined}>
												{target.isOpen ? t("branches.open") : t("branches.closed")}
											</span>
										) : null}
										<ArrowUpRight size={17} className="gh-picker__go" aria-hidden />
									</a>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</dialog>

			<p className="gh-toast" role="status" aria-live="polite" data-visible={toast ? "" : undefined}>
				{toast ? (
					<>
						<Check size={16} aria-hidden />
						{toast}
					</>
				) : null}
			</p>
		</div>
	);
}
