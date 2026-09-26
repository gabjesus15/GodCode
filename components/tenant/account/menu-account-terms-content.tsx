/**
 * Términos y Condiciones para Usuarios Finales (cuenta del menú).
 *
 * El texto legal va solo en español: es un contrato bajo ley chilena y una
 * traducción automática no tendría validez. Si cambia el texto, actualiza
 * `MENU_ACCOUNT_TERMS_UPDATED_AT`.
 */

export const MENU_ACCOUNT_TERMS_UPDATED_AT = "22 de septiembre de 2026";

const CONTACT_EMAIL = "godcode.administrativo@gmail.com";

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
				Estos Términos regulan el registro y uso de la cuenta de usuario final (&quot;Usuario&quot;, comensal) en la
				plataforma Gcode, distinta de los Términos y Condiciones que Gcode suscribe con los restaurantes afiliados
				como clientes del Servicio.
			</p>

			<section>
				<h2>1. Objeto y Aceptación de los Términos</h2>
				<p>
					Estos Términos y Condiciones (&quot;Términos&quot;) regulan el registro y uso de la cuenta de usuario final
					en la plataforma Gcode (&quot;la Plataforma&quot;, &quot;nosotros&quot;), operada como persona natural bajo
					el nombre Gcode, con sede en Santiago, Chile, y correo de contacto <ContactEmail />, por parte de personas
					naturales que se registran para explorar menús y hacer pedidos en restaurantes afiliados (&quot;el
					Usuario&quot;, &quot;tú&quot;).
				</p>
				<p>
					Al crear una cuenta o utilizar la Plataforma de cualquier forma, el Usuario declara haber leído, entendido
					y aceptado íntegramente estos Términos. Si el Usuario es menor de edad, solo puede usar la Plataforma con el
					consentimiento y bajo la supervisión de su padre, madre o tutor legal.
				</p>
			</section>

			<section>
				<h2>2. Descripción del Servicio</h2>
				<p>
					Gcode es una plataforma que permite al Usuario explorar los menús digitales de los restaurantes afiliados
					y realizar pedidos a través de una cuenta personal. Gcode no es un restaurante ni prepara ni entrega
					alimentos: actúa como intermediario tecnológico entre el Usuario y cada restaurante afiliado, conforme se
					detalla en la Sección 6.
				</p>
				<p>
					Gcode podrá agregar, modificar o discontinuar funcionalidades de la Plataforma en cualquier momento,
					procurando informar al Usuario con antelación razonable cuando el cambio afecte de forma relevante el uso
					que este hace de su cuenta.
				</p>
			</section>

			<section>
				<h2>3. Registro y Requisitos de la Cuenta</h2>
				<p>
					Para registrarse, el Usuario debe ser mayor de 18 años o contar con la autorización de su padre, madre o
					tutor, y proporcionar información veraz, completa y actualizada (nombre, correo electrónico, teléfono y
					demás datos que se soliciten).
				</p>
				<p>
					El Usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda actividad
					realizada desde su cuenta. Debe notificar a Gcode de inmediato ante cualquier uso no autorizado o sospecha
					de vulneración de seguridad, escribiendo a <ContactEmail />.
				</p>
				<p>
					Gcode podrá suspender o cancelar una cuenta cuya información de registro sea falsa, incompleta o utilizada
					para fines fraudulentos.
				</p>
			</section>

			<section>
				<h2>4. Funcionalidades de la Cuenta</h2>
				<p>La cuenta del Usuario permite:</p>
				<ul>
					<li>Guardar una o más direcciones de entrega o retiro.</li>
					<li>
						Registrar métodos de pago como referencia para agilizar futuros pedidos, aunque el cobro efectivo del
						pedido se realiza fuera de la Plataforma, directamente con el restaurante (Sección 6) — Gcode no procesa
						ni almacena datos completos de tarjetas u otros instrumentos de pago.
					</li>
					<li>Consultar el historial de pedidos realizados a través de la cuenta.</li>
					<li>Programa de puntos y fidelización: actualmente no disponible (ver Sección 5).</li>
				</ul>
				<p>El Usuario puede editar o eliminar esta información desde su panel de cuenta en cualquier momento.</p>
			</section>

			<section>
				<h2>5. Programa de Puntos y Fidelización</h2>
				<p>
					Actualmente Gcode no cuenta con un programa de puntos ni de fidelización activo. La cuenta permite
					consultar el historial de pedidos, pero no acumula puntos ni beneficios por ahora.
				</p>
				<p>
					Si en el futuro se implementa un programa de este tipo, estos Términos se actualizarán conforme a la
					Sección 12 para incluir sus reglas (acumulación, vigencia y condiciones de canje) antes de que entre en
					vigencia.
				</p>
			</section>

			<section>
				<h2>6. Pedidos y Relación con los Restaurantes Afiliados</h2>
				<p>
					Cuando el Usuario realiza un pedido a través de la Plataforma, el contrato de compraventa de alimentos se
					celebra directamente entre el Usuario y el restaurante afiliado correspondiente, no con Gcode. El pago del
					pedido se realiza fuera de la Plataforma, directamente con el restaurante (efectivo, tarjeta u otro medio
					que este disponga en el local).
				</p>
				<p>
					Gcode no interviene en la preparación, calidad, precio final, cumplimiento del pedido ni en el cobro del
					mismo, y no es responsable por errores, retrasos, incumplimientos o disputas de pago entre el Usuario y el
					restaurante. Cualquier reclamo sobre el pedido debe dirigirse directamente al restaurante correspondiente;
					Gcode podrá facilitar el contacto pero no actúa como parte ni garante de esa relación comercial.
				</p>
				<p>
					La disponibilidad, precios y condiciones publicadas por cada restaurante son de exclusiva responsabilidad
					de este último.
				</p>
			</section>

			<section>
				<h2>7. Protección de Datos Personales</h2>
				<p>
					<strong>Marco legal.</strong> El tratamiento de los datos personales del Usuario se rige por la Ley N°
					19.628 sobre Protección de la Vida Privada y, a partir del 1 de diciembre de 2026, por la Ley N° 21.719
					que moderniza la protección de datos personales en Chile.
				</p>
				<p>
					<strong>Rol de Gcode.</strong> Respecto de los datos que el Usuario entrega para registrarse y usar su
					cuenta (identificación, contacto, direcciones, historial de pedidos, puntos), Gcode actúa como responsable
					del tratamiento. Los usa para operar la cuenta, gestionar pedidos, el programa de puntos y comunicarse con
					el Usuario.
				</p>
				<p>
					<strong>Datos compartidos con restaurantes.</strong> Al realizar un pedido, Gcode comparte con el
					restaurante afiliado correspondiente los datos necesarios para gestionarlo (nombre, dirección de entrega o
					retiro, teléfono, detalle del pedido). Cada restaurante trata esos datos bajo su propia responsabilidad
					para cumplir el pedido.
				</p>
				<p>
					<strong>Seguridad y transferencias.</strong> Gcode implementa medidas de seguridad técnicas y
					organizativas razonables (cifrado, control de acceso) y notificará sin demora injustificada ante cualquier
					vulneración de seguridad que afecte estos datos.
				</p>
				<p>
					<strong>Derechos del Usuario.</strong> El Usuario puede ejercer sus derechos de acceso, rectificación,
					cancelación/supresión, oposición y portabilidad sobre sus datos, escribiendo a <ContactEmail />. Estos
					derechos son irrenunciables y no pueden limitarse contractualmente.
				</p>
			</section>

			<section>
				<h2>8. Obligaciones del Usuario</h2>
				<p>El Usuario se compromete a:</p>
				<ul>
					<li>Usar la Plataforma de acuerdo con la ley chilena y estos Términos.</li>
					<li>Proporcionar información veraz al registrarse y al realizar pedidos (dirección, contacto).</li>
					<li>No intentar vulnerar la seguridad de la Plataforma ni acceder a cuentas de otros usuarios.</li>
					<li>No usar la Plataforma para realizar pedidos fraudulentos o con datos falsos.</li>
					<li>
						Cumplir con las condiciones de pago y retiro/entrega acordadas directamente con cada restaurante.
					</li>
				</ul>
			</section>

			<section>
				<h2>9. Propiedad Intelectual</h2>
				<p>
					El software, diseño, marca y demás elementos de la Plataforma son de propiedad de Gcode (o de sus
					licenciantes) y están protegidos por la legislación de propiedad intelectual e industrial. Estos Términos
					no transfieren al Usuario ningún derecho sobre la Plataforma; solo se concede una licencia de uso personal,
					limitada, no exclusiva e intransferible, mientras la cuenta esté vigente.
				</p>
				<p>
					Los menús, marcas, precios e imágenes de cada restaurante son de propiedad de dicho restaurante; Gcode solo
					los aloja y muestra para prestar el Servicio.
				</p>
			</section>

			<section>
				<h2>10. Limitación de Responsabilidad</h2>
				<p>
					Gcode procurará mantener la Plataforma disponible de forma continua, pero no garantiza una disponibilidad
					del 100% ni la exactitud permanente de la información publicada por cada restaurante (menú, precios,
					disponibilidad).
				</p>
				<p>
					En la máxima medida permitida por la ley, Gcode no será responsable por: (i) el cumplimiento, calidad o
					precio final de los pedidos, que son responsabilidad exclusiva del restaurante (Sección 6); (ii) daños
					indirectos o lucro cesante derivados del uso o la imposibilidad de uso de la Plataforma; ni (iii) daños
					causados por terceros ajenos a Gcode, salvo en casos de dolo o culpa grave de su parte.
				</p>
			</section>

			<section>
				<h2>11. Suspensión y Terminación de la Cuenta</h2>
				<p>
					<strong>Por el Usuario.</strong> El Usuario puede eliminar su cuenta en cualquier momento desde su panel o
					escribiendo a <ContactEmail />.
				</p>
				<p>
					<strong>Por Gcode.</strong> Gcode podrá suspender o cancelar la cuenta del Usuario, con aviso previo
					cuando sea razonablemente posible, en caso de incumplimiento de estos Términos, uso fraudulento de la
					Plataforma, o por decisión de discontinuar el Servicio, avisando con al menos 30 días de anticipación en
					este último caso.
				</p>
				<p>
					Al eliminarse la cuenta, los puntos acumulados y el historial asociado se pierden, salvo que la ley
					disponga lo contrario.
				</p>
			</section>

			<section>
				<h2>12. Modificaciones de estos Términos</h2>
				<p>
					Gcode podrá modificar estos Términos para reflejar cambios en la Plataforma, la normativa aplicable u otras
					razones justificadas. Los cambios relevantes se notificarán al Usuario por correo electrónico o mediante
					aviso en la Plataforma, con al menos 15 días de anticipación a su entrada en vigencia. El uso continuado de
					la cuenta después de esa fecha implica la aceptación de los nuevos Términos; si el Usuario no está de
					acuerdo, puede eliminar su cuenta conforme a la Sección 11.
				</p>
			</section>

			<section>
				<h2>13. Ley Aplicable y Jurisdicción</h2>
				<p>
					Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia derivada de su
					interpretación o cumplimiento se someterá a los tribunales ordinarios de justicia de Santiago, Chile, sin
					perjuicio de los derechos que la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores
					reconozca al Usuario como consumidor final.
				</p>
			</section>

			<section>
				<h2>14. Contacto</h2>
				<p>
					Para consultas sobre estos Términos, la Plataforma o el ejercicio de derechos sobre datos personales, el
					Usuario puede escribir a <ContactEmail />.
				</p>
			</section>
		</div>
	);
}
