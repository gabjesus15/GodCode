import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveBusinessSector } from "./business-sectors";
import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "./owner-password-rules";
import {
	createStoreDraftCompany,
	discardStoreDraftCompany,
	isStoreSlugTaken,
	normalizeStoreSlug,
	storeSlugProblem,
} from "./store-draft-service";
import { normalizeEmail } from "./trial-eligibility";

/**
 * «Crear mi tienda»: con el correo ya confirmado, el dueño elige el link y su contraseña y
 * entra directo a armar su tienda en vista previa. Paga recién al publicarla.
 *
 * Crea, en este orden, el usuario de Auth con su contraseña, la empresa en vista previa y
 * la fila `users` (rol `ceo`). Si algo falla, deshace lo creado para que pueda reintentar.
 *
 * Un correo que ya tiene cuenta en Gcode (dueño de otro local) no pasa por aquí: no se le
 * cambia la contraseña y sigue con el alta de siempre (plan y pago primero).
 */

export type StartStoreInput = {
	token: string;
	businessName?: string | null;
	slug: string;
	sector?: string | null;
	password: string;
	now?: Date;
};

export type StartStoreResult =
	| { ok: true; email: string; companyId: string; slug: string }
	| {
			ok: false;
			status: number;
			code: "invalid" | "not_found" | "not_ready" | "already_created" | "slug_taken" | "slug_invalid" | "existing_account" | "error";
			error: string;
	  };

type AppRow = {
	id: string;
	email: string;
	status: string | null;
	payment_status: string | null;
	company_id: string | null;
	business_name: string | null;
	responsible_name: string | null;
	plan_id: string | null;
	logo_url: string | null;
	sector: string | null;
};

function isAlreadyRegistered(message: string | undefined): boolean {
	const text = String(message ?? "").toLowerCase();
	return text.includes("already") || text.includes("registered") || text.includes("exists");
}

export async function startStoreFromApplication(supabaseAdmin: SupabaseClient, input: StartStoreInput): Promise<StartStoreResult> {
	const password = String(input.password ?? "");
	if (password.length < MIN_OWNER_PASSWORD_LENGTH || password.length > MAX_OWNER_PASSWORD_LENGTH) {
		return { ok: false, status: 400, code: "invalid", error: `Tu contraseña debe tener entre ${MIN_OWNER_PASSWORD_LENGTH} y ${MAX_OWNER_PASSWORD_LENGTH} caracteres.` };
	}

	const slug = normalizeStoreSlug(input.slug);
	const problem = storeSlugProblem(slug);
	if (problem) {
		return {
			ok: false,
			status: 400,
			code: "slug_invalid",
			error: problem === "short" ? "El link necesita al menos 3 letras o números." : "Ese link está reservado. Prueba con otro.",
		};
	}

	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,status,payment_status,company_id,business_name,responsible_name,plan_id,logo_url,sector")
		.eq("verification_token", input.token)
		.maybeSingle();
	const app = data as AppRow | null;
	if (!app) return { ok: false, status: 404, code: "not_found", error: "No encontramos tu registro. Vuelve a abrir el enlace del correo." };
	if (app.company_id) return { ok: false, status: 409, code: "already_created", error: "Tu tienda ya está creada. Entra con tu correo y tu contraseña." };
	if (app.status !== "email_verified" || app.payment_status === "paid") {
		return { ok: false, status: 409, code: "not_ready", error: "Primero confirma tu correo con el enlace que te enviamos." };
	}

	if (await isStoreSlugTaken(supabaseAdmin, slug)) {
		return { ok: false, status: 409, code: "slug_taken", error: "Ese link ya lo tiene otra tienda. Prueba con otro." };
	}

	const email = normalizeEmail(app.email);
	const businessName = String(input.businessName ?? "").trim().slice(0, 120) || String(app.business_name ?? "").trim() || "Mi tienda";
	const sector = input.sector ? resolveBusinessSector(input.sector) : app.sector ? resolveBusinessSector(app.sector) : null;

	const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name: app.responsible_name ?? undefined },
	});
	const authUserId = created?.user?.id ?? null;
	if (!authUserId) {
		if (isAlreadyRegistered(authError?.message)) {
			return { ok: false, status: 409, code: "existing_account", error: "Este correo ya tiene una cuenta en Gcode." };
		}
		console.error("start store auth user:", authError);
		return { ok: false, status: 500, code: "error", error: "No pudimos crear tu cuenta. Intenta de nuevo." };
	}

	const company = await createStoreDraftCompany(supabaseAdmin, {
		app: { ...app, business_name: businessName, email },
		businessName,
		slug,
		sector,
		now: input.now,
	});
	if (!company.ok) {
		await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
		return { ok: false, status: company.status, code: company.code, error: company.error };
	}

	const { error: ownerError } = await supabaseAdmin.from("users").insert({
		email,
		role: "ceo",
		company_id: company.companyId,
		branch_id: null,
		full_name: app.responsible_name?.trim() || null,
		auth_user_id: authUserId,
		auth_id: authUserId,
		is_active: true,
	});
	if (ownerError) {
		console.error("start store owner row:", ownerError);
		await discardStoreDraftCompany(supabaseAdmin, company.companyId);
		await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
		return { ok: false, status: 500, code: "error", error: "No pudimos crear tu tienda. Intenta de nuevo." };
	}

	// La solicitud sigue en `email_verified`: el plan y el pago se eligen al publicar.
	await supabaseAdmin
		.from("onboarding_applications")
		.update({
			company_id: company.companyId,
			business_name: businessName,
			...(sector ? { sector } : {}),
			updated_at: (input.now ?? new Date()).toISOString(),
		})
		.eq("id", app.id);

	return { ok: true, email, companyId: company.companyId, slug: company.slug };
}
