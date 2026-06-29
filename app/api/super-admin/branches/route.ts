import { NextRequest, NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/super-admin/admin-audit";
import { checkBetaBranchLimit } from "@/lib/super-admin/beta-branch-limit";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { SAAS_MUTATE_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";
import { slugify } from "@/utils/slugify";

export async function POST(req: NextRequest) {
	const permission = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!permission.ok) {
		return NextResponse.json({ error: permission.error ?? "No autorizado" }, { status: permission.status ?? 403 });
	}

	const body = (await req.json().catch(() => ({}))) as {
		company_id?: string;
		name?: string;
		slug?: string;
		address?: string;
		phone?: string;
		is_active?: boolean;
		country?: string;
		currency?: string;
	};

	const companyId = String(body.company_id ?? "").trim();
	const name = String(body.name ?? "").trim();
	const address = String(body.address ?? "").trim();
	const phone = String(body.phone ?? "").trim();
	const country = String(body.country ?? "").trim() || null;
	const currency = String(body.currency ?? "").trim() || null;
	const isActive = body.is_active !== false;
	const finalSlug = String(body.slug ?? "").trim() || slugify(name);

	if (!companyId) {
		return NextResponse.json({ error: "Falta company_id" }, { status: 400 });
	}
	if (!name) {
		return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
	}
	if (!finalSlug) {
		return NextResponse.json({ error: "Define un slug valido para la sucursal" }, { status: 400 });
	}

	const limit = await checkBetaBranchLimit(companyId);
	if (!limit.allowed) {
		return NextResponse.json({ error: limit.reason ?? "Limite de sucursales alcanzado" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("branches")
		.insert({
			company_id: companyId,
			name,
			slug: finalSlug,
			address: address || null,
			phone: phone || null,
			is_active: isActive,
			country,
			currency,
		})
		.select("id")
		.single();

	if (error || !data) {
		return NextResponse.json({ error: error?.message ?? "No se pudo crear la sucursal" }, { status: 400 });
	}

	await logAdminAudit({
		actorEmail: permission.email ?? "",
		actorRole: permission.role,
		action: "branch.create",
		resourceType: "branch",
		resourceId: data.id,
		metadata: { company_id: companyId, name, slug: finalSlug },
	});

	return NextResponse.json({ ok: true, branch: { id: data.id } });
}
