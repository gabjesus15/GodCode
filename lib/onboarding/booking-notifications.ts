import type { SupabaseClient } from "@supabase/supabase-js";

import { getAppUrl } from "../tenant/app-url";
import { sendOnboardingEmail } from "./emails";

const RESEND_FROM = process.env.RESEND_FROM ?? "noreply@example.com";
const ONBOARDING_TEAM_EMAIL = process.env.ONBOARDING_TEAM_EMAIL?.trim() ?? "";
const CONTACT_DELAY_DAYS = Math.max(1, Number(process.env.ONBOARDING_CONTACT_DAYS ?? 3) || 3);
const MAX_DELIVERIES_PER_DAY = Math.max(1, Number(process.env.ONBOARDING_MAX_DELIVERIES_PER_DAY ?? 4) || 4);
const PANEL_URL = getAppUrl();

type CompanyContext = {
	id: string;
	name: string;
	email: string | null;
};

type ApplicationContext = {
	id: string;
	business_name: string;
	responsible_name: string;
	email: string;
	company_id: string | null;
};

type DeliveryBookingInfo = {
	scheduledFor: Date;
	assignedTo: string | null;
	assignedAdminId: string | null;
};

function formatContactDate(date: Date): string {
	return new Intl.DateTimeFormat("es-CL", {
		dateStyle: "full",
	}).format(date);
}

export function getBookingContactDate(now = new Date(), days = CONTACT_DELAY_DAYS): Date {
	const contactDate = new Date(now);
	contactDate.setDate(contactDate.getDate() + Math.max(1, Number(days) || 1));
	contactDate.setHours(10, 0, 0, 0);
	return contactDate;
}

function withUtcHour(date: Date, hour = 15): Date {
	const d = new Date(date);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

async function getActiveDeliveryByCompany(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
}): Promise<DeliveryBookingInfo | null> {
	const { data } = await params.supabaseAdmin
		.from("saas_tickets")
		.select("resolution_due_at,assigned_to,assigned_admin_id,status")
		.eq("company_id", params.companyId)
		.eq("category", "onboarding_delivery")
		.not("status", "in", "(resolved,cancelled)")
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (!data?.resolution_due_at) return null;

	return {
		scheduledFor: new Date(data.resolution_due_at),
		assignedTo: data.assigned_to ?? null,
		assignedAdminId: data.assigned_admin_id ?? null,
	};
}

async function getDailyLoad(params: {
	supabaseAdmin: SupabaseClient;
	dayStartIso: string;
	dayEndIso: string;
}): Promise<Array<{ assigned_admin_id: string | null; assigned_to: string | null }>> {
	const { data } = await params.supabaseAdmin
		.from("saas_tickets")
		.select("assigned_admin_id,assigned_to")
		.eq("category", "onboarding_delivery")
		.not("status", "in", "(resolved,cancelled)")
		.gte("resolution_due_at", params.dayStartIso)
		.lt("resolution_due_at", params.dayEndIso);

	return (data ?? []) as Array<{ assigned_admin_id: string | null; assigned_to: string | null }>;
}

async function pickAssignee(params: {
	supabaseAdmin: SupabaseClient;
	dailyLoad: Array<{ assigned_admin_id: string | null; assigned_to: string | null }>;
}): Promise<{ assignedAdminId: string | null; assignedTo: string | null }> {
	const { data: admins } = await params.supabaseAdmin
		.from("admin_users")
		.select("id,email,role")
		.order("created_at", { ascending: true });

	const eligible = (admins ?? []).filter((admin) => (admin.email ?? "").trim().length > 0);
	if (!eligible.length) {
		return { assignedAdminId: null, assignedTo: ONBOARDING_TEAM_EMAIL || null };
	}

	const loadByAdmin = new Map<string, number>();
	for (const admin of eligible) loadByAdmin.set(admin.id, 0);

	for (const item of params.dailyLoad) {
		if (!item.assigned_admin_id) continue;
		loadByAdmin.set(item.assigned_admin_id, (loadByAdmin.get(item.assigned_admin_id) ?? 0) + 1);
	}

	const selected = [...eligible].sort((a, b) => {
		const loadA = loadByAdmin.get(a.id) ?? 0;
		const loadB = loadByAdmin.get(b.id) ?? 0;
		if (loadA !== loadB) return loadA - loadB;
		return a.email.localeCompare(b.email);
	})[0];

	return { assignedAdminId: selected.id, assignedTo: selected.email };
}

async function findAvailableSlot(params: {
	supabaseAdmin: SupabaseClient;
	preferredDate: Date;
}): Promise<DeliveryBookingInfo> {
	for (let offset = 0; offset < 90; offset += 1) {
		const candidate = new Date(params.preferredDate);
		candidate.setDate(candidate.getDate() + offset);
		const slotDate = withUtcHour(candidate);
		const dayStart = new Date(slotDate);
		dayStart.setUTCHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart);
		dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

		const dailyLoad = await getDailyLoad({
			supabaseAdmin: params.supabaseAdmin,
			dayStartIso: dayStart.toISOString(),
			dayEndIso: dayEnd.toISOString(),
		});

		if (dailyLoad.length >= MAX_DELIVERIES_PER_DAY) {
			continue;
		}

		const assignee = await pickAssignee({ supabaseAdmin: params.supabaseAdmin, dailyLoad });
		return {
			scheduledFor: slotDate,
			assignedAdminId: assignee.assignedAdminId,
			assignedTo: assignee.assignedTo,
		};
	}

	const fallback = withUtcHour(params.preferredDate);
	return {
		scheduledFor: fallback,
		assignedAdminId: null,
		assignedTo: ONBOARDING_TEAM_EMAIL || null,
	};
}

async function ensureDeliveryTicket(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
	businessName: string;
	requesterEmail: string;
	scheduledFor: Date;
	assignedAdminId: string | null;
	assignedTo: string | null;
}): Promise<void> {
	const existing = await getActiveDeliveryByCompany({
		supabaseAdmin: params.supabaseAdmin,
		companyId: params.companyId,
	});

	if (existing) {
		await params.supabaseAdmin
			.from("saas_tickets")
			.update({
				resolution_due_at: params.scheduledFor.toISOString(),
				assigned_admin_id: params.assignedAdminId,
				assigned_to: params.assignedTo,
				updated_at: new Date().toISOString(),
			})
			.eq("company_id", params.companyId)
			.eq("category", "onboarding_delivery")
			.not("status", "in", "(resolved,cancelled)");
		return;
	}

	await params.supabaseAdmin.from("saas_tickets").insert({
		company_id: params.companyId,
		subject: `Entrega onboarding - ${params.businessName}`,
		description: "Entrega programada automaticamente para publicacion/configuracion inicial del negocio.",
		category: "onboarding_delivery",
		priority: "medium",
		status: "open",
		source: "onboarding",
		created_by_email: params.requesterEmail,
		assigned_admin_id: params.assignedAdminId,
		assigned_to: params.assignedTo,
		resolution_due_at: params.scheduledFor.toISOString(),
		first_response_due_at: params.scheduledFor.toISOString(),
	});
}

async function getLatestApplication(supabaseAdmin: SupabaseClient, companyId: string): Promise<ApplicationContext | null> {
	const { data: application } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,business_name,responsible_name,email,company_id")
		.eq("company_id", companyId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (!application) {
		return null;
	}

	return application as ApplicationContext;
}

async function getCompanyContext(supabaseAdmin: SupabaseClient, companyId: string): Promise<CompanyContext | null> {
	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("id,name,email")
		.eq("id", companyId)
		.maybeSingle();

	if (!company) {
		return null;
	}

	return company as CompanyContext;
}

export async function sendPaymentValidatedNotice(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
	businessName: string;
	responsibleName: string;
	recipientEmail: string;
	contactDate?: Date;
}): Promise<{ ok: boolean; error?: string }> {
	const contactDate = params.contactDate ?? getBookingContactDate();
	return sendOnboardingEmail({
		type: "payment_validated",
		to: params.recipientEmail,
		from: RESEND_FROM,
		apiKey: process.env.RESEND_API_KEY ?? "",
		businessName: params.businessName,
		responsibleName: params.responsibleName,
		contactDate: formatContactDate(contactDate),
		panelUrl: PANEL_URL,
	});
}

export async function queueBookingReminder(params: {
	supabaseAdmin: SupabaseClient;
	companyId: string;
	businessName?: string;
	requesterEmail?: string;
	scheduledFor?: Date;
}): Promise<DeliveryBookingInfo> {
	const existingDelivery = await getActiveDeliveryByCompany({
		supabaseAdmin: params.supabaseAdmin,
		companyId: params.companyId,
	});
	if (existingDelivery) {
		return existingDelivery;
	}

	const scheduledFor = params.scheduledFor ?? getBookingContactDate();
const slot = await findAvailableSlot({ supabaseAdmin: params.supabaseAdmin, preferredDate: scheduledFor });
	const scheduledForIso = slot.scheduledFor.toISOString();

	const { data: existing } = await params.supabaseAdmin
		.from("subscription_notifications")
		.select("id")
		.eq("company_id", params.companyId)
		.eq("type", "onboarding_contact_followup")
		.eq("status", "pending")
		.eq("scheduled_for", scheduledForIso)
		.maybeSingle();

	if (!existing) {
		await params.supabaseAdmin.from("subscription_notifications").insert({
			company_id: params.companyId,
			type: "onboarding_contact_followup",
			scheduled_for: scheduledForIso,
			status: "pending",
		});
	}

	if (params.businessName && params.requesterEmail) {
		await ensureDeliveryTicket({
			supabaseAdmin: params.supabaseAdmin,
			companyId: params.companyId,
			businessName: params.businessName,
			requesterEmail: params.requesterEmail,
			scheduledFor: slot.scheduledFor,
			assignedAdminId: slot.assignedAdminId,
			assignedTo: slot.assignedTo,
		});
	}

	return slot;
}

export async function processDueBookingReminders(params: {
	supabaseAdmin: SupabaseClient;
	now?: Date;
}): Promise<{ processed: number; errors: number }> {
	const nowIso = (params.now ?? new Date()).toISOString();
	const { data: reminders, error: selectError } = await params.supabaseAdmin
		.from("subscription_notifications")
		.select("id,company_id,scheduled_for,type,status")
		.eq("status", "pending")
		.eq("type", "onboarding_contact_followup")
		.lte("scheduled_for", nowIso)
		.order("scheduled_for", { ascending: true })
		.limit(100);

	if (selectError || !reminders?.length) {
		return { processed: 0, errors: selectError ? 1 : 0 };
	}

	let processed = 0;
	let errors = 0;

	for (const reminder of reminders) {
		const company = await getCompanyContext(params.supabaseAdmin, reminder.company_id);
		const application = await getLatestApplication(params.supabaseAdmin, reminder.company_id);
		const recipientEmail = ONBOARDING_TEAM_EMAIL || application?.email || company?.email || "";

		if (!company || !application || !recipientEmail) {
			errors += 1;
			await params.supabaseAdmin
				.from("subscription_notifications")
				.update({ status: "failed", error: "No se pudo resolver el destinatario", sent_at: nowIso })
				.eq("id", reminder.id);
			continue;
		}

		const sent = await sendOnboardingEmail({
			type: "booking_reminder",
			to: recipientEmail,
			from: RESEND_FROM,
			apiKey: process.env.RESEND_API_KEY ?? "",
			businessName: application.business_name || company.name,
			responsibleName: application.responsible_name,
			contactDate: formatContactDate(new Date(reminder.scheduled_for)),
			panelUrl: PANEL_URL,
		});

		if (!sent.ok) {
			errors += 1;
			await params.supabaseAdmin
				.from("subscription_notifications")
				.update({ status: "failed", error: sent.error ?? "Error al enviar correo", sent_at: nowIso })
				.eq("id", reminder.id);
			continue;
		}

		processed += 1;
		await params.supabaseAdmin
			.from("subscription_notifications")
			.update({ status: "sent", sent_at: nowIso, error: null })
			.eq("id", reminder.id);
	}

	return { processed, errors };
}