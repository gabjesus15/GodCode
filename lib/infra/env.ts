type EnvRule = {
	key: string;
	required: boolean;
	warnOnly?: boolean;
};

const ENV_RULES: EnvRule[] = [
	{ key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
	{ key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
	{ key: "SUPABASE_SERVICE_ROLE_KEY", required: true },
	{ key: "NEXT_PUBLIC_TENANT_BASE_DOMAIN", required: true },
	{ key: "STRIPE_SECRET_KEY", required: false, warnOnly: true },
	{ key: "RESEND_API_KEY", required: false, warnOnly: true },
	{ key: "RESEND_FROM", required: true },
];

let validated = false;

export function validateEnv(): void {
	if (validated) return;
	validated = true;

	const missing: string[] = [];
	const warnings: string[] = [];

	for (const rule of ENV_RULES) {
		const value = process.env[rule.key]?.trim();
		if (!value) {
			if (rule.required) {
				missing.push(rule.key);
			} else if (rule.warnOnly) {
				warnings.push(rule.key);
			}
		}
	}

	if (warnings.length > 0) {
		console.warn(
			`[env] Variables opcionales no definidas (funcionalidad reducida): ${warnings.join(", ")}`
		);
	}

	if (missing.length > 0) {
		const msg = `[env] Variables obligatorias faltantes: ${missing.join(", ")}`;
		const isBuild =
			process.env.NEXT_PHASE === "phase-production-build" || !!process.env.CI;
		if (process.env.NODE_ENV === "production" && !isBuild) {
			throw new Error(msg);
		}
		console.error(msg);
	}
}
