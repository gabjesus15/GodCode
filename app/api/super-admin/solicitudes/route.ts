import { NextResponse } from "next/server";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

function getDeletePolicy(input: {
	status: string | null;
	companyId: string | null;
	paymentStatus: string | null;
	referenceFileUrl: string | null;
}): { canDelete: boolean; reason: string | null } {
	if (input.companyId) {
		return { canDelete: false, reason: "La solicitud ya fue convertida en empresa" };
	}

	const status = String(input.status ?? "").trim().toLowerCase();
	const paymentStatus = String(input.paymentStatus ?? "").trim().toLowerCase();
	const hasProof = Boolean((input.referenceFileUrl ?? "").trim());

	if (status === "active" || status === "payment_validated") {
		return { canDelete: false, reason: "La solicitud ya está activada" };
	}

	if (paymentStatus === "paid") {
		return { canDelete: false, reason: "La solicitud tiene un pago aprobado" };
	}

	if (paymentStatus === "pending_validation" || hasProof) {
		return { canDelete: false, reason: "La solicitud tiene un pago en revisión" };
	}

	const allowedStatuses = new Set(["pending_verification", "email_verified", "form_completed", "rejected", "payment_pending"]);
	if (!allowedStatuses.has(status)) {
		return { canDelete: false, reason: "Estado no elegible para eliminación" };
	}

	return { canDelete: true, reason: null };
}

export async function GET() {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json(
			{ error: permission.error ?? "No autorizado" },
			{ status: permission.status ?? 403 }
		);
	}

	type AppRow = {
		id: string;
		status: string | null;
		created_at: string | null;
		updated_at: string | null;
		plan_id: string | null;
		company_id: string | null;
		custom_plan_name: string | null;
		custom_plan_price: string | null;
		custom_domain: string | null;
		subscription_payment_method: string | null;
		payment_reference: string | null;
		payment_status: string | null;
		payment_reference_url: string | null;
		payment_months: number | null;
		payment_amount: number | null;
		[key: string]: unknown;
	};

	try {
		const { data: apps, error } = await supabaseAdmin
			.from("onboarding_applications")
			.select(
				"id,business_name,responsible_name,email,status,created_at,updated_at,company_id,country,currency," +
					"plan_id,custom_plan_name,custom_plan_price,custom_domain,legal_name,fiscal_address,subscription_payment_method,payment_reference,payment_status,payment_reference_url,payment_months,payment_amount"
			)
			.order("created_at", { ascending: false })
			.limit(200);

		if (error) {
			console.error("[solicitudes] DB error:", error.message);
			return NextResponse.json(
				{ error: "Error al cargar solicitudes" },
				{ status: 500 }
		);
	}

		const listData = (apps ?? []) as unknown as AppRow[];
		const planIds = [...new Set(listData.map((a) => a.plan_id).filter(Boolean))] as string[];
		const companyIds = [...new Set(listData.map((a) => a.company_id).filter(Boolean))] as string[];

		const [plansRes, lastPaymentsRes] = await Promise.all([
		planIds.length
			? supabaseAdmin.from("plans").select("id,name,price").in("id", planIds)
			: Promise.resolve({ data: [] as { id: string; name: string | null; price: number | null }[] }),
		companyIds.length
			? (async () => {
					const { data: payments } = await supabaseAdmin
						.from("payments_history")
						.select("company_id,status,amount_paid,payment_date,payment_reference,reference_file_url")
						.in("company_id", companyIds)
						.order("payment_date", { ascending: false });
					const byCompany = new Map<string, {
						status: string;
						amount_paid: number;
						payment_date: string;
						payment_reference: string | null;
						reference_file_url: string | null;
					}>();
					const grouped = new Map<string, NonNullable<typeof payments>>();
					for (const p of payments ?? []) {
						if (!p.company_id) continue;
						const list = grouped.get(p.company_id) ?? [];
						list.push(p);
						grouped.set(p.company_id, list);
					}
					for (const [companyId, list] of grouped) {
						const pending = list.find((p) => p.status === "pending_validation");
						const chosen = pending ?? list[0];
						if (!chosen) continue;
						byCompany.set(companyId, {
							status: chosen.status ?? "pending",
							amount_paid: chosen.amount_paid ?? 0,
							payment_date: chosen.payment_date ?? "",
							payment_reference: chosen.payment_reference ?? null,
							reference_file_url: chosen.reference_file_url ?? null,
						});
					}
					return byCompany;
			  })()
			: Promise.resolve(new Map<string, {
				status: string;
				amount_paid: number;
				payment_date: string;
				payment_reference: string | null;
				reference_file_url: string | null;
			}>()),
		]);

		const deliveryBookingsRes = companyIds.length
			? await (async () => {
				const { data: tickets } = await supabaseAdmin
					.from("saas_tickets")
					.select("company_id,assigned_to,assigned_admin_id,resolution_due_at,status,updated_at")
					.in("company_id", companyIds)
					.eq("category", "onboarding_delivery")
					.not("status", "in", "(resolved,cancelled)")
					.order("updated_at", { ascending: false });

				const byCompany = new Map<string, {
					assigned_to: string | null;
					assigned_admin_id: string | null;
					resolution_due_at: string | null;
					status: string;
				}>();

				for (const row of tickets ?? []) {
					if (!row.company_id || byCompany.has(row.company_id)) continue;
					byCompany.set(row.company_id, {
						assigned_to: row.assigned_to ?? null,
						assigned_admin_id: row.assigned_admin_id ?? null,
						resolution_due_at: row.resolution_due_at ?? null,
						status: row.status ?? "open",
					});
				}

				return byCompany;
			})()
			: new Map<string, {
				assigned_to: string | null;
				assigned_admin_id: string | null;
				resolution_due_at: string | null;
				status: string;
			}>();

		const plansMap = new Map((plansRes.data ?? []).map((p) => [p.id, p]));

		const list = listData.map((app) => {
			const plan = app.plan_id ? plansMap.get(app.plan_id) : null;
			const planLabel =
				app.plan_id === "custom"
					? `Custom: ${app.custom_plan_name ?? "—"} – ${app.custom_plan_price ?? "—"}`
					: plan?.name ?? (app.plan_id ? `Plan ${app.plan_id}` : "—");
			const lastPayment = app.company_id ? lastPaymentsRes.get(app.company_id) : null;
			const applicationPayment = app.payment_reference
				? {
					status: app.payment_status ?? "pending",
					amount_paid: Number(app.payment_amount ?? 0) || 0,
					payment_date: app.updated_at ?? app.created_at ?? "",
					payment_reference: app.payment_reference,
					reference_file_url: app.payment_reference_url ?? null,
				}
				: null;
			const deliveryBooking = app.company_id ? deliveryBookingsRes.get(app.company_id) : null;
			const paymentStatus = lastPayment
				? lastPayment.status === "paid" || lastPayment.status === "approved"
					? "paid"
					: lastPayment.status === "pending_validation"
						? "pending_validation"
						: lastPayment.status === "rejected"
							? "rejected"
						: "pending"
				: applicationPayment
					? applicationPayment.status === "paid"
						? "paid"
						: applicationPayment.status === "pending_validation"
							? "pending_validation"
							: applicationPayment.status === "rejected"
								? "rejected"
								: "pending"
				: app.status === "payment_pending" && app.company_id
					? "pending"
					: null;
			const referenceFileUrl = lastPayment?.reference_file_url ?? applicationPayment?.reference_file_url ?? null;
			const deletePolicy = getDeletePolicy({
				status: String(app.status ?? "") || null,
				companyId: app.company_id,
				paymentStatus: paymentStatus,
				referenceFileUrl,
			});

			return {
				...app,
				plan_label: planLabel,
				plan_price: plan?.price ?? (app.plan_id === "custom" ? Number(app.custom_plan_price) || null : null),
				custom_domain: !!app.custom_domain,
				custom_domain_value: app.custom_domain ?? null,
				payment_status: paymentStatus,
				delivery_booking: deliveryBooking
					? {
						scheduled_for: deliveryBooking.resolution_due_at,
						assigned_to: deliveryBooking.assigned_to,
						assigned_admin_id: deliveryBooking.assigned_admin_id,
						status: deliveryBooking.status,
					}
					: null,
				can_delete: deletePolicy.canDelete,
				delete_block_reason: deletePolicy.reason,
				last_payment: lastPayment ?? applicationPayment ?? null,
			};
		});

		return NextResponse.json({ data: list });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error inesperado";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
