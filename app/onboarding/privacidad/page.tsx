import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getAppUrl } from "@/lib/tenant/app-url";

import {
	LANDING_COMPANY_NAME,
	LANDING_PRODUCT_NAME,
	LANDING_SUPPORT_EMAIL,
} from "@/lib/landing/brand";

const SUPPORT_EMAIL = LANDING_SUPPORT_EMAIL;

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

function SupportEmail() {
	return (
		<a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline">
			{SUPPORT_EMAIL}
		</a>
	);
}

function Lead({ children }: { children: ReactNode }) {
	return <strong className="font-semibold text-slate-700">{children}</strong>;
}

export default function PrivacidadPage() {
	return (
		<div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
			<div className="onboarding-card p-6 sm:p-8">
				<h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Política de privacidad</h1>
				<p className="mt-2 text-xs text-slate-400">Última actualización: 24 de septiembre de 2026</p>

				<div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
					<p>
						Esta Política explica cómo Gcode trata los datos personales de los restaurantes y negocios que usan la
						plataforma (&quot;el Cliente&quot;), de las personas que visitan nuestro sitio web y de los comensales
						que navegan los menús digitales alojados en ella. Complementa los{" "}
						<Link href="/onboarding/terminos" className="font-medium text-indigo-600 hover:underline">
							Términos y Condiciones
						</Link>
						; ante cualquier diferencia sobre datos personales, prevalece lo dispuesto en su Sección 7.
					</p>

					<section>
						<h2 className="font-semibold text-slate-800">1. Quién es responsable de tus datos</h2>
						<p className="mt-1">
							Gcode, operado como persona natural bajo el nombre Gcode, con sede en Santiago, Chile, y correo de
							contacto <SupportEmail />.
						</p>
						<p className="mt-2">
							El tratamiento se rige por la Ley N° 19.628 sobre Protección de la Vida Privada y, a partir del 1 de
							diciembre de 2026, por la Ley N° 21.719 que moderniza la protección de datos personales en Chile.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">2. Nuestro rol según el tipo de dato</h2>
						<ul className="ml-5 mt-1 list-disc space-y-1">
							<li>
								<Lead>Datos del Cliente (Restaurante):</Lead> Gcode es <em>responsable</em> del tratamiento y los
								usa para prestar el Servicio, facturar y comunicarse con el Cliente.
							</li>
							<li>
								<Lead>Datos de los comensales</Lead> que hacen pedidos en el menú de un Cliente (nombre, teléfono,
								dirección de entrega): Gcode es <em>encargado</em> del tratamiento por cuenta del Cliente, que es
								el responsable frente a esos comensales. Los tratamos solo conforme a sus instrucciones y para
								prestar el Servicio.
							</li>
							<li>
								<Lead>Datos de navegación</Lead> de quienes visitan nuestro sitio o los menús digitales: se tratan
								con fines de medición y seguridad, según la Sección 6.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">3. Qué datos recopilamos</h2>
						<ul className="ml-5 mt-1 list-disc space-y-1">
							<li>
								<Lead>Datos de registro:</Lead> nombre del negocio, nombre de contacto, correo electrónico,
								teléfono y los demás datos que solicita el formulario.
							</li>
							<li>
								<Lead>Datos de facturación:</Lead> plan contratado, historial de pagos y los datos necesarios para
								cobrar. Los datos completos de tarjeta los recibe directamente la pasarela de pago; Gcode no los
								almacena.
							</li>
							<li>
								<Lead>Contenido y uso del Servicio:</Lead> menú, productos, precios, imágenes, sucursales, pedidos
								y configuraciones que el Cliente ingresa.
							</li>
							<li>
								<Lead>Datos técnicos:</Lead> dirección IP, tipo de navegador y dispositivo, páginas visitadas, país
								aproximado e identificadores de sesión, para seguridad, rendimiento y medición.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">4. Para qué los usamos</h2>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>Prestar, mantener y dar soporte al Servicio.</li>
							<li>Procesar pagos y emitir la facturación de las suscripciones.</li>
							<li>Enviar comunicaciones sobre la cuenta, el Servicio o cambios en estos documentos.</li>
							<li>Medir el uso de la plataforma y mejorarla.</li>
							<li>Prevenir fraude, abusos y vulneraciones de seguridad.</li>
							<li>Cumplir obligaciones legales, tributarias y requerimientos de autoridades.</li>
						</ul>
						<p className="mt-2">No vendemos datos personales ni los usamos para publicidad comportamental propia.</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">5. Con quién los compartimos</h2>
						<p className="mt-1">
							Solo con proveedores que necesitamos para operar el Servicio, que tratan los datos por nuestra
							cuenta y bajo sus propias obligaciones de confidencialidad y seguridad:
						</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>
								<Lead>Pasarela de pago</Lead> (Stripe), para cobrar las suscripciones.
							</li>
							<li>
								<Lead>Alojamiento del sitio</Lead> (Vercel) y <Lead>servidores de base de datos</Lead> donde se
								guarda la información del Servicio.
							</li>
							<li>
								<Lead>Envío de correos</Lead> (Resend), para correos de cuenta, códigos de verificación y avisos.
							</li>
							<li>
								<Lead>Medición de uso</Lead> (Google Analytics y Vercel Analytics), según la Sección 6.
							</li>
						</ul>
						<p className="mt-2">
							Con cada Cliente compartimos los datos de los pedidos que sus comensales hacen en su menú, porque
							son necesarios para cumplirlos. También podemos divulgar datos cuando la ley o una autoridad
							competente lo exija.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">6. Cookies y medición de uso</h2>
						<p className="mt-1">
							Usamos cookies esenciales para que el Servicio funcione (inicio de sesión, seguridad y preferencias)
							y herramientas de medición para entender cómo se usa la plataforma:
						</p>
						<ul className="ml-5 mt-1 list-disc space-y-1">
							<li>
								<Lead>Google Analytics (GA4)</Lead>, de Google LLC, que puede usar cookies y recopilar datos
								técnicos seudonimizados (páginas visitadas, dispositivo, país aproximado, origen del tráfico).
							</li>
							<li>
								<Lead>Vercel Analytics y Speed Insights</Lead>, que miden visitas y rendimiento de forma agregada.
							</li>
							<li>
								<Lead>Analítica interna de Gcode</Lead>, guardada en nuestros sistemas, para medir el sitio, los
								menús digitales de cada negocio y el panel de administración (visitas, rutas, país aproximado e
								identificadores de sesión seudonimizados).
							</li>
						</ul>
						<p className="mt-2">
							Estas mediciones se aplican a quienes visitan el sitio de Gcode y también a los comensales que
							navegan el home y el menú digital de los negocios alojados en la plataforma. El Cliente es
							responsable de informar a sus comensales, cuando la ley lo exija, que al visitar su menú pueden
							aplicarse estas mediciones.
						</p>
						<p className="mt-2">
							Puedes bloquear o borrar las cookies desde tu navegador. Si bloqueas las esenciales, algunas
							funciones (como iniciar sesión) pueden dejar de funcionar.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">7. Transferencias internacionales</h2>
						<p className="mt-1">
							Algunos de los proveedores de la Sección 5 (pagos, alojamiento, correo y medición) tienen sus
							servidores fuera de Chile, principalmente en Estados Unidos. En esos casos, los datos se transfieren
							solo en la medida necesaria para prestar el Servicio y quedan protegidos por las medidas de
							seguridad y las garantías contractuales de cada proveedor.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">8. Seguridad</h2>
						<p className="mt-1">
							Aplicamos medidas técnicas y organizativas razonables para proteger los datos: cifrado en tránsito,
							cifrado adicional de los datos personales más sensibles, control de acceso y registros de actividad.
							Ningún sistema es infalible; ante una vulneración de seguridad que afecte datos personales,
							notificaremos sin demora injustificada a los afectados y, cuando corresponda, a la autoridad.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">9. Cuánto tiempo los conservamos</h2>
						<p className="mt-1">
							Conservamos los datos mientras la cuenta del Cliente esté activa. Al terminar el Servicio, el Cliente
							tiene 30 días para exportar sus datos (Sección 9 de los Términos); después los eliminamos, salvo
							los que la ley nos obligue a conservar, como los registros de facturación exigidos por la normativa
							tributaria, que se guardan solo por el plazo legal.
						</p>
						<p className="mt-2">
							Los datos de medición se conservan de forma agregada o seudonimizada y por el plazo que permite
							cada herramienta.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">10. Tus derechos</h2>
						<p className="mt-1">
							Puedes ejercer tus derechos de acceso, rectificación, cancelación/supresión, oposición y
							portabilidad, y retirar tu consentimiento cuando el tratamiento se base en él, escribiendo a{" "}
							<SupportEmail />. Responderemos dentro de los plazos que fija la ley. Estos derechos son
							irrenunciables y no pueden limitarse contractualmente.
						</p>
						<p className="mt-2">
							Si eres comensal de un restaurante que usa Gcode, puedes dirigirte al restaurante o escribirnos
							directamente; si la solicitud le corresponde al restaurante, se la haremos llegar.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">11. Cambios a esta política</h2>
						<p className="mt-1">
							Podemos actualizar esta Política para reflejar cambios en el Servicio o en la normativa. Los cambios
							relevantes se notificarán por correo electrónico o mediante aviso en la plataforma con al menos 15
							días de anticipación a su entrada en vigencia.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">12. Contacto</h2>
						<p className="mt-1">
							Para consultas sobre privacidad o el ejercicio de tus derechos, escríbenos a <SupportEmail />.
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
