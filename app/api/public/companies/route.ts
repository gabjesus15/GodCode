import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

type ThemeConfig = { displayName?: string; logoUrl?: string } | null;

export async function GET() {
	try {
		const { data, error } = await supabaseAdmin
			.from("companies")
			.select("id,name,public_slug,theme_config")
			.in("subscription_status", ["active", "trial"])
			.not("public_slug", "is", null)
			.order("name");

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const list = (data ?? []).map((row) => {
			const theme = (row.theme_config as ThemeConfig) ?? null;
			return {
				id: row.id,
				name: theme?.displayName ?? row.name ?? "Negocio",
				slug: row.public_slug ?? "",
				logoUrl: theme?.logoUrl ?? null,
			};
		}).filter((item) => item.slug);

		return NextResponse.json({ companies: list });
	} catch {
		return NextResponse.json(
			{ error: "Error al cargar el listado" },
			{ status: 500 }
		);
	}
}
