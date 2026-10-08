/**
 * Términos de la cuenta de cliente en los menús (usuarios finales).
 *
 * El texto legal va solo en español: una traducción automática no tendría validez.
 * Fuente: `legal/5-terminos-comensales.md` en los archivos del proyecto. Si cambia
 * el texto, sube `LEGAL_DOCUMENTS_VERSION` y la fecha en `lib/legal/legal-documents.ts`.
 */
import type { ReactNode } from "react";

import { ProviderIdentity } from "@/components/legal/legal-page";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { LEGAL_UPDATED_AT_LABEL } from "@/lib/legal/legal-documents";
import { getAppUrl } from "@/lib/tenant/app-url";

export const MENU_ACCOUNT_TERMS_UPDATED_AT = LEGAL_UPDATED_AT_LABEL;

/** Mismo correo que los Términos y la Política de privacidad del sitio (NEXT_PUBLIC_SUPPORT_EMAIL). */
const CONTACT_EMAIL = LANDING_SUPPORT_EMAIL;

/** Las páginas legales viven en el dominio de Gcode, no en el del negocio: se abren aparte. */
function AppLink({ path, children }: { path: string; children: ReactNode }) {
	return (
		<a href={`${getAppUrl()}${path}`} target="_blank" rel="noopener noreferrer" className="account-terms-link">
			{children}
		</a>
	);
}

function ContactEmail() {
	return (
		<a href={`mailto:${CONTACT_EMAIL}`} className="account-terms-link">
			{CONTACT_EMAIL}
		</a>
	);
}

/** Cuerpo de los términos; lo comparten la página `/mi-cuenta/terminos` y el modal. */
export function MenuAccountTermsContent() {
	return (
		<div className="account-terms" lang="es">
			<p>
				Estos Términos regulan la cuenta que puedes crear en el menú digital de un negocio que usa Gcode (&quot;el
				Negocio&quot;) para guardar tus datos, tus direcciones y tu historial de pedidos (&quot;la Cuenta&quot;).
				Son distintos de los Términos que Gcode firma con los negocios.
			</p>
			<section>
				<h2>1. Quiénes participan</h2>
				<ul>
					<li>
						<strong>El Negocio</strong> es quien vende y entrega la comida, fija sus precios y te cobra. Tu compra es
						con el Negocio.
					</li>
					<li>
						<strong>Gcode</strong> es la plataforma tecnológica que el Negocio usa para su menú y sus pedidos. Gcode
						es operado por una persona natural bajo el nombre comercial Gcode, con sede en Santiago,
						Chile<ProviderIdentity />, y correo <ContactEmail />.
					</li>
				</ul>
				<p>
					Al crear la Cuenta aceptas estos Términos y declaras haber leído la{" "}
					<AppLink path="/onboarding/privacidad">Política de privacidad</AppLink>.
				</p>
			</section>
			<section>
				<h2>2. Requisitos</h2>
				<p>
					Para crear una Cuenta debes ser mayor de 18 años o contar con la autorización de tu padre, madre o tutor,
					y entregar datos verdaderos. La Cuenta es personal: cuida tu contraseña y avísanos a <ContactEmail /> si
					sospechas un acceso no autorizado.
				</p>
				<p>
					Cada Cuenta pertenece al menú del Negocio donde la creaste. Si pides en otro negocio que usa Gcode,
					necesitas otra cuenta en ese menú.
				</p>
			</section>
			<section>
				<h2>3. Qué puedes hacer con la Cuenta</h2>
				<ul>
					<li>
						Guardar tus datos de contacto y una o más direcciones.
					</li>
					<li>
						Ver tu historial de pedidos y repetir uno anterior.
					</li>
					<li>
						Elegir cómo pagarás cada pedido y, si el Negocio lo pide, adjuntar el comprobante.
					</li>
					<li>
						Eliminar la Cuenta cuando quieras (sección 7).
					</li>
				</ul>
				<p>
					Por ahora la Cuenta no tiene programa de puntos. Si se agrega uno, estos Términos se actualizarán antes
					con sus reglas.
				</p>
			</section>
			<section>
				<h2>4. Pedidos, precios y pagos</h2>
				<ul>
					<li>
						El contrato de compra de cada pedido es entre tú y el Negocio. El Negocio es responsable de los precios,
						la calidad, la preparación, la entrega, los cambios y las devoluciones, y de emitirte la boleta o factura
						que corresponda.
					</li>
					<li>
						El precio final, el costo de envío y los medios de pago son los que el Negocio muestra antes de que
						confirmes. Gcode no cobra comisiones ni procesa los pagos de los pedidos: pagas directamente al Negocio.
					</li>
					<li>
						Los pagos por medios externos (transferencia, Pago Móvil, Zelle, Binance Pay u otros que acepte el
						Negocio) los haces desde tu propia cuenta en ese servicio y se rigen por sus condiciones. Gcode no recibe
						tu dinero.
					</li>
					<li>
						<strong>Si el Negocio cobra en bolívares (Venezuela),</strong> el monto en bolívares se calcula con la
						tasa que el Negocio indica en su menú al momento del pedido. Tienes derecho a conocer la tasa usada antes
						de pagar.
					</li>
					<li>
						Los reclamos sobre un pedido se dirigen al Negocio. Gcode puede ayudarte a contactarlo, pero no es parte
						de la compra.
					</li>
				</ul>
			</section>
			<section>
				<h2>5. Tus datos</h2>
				<p>
					El Negocio es el responsable de los datos que entregas en su menú (nombre, correo, teléfono, documento de
					identidad, direcciones e historial) y los usa para reconocerte como cliente y gestionar tus pedidos. Gcode
					los guarda y procesa por cuenta del Negocio, con medidas de seguridad, y los usa además solo para la
					seguridad de la plataforma y la prevención de fraude. El detalle, los proveedores que intervienen y tus
					derechos están en la <AppLink path="/onboarding/privacidad">Política de privacidad</AppLink>.
				</p>
				<p>
					Puedes pedir acceso, rectificación, supresión, oposición, portabilidad y bloqueo de tus datos al Negocio o
					escribiendo a <ContactEmail />. Estos derechos son gratuitos e irrenunciables.
				</p>
			</section>
			<section>
				<h2>6. Uso correcto</h2>
				<p>
					Te comprometes a usar la Cuenta de buena fe: sin hacer pedidos falsos, sin usar datos de otras personas y
					sin intentar vulnerar la seguridad de la plataforma o acceder a cuentas ajenas.
				</p>
			</section>
			<section>
				<h2>7. Eliminar la Cuenta</h2>
				<p>
					Puedes eliminar tu Cuenta en cualquier momento desde Mi cuenta, en Ajustes, confirmando con un código que
					te enviamos al correo. Al eliminarla borramos tus datos, tus direcciones guardadas y tu acceso en este
					Negocio; tus cuentas en otros negocios que usan Gcode no cambian. También puedes pedirlo escribiendo a{" "}
					<ContactEmail /> desde el correo de la Cuenta, o al Negocio, y la eliminaremos dentro de 30 días corridos.
				</p>
				<p>
					Los pedidos ya hechos se conservan en los registros del Negocio, y en Gcode solo por el plazo que exija la
					ley.
				</p>
				<p>
					Gcode o el Negocio pueden suspender una Cuenta usada para fraude o en incumplimiento de estos Términos. Si
					el Negocio deja de usar Gcode, te avisaremos antes de cerrar la Cuenta.
				</p>
			</section>
			<section>
				<h2>8. Responsabilidad</h2>
				<p>
					Gcode procura que la plataforma funcione siempre, pero puede haber interrupciones. Gcode responde por los
					daños que cause por su culpa en el funcionamiento de la plataforma; no responde por el cumplimiento de los
					pedidos, que es del Negocio. Nada en estos Términos limita tus derechos como consumidor.
				</p>
			</section>
			<section>
				<h2>9. Cambios</h2>
				<p>
					Si cambiamos estos Términos de forma relevante, te avisaremos por correo o en el menú con al menos 15 días
					de anticipación. Si no estás de acuerdo, puedes eliminar la Cuenta.
				</p>
			</section>
			<section>
				<h2>10. Ley aplicable</h2>
				<p>
					La Cuenta se rige por las leyes de Chile. Tus compras se rigen por la ley del país del Negocio. En todo
					caso conservas los derechos que te reconozcan las leyes de protección al consumidor de tu país (en Chile,
					la Ley N° 19.496 y el SERNAC; en Venezuela, la Ley Orgánica de Precios Justos y la SUNDDE) y puedes
					reclamar ante los tribunales de tu domicilio.
				</p>
			</section>
			<section>
				<h2>11. Contacto</h2>
				<p>
					Escribe a <ContactEmail />.
				</p>
			</section>
		</div>
	);
}
