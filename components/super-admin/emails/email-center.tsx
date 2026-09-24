"use client";

import { useMemo, useState } from "react";
import { Monitor, Send, Smartphone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import type { StatusTone } from "@/lib/status/status-labels";
import { cn } from "@/utils/cn";

export type EmailCenterData = {
	config: {
		from: string;
		configured: boolean;
		mode: "on" | "dry-run" | "off";
		teamInbox: string;
		replyTo: string;
		ledgerReady: boolean;
	};
	defaultTestRecipient: string;
	readOnly: boolean;
	templates: Array<{
		kind: string;
		group: string;
		label: string;
		trigger: string;
		automatic: boolean;
		subject: string;
		preheader: string;
		html: string;
		text: string;
	}>;
	today: {
		errors: string[];
		items: Array<{ key: string; label: string; business: string; to: string; status: string; detail: string }>;
	};
	recent: Array<{ id: string; label: string; subject: string; business: string; to: string; status: string; error: string; when: string }>;
};

const PLAN_STATUS: Record<string, { label: string; tone: StatusTone }> = {
	"would-send": { label: "Saldría", tone: "info" },
	"already-sent": { label: "Ya enviado", tone: "success" },
	"not-built": { label: "No se puede armar", tone: "warning" },
	skipped: { label: "Omitido", tone: "neutral" },
};

const DELIVERY_STATUS: Record<string, { label: string; tone: StatusTone }> = {
	sent: { label: "Enviado", tone: "success" },
	sending: { label: "Enviando", tone: "info" },
	failed: { label: "Falló", tone: "danger" },
	skipped: { label: "Omitido", tone: "neutral" },
};

const MODE_COPY: Record<EmailCenterData["config"]["mode"], { label: string; tone: StatusTone; text: string }> = {
	on: { label: "Activos", tone: "success", text: "Salen con el cron diario, una sola vez cada uno." },
	"dry-run": { label: "Solo simulación", tone: "warning", text: "EMAIL_REMINDERS=dry-run: se calculan y no se envían." },
	off: { label: "Apagados", tone: "neutral", text: "EMAIL_REMINDERS=off: no sale ningún recordatorio." },
};

const cardClass = "rounded-3xl border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900/80 sm:p-6";

function StatusTile({ title, badge, tone, text }: { title: string; badge: string; tone: StatusTone; text: string }) {
	return (
		<div className="min-w-0 rounded-2xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
				<SaasStatusBadge label={badge} variant={tone} />
			</div>
			<p className="mt-2 break-words text-sm text-zinc-700 dark:text-zinc-300">{text}</p>
		</div>
	);
}

export function EmailCenter({ data }: { data: EmailCenterData }) {
	const { config, templates, today, recent } = data;
	const [selectedKind, setSelectedKind] = useState(templates[0]?.kind ?? "");
	const [view, setView] = useState<"preview" | "text">("preview");
	const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
	const [testTo, setTestTo] = useState(data.defaultTestRecipient);
	const [sending, setSending] = useState(false);
	const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

	const groups = useMemo(() => {
		const map = new Map<string, EmailCenterData["templates"]>();
		for (const template of templates) map.set(template.group, [...(map.get(template.group) ?? []), template]);
		return [...map.entries()];
	}, [templates]);
	const selected = templates.find((template) => template.kind === selectedKind) ?? templates[0];
	const mode = MODE_COPY[config.mode];

	const sendTest = async () => {
		if (!selected) return;
		setSending(true);
		setTestResult(null);
		try {
			const res = await fetch("/api/super-admin/emails/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ kind: selected.kind, to: testTo }),
			});
			const payload = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
			setTestResult(res.ok ? { ok: true, message: payload.message ?? "Enviado." } : { ok: false, message: payload.error ?? "No se pudo enviar." });
		} catch {
			setTestResult({ ok: false, message: "No se pudo enviar. Revisa tu conexión." });
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<StatusTile
					title="Envío"
					badge={config.configured ? "Listo" : "Sin configurar"}
					tone={config.configured ? "success" : "danger"}
					text={config.configured ? config.from : "Faltan RESEND_API_KEY y RESEND_FROM en el entorno."}
				/>
				<StatusTile title="Recordatorios automáticos" badge={mode.label} tone={mode.tone} text={mode.text} />
				<StatusTile
					title="Registro de envíos"
					badge={config.ledgerReady ? "Listo" : "Falta la migración"}
					tone={config.ledgerReady ? "success" : "danger"}
					text={
						config.ledgerReady
							? "Evita duplicados y guarda el historial de cada negocio."
							: "Sin la tabla email_deliveries los recordatorios no salen (20260924_email_deliveries.sql)."
					}
				/>
				<StatusTile title="Avisos al equipo" badge="Equipo" tone="neutral" text={`${config.teamInbox} · las respuestas de clientes llegan a ${config.replyTo}`} />
			</div>

			<Card className={cardClass}>
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Hoy saldrían</h2>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">Simulación del cron de hoy: no envía nada.</p>
				</div>
				{today.errors.length > 0 ? (
					<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
						Algunos datos no cargaron: {today.errors.join(" · ")}
					</p>
				) : null}
				{today.items.length === 0 ? (
					<p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Hoy no toca ningún recordatorio automático.</p>
				) : (
					<div className="mt-4 overflow-x-auto">
						<table className="w-full min-w-[560px] text-left text-sm">
							<thead>
								<tr className="text-xs text-zinc-500 dark:text-zinc-400">
									<th className="pb-2 font-medium">Correo</th>
									<th className="pb-2 font-medium">Negocio</th>
									<th className="pb-2 font-medium">Para</th>
									<th className="pb-2 font-medium">Estado</th>
								</tr>
							</thead>
							<tbody>
								{today.items.map((item) => {
									const status = PLAN_STATUS[item.status] ?? { label: item.status, tone: "neutral" as const };
									return (
										<tr key={item.key} className="border-t border-zinc-100 align-top dark:border-zinc-800">
											<td className="py-2.5 pr-3 font-medium text-zinc-900 dark:text-zinc-100">{item.label}</td>
											<td className="py-2.5 pr-3 text-zinc-700 dark:text-zinc-300">{item.business}</td>
											<td className="py-2.5 pr-3 text-zinc-500 dark:text-zinc-400">{item.to || "—"}</td>
											<td className="py-2.5">
												<SaasStatusBadge label={status.label} variant={status.tone} />
												{item.detail ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p> : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			<Card className={cardClass}>
				<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Plantillas</h2>
				<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Con datos de ejemplo. Elige una para verla como le llega al cliente.</p>

				<div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
					<nav aria-label="Plantillas de correo" className="space-y-5">
						{groups.map(([group, items]) => (
							<div key={group}>
								<p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{group}</p>
								<ul className="mt-1.5 space-y-0.5">
									{items.map((template) => {
										const active = template.kind === selected?.kind;
										return (
											<li key={template.kind}>
												<button
													type="button"
													onClick={() => {
														setSelectedKind(template.kind);
														setTestResult(null);
													}}
													aria-current={active ? "true" : undefined}
													className={cn(
														"flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition",
														active
															? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
															: "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
													)}
												>
													<span className="min-w-0 truncate">{template.label}</span>
													{template.automatic ? (
														<span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide", active ? "text-white/70 dark:text-zinc-500" : "text-indigo-600 dark:text-indigo-400")}>
															Auto
														</span>
													) : null}
												</button>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</nav>

					{selected ? (
						<div className="min-w-0">
							<div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
								<p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Cuándo sale</p>
								<p className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">{selected.trigger}</p>
								<p className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">Asunto</p>
								<p className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selected.subject}</p>
								<p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">{selected.preheader}</p>
							</div>

							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<div className="inline-flex rounded-xl border border-zinc-200 p-0.5 dark:border-zinc-700" role="tablist" aria-label="Formato">
									{(["preview", "text"] as const).map((value) => (
										<button
											key={value}
											type="button"
											role="tab"
											aria-selected={view === value}
											onClick={() => setView(value)}
											className={cn(
												"rounded-lg px-3 py-1.5 text-xs font-medium transition",
												view === value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400",
											)}
										>
											{value === "preview" ? "Vista previa" : "Texto plano"}
										</button>
									))}
								</div>
								{view === "preview" ? (
									<div className="inline-flex rounded-xl border border-zinc-200 p-0.5 dark:border-zinc-700" aria-label="Pantalla">
										{(
											[
												["desktop", Monitor, "Escritorio"],
												["mobile", Smartphone, "Móvil"],
											] as const
										).map(([value, Icon, label]) => (
											<button
												key={value}
												type="button"
												aria-pressed={device === value}
												onClick={() => setDevice(value)}
												className={cn(
													"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
													device === value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400",
												)}
											>
												<Icon className="h-3.5 w-3.5" aria-hidden />
												{label}
											</button>
										))}
									</div>
								) : null}
							</div>

							<div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
								{view === "preview" ? (
									<div className="flex justify-center">
										<iframe
											key={`${selected.kind}-${device}`}
											title={`Vista previa: ${selected.label}`}
											srcDoc={selected.html}
											sandbox=""
											className="h-[720px] border-0 bg-white"
											style={{ width: device === "mobile" ? 390 : "100%" }}
										/>
									</div>
								) : (
									<pre className="max-h-[720px] overflow-auto whitespace-pre-wrap break-words bg-white p-5 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
										{selected.text}
									</pre>
								)}
							</div>

							{!data.readOnly ? (
								<form
									className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
									onSubmit={(event) => {
										event.preventDefault();
										void sendTest();
									}}
								>
									<label className="sr-only" htmlFor="email-test-to">
										Enviar la prueba a
									</label>
									<input
										id="email-test-to"
										type="email"
										required
										value={testTo}
										onChange={(event) => setTestTo(event.target.value)}
										className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
									/>
									<button
										type="submit"
										disabled={sending || !config.configured}
										className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
									>
										<Send className="h-4 w-4" aria-hidden />
										{sending ? "Enviando…" : "Enviar prueba"}
									</button>
								</form>
							) : null}
							{testResult ? (
								<p role="status" className={cn("mt-2 text-sm", testResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
									{testResult.message}
								</p>
							) : null}
						</div>
					) : null}
				</div>
			</Card>

			<Card className={cardClass}>
				<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Últimos envíos</h2>
				{!config.ledgerReady ? (
					<p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">El historial aparece cuando se corre la migración del registro de envíos.</p>
				) : recent.length === 0 ? (
					<p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay envíos registrados.</p>
				) : (
					<div className="mt-4 overflow-x-auto">
						<table className="w-full min-w-[640px] text-left text-sm">
							<thead>
								<tr className="text-xs text-zinc-500 dark:text-zinc-400">
									<th className="pb-2 font-medium">Fecha</th>
									<th className="pb-2 font-medium">Correo</th>
									<th className="pb-2 font-medium">Negocio</th>
									<th className="pb-2 font-medium">Para</th>
									<th className="pb-2 font-medium">Estado</th>
								</tr>
							</thead>
							<tbody>
								{recent.map((row) => {
									const status = DELIVERY_STATUS[row.status] ?? { label: row.status, tone: "neutral" as const };
									return (
										<tr key={row.id} className="border-t border-zinc-100 align-top dark:border-zinc-800">
											<td className="whitespace-nowrap py-2.5 pr-3 text-zinc-500 dark:text-zinc-400">{row.when}</td>
											<td className="py-2.5 pr-3">
												<p className="font-medium text-zinc-900 dark:text-zinc-100">{row.label}</p>
												<p className="text-xs text-zinc-500 dark:text-zinc-400">{row.subject}</p>
											</td>
											<td className="py-2.5 pr-3 text-zinc-700 dark:text-zinc-300">{row.business || "—"}</td>
											<td className="py-2.5 pr-3 text-zinc-500 dark:text-zinc-400">{row.to}</td>
											<td className="py-2.5">
												<SaasStatusBadge label={status.label} variant={status.tone} />
												{row.error ? <p className="mt-1 max-w-[220px] text-xs text-red-600 dark:text-red-400">{row.error}</p> : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
}
