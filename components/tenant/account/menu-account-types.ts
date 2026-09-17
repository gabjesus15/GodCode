/** Vistas del panel de acceso cuando no hay sesión. */
export type MenuAccountView = "login" | "register";

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

/** Pedido del historial de la cuenta (`GET /api/menu-account/orders`). */
export type MenuAccountOrder = {
	id: string;
	/** Número visible para el cliente: secuencia del turno o, si no hay, el id. */
	number: string;
	createdAt: string;
	status: string;
	paymentStatus: string | null;
	fulfillment: "delivery" | "pickup";
	total: number;
	currency: string;
	items: MenuAccountOrderItem[];
	/** Desglose y datos de entrega/pago para la vista de detalle. */
	subtotal: number;
	discountTotal: number;
	deliveryFee: number;
	paymentMethod: string | null;
	/** Código que la persona muestra al recibir un delivery. */
	handoffCode: string | null;
	/** Sucursal del pedido: "Repetir pedido" abre el menú en esta misma sucursal. */
	branchId: string | null;
	branch: { name: string; address: string | null; phone: string | null } | null;
	delivery: { address: string; reference: string } | null;
	/** Notas escritas por la persona, sin las etiquetas internas que agrega el sistema. */
	note: string | null;
};

export type MenuAccountOrderItem = {
	/** Id del producto en el catálogo; null en líneas manuales que no se pueden repetir. */
	productId: string | null;
	name: string;
	quantity: number;
	/** Precio unitario ya con descuento de producto, sin extras. */
	unitPrice: number;
	extras: Array<{ id: string | null; name: string; quantity: number; price: number }>;
	note: string | null;
	/** (unitario + extras) × cantidad. */
	lineTotal: number;
};

/** Dirección guardada (`client_addresses`), escrita por el RPC al pedir con delivery. */
export type MenuAccountAddress = {
	id: string;
	addressLine: string;
	reference: string;
	namedAreaId: string | null;
	lastUsedAt: string | null;
};

/** Datos para rellenar el checkout (`GET /api/menu-account/checkout-profile`). */
export type MenuAccountCheckoutProfile = {
	clientId: string;
	fullName: string;
	phone: string;
	document: string;
	addresses: MenuAccountAddress[];
};
