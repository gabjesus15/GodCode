import { accountUrl, getEmailBrand } from "./brand";
import { relativeDays } from "./format";
import type { EmailBlock, EmailContent } from "./render";

/**
 * Todos los correos del producto. Cada plantilla recibe datos ya formateados (fechas y
 * montos como texto) y devuelve contenido; `render.ts` lo convierte en HTML y texto.
 * El catálogo de abajo documenta cuándo sale cada uno y trae datos de ejemplo para la
 * vista previa del super admin (/herramientas/correos) y los tests.
 */

export type EmailTemplates = {
	verify_email: { name: string; businessName: string; verifyUrl: string };
	onboarding_resume: {
		name: string;
		businessName: string;
		resumeUrl: string;
		step: "plan" | "payment";
		attempt: 1 | 2;
		planName?: string;
	};
	onboarding_receipt_received: {
		name: string;
		businessName: string;
		amount?: string;
		method?: string;
		reference: string;
		statusUrl?: string;
	};
	welcome: {
		name: string;
		businessName: string;
		setPasswordUrl: string;
		loginUrl: string;
		storeUrl?: string;
		contactDate?: string;
	};
	password_reset: { name?: string; resetUrl: string };
	payment_received: {
		name?: string;
		businessName: string;
		concept: string;
		amount: string;
		method?: string;
		reference?: string;
		paidAt: string;
		newEndsAt?: string;
		detail?: string;
		reactivated?: boolean;
	};
	payment_rejected: {
		name?: string;
		businessName: string;
		concept?: string;
		reference: string;
		reason?: string;
		actionUrl: string;
		context: "portal" | "onboarding";
	};
	receipt_received: {
		name?: string;
		businessName: string;
		concept: string;
		amount: string;
		method?: string;
		reference: string;
	};
	order_pending: {
		name?: string;
		businessName: string;
		concept: string;
		amount: string;
		createdAt: string;
		attempt: 1 | 2;
	};
	renewal_reminder: {
		name?: string;
		businessName: string;
		planName: string;
		endsAt: string;
		daysLeft: number;
		trial: boolean;
		amount?: string;
		lines?: Array<{ label: string; value: string }>;
		hasOpenOrder?: boolean;
	};
	cancellation_reminder: { name?: string; businessName: string; endsAt: string; daysLeft: number };
	subscription_expired: {
		name?: string;
		businessName: string;
		planName?: string;
		endedAt: string;
		followup: 0 | 1 | 2;
		amount?: string;
	};
	subscription_ended: { name?: string; businessName: string; endedAt: string };
	subscription_cancelled: { name?: string; businessName: string; endsAt: string };
	subscription_reactivated: { name?: string; businessName: string; endsAt?: string };
	plan_change_scheduled: {
		name?: string;
		businessName: string;
		currentPlan: string;
		targetPlan: string;
		effectiveAt: string;
	};
	plan_changed: { name?: string; businessName: string; previousPlan?: string; newPlan: string; renewalAmount?: string };
	site_ready: { name?: string; businessName: string; storeUrl: string };
	onboarding_followup: { name?: string; businessName: string; contactDate: string };
	team_new_application: { businessName: string; name: string; email: string; adminUrl: string };
	team_payment_review: {
		businessName: string;
		concept: string;
		amount: string;
		method?: string;
		reference: string;
		source: "alta" | "cuenta";
		adminUrl: string;
	};
	team_onboarding_followup: { businessName: string; name: string; email: string; contactDate: string; adminUrl: string };
};

export type EmailKind = keyof EmailTemplates;

function firstName(name: string | null | undefined): string {
	return String(name ?? "").trim().split(/\s+/)[0] ?? "";
}

function greet(name: string | null | undefined): string {
	const first = firstName(name);
	return first ? `Hola, ${first}:` : "Hola:";
}

const PAUSE_EFFECT = "Tu menú público y los pedidos online se pausan hasta que renueves. Tu información queda guardada.";

const builders: { [K in EmailKind]: (data: EmailTemplates[K]) => EmailContent } = {
	verify_email: (d) => {
		const { product } = getEmailBrand();
		return {
			audience: "prospect",
			tone: "brand",
			subject: `Confirma tu correo para crear ${d.businessName} en ${product}`,
			preheader: "Un clic y sigues con el alta. El enlace vence en 24 horas.",
			title: "Confirma tu correo",
			greeting: greet(d.name),
			intro: `Recibimos la solicitud para crear **${d.businessName}** en ${product}. Confirma que este correo es tuyo y sigue con la elección de tu plan.`,
			cta: { label: "Confirmar mi correo", url: d.verifyUrl, showUrl: true },
			ctaFirst: true,
			blocks: [],
			reason: `Recibes este correo porque se registró ${d.businessName} con esta dirección. Si no fuiste tú, ignóralo: no se creará nada. El enlace vence en 24 horas.`,
		};
	},

	onboarding_resume: (d) => {
		const payment = d.step === "payment";
		const blocks: EmailBlock[] = [
			{
				type: "steps",
				title: "Lo que falta",
				items: [
					...(payment ? [] : [{ title: "Elige tu plan", text: "Puedes sumar extras ahora o más adelante." }]),
					{ title: "Paga con PayPal o transferencia", text: "Con transferencia, subes el comprobante y lo validamos." },
					{ title: "Te enviamos el acceso a tu panel", text: "Y te ayudamos a dejar tu menú listo." },
				],
			},
			{ type: "note", text: "¿Tienes dudas antes de pagar? Responde este correo y te ayudamos." },
		];
		return {
			audience: "prospect",
			tone: "brand",
			subject: d.attempt === 1 ? `${d.businessName} está a un paso de estar en línea` : `¿Seguimos con el alta de ${d.businessName}?`,
			preheader: payment ? "Solo falta el pago para activar tu cuenta." : "Solo falta elegir tu plan y pagar. Tus datos siguen guardados.",
			title: payment ? "Solo falta el pago" : "Termina el alta de tu negocio",
			greeting: greet(d.name),
			intro: payment
				? `Ya elegiste ${d.planName ? `el plan **${d.planName}**` : "tu plan"} para **${d.businessName}**. Falta el pago para que activemos tu cuenta.`
				: `Confirmaste tu correo, pero el alta de **${d.businessName}** quedó a medias. Tus datos están guardados: sigue donde lo dejaste.`,
			blocks,
			cta: { label: payment ? "Ir al pago" : "Elegir mi plan", url: d.resumeUrl },
			reason: `Recibes este correo porque empezaste el alta de ${d.businessName}.${d.attempt === 2 ? " Es el último recordatorio: no te escribiremos más sobre esto." : ""}`,
		};
	},

	onboarding_receipt_received: (d) => ({
		audience: "prospect",
		tone: "brand",
		subject: `Recibimos tu comprobante · ${d.businessName}`,
		preheader: "Lo revisamos y te avisamos por correo apenas quede validado.",
		title: "Estamos revisando tu pago",
		greeting: greet(d.name),
		intro: `Recibimos el comprobante de **${d.businessName}**. Nuestro equipo lo valida a mano y te avisamos por correo apenas quede listo.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Monto", value: d.amount ?? "", emphasis: true },
					{ label: "Método", value: d.method ?? "" },
					{ label: "Referencia", value: d.reference },
				],
			},
			{
				type: "steps",
				title: "Qué sigue",
				items: [
					{ title: "Validamos el pago" },
					{ title: "Activamos tu cuenta", text: "Te llega un correo para crear tu contraseña." },
					{ title: "Te ayudamos a dejar tu menú listo" },
				],
			},
			{ type: "note", text: "No hace falta que vuelvas a pagar." },
		],
		secondary: d.statusUrl ? { label: "Ver el estado de mi alta", url: d.statusUrl } : undefined,
		reason: `Recibes este correo por el alta de ${d.businessName}.`,
	}),

	welcome: (d) => {
		const { product } = getEmailBrand();
		const steps = [
			{ title: "Crea tu contraseña", text: "El enlace de arriba sirve una sola vez." },
			{ title: "Carga tu menú", text: "Productos, fotos, precios y horarios desde tu panel." },
			...(d.contactDate ? [{ title: `Te escribimos el ${d.contactDate}`, text: "Para ayudarte a dejar tu página lista." }] : []),
		];
		return {
			audience: "customer",
			tone: "success",
			subject: `${d.businessName} ya está activo en ${product}`,
			preheader: "Crea tu contraseña para entrar a tu panel.",
			title: `Te damos la bienvenida a ${product}`,
			greeting: greet(d.name),
			intro: `El pago quedó registrado y **${d.businessName}** ya tiene su cuenta activa. Empieza por crear tu contraseña.`,
			cta: { label: "Crear mi contraseña", url: d.setPasswordUrl, showUrl: true },
			ctaFirst: true,
			blocks: [
				{
					type: "summary",
					title: "Guarda estos enlaces",
					rows: [
						{ label: "Tu panel", value: d.loginUrl },
						{ label: "Tu menú público", value: d.storeUrl ?? "" },
					],
				},
				{ type: "steps", title: "Primeros pasos", items: steps },
				{ type: "note", text: "Si el enlace vence, entra a tu panel y usa «¿Olvidaste tu contraseña?»: te enviamos otro." },
			],
			reason: `Recibes este correo porque ${d.businessName} se activó con esta dirección.`,
		};
	},

	password_reset: (d) => {
		const { product } = getEmailBrand();
		return {
			audience: "customer",
			tone: "brand",
			subject: `Restablece tu contraseña de ${product}`,
			preheader: "El enlace sirve una sola vez.",
			title: "Elige una contraseña nueva",
			greeting: greet(d.name),
			intro: "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
			cta: { label: "Elegir contraseña nueva", url: d.resetUrl, showUrl: true },
			ctaFirst: true,
			blocks: [],
			reason: "Recibes este correo porque alguien pidió restablecer la contraseña de esta cuenta. Si no fuiste tú, ignóralo: tu contraseña sigue igual.",
		};
	},

	payment_received: (d) => ({
		audience: "customer",
		tone: "success",
		subject: `Pago recibido: ${d.concept}`,
		preheader: d.newEndsAt ? `Tu plan ahora vence el ${d.newEndsAt}.` : "Ya quedó aplicado en tu cuenta.",
		title: `Recibimos ${d.amount}`,
		greeting: greet(d.name),
		intro: `Gracias. El pago de **${d.businessName}** quedó aplicado.${d.reactivated ? " Tu tienda vuelve a estar en línea." : ""}`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Concepto", value: d.concept },
					{ label: "Monto", value: d.amount, emphasis: true },
					{ label: "Método", value: d.method ?? "" },
					{ label: "Referencia", value: d.reference ?? "" },
					{ label: "Fecha", value: d.paidAt },
					{ label: "Nuevo vencimiento", value: d.newEndsAt ?? "", emphasis: true },
				],
			},
			...(d.detail ? [{ type: "text" as const, text: d.detail }] : []),
			{ type: "note", text: "Guarda este correo como comprobante de tu pago." },
		],
		cta: { label: "Ver mi cuenta", url: accountUrl("facturacion") },
		reason: `Recibes este correo porque se registró un pago de ${d.businessName}.`,
	}),

	payment_rejected: (d) => ({
		audience: d.context === "portal" ? "customer" : "prospect",
		tone: "danger",
		subject: `No pudimos validar tu pago de ${d.businessName}`,
		preheader: d.reason ? `Motivo: ${d.reason}` : "Revisa el comprobante o paga de otra forma.",
		title: "No pudimos validar tu pago",
		greeting: greet(d.name),
		intro: `Revisamos el comprobante${d.concept ? ` de **${d.concept}**` : ""} (referencia ${d.reference}) y no pudimos validarlo.`,
		blocks: [
			...(d.reason ? [{ type: "callout" as const, tone: "danger" as const, title: "Motivo", text: d.reason }] : []),
			{
				type: "steps",
				title: "Cómo seguir",
				items: [
					{ title: "Revisa el monto y los datos de la transferencia" },
					{ title: "Sube otro comprobante o paga con PayPal" },
					{ title: "¿Crees que es un error?", text: "Responde este correo con el comprobante y lo revisamos." },
				],
			},
		],
		cta: { label: d.context === "portal" ? "Revisar mi pago" : "Volver al pago", url: d.actionUrl },
		reason: `Recibes este correo por un pago de ${d.businessName}.`,
	}),

	receipt_received: (d) => ({
		audience: "customer",
		tone: "brand",
		subject: `Recibimos tu comprobante: ${d.concept}`,
		preheader: "Lo revisamos y te avisamos apenas quede aplicado.",
		title: "Estamos revisando tu pago",
		greeting: greet(d.name),
		intro: `Recibimos el comprobante de **${d.concept}** para **${d.businessName}**. Te escribimos apenas lo validemos.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Concepto", value: d.concept },
					{ label: "Monto", value: d.amount, emphasis: true },
					{ label: "Método", value: d.method ?? "" },
					{ label: "Referencia", value: d.reference },
				],
			},
			{ type: "note", text: "Mientras lo revisamos no hace falta que vuelvas a pagar, y tu servicio sigue igual." },
		],
		secondary: { label: "Ver mis pagos", url: accountUrl("facturacion") },
		reason: `Recibes este correo por un pago de ${d.businessName}.`,
	}),

	order_pending: (d) => ({
		audience: "customer",
		tone: "warning",
		subject: d.attempt === 1 ? `Tu pago de ${d.concept} sigue pendiente` : `Recordatorio: falta pagar ${d.concept}`,
		preheader: `${d.amount} · puedes pagarlo con PayPal o transferencia.`,
		title: "Tienes un pago sin completar",
		greeting: greet(d.name),
		intro: `El ${d.createdAt} iniciaste **${d.concept}** para **${d.businessName}**, pero todavía no recibimos el pago.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Concepto", value: d.concept },
					{ label: "Monto", value: d.amount, emphasis: true },
				],
			},
			{ type: "note", text: "Si ya no lo necesitas, puedes anularlo desde tu cuenta." },
		],
		cta: { label: "Completar el pago", url: accountUrl("facturacion") },
		reason: `Recibes este correo porque ${d.businessName} tiene un pago sin completar.`,
	}),

	renewal_reminder: (d) => {
		const { product } = getEmailBrand();
		const soon = d.daysLeft <= 1;
		const when = relativeDays(d.daysLeft);
		const subject = d.trial
			? soon
				? `Tu prueba de ${product} termina ${when}`
				: `Tu prueba de ${product} termina el ${d.endsAt}`
			: soon
				? `Tu plan ${d.planName} vence ${when}`
				: `Tu plan ${d.planName} vence el ${d.endsAt}`;
		const rows = [
			{ label: "Plan", value: d.planName },
			{ label: d.trial ? "Termina" : "Vence", value: d.endsAt },
			...(d.lines && d.lines.length > 1 ? d.lines : []),
			{ label: "Renovación mensual", value: d.amount ?? "", emphasis: true },
		];
		return {
			audience: "customer",
			tone: d.daysLeft <= 3 ? "warning" : "brand",
			subject,
			preheader: d.amount
				? `Renueva por ${d.amount} al mes y ${d.businessName} sigue en línea sin cortes.`
				: `Renueva para que ${d.businessName} siga en línea sin cortes.`,
			title: d.trial
				? soon
					? `Tu prueba termina ${when}`
					: `Tu prueba termina en ${d.daysLeft} días`
				: soon
					? `Tu plan vence ${when}`
					: `Tu plan vence en ${d.daysLeft} días`,
			greeting: greet(d.name),
			intro: d.trial
				? `La prueba de **${d.businessName}** termina el **${d.endsAt}**. Elige cómo seguir y tu tienda continúa en línea sin cortes.`
				: `El plan **${d.planName}** de **${d.businessName}** vence el **${d.endsAt}**. Si renuevas antes, los días nuevos se suman al final: no pierdes ninguno.`,
			blocks: [
				{ type: "summary", rows },
				...(d.hasOpenOrder
					? [{ type: "callout" as const, tone: "brand" as const, title: "Ya empezaste la renovación", text: "Tienes un pago iniciado en tu cuenta: solo falta completarlo." }]
					: []),
				...(d.daysLeft <= 3 ? [{ type: "callout" as const, tone: "warning" as const, title: "Si no renuevas", text: PAUSE_EFFECT }] : []),
				{ type: "note", text: "Puedes pagar 1, 3, 6 o 12 meses con PayPal o transferencia." },
			],
			cta: { label: d.hasOpenOrder ? "Completar el pago" : "Renovar ahora", url: accountUrl(d.hasOpenOrder ? "facturacion" : "plan") },
			reason: `Recibes este correo porque eres quien administra ${d.businessName}.`,
		};
	},

	cancellation_reminder: (d) => ({
		audience: "customer",
		tone: "warning",
		subject: `${d.businessName} deja de estar en línea el ${d.endsAt}`,
		preheader: "Cancelaste tu plan. Si cambiaste de opinión, puedes seguir en un clic.",
		title: `Tu plan termina ${relativeDays(d.daysLeft)}`,
		greeting: greet(d.name),
		intro: `Como pediste, el plan de **${d.businessName}** termina el **${d.endsAt}**. Desde ese día tu menú público y los pedidos online dejan de funcionar.`,
		blocks: [{ type: "note", text: "Si ya lo decidiste, no tienes que hacer nada. Gracias por haber confiado en nosotros." }],
		cta: { label: "Seguir con mi plan", url: accountUrl("plan") },
		reason: `Recibes este correo porque cancelaste el plan de ${d.businessName}.`,
	}),

	subscription_expired: (d) => {
		const titles = ["Tu tienda está en pausa", "Tu tienda sigue en pausa", "Tu tienda te está esperando"] as const;
		const subjects = [
			`Tu plan venció: ${d.businessName} está en pausa`,
			`${d.businessName} sigue en pausa`,
			`¿Volvemos a poner ${d.businessName} en línea?`,
		] as const;
		return {
			audience: "customer",
			tone: d.followup === 0 ? "danger" : "warning",
			subject: subjects[d.followup],
			preheader: "Renueva y tu menú vuelve a funcionar al instante.",
			title: titles[d.followup],
			greeting: greet(d.name),
			intro: `El plan${d.planName ? ` **${d.planName}**` : ""} de **${d.businessName}** venció el **${d.endedAt}**. Mientras no renueves, tus clientes no pueden ver tu menú ni hacer pedidos online.`,
			blocks: [
				{ type: "callout", tone: "success", title: "No perdiste nada", text: "Tus productos, pedidos y configuración siguen guardados. Al renovar, todo vuelve tal como estaba." },
				...(d.amount ? [{ type: "summary" as const, rows: [{ label: "Renovación mensual", value: d.amount, emphasis: true }] }] : []),
			],
			cta: { label: "Renovar y volver a estar en línea", url: accountUrl("plan") },
			reason: `Recibes este correo porque eres quien administra ${d.businessName}.${d.followup === 2 ? " Es el último aviso sobre este vencimiento." : ""}`,
		};
	},

	subscription_ended: (d) => {
		const { product } = getEmailBrand();
		return {
			audience: "customer",
			tone: "neutral",
			subject: `Tu plan de ${product} terminó`,
			preheader: "Tu información queda guardada si algún día quieres volver.",
			title: "Tu plan terminó",
			greeting: greet(d.name),
			intro: `Como pediste, el plan de **${d.businessName}** terminó el **${d.endedAt}** y tu tienda ya no está en línea.`,
			blocks: [
				{ type: "text", text: "Tu información queda guardada. Si quieres volver, contrata un plan desde tu cuenta y todo se reactiva." },
				{ type: "note", text: "¿Nos cuentas por qué te fuiste? Responde este correo: lo leemos todo." },
			],
			cta: { label: "Volver a activar mi tienda", url: accountUrl("plan") },
			reason: `Recibes este correo porque el plan de ${d.businessName} terminó.`,
		};
	},

	subscription_cancelled: (d) => ({
		audience: "customer",
		tone: "neutral",
		subject: `Cancelación confirmada: sigues activo hasta el ${d.endsAt}`,
		preheader: "No se cobra nada más. Puedes arrepentirte hasta esa fecha.",
		title: "Recibimos tu cancelación",
		greeting: greet(d.name),
		intro: `El plan de **${d.businessName}** no se renovará. Todo sigue funcionando hasta el **${d.endsAt}**.`,
		blocks: [{ type: "text", text: "Te avisaremos unos días antes. Si cambias de opinión, sigue con tu plan desde tu cuenta y no se corta nada." }],
		cta: { label: "Seguir con mi plan", url: accountUrl("plan") },
		reason: `Recibes este correo porque se canceló el plan de ${d.businessName}.`,
	}),

	subscription_reactivated: (d) => ({
		audience: "customer",
		tone: "success",
		subject: `${d.businessName} sigue activo`,
		preheader: "Anulaste la cancelación: tu plan sigue como antes.",
		title: "Tu plan sigue activo",
		greeting: greet(d.name),
		intro: `Anulaste la cancelación del plan de **${d.businessName}**.${d.endsAt ? ` Tu periodo actual vence el **${d.endsAt}** y te avisaremos antes para renovar.` : ""}`,
		blocks: [],
		secondary: { label: "Ver mi plan", url: accountUrl("plan") },
		reason: `Recibes este correo porque eres quien administra ${d.businessName}.`,
	}),

	plan_change_scheduled: (d) => ({
		audience: "customer",
		tone: "brand",
		subject: `Cambio de plan programado para el ${d.effectiveAt}`,
		preheader: `Hasta esa fecha sigues con todo lo del plan ${d.currentPlan}.`,
		title: `Pasarás al plan ${d.targetPlan}`,
		greeting: greet(d.name),
		intro: `Programamos el cambio de **${d.currentPlan}** a **${d.targetPlan}** para **${d.businessName}**. Hasta el **${d.effectiveAt}** sigues con todo lo de tu plan actual.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Plan actual", value: d.currentPlan },
					{ label: "Nuevo plan", value: d.targetPlan, emphasis: true },
					{ label: "Desde", value: d.effectiveAt },
				],
			},
			{ type: "note", text: "Si cambias de idea, puedes anular el cambio desde tu cuenta antes de esa fecha." },
		],
		cta: { label: "Ver mi plan", url: accountUrl("plan") },
		reason: `Recibes este correo porque se programó un cambio de plan en ${d.businessName}.`,
	}),

	plan_changed: (d) => ({
		audience: "customer",
		tone: "success",
		subject: `Desde hoy tu plan es ${d.newPlan}`,
		preheader: "Aplicamos el cambio de plan que programaste.",
		title: `Ya estás en el plan ${d.newPlan}`,
		greeting: greet(d.name),
		intro: `Aplicamos el cambio de plan que programaste para **${d.businessName}**.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Antes", value: d.previousPlan ?? "" },
					{ label: "Ahora", value: d.newPlan, emphasis: true },
					{ label: "Próxima renovación", value: d.renewalAmount ? `${d.renewalAmount} al mes` : "" },
				],
			},
		],
		cta: { label: "Ver mi plan", url: accountUrl("plan") },
		reason: `Recibes este correo porque eres quien administra ${d.businessName}.`,
	}),

	site_ready: (d) => ({
		audience: "customer",
		tone: "success",
		subject: `Tu página de ${d.businessName} está lista`,
		preheader: "Ya puedes compartir tu menú con tus clientes.",
		title: "Tu página ya está en línea",
		greeting: greet(d.name),
		intro: `Terminamos de configurar **${d.businessName}**. Tu menú ya recibe visitas y pedidos.`,
		blocks: [
			{ type: "code", label: "Tu menú público", value: d.storeUrl },
			{
				type: "steps",
				title: "Para sacarle provecho",
				items: [
					{ title: "Comparte el enlace", text: "En tu Instagram, tu WhatsApp y en un QR en las mesas." },
					{ title: "Mantén tu menú al día", text: "Precios, fotos y productos agotados desde tu panel." },
				],
			},
		],
		cta: { label: "Ver mi página", url: d.storeUrl },
		secondary: { label: "Entrar a mi panel", url: `${getEmailBrand().appUrl}/login` },
		reason: `Recibes este correo porque eres quien administra ${d.businessName}.`,
	}),

	onboarding_followup: (d) => ({
		audience: "customer",
		tone: "brand",
		subject: `Hoy te contactamos para dejar lista tu página · ${d.businessName}`,
		preheader: "Vamos a revisar contigo tu menú y la entrega final.",
		title: "Hoy revisamos tu página contigo",
		greeting: greet(d.name),
		intro: `Tal como quedamos, hoy (${d.contactDate}) te contactamos para revisar el avance de **${d.businessName}** y dejar tu página lista.`,
		blocks: [{ type: "note", text: "Si prefieres otro horario, responde este correo." }],
		reason: `Recibes este correo por el alta de ${d.businessName}.`,
	}),

	team_new_application: (d) => ({
		audience: "team",
		tone: "brand",
		subject: `Nueva solicitud de alta: ${d.businessName}`,
		preheader: `${d.name} · ${d.email}`,
		title: `Nueva solicitud: ${d.businessName}`,
		intro: "Llegó una solicitud de alta. Todavía tiene que confirmar el correo, elegir plan y pagar.",
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Negocio", value: d.businessName },
					{ label: "Responsable", value: d.name },
					{ label: "Correo", value: d.email },
				],
			},
		],
		cta: { label: "Ver en el panel", url: d.adminUrl },
	}),

	team_payment_review: (d) => ({
		audience: "team",
		tone: "warning",
		subject: `Pago por validar: ${d.businessName} · ${d.amount}`,
		preheader: `${d.concept} · ${d.reference}`,
		title: "Hay un comprobante por validar",
		intro: d.source === "alta"
			? `**${d.businessName}** subió el comprobante de su alta. Espera la validación para que activemos su cuenta.`
			: `**${d.businessName}** subió un comprobante desde su cuenta. Espera la validación para que se aplique su compra.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Concepto", value: d.concept },
					{ label: "Monto", value: d.amount, emphasis: true },
					{ label: "Método", value: d.method ?? "" },
					{ label: "Referencia", value: d.reference },
				],
			},
		],
		cta: { label: "Revisar pagos por validar", url: d.adminUrl },
	}),

	team_onboarding_followup: (d) => ({
		audience: "team",
		tone: "brand",
		subject: `Hoy toca contactar a ${d.businessName}`,
		preheader: `${d.name} · ${d.email}`,
		title: `Contactar a ${d.businessName}`,
		intro: `Hoy (${d.contactDate}) toca revisar con el cliente el avance de su página y la entrega final.`,
		blocks: [
			{
				type: "summary",
				rows: [
					{ label: "Negocio", value: d.businessName },
					{ label: "Responsable", value: d.name },
					{ label: "Correo", value: d.email },
				],
			},
		],
		cta: { label: "Abrir el panel", url: d.adminUrl },
	}),
};

export function buildEmailContent<K extends EmailKind>(kind: K, data: EmailTemplates[K]): EmailContent {
	return builders[kind](data);
}

export type EmailGroup = "Alta" | "Pagos" | "Suscripción" | "Cuenta" | "Equipo";

export type EmailCatalogEntry<K extends EmailKind = EmailKind> = {
	kind: K;
	group: EmailGroup;
	label: string;
	/** Cuándo sale, en palabras. */
	trigger: string;
	automatic: boolean;
	sample: EmailTemplates[K];
};

const SAMPLE_BUSINESS = "La Parada Criolla";
const SAMPLE_NAME = "Camila Rojas";

function entry<K extends EmailKind>(value: EmailCatalogEntry<K>): EmailCatalogEntry<K> {
	return value;
}

/** Orden de la vista previa: el recorrido de un cliente, de la solicitud al vencimiento. */
export const EMAIL_CATALOG: EmailCatalogEntry[] = [
	entry({
		kind: "verify_email",
		group: "Alta",
		label: "Confirmar correo",
		trigger: "Al registrarse en el paso 1 del alta y al pedir que se reenvíe.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, verifyUrl: "https://example.com/onboarding/verify?token=demo" },
	}),
	entry({
		kind: "onboarding_resume",
		group: "Alta",
		label: "Alta a medias",
		trigger: "Automático: si el alta queda sin terminar, al día siguiente y a los 3 días. Nunca más de dos.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, resumeUrl: "https://example.com/onboarding/pago?token=demo", step: "payment", attempt: 1, planName: "Pro" },
	}),
	entry({
		kind: "onboarding_receipt_received",
		group: "Alta",
		label: "Comprobante del alta recibido",
		trigger: "Al subir el comprobante de una transferencia en el alta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, amount: "US$ 29,00", method: "Transferencia bancaria", reference: "ONB-2F9A31C7", statusUrl: "https://example.com/onboarding/complete?token=demo" },
	}),
	entry({
		kind: "welcome",
		group: "Alta",
		label: "Bienvenida y contraseña",
		trigger: "Cuando se confirma el pago del alta (PayPal o comprobante validado).",
		automatic: false,
		sample: {
			name: SAMPLE_NAME,
			businessName: SAMPLE_BUSINESS,
			setPasswordUrl: "https://example.com/login/nueva-clave?code=demo",
			loginUrl: "https://example.com/login",
			storeUrl: "https://la-parada.example.com",
			contactDate: "viernes, 26 de septiembre de 2026",
		},
	}),
	entry({
		kind: "site_ready",
		group: "Alta",
		label: "Página lista",
		trigger: "Cuando el equipo marca como resuelto el ticket de entrega del alta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, storeUrl: "https://la-parada.example.com" },
	}),
	entry({
		kind: "onboarding_followup",
		group: "Alta",
		label: "Seguimiento del alta (cliente)",
		trigger: "El día agendado para contactar al negocio, solo si no hay correo de equipo configurado.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, contactDate: "viernes, 26 de septiembre de 2026" },
	}),
	entry({
		kind: "payment_received",
		group: "Pagos",
		label: "Pago recibido",
		trigger: "Al pagar con PayPal en /cuenta o cuando el equipo valida un comprobante.",
		automatic: false,
		sample: {
			name: SAMPLE_NAME,
			businessName: SAMPLE_BUSINESS,
			concept: "Renovación Pro · 3 meses",
			amount: "US$ 87,00",
			method: "PayPal",
			reference: "RENEW-1758652800-7C1D2E3F",
			paidAt: "23 de septiembre de 2026",
			newEndsAt: "22 de enero de 2027",
		},
	}),
	entry({
		kind: "receipt_received",
		group: "Pagos",
		label: "Comprobante recibido",
		trigger: "Al subir un comprobante en /cuenta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, concept: "Renovación Pro · 1 mes", amount: "US$ 29,00", method: "Transferencia bancaria", reference: "RENEW-1758652800-7C1D2E3F" },
	}),
	entry({
		kind: "payment_rejected",
		group: "Pagos",
		label: "Pago rechazado",
		trigger: "Cuando el equipo rechaza un comprobante (en el alta o en /cuenta).",
		automatic: false,
		sample: {
			name: SAMPLE_NAME,
			businessName: SAMPLE_BUSINESS,
			concept: "Renovación Pro · 1 mes",
			reference: "RENEW-1758652800-7C1D2E3F",
			reason: "El monto transferido (US$ 20,00) no coincide con el del pedido (US$ 29,00).",
			actionUrl: "https://example.com/cuenta?tab=facturacion",
			context: "portal",
		},
	}),
	entry({
		kind: "order_pending",
		group: "Pagos",
		label: "Pago sin completar",
		trigger: "Automático: pedido de /cuenta sin pagar, al día siguiente y a los 4 días.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, concept: "Extra: Dominio propio", amount: "US$ 12,50", createdAt: "21 de septiembre de 2026", attempt: 1 },
	}),
	entry({
		kind: "renewal_reminder",
		group: "Suscripción",
		label: "Tu plan vence pronto",
		trigger: "Automático: 7 días, 3 días y 1 día antes del vencimiento. En prueba gratis, con su propio texto.",
		automatic: true,
		sample: {
			name: SAMPLE_NAME,
			businessName: SAMPLE_BUSINESS,
			planName: "Pro",
			endsAt: "26 de septiembre de 2026",
			daysLeft: 3,
			trial: false,
			amount: "US$ 41,50",
			lines: [
				{ label: "Plan Pro", value: "US$ 29,00" },
				{ label: "Dominio propio", value: "US$ 12,50" },
			],
		},
	}),
	entry({
		kind: "subscription_expired",
		group: "Suscripción",
		label: "Plan vencido",
		trigger: "Automático: el día que vence sin renovar y, si sigue así, a los 3 y a los 10 días.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, planName: "Pro", endedAt: "22 de septiembre de 2026", followup: 0, amount: "US$ 29,00" },
	}),
	entry({
		kind: "subscription_cancelled",
		group: "Suscripción",
		label: "Cancelación confirmada",
		trigger: "Al cancelar el plan desde /cuenta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, endsAt: "15 de octubre de 2026" },
	}),
	entry({
		kind: "cancellation_reminder",
		group: "Suscripción",
		label: "Tu plan cancelado termina pronto",
		trigger: "Automático: 3 días antes de que termine un plan cancelado.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, endsAt: "15 de octubre de 2026", daysLeft: 3 },
	}),
	entry({
		kind: "subscription_ended",
		group: "Suscripción",
		label: "Plan terminado",
		trigger: "Automático: el día en que termina un plan cancelado.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, endedAt: "15 de octubre de 2026" },
	}),
	entry({
		kind: "subscription_reactivated",
		group: "Suscripción",
		label: "Cancelación anulada",
		trigger: "Al anular la cancelación desde /cuenta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, endsAt: "15 de octubre de 2026" },
	}),
	entry({
		kind: "plan_change_scheduled",
		group: "Suscripción",
		label: "Cambio de plan programado",
		trigger: "Al programar una bajada de plan desde /cuenta.",
		automatic: false,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, currentPlan: "Pro", targetPlan: "Básico", effectiveAt: "15 de octubre de 2026" },
	}),
	entry({
		kind: "plan_changed",
		group: "Suscripción",
		label: "Cambio de plan aplicado",
		trigger: "Automático: el día en que se aplica un cambio programado.",
		automatic: true,
		sample: { name: SAMPLE_NAME, businessName: SAMPLE_BUSINESS, previousPlan: "Pro", newPlan: "Básico", renewalAmount: "US$ 19,00" },
	}),
	entry({
		kind: "password_reset",
		group: "Cuenta",
		label: "Restablecer contraseña",
		trigger: "Al pedir «¿Olvidaste tu contraseña?» en el login.",
		automatic: false,
		sample: { name: SAMPLE_NAME, resetUrl: "https://example.com/login/nueva-clave?code=demo" },
	}),
	entry({
		kind: "team_new_application",
		group: "Equipo",
		label: "Nueva solicitud de alta",
		trigger: "Al recibir una solicitud en el paso 1. Va al correo del equipo (ONBOARDING_TEAM_EMAIL).",
		automatic: false,
		sample: { businessName: SAMPLE_BUSINESS, name: SAMPLE_NAME, email: "camila@laparada.cl", adminUrl: "https://example.com/onboarding/solicitudes" },
	}),
	entry({
		kind: "team_payment_review",
		group: "Equipo",
		label: "Comprobante por validar",
		trigger: "Cuando un cliente sube un comprobante, en el alta o en /cuenta. Va al correo del equipo.",
		automatic: false,
		sample: {
			businessName: SAMPLE_BUSINESS,
			concept: "Renovación Pro · 1 mes",
			amount: "US$ 29,00",
			method: "Transferencia bancaria",
			reference: "RENEW-1758652800-7C1D2E3F",
			source: "cuenta",
			adminUrl: "https://example.com/dashboard/pagos",
		},
	}),
	entry({
		kind: "team_onboarding_followup",
		group: "Equipo",
		label: "Hoy toca contactar a un negocio",
		trigger: "El día agendado para el seguimiento de un alta. Va al correo del equipo.",
		automatic: true,
		sample: { businessName: SAMPLE_BUSINESS, name: SAMPLE_NAME, email: "camila@laparada.cl", contactDate: "viernes, 26 de septiembre de 2026", adminUrl: "https://example.com/tickets" },
	}),
];

export function findCatalogEntry(kind: string): EmailCatalogEntry | null {
	return EMAIL_CATALOG.find((item) => item.kind === kind) ?? null;
}
