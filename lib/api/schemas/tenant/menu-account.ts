import { z } from "zod";

import { cleanPlainText } from "@/lib/infra/server-sanitize";
import { COMPANY_SLUG_PATTERN } from "@/lib/menu-account/slug";

/**
 * Los textos libres (nombre, dirección, referencia) pasan por `cleanPlainText`: se
 * guardan como texto plano, sin entidades HTML, porque React ya escapa al pintar.
 * El correo, el documento y la contraseña se validan pero no se tocan.
 */
const companySlug = z.string().trim().toLowerCase().regex(COMPANY_SLUG_PATTERN);
const documentField = z.string().trim().min(3).max(32);
const emailField = z.string().trim().toLowerCase().email().max(160);
/** 72 bytes es el tope de bcrypt: más allá, Supabase trunca en silencio. */
const passwordField = z.string().min(8).max(72);
const fullNameField = z.string().trim().min(2).max(80).transform(cleanPlainText);
const phoneField = z.string().trim().min(6).max(32);

export const menuAccountRegisterSchema = z.object({
	companySlug,
	document: documentField,
	email: emailField,
	password: passwordField,
	fullName: fullNameField,
	phone: phoneField,
	preferredBranchId: z.string().uuid().nullable().optional(),
	/** Casilla de términos y condiciones: sin ella no hay alta, aunque se salten el formulario. */
	acceptedTerms: z.literal(true),
});

export const menuAccountLoginSchema = z.object({
	companySlug,
	document: documentField,
	password: z.string().min(1).max(72),
});

export const menuAccountProfileSchema = z.object({
	companySlug,
	fullName: fullNameField.optional(),
	phone: phoneField.optional(),
	preferredBranchId: z.string().uuid().nullable().optional(),
});

/** Código de 6 dígitos que genera Supabase Auth; se aceptan espacios al pegarlo. */
const codeField = z
	.string()
	.transform((value) => value.replace(/\s+/g, ""))
	.pipe(z.string().regex(/^\d{6}$/));

export const menuAccountPasswordSchema = z.object({
	companySlug,
	code: codeField,
	newPassword: passwordField,
});

/** Pedir un código (confirmación o recuperación): solo identifica la cuenta. */
export const menuAccountDocumentSchema = z.object({
	companySlug,
	document: documentField,
});

export const menuAccountVerifySchema = z.object({
	companySlug,
	document: documentField,
	code: codeField,
});

export const menuAccountRecoverConfirmSchema = z.object({
	companySlug,
	document: documentField,
	code: codeField,
	newPassword: passwordField,
});

/** Query de las rutas GET, que solo necesitan identificar el negocio. */
export const menuAccountCompanyQuerySchema = z.object({ companySlug });

/** El carrito identifica el negocio por `company_id` de la sucursal, no por slug. */
export const menuAccountCheckoutProfileQuerySchema = z.object({ companyId: z.string().uuid() });

/** Mismo criterio que el perfil de checkout: el carrito solo conoce el `company_id`. */
export const menuAccountLastOrderQuerySchema = menuAccountCheckoutProfileQuerySchema;

/**
 * Cuál de los dos campos es obligatorio depende del negocio (zona o dirección), y eso
 * lo decide el servidor con la configuración de delivery, no el schema.
 */
export const menuAccountAddressCreateSchema = z.object({
	companySlug,
	addressLine: z.string().trim().max(160).default("").transform(cleanPlainText),
	namedAreaId: z.string().trim().min(1).max(64).nullable().optional(),
	reference: z.string().trim().max(160).default("").transform(cleanPlainText),
});

export const menuAccountAddressDeleteSchema = z.object({
	companySlug,
	id: z.string().uuid(),
});
