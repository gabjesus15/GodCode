import { NextRequest, NextResponse } from "next/server";
import { SAAS_MUTATE_ROLES, SAAS_READ_ROLES, validateAdminRolesOnServer } from "@/utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type RoleRow = {
	id: string;
	name: string;
	description: string | null;
	is_system: boolean;
};

async function validateSaasRead() {
	const result = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!result.ok) {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: result.error ?? "No autorizado" },
				{ status: result.status }
			),
		};
	}
	return { ok: true as const };
}

async function validateSaasMutate() {
	const result = await validateAdminRolesOnServer([...SAAS_MUTATE_ROLES]);
	if (!result.ok) {
		return {
			ok: false as const,
			response: NextResponse.json(
				{ error: result.error ?? "No autorizado" },
				{ status: result.status }
			),
		};
	}
	return { ok: true as const };
}

export async function GET() {
	const access = await validateSaasRead();
	if (!access.ok) return access.response;

	const { data, error } = await supabaseAdmin
		.from("role_definitions")
		.select("id,name,description,is_system")
		.order("is_system", { ascending: false })
		.order("name", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const roles = ((data ?? []) as RoleRow[]).map((role) => ({
		id: role.id,
		name: role.name,
		description: role.description ?? "",
		isSystem: role.is_system,
	}));

	return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
	const access = await validateSaasMutate();
	if (!access.ok) return access.response;

	const { name, description } = await req.json();
	if (!name) {
		return NextResponse.json({ error: "El nombre del rol es requerido" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin.rpc("create_role_definition", {
		p_name: String(name),
		p_description: description ? String(description) : null,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const role = Array.isArray(data) ? data[0] : data;
	return NextResponse.json({
		success: true,
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description ?? "",
					isSystem: role.is_system,
			  }
			: null,
	});
}

export async function PUT(req: NextRequest) {
	const access = await validateSaasMutate();
	if (!access.ok) return access.response;

	const { id, name, description } = await req.json();
	if (!id || !name) {
		return NextResponse.json({ error: "Faltan datos para actualizar el rol" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin.rpc("update_role_definition", {
		p_role_id: id,
		p_name: String(name),
		p_description: description ? String(description) : null,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const role = Array.isArray(data) ? data[0] : data;
	return NextResponse.json({
		success: true,
		role: role
			? {
					id: role.id,
					name: role.name,
					description: role.description ?? "",
					isSystem: role.is_system,
			  }
			: null,
	});
}

export async function DELETE(req: NextRequest) {
	const access = await validateSaasMutate();
	if (!access.ok) return access.response;

	const { id } = await req.json();
	if (!id) {
		return NextResponse.json({ error: "Falta el id del rol" }, { status: 400 });
	}

	const { error } = await supabaseAdmin.rpc("delete_role_definition", {
		p_role_id: id,
	});

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
}
