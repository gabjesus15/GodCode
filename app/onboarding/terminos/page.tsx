import type { Metadata } from "next";
import Link from "next/link";

import { getAppUrl } from "@/lib/tenant/app-url";

import {
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
	LANDING_SUPPORT_EMAIL,
} from "@/lib/landing/brand";

const SUPPORT_EMAIL = LANDING_SUPPORT_EMAIL;

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

function SupportEmail() {
	return (
		<a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline">
			{SUPPORT_EMAIL}
		</a>
	);
}

export default function TerminosPage() {
	return (
		<div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
			<div className="onboarding-card p-6 sm:p-8">
				<h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Términos y Condiciones de Gcode</h1>
				<p className="mt-2 text-xs text-slate-400">Última actualización: 22 de septiembre de 2026</p>

				<div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
					<p>
						Estos Términos y Condiciones (&quot;Términos&quot;) regulan el acceso y uso de la plataforma de menú
						digital y software como servicio (SaaS) ofrecida por Gcode (&quot;el Servicio&quot;,
						&quot;nosotros&quot;) a restaurantes y otros negocios que la contraten (&quot;el Cliente&quot;,
						&quot;tú&quot;). Al crear una cuenta, contratar un plan o utilizar el Servicio de cualquier forma, el
						Cliente declara haber leído, entendido y aceptado íntegramente estos Términos.
					</p>

					<section>
						<h2 className="font-semibold text-slate-800">1. Identificación del Prestador y Aceptación de los Términos</h2>
						<p className="mt-1">
							Gcode es un servicio de menú digital y software como servicio (SaaS) para restaurantes, operado
							como persona natural bajo el nombre Gcode, con sede en Santiago, Chile, y correo de contacto{" "}
							<SupportEmail />
							{" "}(en adelante, &quot;Gcode&quot;, &quot;nosotros&quot; o &quot;el Prestador&quot;).
						</p>
						<p className="mt-2">
							Al registrarse, contratar un plan o utilizar el Servicio, el Cliente acepta estos Términos en su
							totalidad. Si el Cliente actúa en representación de una empresa, declara tener las facultades
							necesarias para obligarla contractualmente.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">2. Descripción del Servicio</h2>
						<p className="mt-1">
							Gcode ofrece una plataforma en línea que permite a restaurantes y negocios de alimentos
							(&quot;Cliente&quot; o &quot;Restaurante&quot;) crear, publicar y administrar un menú digital, junto
							con herramientas de gestión asociadas (pedidos, actualización de precios y disponibilidad, y otras
							funcionalidades del panel de administración).
						</p>
						<p className="mt-2">
							A través de la plataforma, los comensales del Cliente (los clientes finales del restaurante) pueden
							ver el menú y, según el plan contratado, realizar pedidos u otras interacciones que impliquen
							entregar datos personales, los que se tratan conforme a la Sección 7 (Protección de Datos
							Personales).
						</p>
						<p className="mt-2">
							Gcode podrá agregar, modificar o discontinuar funcionalidades del Servicio en cualquier momento,
							procurando informar al Cliente con antelación razonable cuando el cambio afecte de forma relevante
							el uso que este hace del Servicio.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">3. Registro de Cuenta</h2>
						<p className="mt-1">
							Para usar el Servicio, el Cliente debe crear una cuenta y proporcionar información veraz, completa y
							actualizada (nombre del negocio, correo electrónico, teléfono de contacto y demás datos que se
							soliciten).
						</p>
						<p className="mt-2">
							El Cliente es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda
							actividad realizada desde su cuenta. Debe notificar a Gcode de inmediato ante cualquier uso no
							autorizado o sospecha de vulneración de seguridad, escribiendo a <SupportEmail />.
						</p>
						<p className="mt-2">
							Gcode podrá suspender o cancelar una cuenta cuya información de registro sea falsa, incompleta o
							utilizada para fines fraudulentos.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">4. Planes, Precios y Facturación</h2>
						<p className="mt-1">
							Gcode ofrece distintos planes de suscripción, con funcionalidades y precios detallados en la{" "}
							<Link href="/#precios" className="font-medium text-indigo-600 hover:underline">
								página de precios
							</Link>
							. Los precios se expresan en pesos chilenos (CLP) e incluyen los impuestos aplicables, salvo que se
							indique lo contrario.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Prueba gratuita.</strong> El Cliente puede acceder
							a un período de prueba gratuito según las condiciones vigentes al momento de la contratación
							(duración y funcionalidades incluidas). Al finalizar la prueba, el Servicio continúa solo si el
							Cliente contrata un plan pago; en caso contrario, el acceso se limita o suspende conforme a lo
							indicado al inicio de la prueba.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Renovación y cobro.</strong> Las suscripciones
							mensuales o anuales se renuevan automáticamente al final de cada período, salvo que el Cliente
							cancele antes de la fecha de renovación desde su panel de cuenta o escribiendo a <SupportEmail />.
							El cobro se realiza mediante los medios de pago habilitados en la plataforma.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Cambios de plan.</strong> El Cliente puede subir o
							bajar de plan en cualquier momento; el ajuste de precio se prorratea o aplica desde el siguiente
							ciclo de facturación, según se indique en la plataforma.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Reembolsos.</strong> Salvo que la ley aplicable
							disponga otra cosa, los pagos realizados no son reembolsables una vez iniciado el período de
							facturación correspondiente.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">5. Obligaciones del Cliente</h2>
						<p className="mt-1">El Cliente se compromete a:</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>
								Usar el Servicio de acuerdo con la ley chilena y estos Términos, sin publicar contenido ilegal,
								engañoso, difamatorio o que infrinja derechos de terceros (incluyendo precios, descripciones o
								imágenes del menú).
							</li>
							<li>
								Ser el único responsable de la exactitud de la información que publica en su menú digital
								(precios, ingredientes, alérgenos, disponibilidad).
							</li>
							<li>
								No intentar vulnerar la seguridad de la plataforma, realizar ingeniería inversa del software, ni
								usar el Servicio para fines distintos a los previstos.
							</li>
							<li>
								Cumplir con la normativa sanitaria, tributaria y de protección al consumidor que le sea aplicable
								como negocio de alimentos, de forma independiente a las obligaciones de Gcode bajo estos
								Términos.
							</li>
						</ul>
						<p className="mt-2">
							Gcode no es responsable por el contenido que el Cliente publica ni por las relaciones comerciales
							entre el Cliente y sus comensales.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">6. Propiedad Intelectual</h2>
						<p className="mt-1">
							El software, diseño, marca, código fuente y demás elementos de la plataforma Gcode son de propiedad
							de Gcode (o de sus licenciantes) y están protegidos por la legislación de propiedad intelectual e
							industrial. Estos Términos no transfieren al Cliente ningún derecho de propiedad sobre el Servicio;
							solo se concede una licencia de uso limitada, no exclusiva e intransferible, mientras la cuenta
							esté vigente.
						</p>
						<p className="mt-2">
							El Cliente conserva la propiedad de los datos, textos, imágenes y demás contenido que ingresa a la
							plataforma (por ejemplo, su menú, logo y fotografías). Al subir dicho contenido, el Cliente otorga
							a Gcode una licencia limitada para alojarlo, procesarlo y mostrarlo únicamente con el fin de
							prestar el Servicio.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">7. Protección de Datos Personales</h2>
						<p className="mt-1">
							<strong className="font-semibold text-slate-700">Marco legal.</strong> El tratamiento de datos
							personales bajo estos Términos se rige por la Ley N° 19.628 sobre Protección de la Vida Privada y,
							a partir del 1 de diciembre de 2026, por la Ley N° 21.719 que moderniza la protección de datos
							personales en Chile.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Datos del Cliente (Restaurante).</strong> Respecto
							de los datos que el propio Cliente entrega para crear su cuenta (nombre del negocio, contacto,
							medios de pago), Gcode actúa como responsable del tratamiento y los usa exclusivamente para prestar
							el Servicio, facturar y comunicarse con el Cliente.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Datos de los comensales.</strong> Cuando el
							Servicio permite a los comensales del Cliente realizar pedidos u otras acciones que impliquen
							entregar datos personales (nombre, teléfono, dirección de entrega), Gcode actúa como encargado del
							tratamiento por cuenta del Cliente, quien es el responsable frente a esos comensales. El Cliente
							debe contar con una base de licitud válida (consentimiento libre, específico, informado e
							inequívoco, o la que corresponda) para recolectar esos datos, e informarles cómo se usan.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Compromisos de Gcode como encargado.</strong> Gcode
							se compromete a: (i) tratar los datos de comensales solo conforme a las instrucciones del Cliente y
							la finalidad del Servicio; (ii) implementar medidas de seguridad técnicas y organizativas
							razonables (cifrado, control de acceso); (iii) notificar al Cliente sin demora injustificada ante
							cualquier vulneración de seguridad que afecte esos datos; y (iv) eliminar o devolver los datos al
							término del Servicio, salvo obligación legal de conservarlos.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Derechos de los titulares.</strong> Toda persona
							titular de datos personales tratados a través de Gcode puede ejercer sus derechos de acceso,
							rectificación, cancelación/supresión, oposición y portabilidad, escribiendo a <SupportEmail />.
							Estos derechos son irrenunciables y no pueden limitarse contractualmente.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Transferencias internacionales.</strong> Los pagos
							de las suscripciones se procesan a través de una pasarela de pago con sede en Chile. El Servicio
							puede ser contratado por Clientes ubicados fuera de Chile; en ese caso, los datos de pago se tratan
							conforme a los propios términos y medidas de seguridad de dicha pasarela, sin que ello implique que
							Gcode transfiera datos personales del Cliente fuera de Chile por su propia cuenta.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">8. Disponibilidad, Soporte y Limitación de Responsabilidad</h2>
						<p className="mt-1">
							Gcode procurará mantener el Servicio disponible de forma continua, pero no garantiza una
							disponibilidad del 100%. Podrán existir interrupciones programadas por mantenimiento (informadas
							con antelación cuando sea posible) o interrupciones no programadas por causas ajenas a Gcode
							(fallas de terceros proveedores, casos fortuitos o de fuerza mayor).
						</p>
						<p className="mt-2">
							El soporte técnico se presta por correo electrónico a <SupportEmail />, en el horario y con los
							tiempos de respuesta indicados según el plan contratado.
						</p>
						<p className="mt-2">
							En la máxima medida permitida por la ley, Gcode no será responsable por daños indirectos, lucro
							cesante o pérdida de datos derivados del uso o la imposibilidad de uso del Servicio, salvo en casos
							de dolo o culpa grave. La responsabilidad total de Gcode frente al Cliente, cuando corresponda, no
							excederá el monto pagado por el Cliente en los 6 meses anteriores al hecho que origina el reclamo.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">9. Suspensión y Terminación del Servicio</h2>
						<p className="mt-1">
							<strong className="font-semibold text-slate-700">Por el Cliente.</strong> El Cliente puede cancelar
							su suscripción en cualquier momento desde el panel de administración o escribiendo a{" "}
							<SupportEmail />. Al cancelar, el menú del Cliente dejará de estar visible para los comensales de
							inmediato; los montos ya facturados por el período vigente no son reembolsables, conforme a la
							Sección 4.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Por Gcode.</strong> Gcode podrá suspender o
							terminar el acceso del Cliente, con aviso previo cuando sea razonablemente posible, en caso de: (i)
							falta de pago; (ii) incumplimiento de estos Términos; (iii) uso fraudulento o ilegal del Servicio;
							o (iv) discontinuación general del Servicio, en cuyo caso se avisará con al menos 30 días de
							anticipación.
						</p>
						<p className="mt-2">
							<strong className="font-semibold text-slate-700">Exportación de datos.</strong> Antes de eliminar la
							cuenta del Cliente, Gcode pondrá a disposición sus datos (menú, información de pedidos) para que el
							Cliente pueda exportarlos, durante un plazo de 30 días desde la terminación. Transcurrido ese plazo,
							los datos podrán eliminarse de forma definitiva, salvo obligación legal de conservarlos.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">10. Modificaciones de estos Términos</h2>
						<p className="mt-1">
							Gcode podrá modificar estos Términos para reflejar cambios en el Servicio, la normativa aplicable u
							otras razones justificadas. Los cambios relevantes se notificarán al Cliente por correo electrónico
							o mediante aviso en la plataforma, con al menos 15 días de anticipación a su entrada en vigencia.
							El uso continuado del Servicio después de esa fecha implica la aceptación de los nuevos Términos;
							si el Cliente no está de acuerdo, puede cancelar su cuenta conforme a la Sección 9.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">11. Ley Aplicable y Resolución de Controversias</h2>
						<p className="mt-1">
							Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia derivada de
							su interpretación o cumplimiento se someterá a los tribunales ordinarios de justicia de Santiago,
							Chile, sin perjuicio de los derechos que la Ley N° 19.496 sobre Protección de los Derechos de los
							Consumidores reconozca al Cliente cuando actúe como consumidor final.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">12. Contacto</h2>
						<p className="mt-1">
							Para consultas sobre estos Términos, el Servicio o el ejercicio de derechos sobre datos personales,
							el Cliente puede escribir a <SupportEmail />.
						</p>
					</section>
				</div>

				<Link href="/onboarding" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
					← Volver al registro
				</Link>
			</div>
		</div>
	);
}
