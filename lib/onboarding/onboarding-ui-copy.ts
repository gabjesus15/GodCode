/**
 * Textos del alta (cabecera, barra de pasos, paso 1 y confirmación de correo) en los seis
 * idiomas del sitio. «Crear mi tienda» está en `store-start-copy.ts`; el plan y el pago
 * tienen los suyos junto a su formulario.
 * `{email}`, `{n}` y `{seconds}` se reemplazan al usarlos.
 *
 * Quien llega con un plan «solo panel CEO» (sin menú público) no arma tienda: con
 * `getOnboardingUiCopy(locale, { panelOnly: true })` los textos dejan de prometerla.
 *
 * Los errores del paso 1 llegan del servicio de alta como códigos (abajo) y se traducen aquí.
 */

export type OnboardingLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export function resolveOnboardingLocale(locale: string | null | undefined): OnboardingLocale {
	const value = String(locale ?? "es").toLowerCase();
	for (const candidate of ["en", "pt", "fr", "de", "it"] as const) if (value.startsWith(candidate)) return candidate;
	return "es";
}

/**
 * Códigos de error de `/api/onboarding/apply` (el paso 1) y de
 * `/api/onboarding/resend-verification` («Reenviar correo»). El servicio los responde junto a
 * un texto en español que queda para el log y para clientes viejos: el formulario muestra el
 * de su idioma (`form.errors` y `form.resendErrors`).
 */
export const APPLY_ERROR_CODES = ["invalid_input", "email_invalid", "terms_required", "recaptcha_failed", "rate_limited", "server_error"] as const;
export type ApplyErrorCode = (typeof APPLY_ERROR_CODES)[number];

export const RESEND_ERROR_CODES = ["email_invalid", "rate_limited", "email_not_sent", "server_error"] as const;
export type ResendErrorCode = (typeof RESEND_ERROR_CODES)[number];

/**
 * El código de la respuesta si es uno conocido. Si no trae (el límite de intentos de la app,
 * el servicio caído o una versión del servicio anterior a los códigos), el que sale del
 * status: 429 es el límite y lo demás, un problema nuestro.
 */
function resolveErrorCode<Code extends string>(known: readonly Code[], code: unknown, status: number): Code | "rate_limited" | "server_error" {
	if (typeof code === "string" && (known as readonly string[]).includes(code)) return code as Code;
	return status === 429 ? "rate_limited" : "server_error";
}

export function resolveApplyErrorCode(code: unknown, status: number): ApplyErrorCode {
	return resolveErrorCode(APPLY_ERROR_CODES, code, status);
}

export function resolveResendErrorCode(code: unknown, status: number): ResendErrorCode {
	return resolveErrorCode(RESEND_ERROR_CODES, code, status);
}

type StepItem = { title: string; hint: string };

export type OnboardingUiCopy = {
	header: { haveAccount: string; signIn: string };
	footer: { secure: string; terms: string; privacy: string; help: string };
	steps: { aria: string; progress: string; items: [StepItem, StepItem, StepItem] };
	start: {
		title: string;
		subtitle: string;
		includesTitle: string;
		includes: string[];
		nextTitle: string;
		next: Array<{ title: string; text: string }>;
		helpText: string;
		businessesLink: string;
	};
	form: {
		businessName: string;
		businessPlaceholder: string;
		businessHint: string;
		yourName: string;
		yourNamePlaceholder: string;
		email: string;
		emailPlaceholder: string;
		emailHint: string;
		consentPrefix: string;
		termsLink: string;
		consentJoin: string;
		privacyLink: string;
		analyticsNotice: string;
		submit: string;
		/** Por código de `/api/onboarding/apply`. */
		errors: Record<ApplyErrorCode, string>;
		/** La petición no llegó (sin conexión): en el envío y en «Reenviar correo». */
		errorConnection: string;
		sentTitle: string;
		sentBody: string;
		sentTips: string[];
		notSentTitle: string;
		notSentBody: string;
		resend: string;
		resending: string;
		resendWait: string;
		resendSuccess: string;
		/** Por código de `/api/onboarding/resend-verification`. */
		resendErrors: Record<ResendErrorCode, string>;
		wrongEmail: string;
		startOver: string;
	};
	verify: {
		checking: string;
		okTitle: string;
		okBody: string;
		continue: string;
		errorTitle: string;
		missingToken: string;
		genericError: string;
		connectionError: string;
		/** Falla del servidor (o límite de intentos): el enlace puede estar bien, se reintenta. */
		serverError: string;
		retry: string;
		startOver: string;
		help: string;
	};
};

const es: OnboardingUiCopy = {
	header: { haveAccount: "¿Ya tienes cuenta?", signIn: "Iniciar sesión" },
	footer: { secure: "Conexión cifrada y correo verificado.", terms: "Términos", privacy: "Privacidad", help: "Ayuda" },
	steps: {
		aria: "Pasos del alta",
		progress: "Paso {n} de 3",
		items: [
			{ title: "Registro", hint: "Tus datos" },
			{ title: "Tu tienda", hint: "Ármala gratis" },
			{ title: "Publicar", hint: "Plan y pago" },
		],
	},
	start: {
		title: "Crea tu tienda online",
		subtitle: "Ármala gratis con tu menú, tu logo y tus colores. Pagas cuando quieras publicarla.",
		includesTitle: "Todos los planes incluyen",
		includes: [
			"Menú digital con tu marca, listo para compartir",
			"Pedidos online desde tu link o tu QR",
			"Caja para cobrar en tu local",
			"Sin comisiones por venta",
		],
		nextTitle: "Cómo sigue",
		next: [
			{ title: "Confirma tu correo", text: "Te enviamos un enlace ahora mismo." },
			{ title: "Arma tu tienda", text: "Menú, logo y colores, con vista previa. Sin pagar nada." },
			{ title: "Publícala cuando quieras", text: "Eliges tu plan y pagas al abrirla a tus clientes." },
		],
		helpText: "¿Dudas antes de empezar? Escríbenos:",
		businessesLink: "Ver negocios que ya usan Gcode POS",
	},
	form: {
		businessName: "Nombre del negocio",
		businessPlaceholder: "Ej.: La Parada Criolla",
		businessHint: "Así aparecerá en tu menú. Puedes cambiarlo después.",
		yourName: "Tu nombre",
		yourNamePlaceholder: "Ej.: Camila Rojas",
		email: "Correo",
		emailPlaceholder: "tu@negocio.com",
		emailHint: "Te enviaremos un enlace para confirmarlo.",
		consentPrefix: "Acepto los",
		termsLink: "términos de servicio",
		consentJoin: "y la",
		privacyLink: "política de privacidad",
		analyticsNotice:
			"Gcode mide el uso de la plataforma (tu panel CEO y tu menú público) con analítica propia y, si lo aceptas en el aviso de cookies, Google Analytics.",
		submit: "Crear mi tienda",
		errors: {
			invalid_input: "Escribe el nombre del negocio y tu nombre, con al menos 2 letras.",
			email_invalid: "Revisa tu correo. Debe tener la forma tu@negocio.com.",
			terms_required: "Para seguir, acepta los términos y la política de privacidad.",
			recaptcha_failed: "No pudimos comprobar que eres una persona. Recarga la página e inténtalo de nuevo.",
			rate_limited: "Hiciste muchos intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
			server_error: "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.",
		},
		errorConnection: "No hay conexión. Revisa tu internet e intenta de nuevo.",
		sentTitle: "Revisa tu correo",
		sentBody: "Enviamos un enlace a {email}. Ábrelo para crear tu tienda.",
		sentTips: ["Llega en menos de un minuto. Si no lo ves, revisa spam o promociones.", "El enlace vale 7 días."],
		notSentTitle: "Guardamos tu solicitud",
		notSentBody: "Pero el correo a {email} no salió. Pulsa «Reenviar correo» en unos minutos.",
		resend: "Reenviar correo",
		resending: "Reenviando…",
		resendWait: "Puedes reenviarlo en {seconds} s",
		resendSuccess: "Listo, te lo enviamos de nuevo.",
		resendErrors: {
			email_invalid: "Revisa tu correo. Pulsa «Volver a empezar» y escríbelo de nuevo.",
			rate_limited: "Pediste varios correos seguidos. Espera unos minutos antes de pedir otro.",
			email_not_sent: "El correo no salió. Intenta de nuevo en unos minutos.",
			server_error: "No pudimos reenviar el correo. Intenta de nuevo en unos minutos.",
		},
		wrongEmail: "¿Escribiste mal el correo?",
		startOver: "Volver a empezar",
	},
	verify: {
		checking: "Confirmando tu correo…",
		okTitle: "Correo confirmado",
		okBody: "Ahora crea tu tienda. Te llevamos en un momento.",
		continue: "Crear mi tienda",
		errorTitle: "No pudimos confirmar tu correo",
		missingToken: "El enlace está incompleto. Ábrelo de nuevo desde el correo.",
		genericError: "El enlace no es válido o ya venció.",
		connectionError: "No hay conexión. Revisa tu internet e intenta de nuevo.",
		serverError: "Tuvimos un problema al confirmarlo. Intenta de nuevo en unos minutos.",
		retry: "Intentar de nuevo",
		startOver: "Volver a registrarme",
		help: "¿El problema sigue? Escríbenos:",
	},
};

const en: OnboardingUiCopy = {
	header: { haveAccount: "Already have an account?", signIn: "Sign in" },
	footer: { secure: "Encrypted connection and verified email.", terms: "Terms", privacy: "Privacy", help: "Help" },
	steps: {
		aria: "Sign-up steps",
		progress: "Step {n} of 3",
		items: [
			{ title: "Sign up", hint: "Your details" },
			{ title: "Your store", hint: "Build it free" },
			{ title: "Publish", hint: "Plan and payment" },
		],
	},
	start: {
		title: "Create your online store",
		subtitle: "Build it free with your menu, logo and colors. Pay when you want to publish it.",
		includesTitle: "Every plan includes",
		includes: ["A branded digital menu, ready to share", "Online orders from your link or QR code", "A POS to take payments at your venue", "No commission on sales"],
		nextTitle: "What happens next",
		next: [
			{ title: "Confirm your email", text: "We are sending you a link right now." },
			{ title: "Build your store", text: "Menu, logo and colors, with a live preview. Nothing to pay." },
			{ title: "Publish whenever you want", text: "Choose your plan and pay when you open it to customers." },
		],
		helpText: "Questions before you start? Write to us:",
		businessesLink: "See businesses already using Gcode POS",
	},
	form: {
		businessName: "Business name",
		businessPlaceholder: "e.g. La Parada Criolla",
		businessHint: "This is how it will appear on your menu. You can change it later.",
		yourName: "Your name",
		yourNamePlaceholder: "e.g. Camila Rojas",
		email: "Email",
		emailPlaceholder: "you@business.com",
		emailHint: "We will send you a link to confirm it.",
		consentPrefix: "I accept the",
		termsLink: "terms of service",
		consentJoin: "and the",
		privacyLink: "privacy policy",
		analyticsNotice:
			"Gcode measures platform usage (your CEO panel and your public menu) with its own analytics and, if you accept it in the cookie notice, Google Analytics.",
		submit: "Create my store",
		errors: {
			invalid_input: "Enter your business name and your name, with at least 2 letters.",
			email_invalid: "Check your email. It should look like you@business.com.",
			terms_required: "To continue, accept the terms and the privacy policy.",
			recaptcha_failed: "We could not verify that you are a person. Reload the page and try again.",
			rate_limited: "Too many attempts in a row. Wait a few minutes and try again.",
			server_error: "We could not send your request. Try again in a few minutes.",
		},
		errorConnection: "No connection. Check your internet and try again.",
		sentTitle: "Check your email",
		sentBody: "We sent a link to {email}. Open it to create your store.",
		sentTips: ["It arrives in under a minute. If you don't see it, check spam or promotions.", "The link is valid for 7 days."],
		notSentTitle: "We saved your request",
		notSentBody: "But the email to {email} did not go out. Tap “Resend email” in a few minutes.",
		resend: "Resend email",
		resending: "Resending…",
		resendWait: "You can resend in {seconds} s",
		resendSuccess: "Done, we sent it again.",
		resendErrors: {
			email_invalid: "Check your email. Tap “Start over” and enter it again.",
			rate_limited: "You asked for several emails in a row. Wait a few minutes before asking for another.",
			email_not_sent: "The email did not go out. Try again in a few minutes.",
			server_error: "We could not resend the email. Try again in a few minutes.",
		},
		wrongEmail: "Typed the wrong email?",
		startOver: "Start over",
	},
	verify: {
		checking: "Confirming your email…",
		okTitle: "Email confirmed",
		okBody: "Now create your store. Taking you there in a moment.",
		continue: "Create my store",
		errorTitle: "We could not confirm your email",
		missingToken: "The link is incomplete. Open it again from the email.",
		genericError: "The link is not valid or has expired.",
		connectionError: "No connection. Check your internet and try again.",
		serverError: "Something went wrong on our side. Try again in a few minutes.",
		retry: "Try again",
		startOver: "Sign up again",
		help: "Still stuck? Write to us:",
	},
};

const pt: OnboardingUiCopy = {
	header: { haveAccount: "Já tem conta?", signIn: "Entrar" },
	footer: { secure: "Conexão criptografada e e-mail verificado.", terms: "Termos", privacy: "Privacidade", help: "Ajuda" },
	steps: {
		aria: "Etapas do cadastro",
		progress: "Etapa {n} de 3",
		items: [
			{ title: "Cadastro", hint: "Seus dados" },
			{ title: "Sua loja", hint: "Monte grátis" },
			{ title: "Publicar", hint: "Plano e pagamento" },
		],
	},
	start: {
		title: "Crie sua loja online",
		subtitle: "Monte grátis com seu cardápio, seu logo e suas cores. Você paga quando quiser publicá-la.",
		includesTitle: "Todos os planos incluem",
		includes: ["Cardápio digital com a sua marca, pronto para compartilhar", "Pedidos online pelo seu link ou QR", "Caixa para cobrar no seu local", "Sem comissão por venda"],
		nextTitle: "Como continua",
		next: [
			{ title: "Confirme seu e-mail", text: "Enviamos um link agora mesmo." },
			{ title: "Monte sua loja", text: "Cardápio, logo e cores, com prévia. Sem pagar nada." },
			{ title: "Publique quando quiser", text: "Escolha seu plano e pague ao abri-la para seus clientes." },
		],
		helpText: "Dúvidas antes de começar? Escreva para nós:",
		businessesLink: "Ver negócios que já usam o Gcode POS",
	},
	form: {
		businessName: "Nome do negócio",
		businessPlaceholder: "Ex.: La Parada Criolla",
		businessHint: "É assim que aparecerá no seu cardápio. Você pode mudar depois.",
		yourName: "Seu nome",
		yourNamePlaceholder: "Ex.: Camila Rojas",
		email: "E-mail",
		emailPlaceholder: "voce@negocio.com",
		emailHint: "Enviaremos um link para confirmá-lo.",
		consentPrefix: "Aceito os",
		termsLink: "termos de serviço",
		consentJoin: "e a",
		privacyLink: "política de privacidade",
		analyticsNotice:
			"A Gcode mede o uso da plataforma (seu painel CEO e seu cardápio público) com análise própria e, se você aceitar no aviso de cookies, Google Analytics.",
		submit: "Criar minha loja",
		errors: {
			invalid_input: "Escreva o nome do negócio e o seu nome, com pelo menos 2 letras.",
			email_invalid: "Confira seu e-mail. Ele deve ter a forma voce@negocio.com.",
			terms_required: "Para continuar, aceite os termos e a política de privacidade.",
			recaptcha_failed: "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente novamente.",
			rate_limited: "Muitas tentativas seguidas. Espere alguns minutos e tente novamente.",
			server_error: "Não conseguimos enviar sua solicitação. Tente novamente em alguns minutos.",
		},
		errorConnection: "Sem conexão. Verifique sua internet e tente novamente.",
		sentTitle: "Confira seu e-mail",
		sentBody: "Enviamos um link para {email}. Abra-o para criar sua loja.",
		sentTips: ["Chega em menos de um minuto. Se não aparecer, veja o spam ou promoções.", "O link vale por 7 dias."],
		notSentTitle: "Guardamos sua solicitação",
		notSentBody: "Mas o e-mail para {email} não saiu. Toque em “Reenviar e-mail” em alguns minutos.",
		resend: "Reenviar e-mail",
		resending: "Reenviando…",
		resendWait: "Você pode reenviar em {seconds} s",
		resendSuccess: "Pronto, enviamos de novo.",
		resendErrors: {
			email_invalid: "Confira seu e-mail. Toque em “Começar de novo” e digite-o novamente.",
			rate_limited: "Você pediu vários e-mails seguidos. Espere alguns minutos antes de pedir outro.",
			email_not_sent: "O e-mail não saiu. Tente novamente em alguns minutos.",
			server_error: "Não conseguimos reenviar o e-mail. Tente novamente em alguns minutos.",
		},
		wrongEmail: "Digitou o e-mail errado?",
		startOver: "Começar de novo",
	},
	verify: {
		checking: "Confirmando seu e-mail…",
		okTitle: "E-mail confirmado",
		okBody: "Agora crie sua loja. Levamos você em um instante.",
		continue: "Criar minha loja",
		errorTitle: "Não conseguimos confirmar seu e-mail",
		missingToken: "O link está incompleto. Abra-o novamente pelo e-mail.",
		genericError: "O link não é válido ou já expirou.",
		connectionError: "Sem conexão. Verifique sua internet e tente novamente.",
		serverError: "Tivemos um problema ao confirmá-lo. Tente novamente em alguns minutos.",
		retry: "Tentar novamente",
		startOver: "Cadastrar novamente",
		help: "O problema continua? Escreva para nós:",
	},
};

const fr: OnboardingUiCopy = {
	header: { haveAccount: "Vous avez déjà un compte ?", signIn: "Se connecter" },
	footer: { secure: "Connexion chiffrée et e-mail vérifié.", terms: "Conditions", privacy: "Confidentialité", help: "Aide" },
	steps: {
		aria: "Étapes de l’inscription",
		progress: "Étape {n} sur 3",
		items: [
			{ title: "Inscription", hint: "Vos informations" },
			{ title: "Votre boutique", hint: "Créez-la gratuitement" },
			{ title: "Publier", hint: "Offre et paiement" },
		],
	},
	start: {
		title: "Créez votre boutique en ligne",
		subtitle: "Créez-la gratuitement avec votre menu, votre logo et vos couleurs. Vous payez quand vous voulez la publier.",
		includesTitle: "Toutes les offres incluent",
		includes: ["Un menu digital à votre image, prêt à partager", "Commandes en ligne depuis votre lien ou votre QR", "Une caisse pour encaisser sur place", "Sans commission sur les ventes"],
		nextTitle: "La suite",
		next: [
			{ title: "Confirmez votre e-mail", text: "Nous vous envoyons un lien tout de suite." },
			{ title: "Créez votre boutique", text: "Menu, logo et couleurs, avec aperçu. Rien à payer." },
			{ title: "Publiez quand vous voulez", text: "Choisissez votre offre et payez à l’ouverture." },
		],
		helpText: "Des questions avant de commencer ? Écrivez-nous :",
		businessesLink: "Voir les établissements qui utilisent Gcode POS",
	},
	form: {
		businessName: "Nom de l’établissement",
		businessPlaceholder: "Ex. : La Parada Criolla",
		businessHint: "C’est ainsi qu’il apparaîtra sur votre menu. Vous pourrez le modifier.",
		yourName: "Votre nom",
		yourNamePlaceholder: "Ex. : Camila Rojas",
		email: "E-mail",
		emailPlaceholder: "vous@etablissement.com",
		emailHint: "Nous vous enverrons un lien pour le confirmer.",
		consentPrefix: "J’accepte les",
		termsLink: "conditions d’utilisation",
		consentJoin: "et la",
		privacyLink: "politique de confidentialité",
		analyticsNotice:
			"Gcode mesure l’utilisation de la plateforme (votre panneau CEO et votre menu public) avec ses propres statistiques et, si vous l’acceptez dans le bandeau des cookies, Google Analytics.",
		submit: "Créer ma boutique",
		errors: {
			invalid_input: "Indiquez le nom de l’établissement et votre nom, avec au moins 2 lettres.",
			email_invalid: "Vérifiez votre e-mail. Il doit avoir la forme vous@etablissement.com.",
			terms_required: "Pour continuer, acceptez les conditions et la politique de confidentialité.",
			recaptcha_failed: "Nous n’avons pas pu vérifier que vous êtes une personne. Rechargez la page et réessayez.",
			rate_limited: "Trop de tentatives d’affilée. Patientez quelques minutes et réessayez.",
			server_error: "Nous n’avons pas pu envoyer votre demande. Réessayez dans quelques minutes.",
		},
		errorConnection: "Pas de connexion. Vérifiez votre internet et réessayez.",
		sentTitle: "Consultez votre e-mail",
		sentBody: "Nous avons envoyé un lien à {email}. Ouvrez-le pour créer votre boutique.",
		sentTips: ["Il arrive en moins d’une minute. Sinon, vérifiez les spams ou les promotions.", "Le lien est valable 7 jours."],
		notSentTitle: "Nous avons enregistré votre demande",
		notSentBody: "Mais l’e-mail à {email} n’est pas parti. Appuyez sur « Renvoyer l’e-mail » dans quelques minutes.",
		resend: "Renvoyer l’e-mail",
		resending: "Envoi…",
		resendWait: "Vous pourrez le renvoyer dans {seconds} s",
		resendSuccess: "C’est fait, nous l’avons renvoyé.",
		resendErrors: {
			email_invalid: "Vérifiez votre e-mail. Appuyez sur « Recommencer » et saisissez-le à nouveau.",
			rate_limited: "Vous avez demandé plusieurs e-mails d’affilée. Patientez quelques minutes avant d’en demander un autre.",
			email_not_sent: "L’e-mail n’est pas parti. Réessayez dans quelques minutes.",
			server_error: "Nous n’avons pas pu renvoyer l’e-mail. Réessayez dans quelques minutes.",
		},
		wrongEmail: "Erreur dans l’e-mail ?",
		startOver: "Recommencer",
	},
	verify: {
		checking: "Confirmation de votre e-mail…",
		okTitle: "E-mail confirmé",
		okBody: "Créez maintenant votre boutique. Nous vous y emmenons.",
		continue: "Créer ma boutique",
		errorTitle: "Nous n’avons pas pu confirmer votre e-mail",
		missingToken: "Le lien est incomplet. Ouvrez-le à nouveau depuis l’e-mail.",
		genericError: "Le lien n’est pas valide ou a expiré.",
		connectionError: "Pas de connexion. Vérifiez votre internet et réessayez.",
		serverError: "Un problème est survenu de notre côté. Réessayez dans quelques minutes.",
		retry: "Réessayer",
		startOver: "M’inscrire à nouveau",
		help: "Le problème persiste ? Écrivez-nous :",
	},
};

const de: OnboardingUiCopy = {
	header: { haveAccount: "Schon ein Konto?", signIn: "Anmelden" },
	footer: { secure: "Verschlüsselte Verbindung und bestätigte E-Mail.", terms: "AGB", privacy: "Datenschutz", help: "Hilfe" },
	steps: {
		aria: "Schritte der Registrierung",
		progress: "Schritt {n} von 3",
		items: [
			{ title: "Registrierung", hint: "Ihre Daten" },
			{ title: "Ihr Shop", hint: "Kostenlos einrichten" },
			{ title: "Veröffentlichen", hint: "Plan und Zahlung" },
		],
	},
	start: {
		title: "Erstellen Sie Ihren Online-Shop",
		subtitle: "Richten Sie ihn kostenlos mit Speisekarte, Logo und Farben ein. Sie zahlen erst, wenn Sie ihn veröffentlichen.",
		includesTitle: "Alle Pläne enthalten",
		includes: ["Digitale Speisekarte mit Ihrer Marke, bereit zum Teilen", "Online-Bestellungen über Ihren Link oder QR-Code", "Kasse für Zahlungen vor Ort", "Keine Provision pro Verkauf"],
		nextTitle: "So geht es weiter",
		next: [
			{ title: "E-Mail bestätigen", text: "Wir senden Ihnen sofort einen Link." },
			{ title: "Shop einrichten", text: "Speisekarte, Logo und Farben, mit Vorschau. Ohne zu zahlen." },
			{ title: "Veröffentlichen, wann Sie wollen", text: "Plan wählen und beim Öffnen für Ihre Kunden bezahlen." },
		],
		helpText: "Fragen vor dem Start? Schreiben Sie uns:",
		businessesLink: "Geschäfte ansehen, die Gcode POS nutzen",
	},
	form: {
		businessName: "Name des Geschäfts",
		businessPlaceholder: "z. B. La Parada Criolla",
		businessHint: "So erscheint es auf Ihrer Speisekarte. Sie können es später ändern.",
		yourName: "Ihr Name",
		yourNamePlaceholder: "z. B. Camila Rojas",
		email: "E-Mail",
		emailPlaceholder: "sie@geschaeft.com",
		emailHint: "Wir senden Ihnen einen Link zur Bestätigung.",
		consentPrefix: "Ich akzeptiere die",
		termsLink: "Nutzungsbedingungen",
		consentJoin: "und die",
		privacyLink: "Datenschutzerklärung",
		analyticsNotice:
			"Gcode misst die Nutzung der Plattform (Ihr CEO-Panel und Ihre öffentliche Speisekarte) mit eigener Analyse und, wenn Sie es im Cookie-Hinweis erlauben, mit Google Analytics.",
		submit: "Meinen Shop erstellen",
		errors: {
			invalid_input: "Geben Sie den Namen des Geschäfts und Ihren Namen ein, mit mindestens 2 Buchstaben.",
			email_invalid: "Prüfen Sie Ihre E-Mail. Sie sollte so aussehen: sie@geschaeft.com.",
			terms_required: "Um fortzufahren, akzeptieren Sie die Nutzungsbedingungen und die Datenschutzerklärung.",
			recaptcha_failed: "Wir konnten nicht bestätigen, dass Sie ein Mensch sind. Laden Sie die Seite neu und versuchen Sie es erneut.",
			rate_limited: "Zu viele Versuche hintereinander. Warten Sie ein paar Minuten und versuchen Sie es erneut.",
			server_error: "Wir konnten Ihre Anfrage nicht senden. Versuchen Sie es in ein paar Minuten erneut.",
		},
		errorConnection: "Keine Verbindung. Prüfen Sie Ihr Internet und versuchen Sie es erneut.",
		sentTitle: "Prüfen Sie Ihr Postfach",
		sentBody: "Wir haben einen Link an {email} gesendet. Öffnen Sie ihn, um Ihren Shop zu erstellen.",
		sentTips: ["Er kommt in weniger als einer Minute. Sonst prüfen Sie Spam oder Werbung.", "Der Link ist 7 Tage gültig."],
		notSentTitle: "Wir haben Ihre Anfrage gespeichert",
		notSentBody: "Aber die E-Mail an {email} wurde nicht gesendet. Tippen Sie in ein paar Minuten auf „E-Mail erneut senden“.",
		resend: "E-Mail erneut senden",
		resending: "Wird gesendet…",
		resendWait: "Erneut senden in {seconds} s",
		resendSuccess: "Erledigt, wir haben sie erneut gesendet.",
		resendErrors: {
			email_invalid: "Prüfen Sie Ihre E-Mail. Tippen Sie auf „Neu beginnen“ und geben Sie sie erneut ein.",
			rate_limited: "Sie haben mehrere E-Mails nacheinander angefordert. Warten Sie ein paar Minuten, bevor Sie eine weitere anfordern.",
			email_not_sent: "Die E-Mail wurde nicht gesendet. Versuchen Sie es in ein paar Minuten erneut.",
			server_error: "Die E-Mail konnte nicht erneut gesendet werden. Versuchen Sie es in ein paar Minuten erneut.",
		},
		wrongEmail: "Falsche E-Mail eingegeben?",
		startOver: "Neu beginnen",
	},
	verify: {
		checking: "Ihre E-Mail wird bestätigt…",
		okTitle: "E-Mail bestätigt",
		okBody: "Erstellen Sie jetzt Ihren Shop. Wir leiten Sie gleich weiter.",
		continue: "Shop erstellen",
		errorTitle: "Wir konnten Ihre E-Mail nicht bestätigen",
		missingToken: "Der Link ist unvollständig. Öffnen Sie ihn erneut aus der E-Mail.",
		genericError: "Der Link ist ungültig oder abgelaufen.",
		connectionError: "Keine Verbindung. Prüfen Sie Ihr Internet und versuchen Sie es erneut.",
		serverError: "Bei uns ist ein Fehler aufgetreten. Versuchen Sie es in ein paar Minuten erneut.",
		retry: "Erneut versuchen",
		startOver: "Erneut registrieren",
		help: "Das Problem bleibt? Schreiben Sie uns:",
	},
};

const it: OnboardingUiCopy = {
	header: { haveAccount: "Hai già un account?", signIn: "Accedi" },
	footer: { secure: "Connessione cifrata ed email verificata.", terms: "Termini", privacy: "Privacy", help: "Aiuto" },
	steps: {
		aria: "Passaggi della registrazione",
		progress: "Passaggio {n} di 3",
		items: [
			{ title: "Registrazione", hint: "I tuoi dati" },
			{ title: "Il tuo negozio", hint: "Crealo gratis" },
			{ title: "Pubblica", hint: "Piano e pagamento" },
		],
	},
	start: {
		title: "Crea il tuo negozio online",
		subtitle: "Crealo gratis con il tuo menu, il tuo logo e i tuoi colori. Paghi quando vuoi pubblicarlo.",
		includesTitle: "Tutti i piani includono",
		includes: ["Menu digitale con il tuo marchio, pronto da condividere", "Ordini online dal tuo link o QR", "Cassa per incassare nel tuo locale", "Nessuna commissione sulle vendite"],
		nextTitle: "Come prosegue",
		next: [
			{ title: "Conferma la tua email", text: "Ti inviamo subito un link." },
			{ title: "Crea il tuo negozio", text: "Menu, logo e colori, con anteprima. Senza pagare nulla." },
			{ title: "Pubblicalo quando vuoi", text: "Scegli il piano e paga quando lo apri ai clienti." },
		],
		helpText: "Dubbi prima di iniziare? Scrivici:",
		businessesLink: "Vedi le attività che usano già Gcode POS",
	},
	form: {
		businessName: "Nome dell’attività",
		businessPlaceholder: "Es.: La Parada Criolla",
		businessHint: "Apparirà così nel tuo menu. Puoi cambiarlo in seguito.",
		yourName: "Il tuo nome",
		yourNamePlaceholder: "Es.: Camila Rojas",
		email: "Email",
		emailPlaceholder: "tu@attivita.com",
		emailHint: "Ti invieremo un link per confermarla.",
		consentPrefix: "Accetto i",
		termsLink: "termini di servizio",
		consentJoin: "e la",
		privacyLink: "politica sulla privacy",
		analyticsNotice:
			"Gcode misura l’uso della piattaforma (il tuo pannello CEO e il tuo menu pubblico) con analisi proprie e, se lo accetti nell’avviso sui cookie, Google Analytics.",
		submit: "Crea il mio negozio",
		errors: {
			invalid_input: "Scrivi il nome dell’attività e il tuo nome, con almeno 2 lettere.",
			email_invalid: "Controlla la tua email. Deve avere la forma tu@attivita.com.",
			terms_required: "Per continuare, accetta i termini e la politica sulla privacy.",
			recaptcha_failed: "Non siamo riusciti a verificare che sei una persona. Ricarica la pagina e riprova.",
			rate_limited: "Troppi tentativi di fila. Aspetta qualche minuto e riprova.",
			server_error: "Non siamo riusciti a inviare la richiesta. Riprova tra qualche minuto.",
		},
		errorConnection: "Nessuna connessione. Controlla internet e riprova.",
		sentTitle: "Controlla la tua email",
		sentBody: "Abbiamo inviato un link a {email}. Aprilo per creare il tuo negozio.",
		sentTips: ["Arriva in meno di un minuto. Se non lo vedi, controlla spam o promozioni.", "Il link è valido 7 giorni."],
		notSentTitle: "Abbiamo salvato la tua richiesta",
		notSentBody: "Ma l’email a {email} non è partita. Tocca «Invia di nuovo» tra qualche minuto.",
		resend: "Invia di nuovo",
		resending: "Invio…",
		resendWait: "Puoi reinviarla tra {seconds} s",
		resendSuccess: "Fatto, te l’abbiamo inviata di nuovo.",
		resendErrors: {
			email_invalid: "Controlla la tua email. Tocca «Ricomincia» e scrivila di nuovo.",
			rate_limited: "Hai chiesto diverse email di fila. Aspetta qualche minuto prima di chiederne un’altra.",
			email_not_sent: "L’email non è partita. Riprova tra qualche minuto.",
			server_error: "Non siamo riusciti a reinviare l’email. Riprova tra qualche minuto.",
		},
		wrongEmail: "Hai sbagliato email?",
		startOver: "Ricomincia",
	},
	verify: {
		checking: "Stiamo confermando la tua email…",
		okTitle: "Email confermata",
		okBody: "Ora crea il tuo negozio. Ti portiamo lì tra un attimo.",
		continue: "Crea il mio negozio",
		errorTitle: "Non siamo riusciti a confermare la tua email",
		missingToken: "Il link è incompleto. Aprilo di nuovo dall’email.",
		genericError: "Il link non è valido o è scaduto.",
		connectionError: "Nessuna connessione. Controlla internet e riprova.",
		serverError: "Abbiamo avuto un problema nel confermarla. Riprova tra qualche minuto.",
		retry: "Riprova",
		startOver: "Registrati di nuovo",
		help: "Il problema continua? Scrivici:",
	},
};

const COPY: Record<OnboardingLocale, OnboardingUiCopy> = { es, en, pt, fr, de, it };

/** Lo que cambia con «solo panel CEO»: sin tienda que armar, el alta es registro, correo y plan. */
type PanelOnlyCopy = {
	steps: [StepItem, StepItem, StepItem];
	start: Pick<OnboardingUiCopy["start"], "title" | "subtitle" | "includesTitle" | "includes" | "next">;
	form: Pick<OnboardingUiCopy["form"], "businessHint" | "submit" | "sentBody">;
	verify: Pick<OnboardingUiCopy["verify"], "okBody" | "continue">;
};

const PANEL_ONLY: Record<OnboardingLocale, PanelOnlyCopy> = {
	es: {
		steps: [
			{ title: "Registro", hint: "Tus datos" },
			{ title: "Tu correo", hint: "Confírmalo" },
			{ title: "Tu plan", hint: "Plan y pago" },
		],
		start: {
			title: "Crea tu cuenta y elige tu plan",
			subtitle: "El panel CEO para llevar la caja, los pedidos y los reportes de tu local. Pagas tu plan y empiezas a usarlo.",
			includesTitle: "El panel CEO incluye",
			includes: ["Caja para cobrar en tu local", "Pedidos y reportes en un solo lugar", "Sin comisiones por venta"],
			next: [
				{ title: "Confirma tu correo", text: "Te enviamos un enlace ahora mismo." },
				{ title: "Elige tu plan", text: "Puedes sumar extras ahora o más adelante." },
				{ title: "Paga y entra al panel CEO", text: "Te enviamos el acceso por correo apenas se confirme el pago." },
			],
		},
		form: {
			businessHint: "Así aparecerá en tu panel CEO. Puedes cambiarlo después.",
			submit: "Crear mi cuenta",
			sentBody: "Enviamos un enlace a {email}. Ábrelo para elegir tu plan.",
		},
		verify: { okBody: "Ahora elige tu plan. Te llevamos en un momento.", continue: "Elegir mi plan" },
	},
	en: {
		steps: [
			{ title: "Sign up", hint: "Your details" },
			{ title: "Your email", hint: "Confirm it" },
			{ title: "Your plan", hint: "Plan and payment" },
		],
		start: {
			title: "Create your account and choose your plan",
			subtitle: "The CEO panel to run your register, orders and reports. Pay for your plan and start using it.",
			includesTitle: "The CEO panel includes",
			includes: ["A POS to take payments at your venue", "Orders and reports in one place", "No commission on sales"],
			next: [
				{ title: "Confirm your email", text: "We are sending you a link right now." },
				{ title: "Choose your plan", text: "You can add extras now or later." },
				{ title: "Pay and open the CEO panel", text: "We email you access as soon as the payment is confirmed." },
			],
		},
		form: {
			businessHint: "This is how it will appear in your CEO panel. You can change it later.",
			submit: "Create my account",
			sentBody: "We sent a link to {email}. Open it to choose your plan.",
		},
		verify: { okBody: "Now choose your plan. Taking you there in a moment.", continue: "Choose my plan" },
	},
	pt: {
		steps: [
			{ title: "Cadastro", hint: "Seus dados" },
			{ title: "Seu e-mail", hint: "Confirme-o" },
			{ title: "Seu plano", hint: "Plano e pagamento" },
		],
		start: {
			title: "Crie sua conta e escolha seu plano",
			subtitle: "O painel CEO para cuidar do caixa, dos pedidos e dos relatórios do seu local. Você paga seu plano e começa a usar.",
			includesTitle: "O painel CEO inclui",
			includes: ["Caixa para cobrar no seu local", "Pedidos e relatórios em um só lugar", "Sem comissão por venda"],
			next: [
				{ title: "Confirme seu e-mail", text: "Enviamos um link agora mesmo." },
				{ title: "Escolha seu plano", text: "Você pode adicionar extras agora ou depois." },
				{ title: "Pague e entre no painel CEO", text: "Enviamos o acesso por e-mail assim que o pagamento for confirmado." },
			],
		},
		form: {
			businessHint: "É assim que aparecerá no seu painel CEO. Você pode mudar depois.",
			submit: "Criar minha conta",
			sentBody: "Enviamos um link para {email}. Abra-o para escolher seu plano.",
		},
		verify: { okBody: "Agora escolha seu plano. Levamos você em um instante.", continue: "Escolher meu plano" },
	},
	fr: {
		steps: [
			{ title: "Inscription", hint: "Vos informations" },
			{ title: "Votre e-mail", hint: "Confirmez-le" },
			{ title: "Votre offre", hint: "Offre et paiement" },
		],
		start: {
			title: "Créez votre compte et choisissez votre offre",
			subtitle: "Le panneau CEO pour gérer la caisse, les commandes et les rapports de votre établissement. Vous payez votre offre et vous commencez.",
			includesTitle: "Le panneau CEO comprend",
			includes: ["Une caisse pour encaisser sur place", "Commandes et rapports au même endroit", "Sans commission sur les ventes"],
			next: [
				{ title: "Confirmez votre e-mail", text: "Nous vous envoyons un lien tout de suite." },
				{ title: "Choisissez votre offre", text: "Vous pouvez ajouter des options maintenant ou plus tard." },
				{ title: "Payez et accédez au panneau CEO", text: "Nous vous envoyons l’accès par e-mail dès que le paiement est confirmé." },
			],
		},
		form: {
			businessHint: "C’est ainsi qu’il apparaîtra dans votre panneau CEO. Vous pourrez le modifier.",
			submit: "Créer mon compte",
			sentBody: "Nous avons envoyé un lien à {email}. Ouvrez-le pour choisir votre offre.",
		},
		verify: { okBody: "Choisissez maintenant votre offre. Nous vous y emmenons.", continue: "Choisir mon offre" },
	},
	de: {
		steps: [
			{ title: "Registrierung", hint: "Ihre Daten" },
			{ title: "Ihre E-Mail", hint: "Bestätigen" },
			{ title: "Ihr Plan", hint: "Plan und Zahlung" },
		],
		start: {
			title: "Erstellen Sie Ihr Konto und wählen Sie Ihren Plan",
			subtitle: "Das CEO-Panel für Kasse, Bestellungen und Berichte Ihres Geschäfts. Sie zahlen Ihren Plan und legen los.",
			includesTitle: "Das CEO-Panel enthält",
			includes: ["Kasse für Zahlungen vor Ort", "Bestellungen und Berichte an einem Ort", "Keine Provision pro Verkauf"],
			next: [
				{ title: "E-Mail bestätigen", text: "Wir senden Ihnen sofort einen Link." },
				{ title: "Plan wählen", text: "Extras können Sie jetzt oder später hinzufügen." },
				{ title: "Bezahlen und ins CEO-Panel", text: "Den Zugang schicken wir per E-Mail, sobald die Zahlung bestätigt ist." },
			],
		},
		form: {
			businessHint: "So erscheint es in Ihrem CEO-Panel. Sie können es später ändern.",
			submit: "Mein Konto erstellen",
			sentBody: "Wir haben einen Link an {email} gesendet. Öffnen Sie ihn, um Ihren Plan zu wählen.",
		},
		verify: { okBody: "Wählen Sie jetzt Ihren Plan. Wir leiten Sie gleich weiter.", continue: "Plan wählen" },
	},
	it: {
		steps: [
			{ title: "Registrazione", hint: "I tuoi dati" },
			{ title: "La tua email", hint: "Confermala" },
			{ title: "Il tuo piano", hint: "Piano e pagamento" },
		],
		start: {
			title: "Crea il tuo account e scegli il piano",
			subtitle: "Il pannello CEO per gestire cassa, ordini e report del tuo locale. Paghi il piano e inizi a usarlo.",
			includesTitle: "Il pannello CEO include",
			includes: ["Cassa per incassare nel tuo locale", "Ordini e report in un unico posto", "Nessuna commissione sulle vendite"],
			next: [
				{ title: "Conferma la tua email", text: "Ti inviamo subito un link." },
				{ title: "Scegli il piano", text: "Puoi aggiungere extra ora o più avanti." },
				{ title: "Paga ed entra nel pannello CEO", text: "Ti inviamo l’accesso via email appena il pagamento è confermato." },
			],
		},
		form: {
			businessHint: "Apparirà così nel tuo pannello CEO. Puoi cambiarlo in seguito.",
			submit: "Crea il mio account",
			sentBody: "Abbiamo inviato un link a {email}. Aprilo per scegliere il piano.",
		},
		verify: { okBody: "Ora scegli il piano. Ti portiamo lì tra un attimo.", continue: "Scegli il mio piano" },
	},
};

/**
 * Los textos del alta en el idioma pedido. Con `panelOnly` (el plan que trae el landing es
 * «solo panel CEO»), los que prometen armar la tienda gratis cambian por los de elegir plan.
 */
export function getOnboardingUiCopy(locale: string | null | undefined, options: { panelOnly?: boolean } = {}): OnboardingUiCopy {
	const lang = resolveOnboardingLocale(locale);
	const copy = COPY[lang];
	if (!options.panelOnly) return copy;
	const variant = PANEL_ONLY[lang];
	return {
		...copy,
		steps: { ...copy.steps, items: variant.steps },
		start: { ...copy.start, ...variant.start },
		form: { ...copy.form, ...variant.form },
		verify: { ...copy.verify, ...variant.verify },
	};
}

/** Reemplaza `{clave}` por su valor. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
