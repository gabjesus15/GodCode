import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/infra/telegram";
import { getAppUrl } from "@/lib/tenant/app-url";

/**
 * Avisos por Telegram de cada paso del alta de un negocio, para que el equipo
 * vea el embudo sin entrar al panel: solicitud creada → correo verificado → plan
 * elegido → comprobante subido → negocio activado. Cada aviso dice en qué paso va
 * la persona y qué falta, y enlaza al panel. Nunca lanza: es un extra sobre el
 * correo al equipo que ya existe.
 */

export type OnboardingAlert =
	| {
			kind: "application_created";
			businessName: string;
			responsibleName?: string | null;
			email: string;
			phone?: string | null;
			sector?: string | null;
	  }
	| {
			kind: "email_verified";
			businessName: string;
			responsibleName?: string | null;
			email: string;
	  }
	| {
			kind: "plan_chosen";
			businessName: string;
			email?: string | null;
			planName?: string | null;
			months?: number | null;
			amount?: string | null;
			method?: string | null;
			/** Código del cupón del alta, si aplicó uno. */
			coupon?: string | null;
	  }
	| {
			kind: "receipt_uploaded";
			businessName: string;
			email?: string | null;
			amount?: string | null;
			method?: string | null;
			reference?: string | null;
			coupon?: string | null;
	  }
	| {
			kind: "activated";
			businessName: string;
			email?: string | null;
			planName?: string | null;
			months?: number | null;
			via: "paypal" | "manual" | "promo" | "coupon" | string;
			menuUrl?: string | null;
			coupon?: string | null;
	  }
	| {
			/** Algo del alta se trabó y no se arregla solo (p. ej. PayPal cobró y no hay cuenta). */
			kind: "needs_attention";
			businessName: string;
			email?: string | null;
			problem: string;
			detail?: string | null;
	  };

const STEPS_TOTAL = 4;

function line(label: string, value: unknown): string | null {
	const text = String(value ?? "").trim();
	return text ? `${label}${escapeTelegramHtml(text)}` : null;
}

function link(href: string, label: string): string {
	return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(label)}</a>`;
}

/** Mensaje en HTML de Telegram para un paso del alta. */
export function formatOnboardingAlert(alert: OnboardingAlert, appUrl: string = getAppUrl()): string {
	const base = appUrl.replace(/\/$/, "");
	const panel = link(`${base}/dashboard`, "Abrir el panel");
	const pagos = link(`${base}/dashboard/pagos`, "Validar el pago");
	const name = escapeTelegramHtml(alert.businessName || "Negocio sin nombre");
	const who = ["responsibleName" in alert ? alert.responsibleName : null, "email" in alert ? alert.email : null]
		.map((value) => String(value ?? "").trim())
		.filter(Boolean)
		.map(escapeTelegramHtml)
		.join(" · ");

	switch (alert.kind) {
		case "application_created":
			return [
				`🆕 <b>Nueva solicitud de alta: ${name}</b>`,
				who || null,
				line("Teléfono: ", alert.phone),
				line("Rubro: ", alert.sector),
				`Paso 1 de ${STEPS_TOTAL}: le mandamos el correo de verificación. Si no lo confirma en 7 días, la solicitud se borra sola.`,
				panel,
			]
				.filter(Boolean)
				.join("\n");
		case "email_verified":
			return [
				`✅ <b>Correo verificado: ${name}</b>`,
				who || null,
				`Paso 2 de ${STEPS_TOTAL}: ya está dentro del formulario. Falta que elija plan y forma de pago.`,
				panel,
			]
				.filter(Boolean)
				.join("\n");
		case "plan_chosen": {
			const detail = [
				alert.planName ? `Plan ${alert.planName}` : null,
				alert.months ? `${alert.months} ${alert.months === 1 ? "mes" : "meses"}` : null,
				alert.amount || null,
				alert.method || null,
			]
				.filter(Boolean)
				.map(escapeTelegramHtml)
				.join(" · ");
			return [
				`🧾 <b>Eligió plan: ${name}</b>`,
				line("", alert.email),
				detail || null,
				line("Cupón: ", alert.coupon),
				`Paso 3 de ${STEPS_TOTAL}: falta el pago. Con PayPal se activa solo; con transferencia o Pago Móvil sube el comprobante.`,
				panel,
			]
				.filter(Boolean)
				.join("\n");
		}
		case "receipt_uploaded": {
			const detail = [alert.amount, alert.method, alert.reference ? `Ref. ${alert.reference}` : null]
				.filter(Boolean)
				.map(escapeTelegramHtml)
				.join(" · ");
			return [
				`📎 <b>Comprobante subido: ${name}</b>`,
				line("", alert.email),
				detail || null,
				line("Cupón: ", alert.coupon),
				`Paso 4 de ${STEPS_TOTAL}: hay que revisar el comprobante y validar el pago. Hasta entonces el negocio no está activo.`,
				pagos,
			]
				.filter(Boolean)
				.join("\n");
		}
		case "activated": {
			const via =
				alert.via === "paypal"
					? "pagó con PayPal"
					: alert.via === "promo"
						? "entró con promoción"
						: alert.via === "coupon"
							? "entró gratis con cupón"
							: alert.via === "manual"
								? "pago validado a mano"
								: escapeTelegramHtml(alert.via);
			const detail = [
				alert.planName ? `Plan ${alert.planName}` : null,
				alert.months ? `${alert.months} ${alert.months === 1 ? "mes" : "meses"}` : null,
			]
				.filter(Boolean)
				.map(escapeTelegramHtml)
				.join(" · ");
			return [
				`🎉 <b>Negocio activado: ${name}</b> (${via})`,
				line("", alert.email),
				detail || null,
				line("Cupón: ", alert.coupon),
				`Ya tiene acceso al panel y su menú está publicado.`,
				alert.menuUrl ? link(alert.menuUrl, "Ver su menú") : panel,
			]
				.filter(Boolean)
				.join("\n");
		}
		case "needs_attention":
			return [
				`⚠️ <b>Revisar alta: ${name}</b>`,
				line("", alert.email),
				escapeTelegramHtml(alert.problem),
				line("", alert.detail),
				panel,
			]
				.filter(Boolean)
				.join("\n");
		default:
			return "";
	}
}

/** Manda el aviso y se traga cualquier fallo: el alta sigue igual con o sin Telegram. */
export async function alertOnboardingTeam(alert: OnboardingAlert): Promise<void> {
	try {
		await sendTelegramMessage(formatOnboardingAlert(alert));
	} catch {
		// sendTelegramMessage ya no lanza; esto cubre un formateo roto por datos raros.
	}
}
