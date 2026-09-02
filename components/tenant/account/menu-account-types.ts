/** Vistas del panel de acceso cuando no hay sesión. */
export type MenuAccountView = "login" | "register" | "recover" | "recover-sent" | "link-sent";

export type MenuAccountBranchOption = {
	id: string;
	name: string;
};

/** Forma pública de la cuenta que devuelven las rutas de `/api/menu-account/*`. */
export type MenuAccountPublic = {
	id: string;
	fullName: string;
	email: string;
	documentMasked: string;
	documentCountry: string | null;
	phone: string;
	preferredBranchId: string | null;
};
