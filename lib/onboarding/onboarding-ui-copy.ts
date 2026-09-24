/**
 * Textos del alta (cabecera, barra de pasos, paso 1 y confirmación de correo) en los seis
 * idiomas del sitio. Los pasos 2 y 3 tienen los suyos junto a su formulario.
 * `{email}`, `{n}` y `{seconds}` se reemplazan al usarlos.
 */

export type OnboardingLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export function resolveOnboardingLocale(locale: string | null | undefined): OnboardingLocale {
	const value = String(locale ?? "es").toLowerCase();
	for (const candidate of ["en", "pt", "fr", "de", "it"] as const) if (value.startsWith(candidate)) return candidate;
	return "es";
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
		errorSubmit: string;
		errorUnexpected: string;
		sentTitle: string;
		sentBody: string;
		sentTips: string[];
		notSentTitle: string;
		notSentBody: string;
		resend: string;
		resending: string;
		resendWait: string;
		resendSuccess: string;
		resendAlready: string;
		resendError: string;
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
			{ title: "Plan", hint: "Plan y extras" },
			{ title: "Pago", hint: "Activa tu cuenta" },
		],
	},
	start: {
		title: "Crea la cuenta de tu negocio",
		subtitle: "Menú digital, pedidos online y caja en un solo lugar. Sin comisiones por venta.",
		includesTitle: "Todos los planes incluyen",
		includes: [
			"Menú digital con tu marca, listo para compartir",
			"Pedidos online y delivery",
			"Caja, comandas e inventario",
			"Sin comisiones por venta",
		],
		nextTitle: "Cómo sigue",
		next: [
			{ title: "Confirma tu correo", text: "Te enviamos un enlace ahora mismo." },
			{ title: "Elige tu plan", text: "Y los extras que quieras, en menos de 2 minutos." },
			{ title: "Paga y activa tu cuenta", text: "Con PayPal o transferencia. Te ayudamos a dejar tu menú listo." },
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
			"Gcode mide el uso de la plataforma (tu panel y tu menú público) con analítica propia y Google Analytics, como explica la política de privacidad.",
		submit: "Crear mi cuenta",
		errorSubmit: "No pudimos enviar tu solicitud. Intenta de nuevo.",
		errorUnexpected: "Algo salió mal. Intenta de nuevo.",
		sentTitle: "Revisa tu correo",
		sentBody: "Enviamos un enlace a {email}. Ábrelo para elegir tu plan.",
		sentTips: ["Llega en menos de un minuto. Si no lo ves, revisa spam o promociones.", "El enlace vence en 24 horas."],
		notSentTitle: "Guardamos tu solicitud",
		notSentBody: "Pero el correo a {email} no salió. Pulsa «Reenviar correo» en unos minutos.",
		resend: "Reenviar correo",
		resending: "Reenviando…",
		resendWait: "Puedes reenviarlo en {seconds} s",
		resendSuccess: "Listo, te lo enviamos de nuevo.",
		resendAlready: "Tu correo ya está confirmado. Abre el enlace que te enviamos para seguir.",
		resendError: "No pudimos reenviar el correo.",
		wrongEmail: "¿Escribiste mal el correo?",
		startOver: "Volver a empezar",
	},
	verify: {
		checking: "Confirmando tu correo…",
		okTitle: "Correo confirmado",
		okBody: "Ahora elige tu plan. Te llevamos en un momento.",
		continue: "Elegir mi plan",
		errorTitle: "No pudimos confirmar tu correo",
		missingToken: "El enlace está incompleto. Ábrelo de nuevo desde el correo.",
		genericError: "El enlace no es válido o ya venció.",
		connectionError: "No hay conexión. Revisa tu internet e intenta de nuevo.",
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
			{ title: "Plan", hint: "Plan and extras" },
			{ title: "Payment", hint: "Activate your account" },
		],
	},
	start: {
		title: "Create your business account",
		subtitle: "Digital menu, online orders and POS in one place. No commission on sales.",
		includesTitle: "Every plan includes",
		includes: ["A branded digital menu, ready to share", "Online orders and delivery", "POS, kitchen tickets and inventory", "No commission on sales"],
		nextTitle: "What happens next",
		next: [
			{ title: "Confirm your email", text: "We are sending you a link right now." },
			{ title: "Choose your plan", text: "Plus any extras, in under 2 minutes." },
			{ title: "Pay and activate", text: "With PayPal or bank transfer. We help you get your menu ready." },
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
			"Gcode measures platform usage (your panel and your public menu) with its own analytics and Google Analytics, as described in the privacy policy.",
		submit: "Create my account",
		errorSubmit: "We could not send your request. Please try again.",
		errorUnexpected: "Something went wrong. Please try again.",
		sentTitle: "Check your email",
		sentBody: "We sent a link to {email}. Open it to choose your plan.",
		sentTips: ["It arrives in under a minute. If you don't see it, check spam or promotions.", "The link expires in 24 hours."],
		notSentTitle: "We saved your request",
		notSentBody: "But the email to {email} did not go out. Tap “Resend email” in a few minutes.",
		resend: "Resend email",
		resending: "Resending…",
		resendWait: "You can resend in {seconds} s",
		resendSuccess: "Done, we sent it again.",
		resendAlready: "Your email is already confirmed. Open the link we sent you to continue.",
		resendError: "We could not resend the email.",
		wrongEmail: "Typed the wrong email?",
		startOver: "Start over",
	},
	verify: {
		checking: "Confirming your email…",
		okTitle: "Email confirmed",
		okBody: "Now choose your plan. Taking you there in a moment.",
		continue: "Choose my plan",
		errorTitle: "We could not confirm your email",
		missingToken: "The link is incomplete. Open it again from the email.",
		genericError: "The link is not valid or has expired.",
		connectionError: "No connection. Check your internet and try again.",
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
			{ title: "Plano", hint: "Plano e extras" },
			{ title: "Pagamento", hint: "Ative sua conta" },
		],
	},
	start: {
		title: "Crie a conta do seu negócio",
		subtitle: "Cardápio digital, pedidos online e caixa em um só lugar. Sem comissão por venda.",
		includesTitle: "Todos os planos incluem",
		includes: ["Cardápio digital com a sua marca, pronto para compartilhar", "Pedidos online e delivery", "Caixa, comandas e estoque", "Sem comissão por venda"],
		nextTitle: "Como continua",
		next: [
			{ title: "Confirme seu e-mail", text: "Enviamos um link agora mesmo." },
			{ title: "Escolha seu plano", text: "E os extras que quiser, em menos de 2 minutos." },
			{ title: "Pague e ative sua conta", text: "Com PayPal ou transferência. Ajudamos a deixar seu cardápio pronto." },
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
			"A Gcode mede o uso da plataforma (seu painel e seu cardápio público) com análise própria e Google Analytics, como explica a política de privacidade.",
		submit: "Criar minha conta",
		errorSubmit: "Não conseguimos enviar sua solicitação. Tente novamente.",
		errorUnexpected: "Algo deu errado. Tente novamente.",
		sentTitle: "Confira seu e-mail",
		sentBody: "Enviamos um link para {email}. Abra-o para escolher seu plano.",
		sentTips: ["Chega em menos de um minuto. Se não aparecer, veja o spam ou promoções.", "O link expira em 24 horas."],
		notSentTitle: "Guardamos sua solicitação",
		notSentBody: "Mas o e-mail para {email} não saiu. Toque em “Reenviar e-mail” em alguns minutos.",
		resend: "Reenviar e-mail",
		resending: "Reenviando…",
		resendWait: "Você pode reenviar em {seconds} s",
		resendSuccess: "Pronto, enviamos de novo.",
		resendAlready: "Seu e-mail já está confirmado. Abra o link que enviamos para continuar.",
		resendError: "Não conseguimos reenviar o e-mail.",
		wrongEmail: "Digitou o e-mail errado?",
		startOver: "Começar de novo",
	},
	verify: {
		checking: "Confirmando seu e-mail…",
		okTitle: "E-mail confirmado",
		okBody: "Agora escolha seu plano. Levamos você em um instante.",
		continue: "Escolher meu plano",
		errorTitle: "Não conseguimos confirmar seu e-mail",
		missingToken: "O link está incompleto. Abra-o novamente pelo e-mail.",
		genericError: "O link não é válido ou já expirou.",
		connectionError: "Sem conexão. Verifique sua internet e tente novamente.",
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
			{ title: "Offre", hint: "Offre et extras" },
			{ title: "Paiement", hint: "Activez votre compte" },
		],
	},
	start: {
		title: "Créez le compte de votre établissement",
		subtitle: "Menu digital, commandes en ligne et caisse au même endroit. Sans commission sur les ventes.",
		includesTitle: "Toutes les offres incluent",
		includes: ["Un menu digital à votre image, prêt à partager", "Commandes en ligne et livraison", "Caisse, bons de cuisine et stock", "Sans commission sur les ventes"],
		nextTitle: "La suite",
		next: [
			{ title: "Confirmez votre e-mail", text: "Nous vous envoyons un lien tout de suite." },
			{ title: "Choisissez votre offre", text: "Et les extras souhaités, en moins de 2 minutes." },
			{ title: "Payez et activez votre compte", text: "Par PayPal ou virement. Nous vous aidons à préparer votre menu." },
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
			"Gcode mesure l’utilisation de la plateforme (votre panneau et votre menu public) avec ses propres statistiques et Google Analytics, comme l’explique la politique de confidentialité.",
		submit: "Créer mon compte",
		errorSubmit: "Nous n’avons pas pu envoyer votre demande. Réessayez.",
		errorUnexpected: "Une erreur s’est produite. Réessayez.",
		sentTitle: "Consultez votre e-mail",
		sentBody: "Nous avons envoyé un lien à {email}. Ouvrez-le pour choisir votre offre.",
		sentTips: ["Il arrive en moins d’une minute. Sinon, vérifiez les spams ou les promotions.", "Le lien expire dans 24 heures."],
		notSentTitle: "Nous avons enregistré votre demande",
		notSentBody: "Mais l’e-mail à {email} n’est pas parti. Appuyez sur « Renvoyer l’e-mail » dans quelques minutes.",
		resend: "Renvoyer l’e-mail",
		resending: "Envoi…",
		resendWait: "Vous pourrez le renvoyer dans {seconds} s",
		resendSuccess: "C’est fait, nous l’avons renvoyé.",
		resendAlready: "Votre e-mail est déjà confirmé. Ouvrez le lien reçu pour continuer.",
		resendError: "Nous n’avons pas pu renvoyer l’e-mail.",
		wrongEmail: "Erreur dans l’e-mail ?",
		startOver: "Recommencer",
	},
	verify: {
		checking: "Confirmation de votre e-mail…",
		okTitle: "E-mail confirmé",
		okBody: "Choisissez maintenant votre offre. Nous vous y emmenons.",
		continue: "Choisir mon offre",
		errorTitle: "Nous n’avons pas pu confirmer votre e-mail",
		missingToken: "Le lien est incomplet. Ouvrez-le à nouveau depuis l’e-mail.",
		genericError: "Le lien n’est pas valide ou a expiré.",
		connectionError: "Pas de connexion. Vérifiez votre internet et réessayez.",
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
			{ title: "Plan", hint: "Plan und Extras" },
			{ title: "Zahlung", hint: "Konto aktivieren" },
		],
	},
	start: {
		title: "Erstellen Sie das Konto Ihres Geschäfts",
		subtitle: "Digitale Speisekarte, Online-Bestellungen und Kasse an einem Ort. Ohne Provision pro Verkauf.",
		includesTitle: "Alle Pläne enthalten",
		includes: ["Digitale Speisekarte mit Ihrer Marke, bereit zum Teilen", "Online-Bestellungen und Lieferung", "Kasse, Küchenbons und Lager", "Keine Provision pro Verkauf"],
		nextTitle: "So geht es weiter",
		next: [
			{ title: "E-Mail bestätigen", text: "Wir senden Ihnen sofort einen Link." },
			{ title: "Plan wählen", text: "Und gewünschte Extras, in weniger als 2 Minuten." },
			{ title: "Bezahlen und aktivieren", text: "Mit PayPal oder Überweisung. Wir helfen Ihnen bei Ihrer Speisekarte." },
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
			"Gcode misst die Nutzung der Plattform (Ihr Panel und Ihre öffentliche Speisekarte) mit eigener Analyse und Google Analytics, wie in der Datenschutzerklärung beschrieben.",
		submit: "Mein Konto erstellen",
		errorSubmit: "Wir konnten Ihre Anfrage nicht senden. Bitte erneut versuchen.",
		errorUnexpected: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
		sentTitle: "Prüfen Sie Ihr Postfach",
		sentBody: "Wir haben einen Link an {email} gesendet. Öffnen Sie ihn, um Ihren Plan zu wählen.",
		sentTips: ["Er kommt in weniger als einer Minute. Sonst prüfen Sie Spam oder Werbung.", "Der Link läuft nach 24 Stunden ab."],
		notSentTitle: "Wir haben Ihre Anfrage gespeichert",
		notSentBody: "Aber die E-Mail an {email} wurde nicht gesendet. Tippen Sie in ein paar Minuten auf „E-Mail erneut senden“.",
		resend: "E-Mail erneut senden",
		resending: "Wird gesendet…",
		resendWait: "Erneut senden in {seconds} s",
		resendSuccess: "Erledigt, wir haben sie erneut gesendet.",
		resendAlready: "Ihre E-Mail ist bereits bestätigt. Öffnen Sie den gesendeten Link, um fortzufahren.",
		resendError: "Die E-Mail konnte nicht erneut gesendet werden.",
		wrongEmail: "Falsche E-Mail eingegeben?",
		startOver: "Neu beginnen",
	},
	verify: {
		checking: "Ihre E-Mail wird bestätigt…",
		okTitle: "E-Mail bestätigt",
		okBody: "Wählen Sie jetzt Ihren Plan. Wir leiten Sie gleich weiter.",
		continue: "Plan wählen",
		errorTitle: "Wir konnten Ihre E-Mail nicht bestätigen",
		missingToken: "Der Link ist unvollständig. Öffnen Sie ihn erneut aus der E-Mail.",
		genericError: "Der Link ist ungültig oder abgelaufen.",
		connectionError: "Keine Verbindung. Prüfen Sie Ihr Internet und versuchen Sie es erneut.",
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
			{ title: "Piano", hint: "Piano ed extra" },
			{ title: "Pagamento", hint: "Attiva il tuo account" },
		],
	},
	start: {
		title: "Crea l’account della tua attività",
		subtitle: "Menu digitale, ordini online e cassa in un unico posto. Senza commissioni sulle vendite.",
		includesTitle: "Tutti i piani includono",
		includes: ["Menu digitale con il tuo marchio, pronto da condividere", "Ordini online e consegna", "Cassa, comande e magazzino", "Nessuna commissione sulle vendite"],
		nextTitle: "Come prosegue",
		next: [
			{ title: "Conferma la tua email", text: "Ti inviamo subito un link." },
			{ title: "Scegli il tuo piano", text: "E gli extra che vuoi, in meno di 2 minuti." },
			{ title: "Paga e attiva l’account", text: "Con PayPal o bonifico. Ti aiutiamo a preparare il menu." },
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
			"Gcode misura l’uso della piattaforma (il tuo pannello e il tuo menu pubblico) con analisi proprie e Google Analytics, come spiega l’informativa sulla privacy.",
		submit: "Crea il mio account",
		errorSubmit: "Non siamo riusciti a inviare la richiesta. Riprova.",
		errorUnexpected: "Qualcosa è andato storto. Riprova.",
		sentTitle: "Controlla la tua email",
		sentBody: "Abbiamo inviato un link a {email}. Aprilo per scegliere il tuo piano.",
		sentTips: ["Arriva in meno di un minuto. Se non lo vedi, controlla spam o promozioni.", "Il link scade dopo 24 ore."],
		notSentTitle: "Abbiamo salvato la tua richiesta",
		notSentBody: "Ma l’email a {email} non è partita. Tocca «Invia di nuovo» tra qualche minuto.",
		resend: "Invia di nuovo",
		resending: "Invio…",
		resendWait: "Puoi reinviarla tra {seconds} s",
		resendSuccess: "Fatto, te l’abbiamo inviata di nuovo.",
		resendAlready: "La tua email è già confermata. Apri il link ricevuto per continuare.",
		resendError: "Non siamo riusciti a reinviare l’email.",
		wrongEmail: "Hai sbagliato email?",
		startOver: "Ricomincia",
	},
	verify: {
		checking: "Stiamo confermando la tua email…",
		okTitle: "Email confermata",
		okBody: "Ora scegli il tuo piano. Ti portiamo lì tra un attimo.",
		continue: "Scegli il mio piano",
		errorTitle: "Non siamo riusciti a confermare la tua email",
		missingToken: "Il link è incompleto. Aprilo di nuovo dall’email.",
		genericError: "Il link non è valido o è scaduto.",
		connectionError: "Nessuna connessione. Controlla internet e riprova.",
		startOver: "Registrati di nuovo",
		help: "Il problema continua? Scrivici:",
	},
};

const COPY: Record<OnboardingLocale, OnboardingUiCopy> = { es, en, pt, fr, de, it };

export function getOnboardingUiCopy(locale: string | null | undefined): OnboardingUiCopy {
	return COPY[resolveOnboardingLocale(locale)];
}

/** Reemplaza `{clave}` por su valor. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
