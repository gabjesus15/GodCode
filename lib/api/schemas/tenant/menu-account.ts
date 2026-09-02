import { z } from "zod";

import { sanitizeServerText } from "@/lib/infra/server-sanitize";

/**
 * `sanitizeServerText` escapa entidades HTML, así que solo se aplica a los campos
 * de texto libre que después se pintan (nombre). El correo, el documento y la
 * contraseña se dejan crudos: escaparlos los corrompería.
 */
const companySlug = z.string().trim().min(1).max(80);
const documentField = z.string().trim().min(3).max(32);
const emailField = z.string().trim().toLowerCase().email().max(160);
/** 72 bytes es el tope de bcrypt: más allá, Supabase trunca en silencio. */
const passwordField = z.string().min(8).max(72);
const fullNameField = z.string().trim().min(2).max(80).transform(sanitizeServerText);
const phoneField = z.string().trim().min(6).max(32);

export const menuAccountRegisterSchema = z.object({
	companySlug,
	document: documentField,
	email: emailField,
	password: passwordField,
	fullName: fullNameField,
	phone: phoneField,
	preferredBranchId: z.string().uuid().nullable().optional(),
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

export const menuAccountPasswordSchema = z.object({
	companySlug,
	currentPassword: z.string().min(1).max(72).optional(),
	newPassword: passwordField,
});

export const menuAccountRecoverSchema = z.object({
	companySlug,
	document: documentField,
});

export type MenuAccountRegisterInput = z.infer<typeof menuAccountRegisterSchema>;
export type MenuAccountLoginInput = z.infer<typeof menuAccountLoginSchema>;
export type MenuAccountProfileInput = z.infer<typeof menuAccountProfileSchema>;
export type MenuAccountPasswordInput = z.infer<typeof menuAccountPasswordSchema>;
export type MenuAccountRecoverInput = z.infer<typeof menuAccountRecoverSchema>;
