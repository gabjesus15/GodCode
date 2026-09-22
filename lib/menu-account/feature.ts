/**
 * Interruptor de la cuenta de cliente del menú ("Mi cuenta").
 *
 * Apagado: no se muestran los accesos en el storefront, `/mi-cuenta` responde 404
 * y las rutas de `app/api/menu-account/*` también (`menuAccountDisabledResponse`).
 *
 * Apagado por defecto **a propósito**: encenderlo exige poner la variable a mano,
 * así que un despliegue sin configurar nunca la publica por accidente. No depende de
 * ningún correo: no hay confirmación, recuperación ni enlaces mágicos.
 *
 * El prefijo `NEXT_PUBLIC_` es necesario porque los accesos de la UI (header del
 * menú, carrito y el precargado del checkout) son componentes de cliente.
 */
export const MENU_ACCOUNT_ENABLED = /^(1|true|on)$/i.test(
	(process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED ?? "").trim(),
);
