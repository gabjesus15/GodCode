import {
	LABS_QUOTE_BUDGETS,
	LABS_QUOTE_PROJECT_TYPES,
	type LabsQuoteBudget,
	type LabsQuoteProjectType,
} from "./content";

/**
 * Validación de la solicitud de cotización del formulario de Gcode Labs.
 * Pura (sin red ni base de datos) para poder probarla sola.
 */

export type LabsQuoteRequest = {
	name: string;
	company: string;
	email: string;
	phone: string | null;
	projectType: LabsQuoteProjectType;
	budget: LabsQuoteBudget;
	message: string;
};

export type ParseQuoteResult =
	| { ok: true; value: LabsQuoteRequest }
	| { ok: false; error: string; field?: keyof LabsQuoteRequest };

export const LABS_QUOTE_LIMITS = {
	name: 80,
	company: 120,
	email: 160,
	phone: 32,
	message: 2000,
	messageMin: 20,
} as const;

const PROJECT_TYPES = new Set<string>(LABS_QUOTE_PROJECT_TYPES.map((t) => t.value));
const BUDGETS = new Set<string>(LABS_QUOTE_BUDGETS.map((b) => b.value));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown, max: number): string {
	return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function parseQuoteRequest(input: unknown): ParseQuoteResult {
	if (!input || typeof input !== "object") return { ok: false, error: "Solicitud vacía." };
	const body = input as Record<string, unknown>;

	// Campo trampa para bots: los humanos no lo ven ni lo rellenan.
	if (str(body.website, 200)) return { ok: false, error: "Solicitud no válida." };

	const name = str(body.name, LABS_QUOTE_LIMITS.name);
	if (name.length < 2) return { ok: false, error: "Escribe tu nombre.", field: "name" };

	const company = str(body.company, LABS_QUOTE_LIMITS.company);
	if (company.length < 2) return { ok: false, error: "Escribe el nombre de tu empresa.", field: "company" };

	const email = str(body.email, LABS_QUOTE_LIMITS.email).toLowerCase();
	if (!EMAIL_RE.test(email)) return { ok: false, error: "Revisa el correo.", field: "email" };

	const phoneRaw = str(body.phone, LABS_QUOTE_LIMITS.phone);
	const phone = phoneRaw ? phoneRaw : null;
	if (phone && !/^[+\d][\d\s().-]{6,}$/.test(phone)) {
		return { ok: false, error: "Revisa el WhatsApp.", field: "phone" };
	}

	const projectType = str(body.projectType, 40);
	if (!PROJECT_TYPES.has(projectType)) return { ok: false, error: "Elige el tipo de proyecto.", field: "projectType" };

	const budget = str(body.budget, 40);
	if (!BUDGETS.has(budget)) return { ok: false, error: "Elige un rango de presupuesto.", field: "budget" };

	const message = typeof body.message === "string" ? body.message.trim().slice(0, LABS_QUOTE_LIMITS.message) : "";
	if (message.length < LABS_QUOTE_LIMITS.messageMin) {
		return { ok: false, error: "Cuéntanos un poco más del proyecto (al menos unas líneas).", field: "message" };
	}

	return {
		ok: true,
		value: {
			name,
			company,
			email,
			phone,
			projectType: projectType as LabsQuoteProjectType,
			budget: budget as LabsQuoteBudget,
			message,
		},
	};
}

export function labelForProjectType(value: LabsQuoteProjectType): string {
	return LABS_QUOTE_PROJECT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function labelForBudget(value: LabsQuoteBudget): string {
	return LABS_QUOTE_BUDGETS.find((b) => b.value === value)?.label ?? "Sin indicar";
}
