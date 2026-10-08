"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Clock, Rocket, Smartphone, X } from "lucide-react";
import { Drawer } from "vaul";

import type { OwnerSetupInitial } from "./owner-setup-types";
import { SetupPreview } from "./setup-preview";
import { BrandStep } from "./steps/brand-step";
import { DesignStep, SECTOR_NOUN } from "./steps/design-step";
import { LocalStep } from "./steps/local-step";
import { MenuStep } from "./steps/menu-step";
import { PublishStep } from "./steps/publish-step";
import { SetupButton } from "./ui/setup-button";
import { SetupNotice } from "./ui/setup-notice";
import { SetupProgress, SetupProgressCompact } from "./ui/setup-progress";
import { useMediaQuery } from "./ui/use-media-query";

import { LandingBrandMark } from "@/components/landing-v3/landing-brand-mark";
import { setupCssVariables, SETUP_TOKENS } from "@/lib/owner-setup/design-tokens";
import { OWNER_SETUP_DRAFT_PUBLISH_META, OWNER_SETUP_STEP_META, type OwnerSetupStep } from "@/lib/owner-setup/steps";
import { STORE_DRAFT_PUBLISH_PATH, useOwnerSetup } from "@/lib/owner-setup/use-owner-setup";
import { findMenuTemplate } from "@/lib/store-theme/menu-templates";
import { validateStoreThemeAssetFile } from "@/lib/store-theme/store-theme-utils";
import { brandButtonColors } from "@/lib/tenant/logo-colors";

const ROOT_STYLE = setupCssVariables() as CSSProperties;
const EASE = SETUP_TOKENS.motion.ease;

/** Fondo del escenario del teléfono: un halo suave del color de la marca sobre gris. */
function stageBackground(accent: string): string {
	return [
		`radial-gradient(55% 42% at 50% 46%, color-mix(in srgb, ${accent} 24%, transparent) 0%, transparent 72%)`,
		"radial-gradient(circle at 1px 1px, rgba(17,17,19,0.07) 1px, transparent 0) 0 0 / 22px 22px",
		"linear-gradient(180deg, #f3f3f6 0%, #e9e9ef 100%)",
	].join(", ");
}

function LivePill({ draft }: { draft: boolean }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-[12.5px] font-medium text-(--su-ink2) shadow-[0_1px_2px_rgba(17,17,19,0.06)] ring-1 ring-black/5 backdrop-blur">
			<span className="relative flex h-2 w-2" aria-hidden>
				<span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${draft ? "bg-amber-400" : "bg-emerald-400"}`} />
				<span className={`relative inline-flex h-2 w-2 rounded-full ${draft ? "bg-amber-500" : "bg-emerald-500"}`} />
			</span>
			{draft ? "Vista previa · tus clientes todavía no la ven" : "En vivo · así lo ven tus clientes"}
		</span>
	);
}

function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
	return (
		<AnimatePresence mode="wait" initial={false}>
			{saving ? (
				<motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[12.5px] text-(--su-muted)" role="status">
					<span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden />
					Guardando…
				</motion.span>
			) : savedAt ? (
				<motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[12.5px] text-(--su-subtle)" role="status">
					<Check className="h-3.5 w-3.5" aria-hidden />
					Guardado
				</motion.span>
			) : null}
		</AnimatePresence>
	);
}

function StepHeader({ eyebrow, title, description, celebrate }: { eyebrow: string; title: string; description: string; celebrate: boolean }) {
	return (
		<div className="mb-8 sm:mb-10">
			{celebrate ? (
				<motion.span
					initial={{ scale: 0.4, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: "spring", stiffness: 420, damping: 20 }}
					className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-(--su-success) text-white shadow-[0_10px_24px_-8px_rgba(22,163,74,0.6)]"
				>
					<Check className="h-7 w-7" strokeWidth={3} aria-hidden />
				</motion.span>
			) : (
				<p className="mb-2.5 hidden text-[12.5px] font-semibold uppercase tracking-[0.09em] text-(--su-accent) lg:block">{eyebrow}</p>
			)}
			<h1 className="text-balance text-[28px] font-semibold leading-[1.12] tracking-[-0.026em] text-(--su-ink) sm:text-[34px]">{title}</h1>
			<p className="mt-3 max-w-[54ch] text-pretty text-[15px] leading-relaxed text-(--su-muted) sm:text-base">{description}</p>
		</div>
	);
}

function PreviewSheet({ open, onOpenChange, background, children }: { open: boolean; onOpenChange: (open: boolean) => void; background: string; children: ReactNode }) {
	return (
		<Drawer.Root open={open} onOpenChange={onOpenChange} handleOnly>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-[2px]" />
				<Drawer.Content
					className="fixed inset-x-0 bottom-0 z-[151] flex h-[94dvh] flex-col rounded-t-[28px] outline-none"
					style={{ ...ROOT_STYLE, background }}
				>
					<Drawer.Handle className="!mt-2.5 !h-1.5 !w-10 !rounded-full !bg-black/20" />
					<div className="flex items-center justify-between px-5 pt-3">
						<Drawer.Title className="text-[15px] font-semibold text-(--su-ink)">Así se ve tu menú</Drawer.Title>
						<Drawer.Close asChild>
							<SetupButton variant="secondary" size="sm">
								Listo
							</SetupButton>
						</Drawer.Close>
					</div>
					<Drawer.Description className="sr-only">Vista previa en vivo de tu menú, con los cambios que vas haciendo.</Drawer.Description>
					<div className="min-h-0 flex-1 px-6 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">{children}</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}

export function OwnerSetupWizard({ initial, initialStep }: { initial: OwnerSetupInitial; initialStep: OwnerSetupStep }) {
	const router = useRouter();
	const exit = useCallback(() => router.push("/cuenta"), [router]);
	const goPay = useCallback(() => window.location.assign(STORE_DRAFT_PUBLISH_PATH), []);
	const setup = useOwnerSetup({ initial, initialStep, onExit: exit, onPublishDraft: goPay });
	const draft = initial.storeDraft ?? null;
	const isDesktop = useMediaQuery("(min-width: 1024px)");
	const reduceMotion = useReducedMotion();
	const [previewOpen, setPreviewOpen] = useState(false);
	// El archivo recién elegido, solo para leer sus colores; lo que se muestra es el logo ya subido.
	const [logoColorUrl, setLogoColorUrl] = useState<string | null>(null);
	const logoBlobUrl = useRef<string | null>(null);
	const scrollPane = useRef<HTMLDivElement>(null);

	const { step, stepIndex, steps, published, busy, effectiveTheme, menuStatus } = setup;

	useEffect(
		() => () => {
			if (logoBlobUrl.current) URL.revokeObjectURL(logoBlobUrl.current);
		},
		[],
	);

	// Cada paso empieza arriba (en escritorio se desplaza el panel; en el teléfono, la página).
	useEffect(() => {
		scrollPane.current?.scrollTo({ top: 0 });
		window.scrollTo({ top: 0 });
	}, [step]);

	async function pickLogo(file: File) {
		const validation = await validateStoreThemeAssetFile("logoUrl", file);
		if (!validation.ok) {
			setup.reportError(validation.error || "Ese archivo no sirve como logo.");
			return;
		}
		if (logoBlobUrl.current) URL.revokeObjectURL(logoBlobUrl.current);
		logoBlobUrl.current = URL.createObjectURL(file);
		setLogoColorUrl(logoBlobUrl.current);
		if (!(await setup.uploadLogo(file, file.name))) setLogoColorUrl(null);
	}

	const template = findMenuTemplate(effectiveTheme.templateId);
	const templateColor = template?.theme.primaryColor ?? null;
	const accent = effectiveTheme.primaryColor || SETUP_TOKENS.color.accent;
	const businessName = effectiveTheme.displayName || initial.company.name;
	const realProducts = Math.max(0, menuStatus.productCount - menuStatus.sampleCount);

	const meta = OWNER_SETUP_STEP_META[step];
	const header = published
		? { title: "¡Tu tienda está en línea!", description: "Comparte el enlace o imprime el QR para las mesas y el mostrador." }
		: step === "publicar" && draft
			? draft.paymentInReview
				? { title: OWNER_SETUP_DRAFT_PUBLISH_META.reviewTitle, description: OWNER_SETUP_DRAFT_PUBLISH_META.reviewDescription }
				: { title: OWNER_SETUP_DRAFT_PUBLISH_META.title, description: OWNER_SETUP_DRAFT_PUBLISH_META.description }
			: step === "diseno"
			? { title: meta.title, description: `Primero van los que mejor quedan para ${SECTOR_NOUN[initial.sector]}. Toca uno y míralo en el teléfono con tu logo.` }
			: meta;

	const primary = published
		? { label: "Ir a mi cuenta", onClick: () => void setup.finish(), loading: busy === "finish", variant: "primary" as const, icon: null, trailing: <ArrowRight aria-hidden /> }
		: step === "publicar"
			? {
					label: draft?.paymentInReview ? "Ver el estado del pago" : "Publicar mi tienda",
					onClick: () => void setup.publish(),
					loading: busy === "publish",
					variant: "accent" as const,
					icon: draft?.paymentInReview ? <Clock aria-hidden /> : <Rocket aria-hidden />,
					trailing: null,
				}
			: {
					label: step === "menu" && menuStatus.productCount === 0 ? "Lo hago después" : "Continuar",
					onClick: () => void setup.goNext(),
					loading: busy === "save",
					variant: "primary" as const,
					icon: null,
					trailing: <ArrowRight aria-hidden />,
				};
	const primaryButton = (className?: string) => (
		<SetupButton
			variant={primary.variant}
			size="lg"
			onClick={primary.onClick}
			loading={primary.loading}
			disabled={busy != null && !primary.loading}
			icon={primary.icon}
			trailingIcon={primary.trailing}
			className={className}
		>
			{primary.label}
		</SetupButton>
	);

	const preview = (
		<SetupPreview
			theme={setup.previewTheme}
			menuSlug={initial.company.publicSlug}
			customDomain={initial.company.customDomain}
			branchId={initial.branch?.id ?? null}
			reloadKey={setup.reloadKey}
		/>
	);

	const variants: Variants = {
		enter: (direction: number) => ({ opacity: 0, x: reduceMotion ? 0 : direction * 28 }),
		center: { opacity: 1, x: 0, transition: { duration: SETUP_TOKENS.motion.base, ease: EASE } },
		exit: (direction: number) => ({ opacity: 0, x: reduceMotion ? 0 : direction * -18, transition: { duration: SETUP_TOKENS.motion.fast, ease: EASE } }),
	};

	let content: ReactNode = null;
	if (step === "marca") {
		content = (
			<BrandStep
				displayName={setup.displayName}
				onDisplayNameChange={setup.setDisplayName}
				logoPreviewUrl={setup.logoPreviewUrl}
				logoColorUrl={logoColorUrl ?? setup.logoPreviewUrl}
				onPickLogo={(file) => void pickLogo(file)}
				uploading={setup.uploading}
				brandColor={setup.brandColor}
				onBrandColorChange={setup.setBrandColor}
				templateColor={templateColor}
			/>
		);
	} else if (step === "diseno") {
		content = (
			<DesignStep
				sector={initial.sector}
				selectedId={effectiveTheme.templateId ?? ""}
				onSelect={setup.selectTemplate}
				brandColor={setup.brandColor ? (brandButtonColors(setup.brandColor)?.primaryColor ?? null) : null}
				logoUrl={setup.logoPreviewUrl}
				displayName={businessName}
			/>
		);
	} else if (step === "menu") {
		content = <MenuStep company={initial.company} menuSetup={{ ...initial.menuSetup, ...menuStatus }} onStatusChange={setup.setMenuStatus} />;
	} else if (step === "local") {
		content = initial.branch ? (
			<LocalStep form={setup.local} onChange={setup.updateLocal} whatsappError={setup.whatsappError} disabled={busy != null} country={initial.company.country} />
		) : (
			<SetupNotice tone="info" title="Tu tienda todavía no tiene un local">
				Lo puedes crear desde «Locales» en tu cuenta.
			</SetupNotice>
		);
	} else {
		content = (
			<PublishStep
				storeUrl={initial.storeUrl}
				published={published}
				businessName={businessName}
				logoUrl={setup.logoPreviewUrl}
				accentColor={accent}
				draft={draft}
				onGoToStep={(target) => void setup.goTo(target)}
				checklist={[
					{ step: "marca", label: "Tu logo", done: setup.stepDone.marca },
					{ step: "diseno", label: "Un diseño para tu menú", done: setup.stepDone.diseno },
					{
						step: "menu",
						label: realProducts > 0 || menuStatus.sampleCount === 0 ? "Tu menú con productos" : "Menú de ejemplo (cámbialo por el tuyo)",
						done: setup.stepDone.menu,
					},
					{ step: "local", label: "WhatsApp y dirección", done: setup.stepDone.local },
				]}
			/>
		);
	}

	const stage = stageBackground(accent);

	return (
		<div style={ROOT_STYLE} className="min-h-dvh overflow-x-clip bg-(--su-canvas) text-(--su-ink) antialiased lg:h-dvh lg:overflow-hidden">
			<header className="sticky top-0 z-30 border-b border-(--su-line) bg-white/85 backdrop-blur-xl">
				<div className="flex h-14 items-center gap-2 px-2 sm:px-4 lg:h-16 lg:gap-4 lg:px-6">
					<div className="flex min-w-0 items-center gap-3 lg:w-[250px] lg:shrink-0">
						{setup.previous && !published ? (
							<SetupButton variant="ghost" iconOnly aria-label="Volver al paso anterior" onClick={() => void setup.goBack()} disabled={busy != null} className="lg:hidden">
								<ChevronLeft className="h-5 w-5" aria-hidden />
							</SetupButton>
						) : (
							<span className="flex h-11 w-11 items-center justify-center lg:hidden">
								<LandingBrandMark variant="onLight" className="h-[18px]" />
							</span>
						)}
						<span className="hidden items-center gap-3 lg:flex">
							<LandingBrandMark variant="onLight" className="h-[22px]" />
							<span className="h-5 w-px bg-(--su-line-strong)" aria-hidden />
							<span className="truncate text-[15px] font-semibold tracking-[-0.01em]">Configura tu tienda</span>
						</span>
					</div>

					<div className="hidden flex-1 justify-center lg:flex">
						<SetupProgress
							steps={steps}
							current={step}
							done={setup.stepDone}
							onSelect={(target) => void setup.goTo(target)}
							disabled={(target) => published && target !== "publicar"}
						/>
					</div>
					<div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1 lg:hidden">
						<span className="truncate text-[13px] font-semibold">
							{meta.label}
							<span className="font-normal text-(--su-subtle)">
								{" "}
								· {stepIndex + 1} de {steps.length}
							</span>
						</span>
						<div className="w-full max-w-[200px]">
							<SetupProgressCompact steps={steps} current={step} />
						</div>
					</div>

					<div className="flex items-center justify-end gap-3 lg:w-[250px] lg:shrink-0">
						<span className="hidden lg:block">
							<SaveIndicator saving={busy === "save" || setup.uploading} savedAt={setup.savedAt} />
						</span>
						{!published ? (
							<>
								<SetupButton variant="ghost" size="sm" onClick={() => void setup.skip()} loading={busy === "skip"} className="hidden lg:inline-flex">
									Terminar después
								</SetupButton>
								<SetupButton variant="ghost" iconOnly aria-label="Terminar después" onClick={() => void setup.skip()} loading={busy === "skip"} className="lg:hidden">
									<X className="h-5 w-5" aria-hidden />
								</SetupButton>
							</>
						) : (
							<span className="h-11 w-11 lg:hidden" aria-hidden />
						)}
					</div>
				</div>
			</header>

			<div className="lg:grid lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(440px,46%)] xl:grid-cols-[minmax(0,1fr)_minmax(520px,47%)]">
				<div ref={scrollPane} className="relative flex flex-col lg:h-full lg:overflow-y-auto lg:overscroll-contain">
					<main className="mx-auto w-full max-w-[640px] flex-1 px-5 pb-36 pt-7 sm:px-8 sm:pt-10 lg:px-10 lg:pb-12 lg:pt-12">
						<AnimatePresence mode="wait" custom={setup.direction} initial={false}>
							<motion.div key={`${step}-${published}`} custom={setup.direction} variants={variants} initial="enter" animate="center" exit="exit">
								<StepHeader eyebrow={`Paso ${stepIndex + 1} de ${steps.length}`} title={header.title} description={header.description} celebrate={published} />
								<AnimatePresence>
									{setup.error ? (
										<SetupNotice tone="danger" onDismiss={setup.clearError} className="mb-6">
											{setup.error}
										</SetupNotice>
									) : null}
								</AnimatePresence>
								{content}
							</motion.div>
						</AnimatePresence>
					</main>

					<footer className="sticky bottom-0 z-10 hidden bg-(--su-canvas) lg:block before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-linear-to-t before:from-(--su-canvas) before:to-transparent">
						<div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 border-t border-(--su-line) px-10 py-4">
							{setup.previous && !published ? (
								<SetupButton variant="ghost" size="lg" icon={<ArrowLeft aria-hidden />} onClick={() => void setup.goBack()} disabled={busy != null} className="-ml-3">
									Atrás
								</SetupButton>
							) : (
								<span />
							)}
							{primaryButton("min-w-[180px]")}
						</div>
					</footer>
				</div>

				{isDesktop ? (
					<aside className="relative flex h-full flex-col overflow-hidden border-l border-(--su-line)" style={{ background: stage }} aria-label="Vista previa de tu menú">
						<div className="flex justify-center pt-6">
							<LivePill draft={Boolean(draft) && !published} />
						</div>
						<div className="min-h-0 flex-1 px-8 pb-8 pt-5">{preview}</div>
					</aside>
				) : null}
			</div>

			<div className="fixed inset-x-0 bottom-0 z-30 border-t border-(--su-line) bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl lg:hidden">
				<div className="mx-auto flex max-w-[640px] items-center gap-2.5">
					<SetupButton variant="secondary" size="lg" iconOnly aria-label="Ver cómo queda tu menú" onClick={() => setPreviewOpen(true)}>
						<Smartphone className="h-5 w-5" aria-hidden />
					</SetupButton>
					{primaryButton("flex-1")}
				</div>
			</div>

			{!isDesktop ? (
				<PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} background={stage}>
					{previewOpen ? preview : null}
				</PreviewSheet>
			) : null}
		</div>
	);
}
