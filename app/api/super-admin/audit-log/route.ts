import { NextResponse } from "next/server";
import { SAAS_READ_ROLES, validateAdminRolesOnServer } from "../../../../utils/admin/server-auth";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

function csvEscape(value: unknown): string {
	if (value == null) return '""';
	const s = typeof value === "string" ? value : JSON.stringify(value);
	return `"${String(s).replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
	const permission = await validateAdminRolesOnServer([...SAAS_READ_ROLES]);
	if (!permission.ok) {
		return NextResponse.json(
			{ error: permission.error ?? "No autorizado" },
			{ status: permission.status ?? 403 }
		);
	}

	const url = new URL(req.url);
	const accept = req.headers.get("accept") ?? "";
	const wantsCsv =
		url.searchParams.get("format") === "csv" ||
		accept.includes("text/csv") ||
		url.searchParams.get("format") === "export";
	const limitCap = wantsCsv ? 2000 : 200;
	const limit = Math.min(limitCap, Math.max(1, Number(url.searchParams.get("limit")) || (wantsCsv ? 1000 : 80)));

	const { data, error } = await supabaseAdmin
		.from("admin_audit_logs")
		.select("id,created_at,actor_email,action,target_type,target_id,metadata")
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) {
		console.error("[audit-log] DB error:", error.message);
		return NextResponse.json({ error: "Error al cargar registros", data: [] }, { status: 500 });
	}

	const rows = data ?? [];

	if (wantsCsv) {
		const header = ["id", "created_at", "actor_email", "action", "target_type", "target_id", "metadata"];
		const lines = [
			header.join(","),
			...rows.map((r) =>
				[
					csvEscape(r.id),
					csvEscape(r.created_at),
					csvEscape(r.actor_email),
					csvEscape(r.action),
					csvEscape(r.target_type),
					csvEscape(r.target_id),
					csvEscape(r.metadata != null ? JSON.stringify(r.metadata) : ""),
				].join(",")
			),
		];
		const body = `\uFEFF${lines.join("\r\n")}`;
		const stamp = new Date().toISOString().slice(0, 10);
		return new NextResponse(body, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="admin-audit-${stamp}.csv"`,
			},
		});
	}

	return NextResponse.json({ data: rows });
}
