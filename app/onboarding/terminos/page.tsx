import type { Metadata } from "next";

import {
	LegalLink,
	LegalPage,
	Lead,
	ProviderIdentity,
	SupportEmail,
} from "@/components/legal/legal-page";
import { getAppUrl } from "@/lib/tenant/app-url";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";

export const metadata: Metadata = {
	title: "Términos y Condiciones",
	description: `Términos y Condiciones de ${LANDING_PRODUCT_NAME}, la plataforma de ${LANDING_COMPANY_NAME}.`,
	alternates: {
		canonical: `${getAppUrl()}/onboarding/terminos`,
	},
	robots: {
		index: false,
		follow: true,
	},
};

export default function TerminosPage() {
	return (
		<LegalPage title="Términos y Condiciones">
			<p>
				Estos Términos y Condiciones (&quot;Términos&quot;) regulan la contratación y el uso de Gcode, la
				plataforma de menú digital, pedidos en línea y punto de venta ofrecida como software como servicio
				(&quot;el Servicio&quot;) a restaurantes y otros negocios (&quot;el Cliente&quot;, &quot;tú&quot;). Léelos
				antes de contratar: al marcar la casilla de aceptación en el registro, contratar un plan o usar el
				Servicio, aceptas estos Términos y la <LegalLink href="/onboarding/privacidad">Política de
				privacidad</LegalLink>, que forma parte de ellos.
			</p>
			<section>
				<h2 className="font-semibold text-slate-800">1. Quién presta el Servicio</h2>
				<p className="mt-2">
					Gcode es operado por una persona natural bajo el nombre comercial Gcode (también &quot;Gcode Labs&quot; o
					&quot;Gcode POS&quot;), con sede en Santiago, Chile<ProviderIdentity />, y correo de contacto{" "}
					<SupportEmail /> (&quot;Gcode&quot;, &quot;nosotros&quot;).
				</p>
				<p className="mt-2">
					Si contratas en nombre de una empresa, declaras tener facultades para obligarla.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">2. Cómo se celebra el contrato</h2>
				<p className="mt-2">
					El contrato se celebra por medios electrónicos y tiene la misma validez que uno firmado en papel. Antes de
					contratar puedes leer, descargar o imprimir estos Términos. Después de tu primer pago te enviaremos por
					correo una confirmación con el plan, el precio, el período y la fecha de renovación, junto con el enlace a
					la versión de los Términos que aceptaste.
				</p>
				<p className="mt-2">
					Guardamos la versión aceptada, la fecha, la dirección IP y el navegador desde el que aceptaste, como
					respaldo del contrato. El idioma del contrato es el español; las traducciones de la plataforma son solo de
					referencia.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">3. Qué incluye el Servicio</h2>
				<p className="mt-2">
					Gcode permite al Cliente publicar su menú digital y su página de inicio, recibir pedidos en línea, operar
					la caja y administrar productos, sucursales, clientes y reportes, según el plan contratado. El detalle de
					cada plan está en la <LegalLink href="/#precios">página de precios</LegalLink>.
				</p>
				<p className="mt-2">
					Gcode es una herramienta tecnológica: no vende comida, no fija los precios del Cliente, no cobra a sus
					comensales por cuenta del Cliente salvo que se indique expresamente, y no es parte de las ventas entre el
					Cliente y sus comensales.
				</p>
				<p className="mt-2">
					Podemos agregar, modificar o retirar funciones. Si un cambio reduce de forma relevante lo que incluye tu
					plan, te avisaremos con al menos 15 días de anticipación y podrás terminar el contrato con reembolso de la
					parte no usada del período pagado.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">4. Tu cuenta</h2>
				<p className="mt-2">
					Debes entregar información veraz y mantenerla al día. Eres responsable de guardar tus contraseñas, de las
					cuentas que crees para tu equipo y de lo que se haga desde ellas. Si sospechas un acceso no autorizado,
					escríbenos de inmediato a <SupportEmail />.
				</p>
				<p className="mt-2">
					Podemos suspender una cuenta registrada con datos falsos o usada para fraude, conforme a la sección 13.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">5. Planes, precios y pagos</h2>
				<p className="mt-2">
					<Lead>Vista previa gratis.</Lead> Al registrarte, tu tienda se crea en vista previa: puedes armarla y
					probarla con su link sin pagar, pero solo tú la ves; el resto ve un aviso de que abrirá pronto. Se publica
					cuando contratas un plan y se confirma el pago. Si pasan 30 días desde que la creaste sin publicarla,
					podemos eliminarla junto con su contenido y tu acceso, y su link queda libre para otro negocio. Antes te
					avisaremos por correo con al menos 7 días de anticipación, y no la eliminamos mientras estemos validando
					un pago tuyo.
				</p>
				<p className="mt-2">
					<Lead>Precios.</Lead> Los precios de cada plan se muestran antes de contratar, en la moneda que
					corresponde a tu país (por ejemplo, pesos chilenos o dólares estadounidenses), e indican si incluyen
					impuestos. Si pagas en otra moneda, el tipo de cambio es el que aplica tu banco o la pasarela de pago.
				</p>
				<p className="mt-2">
					<Lead>Clientes en Venezuela.</Lead> Los planes se expresan en dólares estadounidenses. Si pagas en
					bolívares (por ejemplo, por Pago Móvil o transferencia), el monto se calcula con la tasa oficial del Banco
					Central de Venezuela del día del pago. Los impuestos o cargos que tu banco o la ley venezolana apliquen a
					tu pago, como el IGTF cuando corresponda, son de tu cargo.
				</p>
				<p className="mt-2">
					<Lead>Medios de pago.</Lead> Puedes pagar con PayPal (tarjeta o saldo) o con los medios con comprobante
					que muestre la plataforma (transferencia, Pago Móvil, Zelle u otros). Con comprobante, el plan se activa o
					renueva cuando validamos el pago, normalmente dentro de un día hábil. Si el comprobante es ilegible,
					incompleto o por otro monto, te lo devolveremos para que lo corrijas.
				</p>
				<p className="mt-2">
					<Lead>Promociones y cupones.</Lead> Las promociones (por ejemplo, meses gratis en el primer pago) y los
					cupones tienen las condiciones que se muestran al usarlos: vigencia, planes a los que aplican y si se
					pueden combinar. No son canjeables por dinero.
				</p>
				<p className="mt-2">
					<Lead>Pago por período y renovación.</Lead> Cada período (mensual o por varios meses) se paga por
					adelantado. Gcode no guarda tu tarjeta ni hace cargos automáticos: antes del vencimiento te recordamos por
					correo que renueves (7, 3 y 1 día antes). Si no renuevas, tu menú público y los pedidos en línea se pausan
					hasta que pagues; tu información queda guardada conforme a la sección 13.
				</p>
				<p className="mt-2">
					<Lead>Cambios de plan.</Lead> Puedes subir o bajar de plan cuando quieras. La plataforma te muestra antes
					de confirmar si la diferencia se prorratea o se aplica desde el siguiente período.
				</p>
				<p className="mt-2">
					<Lead>Impuestos y comprobantes.</Lead> Gcode emite el documento tributario que corresponde por cada pago
					de suscripción.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">6. Retracto, cancelación y reembolsos</h2>
				<p className="mt-2">
					<Lead>Derecho a retracto.</Lead> Si contratas un plan por primera vez, puedes arrepentirte dentro de los
					10 días corridos siguientes a tu primer pago, escribiendo a <SupportEmail />. Te devolveremos el total
					pagado por ese primer período, por el mismo medio de pago cuando sea posible, dentro de 10 días hábiles.
					El retracto no aplica a las renovaciones ni a los cambios de plan posteriores.
				</p>
				<p className="mt-2">
					<Lead>Cancelación.</Lead> Puedes cancelar la suscripción en cualquier momento desde tu panel
					(&quot;Cancelar suscripción&quot;), sin llamar ni justificar el motivo. Tu tienda sigue en línea hasta el
					fin del período ya pagado y después se pausa; dejamos de enviarte recordatorios de renovación. Puedes
					reactivarla mientras tus datos sigan guardados.
				</p>
				<p className="mt-2">
					<Lead>Reembolsos.</Lead> Fuera del retracto, lo pagado por un período ya iniciado no se reembolsa, salvo:
					(i) cuando el Servicio no estuvo disponible por causas atribuibles a Gcode por más de 72 horas seguidas
					dentro del período, caso en que reembolsamos o abonamos la parte proporcional; (ii) cuando reducimos lo
					que incluye tu plan y decides terminar (sección 3); (iii) cobros duplicados o por error, que siempre se
					devuelven; y (iv) los demás casos que la ley disponga.
				</p>
				<p className="mt-2">
					Estas reglas no limitan los derechos que la ley te reconozca como consumidor o como micro o pequeña
					empresa.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">7. Uso aceptable</h2>
				<p className="mt-2">
					No puedes usar el Servicio para:
				</p>
				<ul className="ml-5 mt-1 list-disc space-y-1">
					<li>
						Publicar contenido ilegal, engañoso, difamatorio, que infrinja derechos de terceros o que promueva la
						venta de productos prohibidos.
					</li>
					<li>
						Vender alcohol, tabaco u otros productos restringidos sin cumplir las restricciones de edad y las
						licencias que exija la ley.
					</li>
					<li>
						Enviar comunicaciones masivas no solicitadas a los comensales.
					</li>
					<li>
						Intentar vulnerar la seguridad de la plataforma, acceder a datos de otros negocios, hacer ingeniería
						inversa del software o sobrecargar el Servicio de forma deliberada.
					</li>
					<li>
						Revender o sublicenciar el Servicio sin autorización escrita.
					</li>
				</ul>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">8. Lo que es responsabilidad del Cliente</h2>
				<p className="mt-2">
					El Cliente es el único responsable de:
				</p>
				<ul className="ml-5 mt-1 list-disc space-y-1">
					<li>
						Su menú y su información: precios, descripciones, fotos, ingredientes, alérgenos, disponibilidad,
						horarios y zonas de reparto. Si carga el menú con la lectura automática de su carta, debe revisarlo antes
						de publicarlo, porque puede tener errores de lectura.
					</li>
					<li>
						Cumplir la normativa sanitaria, comercial, laboral y tributaria de su negocio, incluidas las licencias
						municipales y sanitarias.
					</li>
					<li>
						<Lead>Emitir los documentos tributarios de sus ventas</Lead> (boleta o factura electrónica ante el SII en
						Chile; factura de máquina fiscal o imprenta digital ante el SENIAT en Venezuela). Los tickets y
						comprobantes que genera Gcode son comprobantes internos y no reemplazan esos documentos.
					</li>
					<li>
						<Lead>Precios en bolívares (Venezuela).</Lead> Si el Cliente cobra en bolívares, la tasa de cambio que
						elige en el panel y los montos que muestra a sus comensales son decisión y responsabilidad suya. La
						normativa venezolana exige usar y exhibir la tasa oficial del BCV, que es la que ofrece Gcode.
					</li>
					<li>
						<Lead>Medios de pago.</Lead> Los pagos que el Cliente recibe por transferencia, Pago Móvil, Zelle,
						Binance Pay u otros medios llegan directo a sus propias cuentas: Gcode no los procesa ni los custodia. Si
						acepta pagos en divisas o criptoactivos, debe cumplir las obligaciones tributarias que correspondan (por
						ejemplo, el IGTF en Venezuela).
					</li>
					<li>
						Atender a sus comensales: pedidos, entregas, cobros, reclamos, garantías y devoluciones. Gcode puede
						ayudar a contactar al Cliente, pero no es parte ni garante de esas ventas.
					</li>
					<li>
						Los datos de sus comensales y de su equipo: informarles cómo se usan, contar con base legal para
						tratarlos (por ejemplo, el consentimiento para enviarles promociones) y atender sus solicitudes, conforme
						a la sección 11.
					</li>
				</ul>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">9. Propiedad intelectual y contenido</h2>
				<p className="mt-2">
					El software, el diseño, la marca Gcode y los demás elementos de la plataforma son de Gcode o de sus
					licenciantes. Te damos una licencia de uso limitada, no exclusiva e intransferible mientras tu cuenta esté
					vigente.
				</p>
				<p className="mt-2">
					Tu menú, tu logo, tus fotos, tus datos y los de tus comensales son tuyos. Nos das una licencia limitada
					para alojarlos, procesarlos y mostrarlos con el único fin de prestar el Servicio. Mientras tu tienda esté
					publicada, podemos mostrar tu nombre y tu enlace en el listado público de negocios que usan Gcode; puedes
					pedir que lo retiremos.
				</p>
				<p className="mt-2">
					Declaras tener derecho a usar el contenido que subes. Si recibimos un reclamo fundado de infracción,
					podemos retirar ese contenido y te avisaremos.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">10. Disponibilidad y soporte</h2>
				<p className="mt-2">
					Trabajamos para que el Servicio esté disponible siempre, pero no podemos garantizar el 100 %. Puede haber
					mantenciones programadas, que avisaremos con anticipación cuando sea posible, e interrupciones por fallas
					de proveedores, de internet o por fuerza mayor.
				</p>
				<p className="mt-2">
					El soporte se presta por correo a <SupportEmail /> y por los canales que indique la plataforma, en días
					hábiles. Respaldamos la base de datos de forma periódica, pero te recomendamos exportar tus datos
					importantes.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">11. Datos personales</h2>
				<p className="mt-2">
					<Lead>Tus datos como Cliente.</Lead> Gcode es responsable de los datos que nos entregas para tu cuenta y
					tu facturación, y los trata como explica la <LegalLink href="/onboarding/privacidad">Política de
					privacidad</LegalLink>.
				</p>
				<p className="mt-2">
					<Lead>Datos de tus comensales y tu equipo.</Lead> Respecto de los datos de los comensales que piden en tu
					menú o crean una cuenta en él, y de los usuarios de tu equipo, el Cliente es el responsable y Gcode actúa
					como encargado del tratamiento. Al aceptar estos Términos, aceptas también el{" "}
					<LegalLink href="/onboarding/terminos#anexo-datos">Anexo de encargo de tratamiento de datos</LegalLink>,
					que regula cómo los tratamos por tu cuenta: solo según tus instrucciones y para prestar el Servicio, con
					medidas de seguridad, con aviso ante vulneraciones y con su devolución o eliminación al terminar.
				</p>
				<p className="mt-2">
					<Lead>Marco legal.</Lead> Aplicamos la Ley N° 19.628 sobre Protección de la Vida Privada y, desde su
					entrada en vigencia, la Ley N° 21.719; en Venezuela, los artículos 28 y 60 de la Constitución y los
					principios fijados por el Tribunal Supremo de Justicia; y en otros países, las normas de protección de
					datos que correspondan.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">12. Responsabilidad</h2>
				<p className="mt-2">
					Respondemos por los daños directos que te causemos por incumplir estos Términos. No respondemos por daños
					indirectos ni por el lucro cesante, ni por fallas de terceros ajenos a nuestro control, salvo dolo o culpa
					grave de nuestra parte.
				</p>
				<p className="mt-2">
					Salvo dolo o culpa grave, nuestra responsabilidad total frente al Cliente por todos los reclamos derivados
					del Servicio no superará lo que el Cliente nos pagó en los 6 meses anteriores al hecho que origina el
					reclamo.
				</p>
				<p className="mt-2">
					Nada en estos Términos limita los derechos irrenunciables que la ley te reconozca.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">13. Suspensión y terminación</h2>
				<p className="mt-2">
					<Lead>Por el Cliente.</Lead> Puedes terminar el contrato en cualquier momento cancelando la suscripción
					(sección 6).
				</p>
				<p className="mt-2">
					<Lead>Por Gcode.</Lead> Si un período vence sin pago, la tienda se pausa (sección 5). Además, podemos
					suspender o terminar el Servicio por incumplimiento grave de estos Términos o por uso fraudulento o
					ilegal, avisándote antes cuando sea razonablemente posible y dándote la oportunidad de corregirlo. Si
					decidimos discontinuar el Servicio, avisaremos con al menos 30 días de anticipación y reembolsaremos la
					parte no usada del período pagado.
				</p>
				<p className="mt-2">
					<Lead>Tus datos al terminar.</Lead> Si tu tienda queda pausada o cancelada por más de 12 meses, o si nos
					pides eliminar la cuenta, consideramos terminado el contrato. Durante 30 días desde la terminación puedes
					pedirnos una copia de tu menú, tus clientes y tus pedidos. Pasado ese plazo los eliminamos, salvo lo que
					la ley nos obligue a conservar (por ejemplo, registros de facturación).
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">14. Cambios a estos Términos</h2>
				<p className="mt-2">
					Podemos actualizar estos Términos por cambios en el Servicio o en la ley. Te avisaremos por correo o en la
					plataforma con al menos 15 días de anticipación, indicando qué cambia. Si no estás de acuerdo, puedes
					terminar el contrato antes de la fecha de entrada en vigencia, con reembolso de la parte no usada del
					período pagado. Si sigues usando el Servicio después de esa fecha, se aplicarán los nuevos Términos.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">15. Ley aplicable y reclamos</h2>
				<p className="mt-2">
					Estos Términos se rigen por las leyes de la República de Chile. Las controversias se someterán a los
					tribunales ordinarios de Santiago, sin perjuicio de tu derecho a reclamar ante el tribunal de tu domicilio
					o ante los organismos de protección al consumidor cuando la ley te lo reconozca (por ejemplo, el Juzgado
					de Policía Local o el SERNAC en Chile, o la SUNDDE en Venezuela).
				</p>
				<p className="mt-2">
					Antes de ir a tribunales, te pedimos escribirnos a <SupportEmail />: respondemos los reclamos dentro de 10
					días hábiles.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">16. Disposiciones generales</h2>
				<p className="mt-2">
					<Lead>Fuerza mayor.</Lead> Ninguna parte responde por incumplimientos causados por hechos imprevisibles e
					irresistibles ajenos a su control, mientras duren.
				</p>
				<p className="mt-2">
					<Lead>Cesión.</Lead> Podemos ceder este contrato a una sociedad que continúe el Servicio, avisándote
					antes; tus derechos se mantienen. Tú puedes cederlo con nuestro acuerdo por escrito.
				</p>
				<p className="mt-2">
					<Lead>Divisibilidad.</Lead> Si una cláusula se declara nula, el resto sigue vigente.
				</p>
				<p className="mt-2">
					<Lead>Notificaciones.</Lead> Te escribiremos al correo de tu cuenta; tú puedes escribirnos a{" "}
					<SupportEmail />.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">17. Contacto</h2>
				<p className="mt-2">
					Para cualquier consulta sobre estos Términos, escribe a <SupportEmail />.
				</p>
			</section>

			<div id="anexo-datos" className="space-y-5 border-t border-slate-200 pt-6">
				<h2 className="text-base font-semibold text-slate-900">Anexo: encargo de tratamiento de datos personales</h2>
				<p>
					Este Anexo forma parte de los Términos y Condiciones de Gcode y se aplica a los datos personales de los
					comensales del Cliente (quienes piden en su menú o crean una cuenta en él) y de los usuarios de su equipo
					que Gcode trata al prestar el Servicio. En esos datos, el Cliente es el responsable y Gcode es el encargado
					del tratamiento.
				</p>
				<section>
					<h2 className="font-semibold text-slate-800">A1. Qué datos y para qué</h2>
					<p className="mt-2">
						Gcode trata nombre, teléfono, correo, documento de identidad cuando el Cliente lo pide en la cuenta del
						menú, direcciones de entrega, detalle e historial de pedidos, comprobantes de pago que suben los
						comensales, y los datos de acceso del equipo del Cliente. Lo hace solo para prestar el Servicio: mostrar
						el menú, recibir y gestionar pedidos, operar la caja, calcular envíos, coordinar repartos y llevar los
						reportes del Cliente.
					</p>
				</section>
				<section>
					<h2 className="font-semibold text-slate-800">A2. Obligaciones de Gcode</h2>
					<p className="mt-2">
						Gcode se compromete a:
					</p>
					<ul className="ml-5 mt-1 list-disc space-y-1">
						<li>
							Tratar los datos solo según las instrucciones del Cliente, que son las que resultan de la configuración
							que elige en la plataforma, y no usarlos para fines propios, salvo la seguridad, la prevención de fraude
							y el cumplimiento de la ley.
						</li>
						<li>
							Exigir confidencialidad a quienes tengan acceso a ellos.
						</li>
						<li>
							Aplicar medidas de seguridad razonables: cifrado en tránsito, cifrado adicional de los datos más
							sensibles, control de acceso por negocio, registros de actividad y respaldos.
						</li>
						<li>
							Usar solo los subencargados indicados en la <LegalLink href="/onboarding/privacidad">Política de
							privacidad</LegalLink>, con obligaciones de seguridad equivalentes. Avisaremos con al menos 15 días de
							anticipación antes de agregar uno nuevo; si el Cliente se opone por motivos fundados, puede terminar el
							contrato con reembolso de la parte no usada del período pagado.
						</li>
						<li>
							Notificar al Cliente sin dilaciones indebidas cualquier vulneración de seguridad que afecte esos datos,
							con la información disponible para que el Cliente pueda cumplir sus propios deberes de aviso.
						</li>
						<li>
							Ayudar al Cliente a responder las solicitudes de acceso, rectificación, supresión, oposición,
							portabilidad y bloqueo de sus comensales. Si un comensal nos escribe directamente, le avisaremos al
							Cliente.
						</li>
						<li>
							Al terminar el contrato, devolver los datos al Cliente si lo pide dentro de 30 días y luego eliminarlos,
							salvo lo que la ley obligue a conservar.
						</li>
						<li>
							Entregar al Cliente, si lo pide, la información necesaria para demostrar el cumplimiento de este Anexo.
						</li>
					</ul>
				</section>
				<section>
					<h2 className="font-semibold text-slate-800">A3. Obligaciones del Cliente</h2>
					<p className="mt-2">
						El Cliente se compromete a:
					</p>
					<ul className="ml-5 mt-1 list-disc space-y-1">
						<li>
							Informar a sus comensales y a su equipo cómo se usan sus datos y contar con una base legal para tratarlos
							(por ejemplo, el consentimiento para enviarles promociones).
						</li>
						<li>
							No pedir datos que no necesita para vender y entregar sus pedidos, y no subir datos sensibles (salud, por
							ejemplo) salvo que el comensal los entregue para su pedido (como una alergia).
						</li>
						<li>
							Usar los datos de los comensales solo para sus pedidos y para las finalidades que les informó.
						</li>
					</ul>
				</section>
				<section>
					<h2 className="font-semibold text-slate-800">A4. Transferencias internacionales</h2>
					<p className="mt-2">
						Algunos subencargados procesan datos fuera del país del Cliente, principalmente en Estados Unidos y la
						Unión Europea. Gcode solo usa proveedores que ofrecen garantías contractuales de protección de datos.
					</p>
				</section>
			</div>
		</LegalPage>
	);
}
