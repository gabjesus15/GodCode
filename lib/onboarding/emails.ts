/**
 * Emails transaccionales para el flujo de onboarding.
 * Usa Resend como proveedor.
 * Diseño corporativo unificado con logo y marca.
 *
 * Opcional en .env:
 *   EMAIL_LOGO_URL     - URL absoluta del logo (ej. https://tu-dominio.com/logo-email.png)
 *   EMAIL_COMPANY_NAME - Nombre de la empresa (default: GodCode)
 *   EMAIL_TAGLINE      - Eslogan bajo el logo (default: Tu visión, nuestro código.)
 */

import { getAppUrl } from "../tenant/app-url";

const RESEND_API = "https://api.resend.com/emails";

const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL ?? "";
const EMAIL_COMPANY_NAME = process.env.EMAIL_COMPANY_NAME ?? "GodCode";
const EMAIL_TAGLINE = process.env.EMAIL_TAGLINE ?? "Tu visión, nuestro código.";
const EMAIL_APP_URL = getAppUrl();

const BRAND_PRIMARY = "#6d28d9";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG_BODY = "#f9fafb";
const CARD_RADIUS = "12px";
const FOOTER_FONT_SIZE = "12px";
const FOOTER_COLOR = "#9ca3af";

export type OnboardingEmailType =
  | "verification"
  | "welcome"
  | "team_notification"
  | "application_confirmation"
  | "payment_reminder"
  | "payment_validated"
  | "booking_reminder"
  | "plan_expiring"
  | "invoice"
  | "site_ready"
  | "status_suspended"
  | "status_reactivated"
  | "status_cancelled_scheduled"
  | "plan_downgrade_scheduled";

interface BaseEmailParams {
  to: string;
  from: string;
  apiKey: string;
}

interface VerificationEmailParams extends BaseEmailParams {
  type: "verification";
  responsibleName: string;
  businessName: string;
  verifyUrl: string;
}

interface ConfirmationEmailParams extends BaseEmailParams {
  type: "application_confirmation";
  responsibleName: string;
  businessName: string;
  nextStepUrl: string;
}

interface WelcomeEmailParams extends BaseEmailParams {
  type: "welcome";
  responsibleName: string;
  businessName: string;
  panelUrl: string;
}

interface TeamNotificationParams extends BaseEmailParams {
  type: "team_notification";
  businessName: string;
  responsibleName: string;
  email: string;
  sector?: string;
  dashboardUrl: string;
}

interface PaymentReminderParams extends BaseEmailParams {
  type: "payment_reminder";
  responsibleName: string;
  businessName: string;
  amount?: string;
  paymentUrl?: string;
}

interface PaymentValidatedParams extends BaseEmailParams {
  type: "payment_validated";
  responsibleName: string;
  businessName: string;
  contactDate: string;
  panelUrl?: string;
}

interface BookingReminderParams extends BaseEmailParams {
  type: "booking_reminder";
  businessName: string;
  responsibleName: string;
  contactDate: string;
  panelUrl?: string;
}

interface PlanExpiringParams extends BaseEmailParams {
  type: "plan_expiring";
  responsibleName: string;
  businessName: string;
  expiresAt: string;
  panelUrl?: string;
}

interface InvoiceParams extends BaseEmailParams {
  type: "invoice";
  responsibleName: string;
  businessName: string;
  planName: string;
  amount: string;
  date: string;
  reference?: string;
}

interface SiteReadyParams extends BaseEmailParams {
  type: "site_ready";
  responsibleName: string;
  businessName: string;
  siteUrl: string;
}

interface StatusSuspendedParams extends BaseEmailParams {
  type: "status_suspended";
  responsibleName: string;
  businessName: string;
  panelUrl?: string;
}

interface StatusReactivatedParams extends BaseEmailParams {
  type: "status_reactivated";
  responsibleName: string;
  businessName: string;
  panelUrl?: string;
}

interface StatusCancelledScheduledParams extends BaseEmailParams {
  type: "status_cancelled_scheduled";
  responsibleName: string;
  businessName: string;
  endsAt: string;
  panelUrl?: string;
}

interface PlanDowngradeScheduledParams extends BaseEmailParams {
  type: "plan_downgrade_scheduled";
  responsibleName: string;
  businessName: string;
  currentPlanName: string;
  targetPlanName: string;
  effectiveAt: string;
  panelUrl?: string;
}

type EmailParams =
  | VerificationEmailParams
  | ConfirmationEmailParams
  | WelcomeEmailParams
  | TeamNotificationParams
  | PaymentReminderParams
  | PaymentValidatedParams
  | BookingReminderParams
  | PlanExpiringParams
  | InvoiceParams
  | SiteReadyParams
  | StatusSuspendedParams
  | StatusReactivatedParams
  | StatusCancelledScheduledParams
  | PlanDowngradeScheduledParams;

function wrapEmailLayout(contentHtml: string): string {
  const logoBlock = EMAIL_LOGO_URL
    ? `<img src="${EMAIL_LOGO_URL}" alt="${EMAIL_COMPANY_NAME}" width="140" height="40" style="display: block; max-width: 140px; height: auto;" />`
    : `<span style="font-size: 22px; font-weight: 700; color: ${BRAND_PRIMARY}; letter-spacing: -0.5px;">${EMAIL_COMPANY_NAME}</span>`;
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${EMAIL_COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_BODY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_BODY};">
    <tr>
      <td align="center" style="padding: 32px 16px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px;">
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid ${BORDER};">
              <a href="${EMAIL_APP_URL}" style="text-decoration: none;">${logoBlock}</a>
              ${EMAIL_TAGLINE ? `<p style="margin: 6px 0 0; font-size: 12px; color: ${TEXT_MUTED}; font-style: italic;">${EMAIL_TAGLINE}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 28px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid ${BORDER}; font-size: ${FOOTER_FONT_SIZE}; color: ${FOOTER_COLOR}; line-height: 1.5;">
              <p style="margin: 0 0 4px;">${EMAIL_COMPANY_NAME}</p>
              <p style="margin: 0;">Este es un correo automático. No respondas a este mensaje.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerificationEmail(p: VerificationEmailParams): { subject: string; html: string } {
  const subject = `Verifica tu correo - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: ${CARD_RADIUS}; border: 1px solid ${BORDER}; overflow: hidden;">
    <tr>
      <td style="padding: 28px 24px;">
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Gracias por tu interés en unirte. Para continuar con la solicitud de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>, verifica tu correo haciendo clic en el botón:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
          <tr>
            <td style="border-radius: 8px; background: ${BRAND_PRIMARY};">
              <a href="${p.verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Verificar mi correo</a>
            </td>
          </tr>
        </table>
        <p style="margin: 20px 0 0; font-size: 13px; color: ${TEXT_MUTED};">Si no solicitaste esto, ignora este mensaje. El enlace expira en 24 horas.</p>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildConfirmationEmail(p: ConfirmationEmailParams): { subject: string; html: string } {
  const subject = `Solicitud recibida - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ecfdf5; border-radius: ${CARD_RADIUS}; border: 1px solid #a7f3d0;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #065f46;">✓ Solicitud recibida</p>
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Hemos recibido tu solicitud para <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>. Te enviamos un correo de verificación. Una vez verificado, podrás completar los datos del negocio y elegir tu plan.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #059669;">
              <a href="${p.nextStepUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ver correo de verificación</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildWelcomeEmail(p: WelcomeEmailParams): { subject: string; html: string } {
  const subject = `¡Bienvenido, ${p.businessName}!`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: ${CARD_RADIUS}; border: 1px solid #93c5fd;">
    <tr>
      <td style="padding: 32px 24px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #1e40af;">¡Bienvenido, ${p.responsibleName}!</h1>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_DARK};"><strong>${p.businessName}</strong> ya está activo. Ya puedes acceder a tu panel para configurar sucursales, menú y equipo.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
          <tr>
            <td style="border-radius: 8px; background: ${BRAND_PRIMARY};">
              <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ir al panel</a>
            </td>
          </tr>
        </table>
        <p style="margin: 0; font-size: 14px; color: ${TEXT_MUTED};">Si tienes dudas, nuestro equipo de soporte está para ayudarte.</p>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildTeamNotification(p: TeamNotificationParams): { subject: string; html: string } {
  const subject = `Nueva solicitud: ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fffbeb; border-radius: ${CARD_RADIUS}; border: 1px solid #fcd34d;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Nueva solicitud de onboarding</p>
        <h1 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">${p.businessName}</h1>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
          <tr><td style="padding: 6px 0; font-size: 14px; color: ${TEXT_MUTED};"><strong style="color: ${TEXT_DARK};">Negocio:</strong> ${p.businessName}</td></tr>
          <tr><td style="padding: 6px 0; font-size: 14px; color: ${TEXT_MUTED};"><strong style="color: ${TEXT_DARK};">Responsable:</strong> ${p.responsibleName}</td></tr>
          <tr><td style="padding: 6px 0; font-size: 14px; color: ${TEXT_MUTED};"><strong style="color: ${TEXT_DARK};">Email:</strong> ${p.email}</td></tr>
          ${p.sector ? `<tr><td style="padding: 6px 0; font-size: 14px; color: ${TEXT_MUTED};"><strong style="color: ${TEXT_DARK};">Rubro:</strong> ${p.sector}</td></tr>` : ""}
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #d97706;">
              <a href="${p.dashboardUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Ver en el panel</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildPaymentReminder(p: PaymentReminderParams): { subject: string; html: string } {
  const subject = `Recordatorio de pago - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: ${CARD_RADIUS}; border: 1px solid ${BORDER};">
    <tr>
      <td style="padding: 28px 24px;">
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Tienes un pago pendiente para <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>.</p>
        ${p.amount ? `<p style="margin: 0 0 24px; font-size: 15px;"><strong style="color: ${TEXT_DARK};">Monto:</strong> ${p.amount}</p>` : ""}
        ${p.paymentUrl ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #d97706;">
              <a href="${p.paymentUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Pagar ahora</a>
            </td>
          </tr>
        </table>` : ""}
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildPaymentValidated(p: PaymentValidatedParams): { subject: string; html: string } {
	const subject = `Pago validado - ${p.businessName}`;
	const content = `
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #eff6ff; border-radius: ${CARD_RADIUS}; border: 1px solid #93c5fd;">
		<tr>
			<td style="padding: 28px 24px;">
				<p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Pago validado</p>
				<h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
				<p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Ya validamos el pago de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>. Te contactaremos el <strong style="color: ${TEXT_DARK};">${p.contactDate}</strong> para avisarte que tu página está lista.</p>
				${p.panelUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius: 8px; background: ${BRAND_PRIMARY};"><a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ver estado</a></td></tr></table>` : ""}
			</td>
		</tr>
	</table>`;
	return { subject, html: wrapEmailLayout(content) };
}

function buildBookingReminder(p: BookingReminderParams): { subject: string; html: string } {
	const subject = `Seguimiento programado - ${p.businessName}`;
	const content = `
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fffbeb; border-radius: ${CARD_RADIUS}; border: 1px solid #fcd34d;">
		<tr>
			<td style="padding: 28px 24px;">
				<p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Booking de contacto</p>
				<h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
				<p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Tal como acordamos, hoy es el seguimiento de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>. Te contactaremos para confirmar el avance de tu página y la entrega final.</p>
				<p style="margin: 0 0 24px; font-size: 15px; color: ${TEXT_DARK};"><strong>Fecha agendada:</strong> ${p.contactDate}</p>
				${p.panelUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius: 8px; background: ${BRAND_PRIMARY};"><a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Abrir panel</a></td></tr></table>` : ""}
			</td>
		</tr>
	</table>`;
	return { subject, html: wrapEmailLayout(content) };
}

function buildPlanExpiring(p: PlanExpiringParams): { subject: string; html: string } {
	const subject = `Tu plan vence pronto - ${p.businessName}`;
	const content = `
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fffbeb; border-radius: ${CARD_RADIUS}; border: 1px solid #fcd34d;">
		<tr>
			<td style="padding: 28px 24px;">
				<h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
				<p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">La suscripción de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong> vence el <strong>${p.expiresAt}</strong>. Renueva para seguir activo.</p>
				${p.panelUrl ? `
				<table role="presentation" cellspacing="0" cellpadding="0" border="0">
				  <tr>
				    <td style="border-radius: 8px; background: ${BRAND_PRIMARY};">
				      <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ir al panel</a>
				    </td>
				  </tr>
				</table>` : ""}
			</td>
		</tr>
	</table>`;
	return { subject, html: wrapEmailLayout(content) };
}

function buildInvoice(p: InvoiceParams): { subject: string; html: string } {
  const subject = `Factura / Resumen de pago - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f0fdf4; border-radius: ${CARD_RADIUS}; border: 1px solid #86efac;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de pago</p>
        <h1 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 16px; font-size: 15px; color: ${TEXT_MUTED};">Detalle del pago para <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
          <tr><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;"><strong>Plan</strong></td><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${p.planName}</td></tr>
          <tr><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;"><strong>Monto</strong></td><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${p.amount}</td></tr>
          <tr><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;"><strong>Fecha</strong></td><td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${p.date}</td></tr>
          ${p.reference ? `<tr><td style="padding: 12px 16px; font-size: 14px;"><strong>Referencia</strong></td><td style="padding: 12px 16px; font-size: 14px;">${p.reference}</td></tr>` : ""}
        </table>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildSiteReady(p: SiteReadyParams): { subject: string; html: string } {
  const subject = `Tu sitio está listo - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: ${CARD_RADIUS}; border: 1px solid #6ee7b7;">
    <tr>
      <td style="padding: 32px 24px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 600; color: #065f46;">¡Todo listo, ${p.responsibleName}!</h1>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_DARK};">La página de <strong>${p.businessName}</strong> ya está configurada y lista para funcionar.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #059669;">
              <a href="${p.siteUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ver mi sitio</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildStatusSuspended(p: StatusSuspendedParams): { subject: string; html: string } {
  const subject = `Suscripción suspendida - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fef2f2; border-radius: ${CARD_RADIUS}; border: 1px solid #fecaca;">
    <tr>
      <td style="padding: 28px 24px;">
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #991b1b;">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">La suscripción de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong> ha sido suspendida. Para reactivar, contacta a soporte o renueva tu plan.</p>
        ${p.panelUrl ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #dc2626;">
              <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ir al panel</a>
            </td>
          </tr>
        </table>` : ""}
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildStatusReactivated(p: StatusReactivatedParams): { subject: string; html: string } {
  const subject = `Cuenta reactivada - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ecfdf5; border-radius: ${CARD_RADIUS}; border: 1px solid #a7f3d0;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">Cuenta reactivada</p>
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">La cuenta de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong> ha sido reactivada. Ya puedes acceder de nuevo.</p>
        ${p.panelUrl ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #059669;">
              <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ir al panel</a>
            </td>
          </tr>
        </table>` : ""}
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildStatusCancelledScheduled(p: StatusCancelledScheduledParams): { subject: string; html: string } {
  const subject = `Cancelacion programada - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fff7ed; border-radius: ${CARD_RADIUS}; border: 1px solid #fdba74;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px;">Cancelacion programada</p>
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Recibimos tu solicitud para cancelar la suscripcion de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>.</p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: ${TEXT_DARK};"><strong>Tu servicio seguira activo hasta:</strong> ${p.endsAt}</p>
        ${p.panelUrl ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: #c2410c;">
              <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Revisar mi cuenta</a>
            </td>
          </tr>
        </table>` : ""}
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

function buildPlanDowngradeScheduled(p: PlanDowngradeScheduledParams): { subject: string; html: string } {
  const subject = `Cambio de plan programado - ${p.businessName}`;
  const content = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #eff6ff; border-radius: ${CARD_RADIUS}; border: 1px solid #93c5fd;">
    <tr>
      <td style="padding: 28px 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Cambio programado</p>
        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${TEXT_DARK};">Hola, ${p.responsibleName}</h1>
        <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: ${TEXT_MUTED};">Programamos tu cambio de plan para el cierre del ciclo actual de <strong style="color: ${TEXT_DARK};">${p.businessName}</strong>.</p>
        <p style="margin: 0 0 4px; font-size: 15px; color: ${TEXT_DARK};"><strong>Plan actual:</strong> ${p.currentPlanName}</p>
        <p style="margin: 0 0 4px; font-size: 15px; color: ${TEXT_DARK};"><strong>Nuevo plan:</strong> ${p.targetPlanName}</p>
        <p style="margin: 0 0 24px; font-size: 15px; color: ${TEXT_DARK};"><strong>Fecha efectiva:</strong> ${p.effectiveAt}</p>
        ${p.panelUrl ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 8px; background: ${BRAND_PRIMARY};">
              <a href="${p.panelUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Ver detalle en cuenta</a>
            </td>
          </tr>
        </table>` : ""}
      </td>
    </tr>
  </table>`;
  return { subject, html: wrapEmailLayout(content) };
}

export async function sendOnboardingEmail(params: EmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = params.apiKey;
  const from = params.from;

  if (!apiKey || !from) {
    return { ok: false, error: "Email provider not configured" };
  }

  let subject: string;
  let html: string;

  switch (params.type) {
    case "verification":
      ({ subject, html } = buildVerificationEmail(params));
      break;
    case "application_confirmation":
      ({ subject, html } = buildConfirmationEmail(params));
      break;
    case "welcome":
      ({ subject, html } = buildWelcomeEmail(params));
      break;
    case "team_notification":
      ({ subject, html } = buildTeamNotification(params));
      break;
    case "payment_reminder":
      ({ subject, html } = buildPaymentReminder(params));
      break;
    case "payment_validated":
      ({ subject, html } = buildPaymentValidated(params));
      break;
    case "booking_reminder":
      ({ subject, html } = buildBookingReminder(params));
      break;
    case "plan_expiring":
      ({ subject, html } = buildPlanExpiring(params));
      break;
    case "invoice":
      ({ subject, html } = buildInvoice(params));
      break;
    case "site_ready":
      ({ subject, html } = buildSiteReady(params));
      break;
    case "status_suspended":
      ({ subject, html } = buildStatusSuspended(params));
      break;
    case "status_reactivated":
      ({ subject, html } = buildStatusReactivated(params));
      break;
    case "status_cancelled_scheduled":
      ({ subject, html } = buildStatusCancelledScheduled(params));
      break;
    case "plan_downgrade_scheduled":
      ({ subject, html } = buildPlanDowngradeScheduled(params));
      break;
    default:
      return { ok: false, error: "Unknown email type" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || "Email send failed" };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
