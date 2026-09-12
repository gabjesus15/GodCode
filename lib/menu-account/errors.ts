import "server-only";

/**
 * Códigos de error del flujo de cuenta del cliente final. Viajan al navegador en
 * `{ error, code }` y el hook de UI los traduce; el texto de `message` es el
 * fallback si falta la traducción.
 */
export type MenuAccountErrorCode =
	| "company_not_found"
	| "invalid_document"
	| "blocked_document"
	| "invalid_branch"
	| "document_taken"
	| "already_registered"
	| "email_belongs_to_staff"
	| "email_unavailable"
	| "invalid_credentials"
	| "unauthorized"
	| "link_invalid"
	| "reset_required"
	| "weak_password"
	| "internal";

export class MenuAccountError extends Error {
	readonly status: number;
	readonly code: MenuAccountErrorCode;

	constructor(status: number, code: MenuAccountErrorCode, message: string) {
		super(message);
		this.name = "MenuAccountError";
		this.status = status;
		this.code = code;
	}
}

export const menuAccountErrors = {
	companyNotFound: () =>
		new MenuAccountError(404, "company_not_found", "Este negocio no está disponible."),
	invalidDocument: () =>
		new MenuAccountError(400, "invalid_document", "El número de documento no es válido."),
	blockedDocument: () =>
		new MenuAccountError(400, "blocked_document", "Ese número de documento no se puede usar."),
	invalidBranch: () =>
		new MenuAccountError(400, "invalid_branch", "La sucursal seleccionada no está disponible."),
	documentTaken: () =>
		new MenuAccountError(409, "document_taken", "Ya existe una cuenta con ese documento en este negocio."),
	alreadyRegistered: () =>
		new MenuAccountError(409, "already_registered", "Ya tienes una cuenta en este negocio. Entra con tu documento."),
	emailBelongsToStaff: () =>
		new MenuAccountError(409, "email_belongs_to_staff", "Ese correo pertenece a una cuenta del equipo. Usa otro."),
	emailUnavailable: () =>
		new MenuAccountError(409, "email_unavailable", "Ese correo no está disponible."),
	/** Mensaje deliberadamente idéntico exista o no la cuenta, para no filtrar documentos. */
	invalidCredentials: () =>
		new MenuAccountError(401, "invalid_credentials", "Documento o contraseña incorrectos."),
	unauthorized: () =>
		new MenuAccountError(401, "unauthorized", "Tu sesión expiró. Vuelve a entrar."),
	linkInvalid: () =>
		new MenuAccountError(400, "link_invalid", "Este enlace ya no es válido. Pide uno nuevo."),
	resetRequired: () =>
		new MenuAccountError(400, "reset_required", "Necesitas tu contraseña actual para cambiarla."),
	internal: (message = "No se pudo completar la operación. Intenta de nuevo.") =>
		new MenuAccountError(500, "internal", message),
} as const;
