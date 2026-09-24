import { Mail } from "lucide-react";

import { EmailCenter, type EmailCenterData } from "@/components/super-admin/emails/email-center";
import { SaasPageHeader } from "@/components/super-admin/shared/saas-page-header";
import { getEmailBrand } from "@/lib/email/brand";
import { listRecentDeliveries } from "@/lib/email/deliveries";
import { lifecycleMode, runLifecycleEmails, type LifecycleReport } from "@/lib/email/lifecycle-job";
import { renderEmail } from "@/lib/email/render";
import { resolveFromAddress, teamInbox } from "@/lib/email/send";
import { buildEmailContent, EMAIL_CATALOG } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { formatAdminDateTime } from "@/lib/super-admin/admin-format";
import { requireSuperAdminSession } from "@/lib/super-admin/require-super-admin-session";

/** @service-role layout-guard
 *
 * Solo lectura: la simulación del cron (`dry-run`) calcula qué saldría hoy sin enviar ni
 * escribir nada, y el historial sale de `email_deliveries`.
 */

export const dynamic = "force-dynamic";

export const metadata = { title: "Correos" };

export default async function CorreosPage() {
	const session = await requireSuperAdminSession();

	const [deliveries, plan] = await Promise.all([
		listRecentDeliveries(40),
		runLifecycleEmails({ mode: "dry-run" }).catch(
			(error): LifecycleReport => ({
				mode: "dry-run",
				planned: 0,
				sent: 0,
				failed: 0,
				items: [],
				errors: [error instanceof Error ? error.message : "No se pudo calcular"],
			}),
		),
	]);

	const companyIds = [
		...new Set([...(deliveries ?? []).map((row) => row.company_id), ...plan.items.map((item) => item.companyId)].filter(Boolean)),
	] as string[];
	const { data: companies } = companyIds.length
		? await supabaseAdmin.from("companies").select("id,name").in("id", companyIds)
		: { data: [] };
	const companyName = new Map(((companies ?? []) as Array<{ id: string; name: string | null }>).map((row) => [row.id, row.name ?? ""]));
	const labelOf = new Map(EMAIL_CATALOG.map((entry) => [entry.kind as string, entry.label]));

	const from = resolveFromAddress(process.env.RESEND_FROM);
	const data: EmailCenterData = {
		config: {
			from: from || "Sin configurar",
			configured: Boolean(process.env.RESEND_API_KEY?.trim() && from),
			mode: lifecycleMode(),
			teamInbox: teamInbox(),
			replyTo: getEmailBrand().replyTo,
			ledgerReady: deliveries !== null,
		},
		defaultTestRecipient: session.email,
		readOnly: session.role !== "super_admin",
		templates: EMAIL_CATALOG.map((entry) => {
			const content = buildEmailContent(entry.kind, entry.sample as never);
			const rendered = renderEmail(content);
			return {
				kind: entry.kind,
				group: entry.group,
				label: entry.label,
				trigger: entry.trigger,
				automatic: entry.automatic,
				subject: rendered.subject,
				preheader: content.preheader,
				html: rendered.html,
				text: rendered.text,
			};
		}),
		today: {
			errors: plan.errors,
			items: plan.items.map((item) => ({
				key: item.dedupeKey,
				label: labelOf.get(item.kind) ?? item.kind,
				business: item.businessName || (item.companyId ? companyName.get(item.companyId) : "") || "Solicitud de alta",
				to: item.to ?? "",
				status: item.status,
				detail: item.detail ?? "",
			})),
		},
		recent: (deliveries ?? []).map((row) => ({
			id: row.id,
			label: labelOf.get(row.kind) ?? row.kind,
			subject: row.subject,
			business: row.company_id ? (companyName.get(row.company_id) ?? "") : "",
			to: row.recipient,
			status: row.status,
			error: row.error ?? "",
			when: formatAdminDateTime(row.sent_at ?? row.created_at),
		})),
	};

	return (
		<div className="min-w-0 space-y-6">
			<SaasPageHeader
				title="Correos"
				description="Todo lo que Gcode les escribe a los negocios: cuándo sale cada correo, cómo se ve y qué se envió."
				icon={Mail}
			/>
			<EmailCenter data={data} />
		</div>
	);
}
