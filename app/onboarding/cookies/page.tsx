import type { Metadata } from "next";

import {
	LegalLink,
	LegalPage,
	LegalTable,
	Lead,
	SupportEmail,
} from "@/components/legal/legal-page";
import { getAppUrl } from "@/lib/tenant/app-url";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME } from "@/lib/landing/brand";
import { getLegalBackHref } from "@/lib/legal/legal-back-href-server";

import { CookieSettingsButton } from "@/components/legal/cookie-consent";

export const metadata: Metadata = {
	title: "Política de cookies",
	description: `Política de cookies de ${LANDING_PRODUCT_NAME}, la plataforma de ${LANDING_COMPANY_NAME}.`,
	alternates: {
		canonical: `${getAppUrl()}/onboarding/cookies`,
	},
	robots: {
		index: false,
		follow: true,
	},
};

export default async function CookiesPage() {
	return (
		<LegalPage title="Política de cookies" backHref={await getLegalBackHref()}>
			<p>
				Las cookies son pequeños archivos que un sitio guarda en tu navegador. También usamos el almacenamiento
				local del navegador, que funciona de forma parecida. Esta Política explica cuáles usamos y cómo
				controlarlas. Forma parte de la <LegalLink href="/onboarding/privacidad">Política de
				privacidad</LegalLink>.
			</p>
			<section>
				<h2 className="font-semibold text-slate-800">1. Cookies esenciales (siempre activas)</h2>
				<p className="mt-2">
					Sin ellas no podrías iniciar sesión, usar el carrito ni enviar los formularios protegidos contra bots. No
					requieren consentimiento.
				</p>
				<LegalTable
					head={["Nombre", "Para qué", "Duración"]}
					rows={[
						[<><code>sb-tenant-auth-token</code></>, <>Mantener la sesión en el panel del negocio</>, <>Mientras tengas la sesión iniciada</>],
						[<><code>sb-super-admin-auth-token</code></>, <>Mantener la sesión en tu cuenta de Gcode, donde configuras tu tienda y ves su vista previa, y la del equipo de Gcode</>, <>Igual que la anterior</>],
						[<><code>sb-menu-client-auth-token</code></>, <>Mantener la sesión de tu cuenta en el menú de un negocio</>, <>Igual que la anterior</>],
						[<>Almacenamiento local del carrito y preferencias</>, <>Recordar tu carrito, la sucursal elegida y tu idioma</>, <>Hasta que lo borres</>],
						[<><code>gcode-consent-analytics</code> (almacenamiento local)</>, <>Recordar si aceptaste o rechazaste la medición</>, <>12 meses</>],
						[<><code>_GRECAPTCHA</code> (de Google)</>, <>reCAPTCHA: distinguir personas de bots en el registro y en el formulario de cotización de Gcode Labs</>, <>6 meses</>],
					]}
				/>
				<p className="mt-2">
					Las cookies de sesión pueden dividirse en partes (<code>.0</code>, <code>.1</code>) cuando son largas.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">2. Medición propia (siempre activa)</h2>
				<ul className="ml-5 mt-1 list-disc space-y-1">
					<li>
						<Lead>Analítica propia de Gcode:</Lead> cuenta visitas y páginas vistas, también en los menús de los
						negocios. Guarda en el almacenamiento local un identificador aleatorio de visitante
						(<code>gc_visitor_id</code>, hasta que lo borres) y, mientras la pestaña está abierta, uno de sesión
						(<code>gc_session_id</code> y <code>gc_last_page_view</code>). No contienen tu nombre ni tu correo y no
						se comparten con terceros.
					</li>
					<li>
						<Lead>Vercel Analytics y Speed Insights:</Lead> miden visitas y rendimiento de forma agregada y sin
						cookies.
					</li>
				</ul>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">3. Cookies de medición de Google Analytics (solo si aceptas)</h2>
				<LegalTable
					head={["Nombre", "Para qué", "Duración"]}
					rows={[
						[<><code>_ga</code></>, <>Distinguir visitantes de forma seudonimizada</>, <>2 años</>],
						[<><code>_ga_&lt;id&gt;</code></>, <>Mantener el estado de la sesión de medición</>, <>2 años</>],
					]}
				/>
				<p className="mt-2">
					En las páginas de Gcode (sitio, registro y panel) te preguntamos antes de activarlas. Si las rechazas o no
					respondes, Google Analytics funciona sin cookies y sin identificarte. En los menús de los negocios nunca
					se activan: Google Analytics mide sin cookies.
				</p>
				<p className="mt-2">
					No usamos cookies publicitarias ni de redes sociales.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">4. Cómo cambiar tu decisión</h2>
				<CookieSettingsButton />
				<p className="mt-2">
					Puedes cambiar tu elección cuando quieras con este botón o desde el pie de cada página del sitio. También
					puedes borrar o bloquear las cookies desde tu navegador; si bloqueas las esenciales, no podrás iniciar
					sesión.
				</p>
			</section>
			<section>
				<h2 className="font-semibold text-slate-800">5. Contacto</h2>
				<p className="mt-2">
					Para cualquier consulta, escribe a <SupportEmail />.
				</p>
			</section>
		</LegalPage>
	);
}
