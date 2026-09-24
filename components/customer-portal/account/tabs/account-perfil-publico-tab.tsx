"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Camera, ExternalLink, Eye, Globe, ImagePlus, Mail, MapPin, Palette, Phone, RefreshCw } from "lucide-react";

import { HomeSocialGlyph } from "@/components/tenant/home/home-icons";
import { normalizeBackgroundMode } from "@/lib/store-theme/theme-config";
import {
	HOME_BIO_MAX,
	HOME_SOCIAL_PLATFORMS,
	type HomeButtonShape,
	type HomeButtonStyle,
	type HomeCoverMode,
	type HomeSocialPlatform,
} from "@/lib/tenant/home-page/home-page-config";
import { brandCoverFill } from "@/lib/tenant/home-page/resolve-home-page";
import { canOptimizeRemoteImage } from "@/lib/tenant/images/can-optimize-remote-image";
import { getTenantHomeUrl } from "@/utils/tenant-url";

import type { BranchSummary, BusinessInfoSummary, CompanySnapshot, PortalTab } from "../../shared/customer-account-types";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { PageHeader } from "../../ui/PageHeader";
import { Skeleton } from "../../ui/Skeleton";
import { HomeLinksEditor } from "../../home-page/home-links-editor";
import { EditorSection, OptionCards, Switch } from "../../home-page/home-editor-controls";
import { HomePagePreview } from "../../home-page/home-page-preview";
import { useHomePageEditor, type BranchContactDraft } from "../../home-page/use-home-page-editor";

const inputClass =
	"h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60";

const SOCIAL_FIELDS: Record<HomeSocialPlatform, { label: string; placeholder: string }> = {
	instagram: { label: "Instagram", placeholder: "@tu_local" },
	tiktok: { label: "TikTok", placeholder: "@tu_local" },
	facebook: { label: "Facebook", placeholder: "facebook.com/tu-local" },
	youtube: { label: "YouTube", placeholder: "@tu_canal" },
	x: { label: "X", placeholder: "@tu_local" },
	whatsapp: { label: "WhatsApp", placeholder: "+56 9 1234 5678" },
	email: { label: "Correo", placeholder: "hola@tulocal.cl" },
	website: { label: "Sitio web", placeholder: "tulocal.cl" },
};

const BRANCH_FIELDS: Array<{ key: keyof BranchContactDraft; label: string; placeholder: string; icon: ReactNode; type?: string; wide?: boolean }> = [
	{ key: "whatsapp_url", label: "WhatsApp", placeholder: "https://wa.me/56912345678", icon: <HomeSocialGlyph platform="whatsapp" size={14} />, type: "url", wide: true },
	{ key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/tu-local", icon: <Camera className="h-3.5 w-3.5" aria-hidden />, type: "url", wide: true },
	{ key: "map_url", label: "Google Maps", placeholder: "https://maps.app.goo.gl/…", icon: <MapPin className="h-3.5 w-3.5" aria-hidden />, type: "url", wide: true },
	{ key: "phone", label: "Teléfono", placeholder: "+56 9 1234 5678", icon: <Phone className="h-3.5 w-3.5" aria-hidden />, type: "tel" },
	{ key: "address", label: "Dirección", placeholder: "Calle y número, ciudad", icon: <MapPin className="h-3.5 w-3.5" aria-hidden /> },
];

export type AccountPerfilPublicoTabProps = {
	company: CompanySnapshot;
	branches: BranchSummary[];
	initialBusinessInfo: BusinessInfoSummary | null;
	onNavigate: (tab: PortalTab) => void;
	/** Avisa al portal si hay cambios sin guardar (para no perderlos al cambiar de pestaña). */
	onDirtyChange?: (dirty: boolean) => void;
};

export function AccountPerfilPublicoTab({ company, branches, initialBusinessInfo, onNavigate, onDirtyChange }: AccountPerfilPublicoTabProps) {
	const editor = useHomePageEditor({ branches, initialSchedule: initialBusinessInfo?.schedule ?? "" });
	const { config, context, model, dirty, saving } = editor;
	const [previewOpen, setPreviewOpen] = useState(false);
	const coverInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		onDirtyChange?.(dirty);
	}, [dirty, onDirtyChange]);
	useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

	const homeUrl = useMemo(
		() => (company.publicSlug ? getTenantHomeUrl(company.publicSlug, company.customDomain) : ""),
		[company.customDomain, company.publicSlug],
	);
	const menuUrl = homeUrl ? `${homeUrl.replace(/\/$/, "")}/menu` : "";
	const publicSlug = company.publicSlug ?? "";

	const goToBranches = () => document.getElementById("home-branches")?.scrollIntoView({ behavior: "smooth", block: "start" });

	/* Si algo no valida, lleva al primer campo marcado: el aviso de arriba puede
	   quedar bajo la barra fija y el error, varias tarjetas más abajo. */
	const handleSave = async () => {
		const saved = await editor.save();
		if (saved) return;
		requestAnimationFrame(() => {
			const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
			invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
			invalid?.focus({ preventScroll: true });
		});
	};

	const accent = model?.brand.accent ?? "#4f46e5";
	const customCoverUrl = editor.coverUpload?.url || context?.customCoverUrl || "";
	// Con el menú en fondo sólido su foto está apagada: la portada usa el color de marca.
	const menuIsSolid = context ? normalizeBackgroundMode(context.theme.backgroundMode) === "solid" : false;
	const menuPhotoUsable = Boolean(context?.menuImageUrl) && !menuIsSolid;
	const shownCoverMode: HomeCoverMode = config?.coverMode === "menu-image" && !menuPhotoUsable ? "brand" : (config?.coverMode ?? "menu-image");

	const coverOptions: Array<{ value: HomeCoverMode; title: string; hint?: string; visual: ReactNode; disabled?: boolean }> = [
		{
			value: "menu-image",
			title: "Foto del menú",
			hint: menuIsSolid ? "Tu menú usa color sólido" : context?.menuImageUrl ? "La de fondo de tu tienda" : "No tienes foto de fondo",
			visual: <CoverThumb url={menuPhotoUsable ? (context?.menuImageUrl ?? "") : ""} />,
			disabled: !menuPhotoUsable,
		},
		{
			value: "custom-image",
			title: "Foto propia",
			hint: customCoverUrl ? "Solo para esta página" : "Sube una foto",
			visual: customCoverUrl ? (
				<CoverThumb url={customCoverUrl} />
			) : (
				<span className="grid h-14 place-items-center bg-[#f5f5f7] text-[#6e6e73]">
					<ImagePlus className="h-5 w-5" aria-hidden />
				</span>
			),
		},
		{
			value: "brand",
			title: "Color de marca",
			hint: menuIsSolid ? "Con tu fondo sólido" : "Tu color primario",
			visual: <span className="block h-14" style={{ background: brandCoverFill(accent, model?.brand.glow ?? accent) }} />,
		},
		{
			value: "none",
			title: "Sin portada",
			hint: "Solo logo y nombre",
			visual: <span className="block h-14 bg-[#f5f5f7]" />,
		},
	];

	const styleOptions: Array<{ value: HomeButtonStyle; title: string; visual: ReactNode }> = [
		{ value: "solid", title: "Lleno", visual: <ButtonSample kind="solid" accent={accent} shape={config?.buttonShape ?? "pill"} /> },
		{ value: "soft", title: "Suave", visual: <ButtonSample kind="soft" accent={accent} shape={config?.buttonShape ?? "pill"} /> },
		{ value: "outline", title: "Contorno", visual: <ButtonSample kind="outline" accent={accent} shape={config?.buttonShape ?? "pill"} /> },
	];

	const shapeOptions: Array<{ value: HomeButtonShape; title: string; visual: ReactNode }> = [
		{ value: "pill", title: "Píldora", visual: <ButtonSample kind="solid" accent={accent} shape="pill" /> },
		{ value: "rounded", title: "Redondeado", visual: <ButtonSample kind="solid" accent={accent} shape="rounded" /> },
		{ value: "square", title: "Recto", visual: <ButtonSample kind="solid" accent={accent} shape="square" /> },
	];

	const preview =
		model && publicSlug ? <HomePagePreview model={model} publicSlug={publicSlug} menuUrl={menuUrl} /> : null;

	return (
		<div className="space-y-4 sm:space-y-5">
			{/* Barra fija: estado y acciones siempre a mano. */}
			<div className="sticky top-0 z-10 -mx-4 bg-[#fbfbfd]/95 px-4 pb-2 pt-1 backdrop-blur-md md:-mx-5 md:px-5 lg:-mx-8 lg:px-8">
				<div className="flex flex-col gap-3 rounded-2xl border border-[#e5e5ea] bg-white px-3.5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
					<div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
						<PageHeader title="Página de inicio" />
						{editor.loadState === "ready" ? (
							<Badge variant={dirty ? "warning" : "success"} dot>
								{dirty ? "Cambios sin guardar" : "Publicada"}
							</Badge>
						) : null}
					</div>
					{/* Móvil: rejilla de dos columnas (ver/descartar arriba, vista previa/guardar abajo). */}
					<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
						{homeUrl ? (
							<a
								href={homeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
							>
								Ver página <ExternalLink className="h-3.5 w-3.5" aria-hidden />
							</a>
						) : null}
						<Button variant="ghost" size="sm" onClick={editor.discard} disabled={!dirty || saving} className="justify-center">
							Descartar
						</Button>
						{/* En móvil la vista previa se abre desde aquí: un botón flotante tapaba los controles. */}
						{editor.loadState === "ready" && model ? (
							<Button
								variant="secondary"
								size="sm"
								icon={<Eye className="h-3.5 w-3.5" />}
								onClick={() => setPreviewOpen(true)}
								className="justify-center lg:hidden"
							>
								Vista previa
							</Button>
						) : null}
						<Button variant="primary" size="sm" onClick={() => void handleSave()} loading={saving} disabled={!dirty} className="justify-center">
							Guardar y publicar
						</Button>
					</div>
				</div>
			</div>

			{editor.error ? <Alert variant="danger">{editor.error}</Alert> : null}
			{editor.ok ? <Alert variant="success">{editor.ok}</Alert> : null}

			{editor.loadState === "loading" ? (
				<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
					<div className="space-y-4">
						<Skeleton className="h-40 w-full" />
						<Skeleton className="h-72 w-full" />
					</div>
					<Skeleton className="hidden h-[640px] w-full lg:block" />
				</div>
			) : null}

			{editor.loadState === "error" ? (
				<Alert
					variant="danger"
					action={
						<Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void editor.reload()}>
							Reintentar
						</Button>
					}
				>
					{editor.loadError}
				</Alert>
			) : null}

			{editor.loadState === "ready" && config && context && editor.socials ? (
				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
					<div className="min-w-0 space-y-4">
						<EditorSection
							title="Perfil"
							description="Lo primero que ve tu cliente: tu logo, tu nombre y una frase que diga qué ofreces."
						>
							<div className="flex items-center gap-3 border-b border-[#f0f0f5] pb-4">
								<span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f5f5f7] text-sm font-bold text-[#1d1d1f] ring-1 ring-[#e5e5ea]">
									{context.logoUrl ? (
										<Image src={context.logoUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
									) : (
										model?.initials
									)}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-[#1d1d1f]">{context.name}</p>
									<p className="text-xs text-[#6e6e73]">Nombre, logo, colores y tipografía vienen de Tienda.</p>
								</div>
								<Button variant="secondary" size="sm" icon={<Palette className="h-3.5 w-3.5" />} onClick={() => onNavigate("tienda")}>
									Editar
								</Button>
							</div>

							<label className="mt-4 block text-xs font-medium text-[#6e6e73]">
								<span className="flex items-center justify-between">
									Frase de presentación
									<span className={config.bio.length >= HOME_BIO_MAX ? "text-amber-700" : "text-[#6e6e73]"}>
										{config.bio.length}/{HOME_BIO_MAX}
									</span>
								</span>
								<textarea
									value={config.bio}
									maxLength={HOME_BIO_MAX}
									rows={2}
									onChange={(event) => editor.updateConfig({ bio: event.target.value.replace(/\n/g, " ") })}
									placeholder="Ej. Pizzas napolitanas a la leña · Delivery y retiro en Providencia"
									disabled={saving}
									className="mt-1.5 w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
								/>
							</label>
						</EditorSection>

						<EditorSection
							title="Enlaces"
							description="Tus botones, en el orden en que aparecen. Destaca con tu color el más importante; lo normal es la carta."
						>
							<HomeLinksEditor
								links={config.links}
								branches={editor.previewBranches}
								errors={editor.errors.links}
								disabled={saving}
								onChange={(links) => editor.updateConfig({ links })}
								onClearError={editor.clearLinkError}
								onGoToBranches={goToBranches}
							/>
						</EditorSection>

						<EditorSection
							title="Redes sociales"
							description="Aparecen como íconos bajo tu nombre. Puedes pegar el enlace o solo tu usuario."
						>
							<div className="grid gap-3 sm:grid-cols-2">
								{HOME_SOCIAL_PLATFORMS.map((platform) => {
									const field = SOCIAL_FIELDS[platform];
									const error = editor.errors.socials[platform];
									return (
										<label key={platform} className="block text-xs font-medium text-[#6e6e73]">
											<span className="mb-1 flex items-center gap-1.5">
												{platform === "email" ? (
													<Mail className="h-3.5 w-3.5" aria-hidden />
												) : platform === "website" ? (
													<Globe className="h-3.5 w-3.5" aria-hidden />
												) : (
													<HomeSocialGlyph platform={platform} size={14} />
												)}
												{field.label}
											</span>
											<input
												value={editor.socials?.[platform] ?? ""}
												onChange={(event) => editor.updateSocial(platform, event.target.value)}
												placeholder={field.placeholder}
												spellCheck={false}
												autoCapitalize="off"
												disabled={saving}
												aria-invalid={Boolean(error)}
												className={`${inputClass} ${error ? "border-red-400" : "border-[#d2d2d7] focus:border-indigo-500"}`}
											/>
											{error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
										</label>
									);
								})}
							</div>
						</EditorSection>

						<EditorSection title="Apariencia" description="Cómo se viste tu página. Los colores y la tipografía del nombre son los de tu tienda.">
							<div className="space-y-5">
								<div>
									<div className="mb-2 flex items-center justify-between gap-2">
										<p className="text-xs font-semibold text-[#1d1d1f]">Portada</p>
										{config.coverMode === "custom-image" ? (
											<button
												type="button"
												onClick={() => coverInputRef.current?.click()}
												disabled={editor.coverUploading || saving}
												className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
											>
												{editor.coverUploading ? "Subiendo…" : "Cambiar foto"}
											</button>
										) : null}
									</div>
									<OptionCards
										label="Portada"
										value={shownCoverMode}
										options={coverOptions}
										columns={4}
										disabled={saving || editor.coverUploading}
										onChange={(value) => {
											if (value === "custom-image" && !config.coverImagePath) {
												coverInputRef.current?.click();
												return;
											}
											editor.updateConfig({ coverMode: value });
										}}
									/>
									<input
										ref={coverInputRef}
										type="file"
										accept="image/jpeg,image/png,image/webp"
										className="hidden"
										onChange={(event) => {
											void editor.uploadCover(event.target.files?.[0] ?? null);
											event.currentTarget.value = "";
										}}
									/>
									<p className="mt-2 text-[11px] text-[#6e6e73]">
										Foto horizontal de al menos 1600×900. En computadores también tiñe el fondo de la página.
									</p>
								</div>

								<div>
									<p className="mb-2 text-xs font-semibold text-[#1d1d1f]">Botones</p>
									<OptionCards label="Estilo de los botones" value={config.buttonStyle} options={styleOptions} disabled={saving} onChange={(buttonStyle) => editor.updateConfig({ buttonStyle })} />
								</div>

								<div>
									<p className="mb-2 text-xs font-semibold text-[#1d1d1f]">Forma</p>
									<OptionCards label="Forma de los botones" value={config.buttonShape} options={shapeOptions} disabled={saving} onChange={(buttonShape) => editor.updateConfig({ buttonShape })} />
								</div>
							</div>
						</EditorSection>

						<EditorSection title="Información" description="Datos que ayudan a decidir: si estás abierto y a qué hora.">
							<div className="divide-y divide-[#f0f0f5]">
								<ToggleRow
									title="Abierto o cerrado"
									description="Un indicador bajo tu nombre. Sale de las cajas abiertas en tu panel de ventas."
									checked={config.showStatus}
									onChange={(showStatus) => editor.updateConfig({ showStatus })}
									disabled={saving}
								/>
								<div className="py-3">
									<ToggleRow
										title="Horario"
										description="Se muestra al final de la página. El menú también lo usa para avisar cuando estás cerrado."
										checked={config.showSchedule}
										onChange={(showSchedule) => editor.updateConfig({ showSchedule })}
										disabled={saving}
										flush
									/>
									<textarea
										value={editor.schedule}
										onChange={(event) => editor.updateSchedule(event.target.value)}
										rows={3}
										placeholder={"Lun a Vie · 12:00 a 23:00\nSáb y Dom · 13:00 a 00:00"}
										disabled={saving}
										aria-label="Horario de atención"
										className="mt-3 w-full resize-y rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
									/>
								</div>
								<ToggleRow
									title="Código QR en computadores"
									description="Una tarjeta con el QR de tu menú para abrirlo en el móvil. En teléfonos no aparece."
									checked={config.showQr}
									onChange={(showQr) => editor.updateConfig({ showQr })}
									disabled={saving}
								/>
							</div>
						</EditorSection>

						<EditorSection
							id="home-branches"
							title="Contacto por sucursal"
							description="WhatsApp, Instagram, mapa y teléfono de cada local. Con varias sucursales, el cliente elige a cuál escribir."
						>
							{editor.activeBranches.length === 0 ? (
								<p className="text-sm text-[#6e6e73]">
									No hay sucursales activas.{" "}
									<button type="button" onClick={() => onNavigate("sucursales")} className="font-semibold text-indigo-600 hover:underline">
										Agrega una en Sucursales
									</button>
									.
								</p>
							) : (
								<div className="divide-y divide-[#f0f0f5]">
									{editor.activeBranches.map((branch) => {
										const draft = editor.branchDrafts[branch.id];
										if (!draft) return null;
										const branchErrors = editor.errors.branches[branch.id] ?? {};
										return (
											<fieldset key={branch.id} className="py-4 first:pt-0 last:pb-0">
												<legend className="float-left mb-3 w-full text-sm font-semibold text-[#1d1d1f]">{branch.name}</legend>
												<div className="clear-both grid gap-3 sm:grid-cols-2">
													{BRANCH_FIELDS.map((field) => (
														<label key={field.key} className={`block text-xs font-medium text-[#6e6e73] ${field.wide ? "sm:col-span-2" : ""}`}>
															<span className="mb-1 flex items-center gap-1.5">
																{field.icon}
																{field.label}
															</span>
															<input
																type={field.type ?? "text"}
																value={draft[field.key]}
																onChange={(event) => editor.updateBranch(branch.id, { [field.key]: event.target.value })}
																placeholder={field.placeholder}
																spellCheck={false}
																disabled={saving}
																aria-invalid={Boolean(branchErrors[field.key])}
																className={`${inputClass} ${branchErrors[field.key] ? "border-red-400" : "border-[#d2d2d7] focus:border-indigo-500"}`}
															/>
															{branchErrors[field.key] ? (
																<span className="mt-1 block text-xs font-medium text-red-600">{branchErrors[field.key]}</span>
															) : null}
														</label>
													))}
												</div>
											</fieldset>
										);
									})}
								</div>
							)}
						</EditorSection>
					</div>

					<aside className="sticky top-24 hidden lg:block" aria-label="Vista previa">
						{preview}
					</aside>
				</div>
			) : null}

			{/* En móvil la vista previa va en una hoja aparte. */}
			{editor.loadState === "ready" && model ? (
				<Dialog open={previewOpen} onOpenChange={setPreviewOpen} title="Vista previa" size="md">
					{preview}
				</Dialog>
			) : null}
		</div>
	);
}

function CoverThumb({ url }: { url: string }) {
	if (!url) return <span className="block h-14 bg-[#f5f5f7]" />;
	return (
		<span className="relative block h-14">
			<Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized={!canOptimizeRemoteImage(url)} />
		</span>
	);
}

function ButtonSample({ kind, accent, shape }: { kind: HomeButtonStyle; accent: string; shape: HomeButtonShape }) {
	const radius = shape === "pill" ? 999 : shape === "rounded" ? 7 : 2;
	const style =
		kind === "solid"
			? { background: "#fff", border: "1px solid #e5e5ea", boxShadow: "0 3px 8px -4px rgba(0,0,0,.25)" }
			: kind === "soft"
				? { background: `color-mix(in srgb, ${accent} 14%, #fff)`, border: "1px solid transparent" }
				: { background: "transparent", border: "1.5px solid #86868b" };
	return (
		<span className="flex h-14 flex-col justify-center gap-1.5 bg-[#f5f5f7] px-3">
			<span className="block h-3.5 w-full" style={{ background: accent, borderRadius: radius }} />
			<span className="block h-3.5 w-full" style={{ ...style, borderRadius: radius }} />
		</span>
	);
}

function ToggleRow({
	title,
	description,
	checked,
	onChange,
	disabled,
	flush = false,
}: {
	title: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	flush?: boolean;
}) {
	return (
		<div className={`flex items-start justify-between gap-4 ${flush ? "" : "py-3"}`}>
			<div className="min-w-0">
				<p className="text-sm font-semibold text-[#1d1d1f]">{title}</p>
				<p className="mt-0.5 text-xs leading-relaxed text-[#6e6e73]">{description}</p>
			</div>
			<Switch checked={checked} onChange={onChange} label={checked ? "Sí" : "No"} disabled={disabled} />
		</div>
	);
}
