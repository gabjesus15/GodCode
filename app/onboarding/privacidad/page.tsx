import type { Metadata } from "next";
import Link from "next/link";

import { getAppUrl } from "@/lib/tenant/app-url";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hola@godcode.me";

export const metadata: Metadata = {
	title: "Política de privacidad · GodCode",
	description: "Política de privacidad de la plataforma GodCode.",
	alternates: {
		canonical: `${getAppUrl()}/onboarding/privacidad`,
	},
	robots: {
		index: false,
		follow: true,
	},
};

export default function PrivacidadPage() {
	return (
		<div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
			<div className="onboarding-card p-6 sm:p-8">
				<h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Política de privacidad</h1>
				<p className="mt-2 text-xs text-slate-400">Última actualización: 3 de abril de 2026</p>

				<div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-600">
					<section>
						<h2 className="font-semibold text-slate-800">1. Información que recopilamos</h2>
						<p className="mt-1">
							Recopilamos los datos que proporcionas al registrarte (nombre, correo electrónico,
							nombre del negocio) y datos generados por tu uso del servicio (productos, pedidos, configuraciones).
							También recopilamos datos técnicos como dirección IP, tipo de navegador y dispositivo
							para mejorar la seguridad y el rendimiento.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">2. Cómo usamos tus datos</h2>
						<p className="mt-1">Usamos tu información para:</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>Proveer y mantener el servicio.</li>
							<li>Procesar pagos y facturación.</li>
							<li>Enviarte comunicaciones sobre tu cuenta o cambios en el servicio.</li>
							<li>Mejorar la plataforma y desarrollar nuevas funcionalidades.</li>
							<li>Prevenir fraude y garantizar la seguridad.</li>
						</ul>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">3. Compartición de datos</h2>
						<p className="mt-1">
							No vendemos tus datos personales. Podemos compartir información con proveedores
							de servicios esenciales (procesadores de pago, hosting, almacenamiento en la nube) bajo
							acuerdos de confidencialidad. Podemos divulgar datos si la ley lo requiere.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">4. Almacenamiento y seguridad</h2>
						<p className="mt-1">
							Tus datos se almacenan en servidores seguros con cifrado en tránsito y en reposo.
							Implementamos medidas técnicas y organizativas para proteger tu información, pero
							ningún sistema es completamente infalible.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">5. Tus derechos</h2>
						<p className="mt-1">Tienes derecho a:</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>Acceder a tus datos personales.</li>
							<li>Solicitar la corrección de datos inexactos.</li>
							<li>Solicitar la eliminación de tu cuenta y datos asociados.</li>
							<li>Exportar tus datos en un formato legible.</li>
							<li>Retirar tu consentimiento en cualquier momento.</li>
						</ul>
						<p className="mt-1">
							Para ejercer estos derechos, contacta a{" "}
							<a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-indigo-600 hover:underline">
								{SUPPORT_EMAIL}
							</a>.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">6. Cookies y mediciones de uso</h2>
						<p className="mt-1">
							Usamos cookies esenciales para el funcionamiento del servicio (autenticación, sesión)
							y cookies o identificadores de analítica para entender cómo se usa la plataforma.
						</p>
						<p className="mt-2">
							En concreto, registramos visitas y navegación mediante:
						</p>
						<ul className="ml-5 mt-1 list-disc space-y-0.5">
							<li>
								<strong>Google Analytics (GA4)</strong>, servicio de Google LLC, que puede usar cookies
								y recopilar datos técnicos anónimos o seudonimizados (páginas visitadas, dispositivo,
								país aproximado, origen del tráfico).
							</li>
							<li>
								<strong>Analítica interna de GodCode</strong>, almacenada en nuestros sistemas para
								medir el rendimiento de la landing, los menús digitales de cada negocio y el panel
								super administrador (visitas, rutas, país aproximado, identificadores de sesión
								seudonimizados).
							</li>
						</ul>
						<p className="mt-2">
							Estas mediciones aplican tanto a quienes visitan la web pública de GodCode como a los
							clientes finales que navegan el home y el menú digital de los negocios alojados en la
							plataforma. No usamos cookies de publicidad comportamental propias.
						</p>
						<p className="mt-2">
							Puedes configurar tu navegador para bloquear cookies; eso puede afectar algunas
							funciones, pero el servicio principal seguirá operativo.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">7. Retención de datos</h2>
						<p className="mt-1">
							Conservamos tus datos mientras tu cuenta esté activa. Al cancelar tu cuenta,
							eliminaremos tus datos personales dentro de 30 días, excepto cuando la ley nos
							obligue a retenerlos por más tiempo.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">8. Cambios a esta política</h2>
						<p className="mt-1">
							Podemos actualizar esta política de privacidad. Te notificaremos por correo electrónico
							sobre cambios significativos con al menos 15 días de antelación.
						</p>
					</section>

					<section>
						<h2 className="font-semibold text-slate-800">9. Contacto</h2>
						<p className="mt-1">
							Para consultas sobre privacidad, escríbenos a{" "}
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
