/**
 * Interruptor de la cuenta de cliente del menú ("Mi cuenta").
 *
 * La funcionalidad está construida pero **no terminada**, así que se despliega
 * apagada: no se muestran los accesos en el storefront y la ruta `/mi-cuenta`
 * responde 404. El código viaja a producción sin quedar expuesto.
 *
 * Apagado por defecto **a propósito**: encenderlo exige poner la variable a
 * mano, así que un despliegue sin configurar nunca publica la feature a medias.
 *
 * Para trabajar en local: `NEXT_PUBLIC_MENU_ACCOUNT_ENABLED=1` en `.env.local`.
 *
 * El prefijo `NEXT_PUBLIC_` es necesario porque los dos accesos de la UI
 * (el del header del menú y el del carrito) son componentes de cliente.
 *
 * Ojo: esto cubre la superficie visible, no las rutas de `app/api/menu-account/*`,
 * que siguen respondiendo si se las llama directamente.
 */
export const MENU_ACCOUNT_ENABLED = /^(1|true|on)$/i.test(
	(process.env.NEXT_PUBLIC_MENU_ACCOUNT_ENABLED ?? "").trim(),
);
