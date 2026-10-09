import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import { isStoreDraftPending, storeDraftHasMenuReads, withStoreDraftMenuRead } from "@/lib/tenant/store-draft";
import { extractMenuDraft, isMenuImportEnabled, type MenuImportSource } from "@/lib/menu/ai-menu-import";
import { xlsxToText } from "@/lib/menu/spreadsheet-to-text";

/** @service-role customer-account
 *
 * Lee una carta subida por el dueño y devuelve el borrador para revisar. No escribe el menú:
 * la creación va por `POST /api/customer-account/menu` con lo que el dueño confirmó.
 *
 * Con service role solo se toca `theme_config` de ctx.companyId: una tienda en vista previa
 * («Arma y paga») trae una lectura gratis y aquí se cuenta. Con el plan pagado no hay tope
 * más allá del límite por hora.
 */

export const maxDuration = 60;

// Vercel corta los cuerpos de más de 4,5 MB; el navegador achica las fotos antes de subirlas.
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const TEXT_LIMIT = 120_000;

async function toSource(file: File): Promise<MenuImportSource | null> {
	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (IMAGE_TYPES.has(type)) {
		return { kind: "image", mediaType: type as "image/jpeg", base64: Buffer.from(bytes).toString("base64") };
	}
	if (type === "application/pdf" || name.endsWith(".pdf")) {
		return { kind: "pdf", base64: Buffer.from(bytes).toString("base64") };
	}
	if (name.endsWith(".xlsx") || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
		const text = await xlsxToText(bytes).catch(() => "");
		return text ? { kind: "text", text: text.slice(0, TEXT_LIMIT) } : null;
	}
	if (name.endsWith(".csv") || name.endsWith(".txt") || type === "text/csv" || type === "text/plain") {
		const text = new TextDecoder().decode(bytes).trim();
		return text ? { kind: "text", text: text.slice(0, TEXT_LIMIT) } : null;
	}
	return null;
}

export async function POST(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	if (!isMenuImportEnabled()) {
		return NextResponse.json({ error: "La importación de menús todavía no está activada." }, { status: 503 });
	}

	// Cada lectura cuesta: unas pocas por hora alcanzan para una carta de varias páginas.
	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "menu_import", 15, 60 * 60_000);
	if (limited) return limited;

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("subscription_status,theme_config")
		.eq("id", ctx.companyId)
		.maybeSingle();
	const draft = isStoreDraftPending(company);
	if (draft && !storeDraftHasMenuReads(company?.theme_config)) {
		return NextResponse.json(
			{
				error: "Ya usaste tu lectura gratis con IA. Sigue cargando tu menú a mano o publica tu tienda para leer más cartas.",
				code: "draft_limit",
			},
			{ status: 402 },
		);
	}

	const form = await req.formData().catch(() => null);
	const file = form?.get("file");
	if (!(file instanceof File) || file.size === 0) {
		return NextResponse.json({ error: "Sube una foto, un PDF o un Excel de tu carta." }, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return NextResponse.json({ error: "El archivo pesa más de 4 MB. Si es un PDF, súbelo por partes o como fotos." }, { status: 413 });
	}

	const source = await toSource(file);
	if (!source) {
		return NextResponse.json(
			{ error: "Ese formato no lo podemos leer. Sube una foto (JPG o PNG), un PDF o un Excel (.xlsx o .csv)." },
			{ status: 415 },
		);
	}

	const result = await extractMenuDraft(source);
	if (!result.ok) {
		const status = result.code === "rate_limited" ? 429 : result.code === "unavailable" ? 502 : 422;
		return NextResponse.json({ error: result.error, code: result.code }, { status });
	}
	// Se cuenta solo la lectura que salió bien, sobre el tema recién leído (la lectura tarda
	// y el asistente pudo guardar cambios mientras tanto).
	if (draft) {
		const { data: fresh } = await supabaseAdmin.from("companies").select("theme_config").eq("id", ctx.companyId).maybeSingle();
		if (fresh) {
			await supabaseAdmin
				.from("companies")
				.update({ theme_config: withStoreDraftMenuRead(fresh.theme_config) })
				.eq("id", ctx.companyId);
		}
	}
	return NextResponse.json({ draft: result.draft, dropped: result.dropped, truncated: result.truncated, notes: result.notes });
}
