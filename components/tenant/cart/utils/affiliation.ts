import type { OrderChannelMode } from "@/lib/tenant/menu-settings";
import { shouldPersistOrderToPanel } from "@/lib/tenant/menu-settings";

const GUEST_CHOICE_KEY_PREFIX = "menu_affiliation_guest:";

/**
 * Si al tocar "Ir a pagar" se pregunta "¿Estás afiliado?".
 *
 * Solo a quien la API confirmó sin sesión (`isGuest`: mientras carga o si falla, no) y
 * en canales que guardan el pedido: uno solo por WhatsApp no suma puntos aunque entre a
 * su cuenta. Quien ya dijo "No" en esta visita no vuelve a verla.
 */
export function shouldAskAffiliation(params: {
	offerAccount: boolean;
	isGuest: boolean;
	companyId: string | null | undefined;
	orderChannel: OrderChannelMode;
	chosenGuestThisVisit: (companyId: string) => boolean;
}): boolean {
	const { offerAccount, isGuest, companyId, orderChannel, chosenGuestThisVisit } = params;
	if (!offerAccount || !isGuest || !companyId) return false;
	if (!shouldPersistOrderToPanel(orderChannel)) return false;
	return !chosenGuestThisVisit(companyId);
}

/** Ya dijo "No" en esta visita (pestaña): no se le vuelve a preguntar. */
export function hasChosenGuestThisVisit(companyId: string): boolean {
	try {
		return window.sessionStorage.getItem(`${GUEST_CHOICE_KEY_PREFIX}${companyId}`) === "1";
	} catch {
		return false;
	}
}

export function rememberGuestChoice(companyId: string): void {
	try {
		window.sessionStorage.setItem(`${GUEST_CHOICE_KEY_PREFIX}${companyId}`, "1");
	} catch {
		/* sin almacenamiento (modo privado estricto): se volverá a preguntar, nada más */
	}
}
