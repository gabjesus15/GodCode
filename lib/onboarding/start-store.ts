import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveBusinessSector } from "./business-sectors";
import { isAlreadyRegisteredError } from "./company-owner";
import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "./owner-password-rules";
import {
	createStoreDraftCompany,
	discardStoreDraftCompany,
	isPanelOnlyPlan,
	isStoreSlugTaken,
	normalizeStoreSlug,
	STORE_DRAFT_CREATE_FAILED,
	storeSlugProblem,
} from "./store-draft-service";
import { normalizeEmail } from "./trial-eligibility";

/**
 * «Crear mi tienda»: con el correo ya confirmado, el dueño elige el link y su contraseña y
 * entra directo a armar su tienda en vista previa. Paga recién al publicarla.
 *
 * Crea, en este orden, el usuario de Auth con su contraseña, la empresa en vista previa
 * (con su sucursal y `business_info`), la fila `users` (rol `ceo`) y por último ata la
 * solicitud a la empresa. Cualquier fallo es fatal: se deshace todo lo creado y se devuelve
 * un error para reintentar. Si no, quedaba una cuenta con contraseña pero sin tienda
 * enlazada, y el reintento chocaba con «este correo ya tiene una cuenta».
 *
 * Un correo que ya tiene cuenta en Gcode (dueño de otro local) no pasa por aquí: no se le
 * cambia la contraseña y sigue con el alta de siempre (plan y pago primero). Tampoco el
 * plan «solo panel CEO», que no tiene tienda que armar.
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
			code: "invalid" | "not_found" | "not_ready" | "already_created" | "slug_taken" | "slug_invalid" | "existing_account" | "panel_only" | "error";
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

	const { data, error: readError } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,status,payment_status,company_id,business_name,responsible_name,plan_id,logo_url,sector")
		.eq("verification_token", input.token)
		.maybeSingle();
	if (readError) {
		console.error("start store: solicitud", readError);
		return { ok: false, status: 500, code: "error", error: STORE_DRAFT_CREATE_FAILED };
	}
	const app = data as AppRow | null;
	if (!app) return { ok: false, status: 404, code: "not_found", error: "No encontramos tu registro. Vuelve a abrir el enlace del correo." };
	if (app.company_id) return { ok: false, status: 409, code: "already_created", error: "Tu tienda ya está creada. Entra con tu correo y tu contraseña." };
	if (app.status !== "email_verified" || app.payment_status === "paid") {
		return { ok: false, status: 409, code: "not_ready", error: "Primero confirma tu correo con el enlace que te enviamos." };
	}

	if (await isPanelOnlyPlan(supabaseAdmin, app.plan_id)) {
		return { ok: false, status: 409, code: "panel_only", error: "Tu plan no incluye tienda: sigue eligiendo tu plan y pagando." };
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
		if (isAlreadyRegisteredError(authError?.message)) {
			return { ok: false, status: 409, code: "existing_account", error: "Este correo ya tiene una cuenta en Gcode." };
		}
		console.error("start store auth user:", authError);
		return { ok: false, status: 500, code: "error", error: "No pudimos crear tu cuenta. Intenta de nuevo." };
	}

	/** Deshace lo creado: tienda (si hay) y cuenta de Auth, para poder reintentar desde cero. */
	const rollback = async (companyId: string | null) => {
		if (companyId) await discardStoreDraftCompany(supabaseAdmin, companyId);
		const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((e: unknown) => ({
			error: { message: e instanceof Error ? e.message : String(e) },
		}));
		if (error) console.error("start store: no se pudo borrar la cuenta a medias", { authUserId, error: error.message });
	};

	const company = await createStoreDraftCompany(supabaseAdmin, {
		app: { ...app, business_name: businessName, email },
		businessName,
		slug,
		sector,
		now: input.now,
	});
	if (!company.ok) {
		await rollback(null);
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
		await rollback(company.companyId);
		return { ok: false, status: 500, code: "error", error: STORE_DRAFT_CREATE_FAILED };
	}

	// La solicitud sigue en `email_verified`: el plan y el pago se eligen al publicar. Solo se
	// ata si todavía no tiene empresa: si otra pestaña creó la tienda entre medio, esta se
	// deshace y gana la primera.
	const { data: linked, error: linkError } = await supabaseAdmin
		.from("onboarding_applications")
		.update({
			company_id: company.companyId,
			business_name: businessName,
			...(sector ? { sector } : {}),
			updated_at: (input.now ?? new Date()).toISOString(),
		})
		.eq("id", app.id)
		.is("company_id", null)
		.select("id")
		.maybeSingle();
	if (linkError || !linked) {
		console.error("start store: no se pudo atar la solicitud", { applicationId: app.id, error: linkError?.message ?? "sin fila" });
		await rollback(company.companyId);
		return linkError
			? { ok: false, status: 500, code: "error", error: STORE_DRAFT_CREATE_FAILED }
			: { ok: false, status: 409, code: "already_created", error: "Tu tienda ya está creada. Entra con tu correo y tu contraseña." };
	}

	return { ok: true, email, companyId: company.companyId, slug: company.slug };
}
