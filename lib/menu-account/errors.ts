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
	| "link_password_mismatch"
	| "address_limit"
	| "invalid_zone"
	| "invalid_address"
	| "delivery_unavailable"
	| "unauthorized"
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
	/**
	 * El correo ya es de un cliente de otro negocio y la contraseña no es la de esa
	 * cuenta. Revela que el correo tiene cuenta, pero es inevitable: el registro tiene
	 * que decirle a la persona por qué no puede usar ese correo.
	 */
	linkPasswordMismatch: () =>
		new MenuAccountError(
			401,
			"link_password_mismatch",
			"Ese correo ya tiene una cuenta. Escribe la misma contraseña que usas en ella.",
		),
	addressLimit: () =>
		new MenuAccountError(409, "address_limit", "Llegaste al máximo de direcciones. Borra una para agregar otra."),
	invalidAddress: () =>
		new MenuAccountError(400, "invalid_address", "Escribe la dirección con calle y número."),
	invalidZone: () =>
		new MenuAccountError(400, "invalid_zone", "Elige una zona de entrega de la lista."),
	deliveryUnavailable: () =>
		new MenuAccountError(409, "delivery_unavailable", "Este negocio no hace delivery."),
	unauthorized: () =>
		new MenuAccountError(401, "unauthorized", "Tu sesión expiró. Vuelve a entrar."),
	internal: (message = "No se pudo completar la operación. Intenta de nuevo.") =>
		new MenuAccountError(500, "internal", message),
} as const;
