import { createHash } from "crypto";

export function normalizeEmail(raw: string | null | undefined): string {
	return String(raw ?? "").trim().toLowerCase();
}

export function hashCardFingerprint(fingerprint: string): string {
	const salt = process.env.TRIAL_CARD_FINGERPRINT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "trial-fingerprint-salt";
	return createHash("sha256").update(`${salt}:${fingerprint}`).digest("hex");
}

export function hashPaymentIdentity(identity: string): string {
	const salt = process.env.TRIAL_CARD_FINGERPRINT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "trial-fingerprint-salt";
	return createHash("sha256").update(`${salt}:${identity}`).digest("hex");
}

export async function getStripeCardFingerprintFromCheckoutSession(
	checkoutSessionId: string,
	stripeSecret: string,
): Promise<string | null> {
	if (!checkoutSessionId || !stripeSecret) return null;
	if (checkoutSessionId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(checkoutSessionId)) {
		return null;
	}

	const sessionUrl = new URL(`https://api.stripe.com/v1/checkout/sessions/${checkoutSessionId}`);
	sessionUrl.searchParams.append("expand[]", "payment_intent.payment_method");

	const sessionRes = await fetch(sessionUrl.toString(), {
		headers: { Authorization: `Bearer ${stripeSecret}` },
	});

	if (!sessionRes.ok) return null;

	const session = (await sessionRes.json()) as {
		payment_intent?: {
			payment_method?: {
				type?: string;
				card?: { fingerprint?: string | null };
			};
		};
	};

	const method = session.payment_intent?.payment_method;
	if (!method || method.type !== "card") return null;
	const fingerprint = method.card?.fingerprint;
	if (!fingerprint || typeof fingerprint !== "string") return null;

	return fingerprint;
}
