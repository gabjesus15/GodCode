import type { Metadata } from "next";

import {
	LegalLink,
	LegalPage,
	LegalTable,
	Lead,
	ProviderIdentity,
	SupportEmail,
} from "@/components/legal/legal-page";
import { getAppUrl } from "@/lib/tenant/app-url";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getLegalBackHref } from "@/lib/legal/legal-back-href-server";

export const metadata: Metadata = {
	title: "Política de privacidad",
	description: `Política de privacidad de ${LANDING_PRODUCT_NAME}, la plataforma de ${LANDING_COMPANY_NAME}.`,
	alternates: {
		canonical: `${getAppUrl()}/onboarding/privacidad`,
	},
	robots: {
		index: false,
		follow: true,
	},
};

export default async function PrivacidadPage() {
	return (
		<LegalPage title="Política de privacidad" backHref={await getLegalBackHref()}>
			<p>
				Esta Política explica qué datos personales trata Gcode, para qué, con quién los comparte y qué derechos
				tienes. Se aplica a los negocios que usan la plataforma (&quot;el Cliente&quot;), a las personas que
				visitan nuestro sitio y a los comensales que usan los menús digitales alojados en ella. Complementa los{" "}
				<LegalLink href="/onboarding/terminos">Términos y Condiciones</LegalLink>.
			</p>
			<section>
				<h2 className="font-semibold text-slate-800">1. Quién es responsable</h2>
				<p className="mt-2">
					Gcode, operado por una persona natural bajo el nombre comercial Gcode, con sede en Santiago,
					Chile<ProviderIdentity />, y correo de contacto <SupportEmail />.
				</p>
				<p className="mt-2">
					Aplicamos la Ley N° 19.628 sobre Protección de la Vida Privada y, desde su entrada en vigencia, la Ley N°
					21.719 que la reemplaza. Si estás en Venezuela, también te amparan los artículos 28 y 60 de la
					Constitución. Si estás en otro país, tienes además los derechos que te reconozca tu ley local (por
					ejemplo, el RGPD en la Unión Europea o la LGPD en Brasil).
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">2. Nuestro rol según el dato</h2>
				<ul className="ml-5 mt-1 list-disc space-y-1">
					<li>
						<Lead>Datos de los Clientes, de sus representantes y de quienes visitan nuestro sitio:</Lead> Gcode es el{" "}
						<Lead>responsable</Lead> y decide cómo se usan.
					</li>
					<li>
						<Lead>Datos de los comensales y del equipo de cada negocio:</Lead> el <Lead>negocio es el
						responsable</Lead> y Gcode es <Lead>encargado</Lead>: los tratamos por cuenta del negocio y según sus
						instrucciones, como explica el <LegalLink href="/onboarding/terminos#anexo-datos">Anexo de encargo de
						tratamiento</LegalLink>. Si eres comensal, el negocio donde pides es quien recibe tus datos y responde
						por su uso; también puedes escribirnos y le haremos llegar tu solicitud.
					</li>
					<li>
						<Lead>Seguridad y prevención de fraude:</Lead> en los límites de seguridad, abuso y obligaciones legales,
						Gcode trata esos datos como responsable.
					</li>
				</ul>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">3. Qué datos tratamos</h2>
				<ul className="ml-5 mt-1 list-disc space-y-1">
					<li>
						<Lead>Registro del negocio:</Lead> nombre del negocio y del responsable, correo, teléfono, rubro, país,
						razón social y dirección fiscal cuando los entregas, redes sociales y logo.
					</li>
					<li>
						<Lead>Cotizaciones a Gcode Labs:</Lead> nombre, empresa, correo, WhatsApp si lo das y lo que nos cuentas
						del proyecto. Solo los usamos para responderte.
					</li>
					<li>
						<Lead>Facturación:</Lead> plan, cupones usados, historial de pagos, referencia y comprobante de cada pago
						con comprobante (guardado en almacenamiento privado, solo lo ve nuestro equipo para validarlo). Los datos
						de tarjeta los ingresas directamente en PayPal o en Mercado Pago; Gcode no los recibe.
					</li>
					<li>
						<Lead>Contenido del negocio:</Lead> menú, precios, fotos, sucursales, horarios, configuración, pedidos,
						caja y reportes.
					</li>
					<li>
						<Lead>Comensales que piden:</Lead> nombre, teléfono, dirección de entrega, detalle del pedido, medio de
						pago elegido y, si el negocio lo pide, el comprobante de pago.
					</li>
					<li>
						<Lead>Comensales con cuenta en un menú:</Lead> además, correo, contraseña (guardada cifrada), documento
						de identidad (RUT, cédula u otro) que el negocio usa para reconocerte como cliente, direcciones guardadas
						e historial de pedidos.
					</li>
					<li>
						<Lead>Datos técnicos:</Lead> dirección IP, navegador, dispositivo, país aproximado, páginas visitadas e
						identificadores de sesión, para seguridad, funcionamiento y medición.
					</li>
					<li>
						<Lead>Prueba de aceptación:</Lead> versión de los documentos aceptados, fecha, IP y navegador.
					</li>
				</ul>
				<p className="mt-2">
					No pedimos datos sensibles. Si escribes una alergia o indicación de salud en un pedido, solo se usa para
					preparar ese pedido.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">4. Para qué los usamos y con qué base legal</h2>
				<LegalTable
					head={["Finalidad", "Base legal"]}
					rows={[
						[<>Crear la cuenta del negocio y prestar el Servicio</>, <>Ejecución del contrato</>],
						[<>Cobrar las suscripciones y emitir los documentos tributarios</>, <>Contrato y obligación legal</>],
						[<>Enviar avisos de la cuenta: verificación, recordatorios para publicar tu tienda, pagos, renovación, cambios de los documentos</>, <>Ejecución del contrato y de las gestiones previas que pediste</>],
						[<>Responder las solicitudes de cotización de Gcode Labs</>, <>Gestiones previas a un contrato que pediste</>],
						[<>Gestionar los pedidos y las cuentas de los comensales por cuenta de cada negocio</>, <>Contrato del comensal con el negocio (Gcode como encargado)</>],
						[<>Seguridad, prevención de fraude y abuso (límites de intentos, reCAPTCHA, registros)</>, <>Interés legítimo y obligación legal</>],
						[<>Medición con nuestra analítica propia y Vercel, sin cookies publicitarias</>, <>Interés legítimo en mejorar el Servicio</>],
						[<>Medición con Google Analytics usando cookies</>, <>Tu consentimiento, que das o rechazas en el aviso de cookies</>],
						[<>Enviarte novedades de Gcode</>, <>Tu consentimiento; puedes darte de baja en cada correo</>],
						[<>Cumplir requerimientos de autoridades</>, <>Obligación legal</>],
					]}
				/>
				<p className="mt-2">
					No vendemos datos personales, no los usamos para publicidad personalizada y no tomamos decisiones
					automatizadas que te afecten de forma significativa.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">5. Con quién los compartimos</h2>
				<p className="mt-2">
					Con el negocio donde pides, para cumplir tu pedido. Con autoridades, cuando la ley lo exija. Y con estos
					proveedores, que tratan los datos por nuestra cuenta y con obligaciones de confidencialidad y seguridad:
				</p>
				<LegalTable
					head={["Proveedor", "Para qué", "Qué datos recibe", "Dónde"]}
					rows={[
						[<>Supabase</>, <>Base de datos, archivos y autenticación</>, <>Todos los datos del Servicio</>, <>Servidores contratados por Gcode</>],
						[<>Vercel</>, <>Alojamiento del sitio y medición agregada (Analytics, Speed Insights)</>, <>Datos técnicos</>, <>Estados Unidos y otros</>],
						[<>PayPal</>, <>Cobro de suscripciones</>, <>Correo, importe y datos que ingresas en PayPal</>, <>Estados Unidos</>],
						[<>Mercado Pago</>, <>Cobro del plan en pesos chilenos, si eliges ese medio en Chile</>, <>Correo, importe y datos que ingresas en Mercado Pago</>, <>Según las condiciones de Mercado Pago</>],
						[<>Resend</>, <>Envío de correos</>, <>Correo, nombre y contenido del aviso</>, <>Estados Unidos</>],
						[<>Anthropic</>, <>Leer la carta que subes (foto, PDF o planilla) para armar tu menú, si usas esa opción</>, <>El archivo de la carta</>, <>Estados Unidos</>],
						[<>Google (reCAPTCHA)</>, <>Protección contra bots en el registro y en el formulario de cotización de Gcode Labs</>, <>Datos técnicos del navegador</>, <>Estados Unidos</>],
						[<>Google (Analytics)</>, <>Medición de uso, solo con tu consentimiento</>, <>Datos técnicos seudonimizados</>, <>Estados Unidos</>],
						[<>Upstash</>, <>Límites de uso y caché</>, <>Dirección IP de forma temporal</>, <>Estados Unidos y Unión Europea</>],
						[<>Telegram</>, <>Avisos internos a nuestro equipo cuando un negocio se registra, paga o pide una cotización en Gcode Labs</>, <>Nombre del negocio o empresa y del responsable, correo, teléfono y, en las cotizaciones, lo que nos cuentas del proyecto</>, <>Fuera de Chile</>],
						[<>OpenStreetMap (Nominatim)</>, <>Ubicar direcciones y calcular el envío</>, <>La dirección que escribes</>, <>Unión Europea</>],
						[<>Uber Direct</>, <>Reparto con repartidores externos, si el negocio lo activa</>, <>Nombre, teléfono y dirección de entrega</>, <>Estados Unidos y país de entrega</>],
						[<>WhatsApp (Meta)</>, <>Confirmar pedidos por WhatsApp, si el negocio lo usa</>, <>Lo envías tú desde tu WhatsApp al negocio</>, <>Según las condiciones de WhatsApp</>],
					]}
				/>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">6. Transferencias internacionales</h2>
				<p className="mt-2">
					Varios proveedores procesan datos fuera de Chile y de Venezuela, principalmente en Estados Unidos y la
					Unión Europea. Solo transferimos lo necesario para prestar el Servicio y elegimos proveedores con
					garantías contractuales de protección de datos.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">7. Cookies</h2>
				<p className="mt-2">
					Usamos cookies esenciales para iniciar sesión y mantener la seguridad, y, solo si aceptas, cookies de
					Google Analytics para medir el uso del sitio. En los menús de los negocios nunca se activan: Google
					Analytics mide sin cookies. El detalle está en la{" "}
					<LegalLink href="/onboarding/cookies">Política de cookies</LegalLink>.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">8. Cuánto tiempo los guardamos</h2>
				<LegalTable
					head={["Dato", "Plazo"]}
					rows={[
						[<>Cuenta y contenido del negocio</>, <>Mientras la cuenta exista, más 30 días para que puedas pedir una copia (sección 13 de los Términos)</>],
						[<>Tienda en vista previa que no publicas</>, <>Hasta que la publiques; si pasan 30 días sin publicarla, podemos borrarla, con aviso por correo 7 días antes</>],
						[<>Registros de facturación y pagos</>, <>6 años, por las obligaciones tributarias</>],
						[<>Comprobantes de pago</>, <>Hasta validar el pago y luego el mismo plazo que la facturación</>],
						[<>Cuenta del comensal en un menú</>, <>Hasta que la elimines desde Mi cuenta, lo pidas o el negocio deje Gcode</>],
						[<>Pedidos y datos de comensales</>, <>Mientras el negocio tenga cuenta, o hasta que el negocio o el comensal pidan su eliminación, salvo obligación legal</>],
						[<>Solicitudes de registro no completadas</>, <>12 meses</>],
						[<>Datos técnicos y de seguridad</>, <>Hasta 12 meses</>],
						[<>Google Analytics</>, <>14 meses</>],
					]}
				/>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">9. Seguridad</h2>
				<p className="mt-2">
					Usamos cifrado en tránsito, cifrado adicional para los datos más sensibles, control de acceso por negocio,
					almacenamiento privado para comprobantes, límites de intentos y registros de actividad. Ningún sistema es
					infalible: si ocurre una vulneración que afecte tus datos, te avisaremos sin dilaciones indebidas y,
					cuando corresponda, a la autoridad.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">10. Tus derechos</h2>
				<p className="mt-2">
					Puedes pedir acceso, rectificación, supresión, oposición, portabilidad y bloqueo de tus datos, y retirar
					tu consentimiento en cualquier momento, escribiendo a <SupportEmail /> desde el correo de tu cuenta.
					Responderemos dentro del plazo legal, que como máximo es de 30 días corridos. El ejercicio de estos
					derechos es gratuito.
				</p>
				<p className="mt-2">
					Si eres comensal, puedes dirigirte al negocio o escribirnos; si la solicitud le corresponde al negocio, se
					la haremos llegar y te avisaremos. Si tienes cuenta en el menú de un negocio, también puedes eliminarla tú
					mismo desde Mi cuenta.
				</p>
				<p className="mt-2">
					Si no quedas conforme con nuestra respuesta, puedes reclamar ante la autoridad de tu país: en Chile, ante
					la Agencia de Protección de Datos Personales una vez que esté en funciones (mientras tanto, ante los
					tribunales); en Venezuela, mediante la acción de habeas data ante los tribunales; en otros países, ante su
					autoridad de protección de datos.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">11. Menores de edad</h2>
				<p className="mt-2">
					Gcode no está dirigido a menores de 14 años. Para crear una cuenta en un menú se requiere ser mayor de 18
					años o contar con la autorización de un padre, madre o tutor.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">12. Cambios a esta Política</h2>
				<p className="mt-2">
					Si hacemos cambios relevantes, te avisaremos por correo o en la plataforma con al menos 15 días de
					anticipación.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">13. Contacto</h2>
				<p className="mt-2">
					Para cualquier consulta sobre privacidad, escribe a <SupportEmail />.
				</p>
			</section>
		</LegalPage>
	);
}
