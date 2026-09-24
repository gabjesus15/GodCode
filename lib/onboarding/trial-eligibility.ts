import { createHash } from "crypto";

export function normalizeEmail(raw: string | null | undefined): string {
	return String(raw ?? "").trim().toLowerCase();
}

export function hashPaymentIdentity(identity: string): string {
	const salt = process.env.TRIAL_CARD_FINGERPRINT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "trial-fingerprint-salt";
	return createHash("sha256").update(`${salt}:${identity}`).digest("hex");
}
