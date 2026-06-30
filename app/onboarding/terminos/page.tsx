import type { Metadata } from "next";
import Link from "next/link";

import { getAppUrl } from "@/lib/tenant/app-url";

const COMPANY_NAME = "GodCode";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";

const SUPPORT_EMAIL = LANDING_SUPPORT_EMAIL;

export const metadata: Metadata = {
	title: "Términos de servicio · GodCode",
	description: "Términos de servicio de la plataforma GodCode.",
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
		<div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
			<div className="onboarding-card p-6 sm:p-8">
				<h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Términos de servicio</h1>
				<p className="mt-2 text-xs text-slate-400">Última actualización: 3 de abril de 2026</p>

				<div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
					<section>
						<h2 className="font-semibold text-slate-800">1. Aceptación de los términos</h2>
						<p className="mt-1">
							Al registrarte y usar la plataforma {COMPANY_NAME}, aceptas estos términos en su totalidad.
							Si no estás de acuerdo con alguno de ellos, no uses el servicio.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">2. Descripción del servicio</h2>
						<p className="mt-1">
							{COMPANY_NAME} es una plataforma SaaS que permite a negocios crear tiendas online,
							gestionar menús digitales, pedidos, inventario, facturación y otras herramientas de comercio.
							Nos reservamos el derecho de modificar o descontinuar funcionalidades con previo aviso.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">3. Cuentas y seguridad</h2>
						<p className="mt-1">
							Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas
							las actividades que ocurran bajo tu cuenta. Notifícanos inmediatamente si detectas un uso
							no autorizado.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">4. Uso aceptable</h2>
						<p className="mt-1">
							No puedes usar la plataforma para actividades ilegales, distribuir contenido dañino,
							intentar acceder a cuentas de otros usuarios o realizar ingeniería inversa del servicio.
							Nos reservamos el derecho de suspender cuentas que violen estos términos.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">5. Pagos y facturación</h2>
						<p className="mt-1">
							Los planes de suscripción se facturan de forma recurrente. Puedes cancelar tu suscripción
							en cualquier momento; el acceso continuará hasta el final del período facturado. No se
							realizan reembolsos por períodos parciales salvo que la ley lo requiera.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">6. Propiedad intelectual</h2>
						<p className="mt-1">
							Todo el contenido que subas a la plataforma (imágenes, textos, productos) sigue siendo tuyo.
							Nos concedes una licencia limitada para mostrarlo como parte del servicio.
							La marca, diseño y código de {COMPANY_NAME} son propiedad exclusiva nuestra.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">6. Analítica y datos de visitantes de tu menú</h2>
						<p className="mt-1">
							Al usar {COMPANY_NAME}, aceptas que la plataforma mida el tráfico de tu landing pública,
							tu panel de administración y las páginas que tus clientes visitan (home del negocio,
							menú digital, checkout y páginas relacionadas).
						</p>
						<p className="mt-2">
							Esa información se procesa en dos capas complementarias:
						</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>
								Analítica interna del super administrador de {COMPANY_NAME}, para operar la plataforma,
								detectar incidencias y mostrarte métricas agregadas de uso.
							</li>
							<li>
								Google Analytics (GA4), como proveedor externo de medición agregada del sitio.
							</li>
						</ul>
						<p className="mt-2">
							Eres responsable de informar a tus clientes finales, cuando la ley de tu país lo exija,
							que al visitar tu menú digital pueden aplicarse estas mediciones. {COMPANY_NAME} actúa
							como encargado del tratamiento respecto de los datos técnicos de navegación de esos
							visitantes.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">7. Limitación de responsabilidad</h2>
						<p className="mt-1">
							{COMPANY_NAME} se proporciona &quot;tal cual&quot;. No garantizamos disponibilidad ininterrumpida.
							En ningún caso nuestra responsabilidad excederá el monto pagado por ti durante los últimos
							12 meses.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">8. Modificaciones</h2>
						<p className="mt-1">
							Podemos actualizar estos términos. Te notificaremos por correo electrónico o mediante un
							aviso en la plataforma con al menos 15 días de antelación. El uso continuado implica
							aceptación de los nuevos términos.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">9. Contacto</h2>
						<p className="mt-1">
							Si tienes preguntas sobre estos términos, escríbenos a{" "}
							<a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline">
								{SUPPORT_EMAIL}
							</a>.
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
