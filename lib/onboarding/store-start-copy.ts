import { resolveOnboardingLocale, type OnboardingLocale } from "./onboarding-ui-copy";

/**
 * «Crear mi tienda» (`/onboarding/tienda`): con el correo confirmado, el dueño elige el
 * link y su contraseña y entra a armar su tienda en vista previa. `{name}`, `{email}` y
 * `{slug}` se reemplazan al usarlos.
 *
 * Con «solo panel CEO» no hay tienda que armar: esa alta pasa por aquí solo de camino a
 * elegir el plan, o ya pagada, y entonces el aviso habla de la cuenta (`panelOnlyCreated*`).
 */
export type StoreStartCopy = {
	title: string;
	subtitle: string;
	storeName: string;
	storeNameHint: string;
	link: string;
	linkChecking: string;
	linkAvailable: string;
	linkTaken: string;
	linkUseSuggestion: string;
	linkShort: string;
	linkReserved: string;
	sector: string;
	sectorHint: string;
	signInAs: string;
	password: string;
	passwordHint: string;
	showPassword: string;
	hidePassword: string;
	submit: string;
	submitting: string;
	footnote: string;
	asideLinkTitle: string;
	asidePreviewNote: string;
	freeTitle: string;
	free: string[];
	paidTitle: string;
	paid: string[];
	existingTitle: string;
	existingBody: string;
	existingLogin: string;
	existingClassic: string;
	createdTitle: string;
	createdBody: string;
	/** «Solo panel CEO» ya pagado: la cuenta existe y no hay tienda de la que hablar. */
	panelOnlyCreatedTitle: string;
	panelOnlyCreatedBody: string;
	login: string;
	errorGeneric: string;
	errorSignIn: string;
	/** Rechazos de «Crear mi tienda» por código (el servidor manda `code`; su texto en español queda para el log). */
	errors: {
		password: string;
		notFound: string;
		notReady: string;
		slugTaken: string;
		slugInvalid: string;
		rateLimited: string;
		missingLink: string;
	};
};

const es: StoreStartCopy = {
	title: "Crea tu tienda",
	subtitle: "Elige su link y tu contraseña. Después la armas con tu menú, tu logo y tus colores, y la ves antes de pagar.",
	storeName: "Nombre de la tienda",
	storeNameHint: "Así la verán tus clientes. Puedes cambiarlo después.",
	link: "Link de tu tienda",
	linkChecking: "Revisando…",
	linkAvailable: "Está libre",
	linkTaken: "Ya está ocupado.",
	linkUseSuggestion: "Usar {slug}",
	linkShort: "Usa al menos 3 letras o números.",
	linkReserved: "Ese link está reservado. Prueba con otro.",
	sector: "¿Qué vendes?",
	sectorHint: "Te recomendamos un diseño para tu tipo de negocio.",
	signInAs: "Entrarás con {email}",
	password: "Crea tu contraseña",
	passwordHint: "Mínimo 8 caracteres.",
	showPassword: "Mostrar contraseña",
	hidePassword: "Ocultar contraseña",
	submit: "Crear mi tienda",
	submitting: "Creando tu tienda…",
	footnote: "Armarla es gratis. Eliges tu plan y pagas solo cuando quieras publicarla.",
	asideLinkTitle: "Tu tienda, en vista previa",
	asidePreviewNote: "La armas y la pruebas con su link. Hasta que la publiques, solo tú la ves.",
	freeTitle: "Gratis mientras la armas",
	free: ["Tu menú, con fotos y precios", "Logo, colores y plantillas", "Una lectura de tu carta con IA", "Vista previa con tu link"],
	paidTitle: "Con tu plan, al publicarla",
	paid: ["Tienda abierta a tus clientes", "Pedidos online y delivery", "Caja, comandas e inventario"],
	existingTitle: "Ya tienes una cuenta con {email}",
	existingBody: "Entra con tu contraseña de siempre, o sigue el alta eligiendo tu plan primero.",
	existingLogin: "Iniciar sesión",
	existingClassic: "Elegir mi plan",
	createdTitle: "Tu tienda ya está creada",
	createdBody: "Entra con tu correo y tu contraseña para seguir armándola.",
	panelOnlyCreatedTitle: "Tu cuenta ya está creada",
	panelOnlyCreatedBody: "Entra con tu correo para usar tu panel CEO. Si aún no tienes contraseña, créala con el enlace del correo de bienvenida.",
	login: "Iniciar sesión",
	errorGeneric: "No pudimos crear tu tienda. Intenta de nuevo.",
	errorSignIn: "Tu tienda quedó creada. Entra desde el inicio de sesión con tu correo y tu contraseña.",
	errors: {
		password: "Tu contraseña debe tener entre {min} y {max} caracteres.",
		notFound: "No encontramos tu registro. Vuelve a abrir el enlace del correo.",
		notReady: "Primero confirma tu correo con el enlace que te enviamos.",
		slugTaken: "Ese link ya lo tiene otra tienda. Prueba con otro.",
		slugInvalid: "Ese link no se puede usar. Usa al menos 3 letras o números y prueba con otro.",
		rateLimited: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
		missingLink: "Falta el enlace de tu registro. Vuelve a abrirlo desde el correo.",
	},
};

const en: StoreStartCopy = {
	title: "Create your store",
	subtitle: "Pick its link and your password. Then build it with your menu, logo and colors, and see it before you pay.",
	storeName: "Store name",
	storeNameHint: "This is what your customers will see. You can change it later.",
	link: "Your store link",
	linkChecking: "Checking…",
	linkAvailable: "It’s available",
	linkTaken: "That one is taken.",
	linkUseSuggestion: "Use {slug}",
	linkShort: "Use at least 3 letters or numbers.",
	linkReserved: "That link is reserved. Try another one.",
	sector: "What do you sell?",
	sectorHint: "We’ll suggest a design for your type of business.",
	signInAs: "You’ll sign in with {email}",
	password: "Create your password",
	passwordHint: "At least 8 characters.",
	showPassword: "Show password",
	hidePassword: "Hide password",
	submit: "Create my store",
	submitting: "Creating your store…",
	footnote: "Building it is free. Choose your plan and pay only when you want to publish it.",
	asideLinkTitle: "Your store, in preview",
	asidePreviewNote: "Build it and try it with its link. Until you publish it, only you can see it.",
	freeTitle: "Free while you build it",
	free: ["Your menu, with photos and prices", "Logo, colors and templates", "One AI read of your menu", "Preview with your link"],
	paidTitle: "With your plan, when you publish",
	paid: ["Store open to your customers", "Online orders and delivery", "POS, kitchen tickets and inventory"],
	existingTitle: "You already have an account with {email}",
	existingBody: "Sign in with your usual password, or continue by choosing your plan first.",
	existingLogin: "Sign in",
	existingClassic: "Choose my plan",
	createdTitle: "Your store is already created",
	createdBody: "Sign in with your email and password to keep building it.",
	panelOnlyCreatedTitle: "Your account is already created",
	panelOnlyCreatedBody: "Sign in with your email to use your CEO panel. If you don’t have a password yet, create it with the link in the welcome email.",
	login: "Sign in",
	errorGeneric: "We couldn’t create your store. Please try again.",
	errorSignIn: "Your store was created. Sign in with your email and password.",
	errors: {
		password: "Your password must be between {min} and {max} characters.",
		notFound: "We couldn’t find your sign-up. Open the link in the email again.",
		notReady: "First confirm your email with the link we sent you.",
		slugTaken: "Another store already has that link. Try a different one.",
		slugInvalid: "That link can’t be used. Use at least 3 letters or numbers and try another one.",
		rateLimited: "Too many attempts. Wait a few minutes and try again.",
		missingLink: "The link to your sign-up is missing. Open it again from the email.",
	},
};

const pt: StoreStartCopy = {
	title: "Crie sua loja",
	subtitle: "Escolha o link e sua senha. Depois monte com seu cardápio, seu logo e suas cores, e veja antes de pagar.",
	storeName: "Nome da loja",
	storeNameHint: "É assim que seus clientes vão vê-la. Você pode mudar depois.",
	link: "Link da sua loja",
	linkChecking: "Verificando…",
	linkAvailable: "Está livre",
	linkTaken: "Já está ocupado.",
	linkUseSuggestion: "Usar {slug}",
	linkShort: "Use pelo menos 3 letras ou números.",
	linkReserved: "Esse link está reservado. Tente outro.",
	sector: "O que você vende?",
	sectorHint: "Sugerimos um design para o seu tipo de negócio.",
	signInAs: "Você vai entrar com {email}",
	password: "Crie sua senha",
	passwordHint: "Mínimo de 8 caracteres.",
	showPassword: "Mostrar senha",
	hidePassword: "Ocultar senha",
	submit: "Criar minha loja",
	submitting: "Criando sua loja…",
	footnote: "Montar é grátis. Você escolhe o plano e paga só quando quiser publicá-la.",
	asideLinkTitle: "Sua loja, em prévia",
	asidePreviewNote: "Monte e teste com o link dela. Até você publicar, só você a vê.",
	freeTitle: "Grátis enquanto você monta",
	free: ["Seu cardápio, com fotos e preços", "Logo, cores e modelos", "Uma leitura do seu cardápio com IA", "Prévia com o seu link"],
	paidTitle: "Com seu plano, ao publicar",
	paid: ["Loja aberta para seus clientes", "Pedidos online e delivery", "Caixa, comandas e estoque"],
	existingTitle: "Você já tem uma conta com {email}",
	existingBody: "Entre com sua senha de sempre, ou continue escolhendo seu plano primeiro.",
	existingLogin: "Entrar",
	existingClassic: "Escolher meu plano",
	createdTitle: "Sua loja já foi criada",
	createdBody: "Entre com seu e-mail e sua senha para continuar montando.",
	panelOnlyCreatedTitle: "Sua conta já foi criada",
	panelOnlyCreatedBody: "Entre com seu e-mail para usar seu painel CEO. Se ainda não tem senha, crie-a com o link do e-mail de boas-vindas.",
	login: "Entrar",
	errorGeneric: "Não conseguimos criar sua loja. Tente novamente.",
	errorSignIn: "Sua loja foi criada. Entre com seu e-mail e sua senha.",
	errors: {
		password: "Sua senha deve ter entre {min} e {max} caracteres.",
		notFound: "Não encontramos seu cadastro. Abra novamente o link do e-mail.",
		notReady: "Primeiro confirme seu e-mail com o link que enviamos.",
		slugTaken: "Outra loja já usa esse link. Tente outro.",
		slugInvalid: "Esse link não pode ser usado. Use pelo menos 3 letras ou números e tente outro.",
		rateLimited: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
		missingLink: "Falta o link do seu cadastro. Abra-o novamente pelo e-mail.",
	},
};

const fr: StoreStartCopy = {
	title: "Créez votre boutique",
	subtitle: "Choisissez son lien et votre mot de passe. Ensuite, créez-la avec votre menu, votre logo et vos couleurs, et voyez-la avant de payer.",
	storeName: "Nom de la boutique",
	storeNameHint: "C’est ce que verront vos clients. Modifiable plus tard.",
	link: "Lien de votre boutique",
	linkChecking: "Vérification…",
	linkAvailable: "Disponible",
	linkTaken: "Déjà pris.",
	linkUseSuggestion: "Utiliser {slug}",
	linkShort: "Utilisez au moins 3 lettres ou chiffres.",
	linkReserved: "Ce lien est réservé. Essayez-en un autre.",
	sector: "Que vendez-vous ?",
	sectorHint: "Nous vous suggérons un design adapté à votre activité.",
	signInAs: "Vous vous connecterez avec {email}",
	password: "Créez votre mot de passe",
	passwordHint: "8 caractères minimum.",
	showPassword: "Afficher le mot de passe",
	hidePassword: "Masquer le mot de passe",
	submit: "Créer ma boutique",
	submitting: "Création de votre boutique…",
	footnote: "La créer est gratuit. Vous choisissez votre offre et payez seulement pour la publier.",
	asideLinkTitle: "Votre boutique, en aperçu",
	asidePreviewNote: "Créez-la et testez-la avec son lien. Tant que vous ne la publiez pas, vous seul la voyez.",
	freeTitle: "Gratuit pendant la création",
	free: ["Votre menu, avec photos et prix", "Logo, couleurs et modèles", "Une lecture de votre carte par IA", "Aperçu avec votre lien"],
	paidTitle: "Avec votre offre, à la publication",
	paid: ["Boutique ouverte à vos clients", "Commandes en ligne et livraison", "Caisse, tickets cuisine et stock"],
	existingTitle: "Vous avez déjà un compte avec {email}",
	existingBody: "Connectez-vous avec votre mot de passe habituel, ou continuez en choisissant d’abord votre offre.",
	existingLogin: "Se connecter",
	existingClassic: "Choisir mon offre",
	createdTitle: "Votre boutique est déjà créée",
	createdBody: "Connectez-vous avec votre e-mail et votre mot de passe pour continuer.",
	panelOnlyCreatedTitle: "Votre compte est déjà créé",
	panelOnlyCreatedBody: "Connectez-vous avec votre e-mail pour utiliser votre panneau CEO. Si vous n’avez pas encore de mot de passe, créez-le avec le lien de l’e-mail de bienvenue.",
	login: "Se connecter",
	errorGeneric: "Nous n’avons pas pu créer votre boutique. Réessayez.",
	errorSignIn: "Votre boutique est créée. Connectez-vous avec votre e-mail et votre mot de passe.",
	errors: {
		password: "Votre mot de passe doit contenir entre {min} et {max} caractères.",
		notFound: "Nous ne trouvons pas votre inscription. Ouvrez à nouveau le lien de l’e-mail.",
		notReady: "Confirmez d’abord votre e-mail avec le lien que nous vous avons envoyé.",
		slugTaken: "Une autre boutique utilise déjà ce lien. Essayez-en un autre.",
		slugInvalid: "Ce lien ne peut pas être utilisé. Utilisez au moins 3 lettres ou chiffres et essayez-en un autre.",
		rateLimited: "Trop de tentatives. Attendez quelques minutes et réessayez.",
		missingLink: "Le lien de votre inscription est manquant. Ouvrez-le à nouveau depuis l’e-mail.",
	},
};

const de: StoreStartCopy = {
	title: "Erstellen Sie Ihren Shop",
	subtitle: "Wählen Sie den Link und Ihr Passwort. Danach richten Sie ihn mit Speisekarte, Logo und Farben ein und sehen ihn, bevor Sie zahlen.",
	storeName: "Name des Shops",
	storeNameHint: "So sehen ihn Ihre Kunden. Sie können ihn später ändern.",
	link: "Link Ihres Shops",
	linkChecking: "Wird geprüft…",
	linkAvailable: "Ist frei",
	linkTaken: "Bereits vergeben.",
	linkUseSuggestion: "{slug} verwenden",
	linkShort: "Mindestens 3 Buchstaben oder Zahlen.",
	linkReserved: "Dieser Link ist reserviert. Versuchen Sie einen anderen.",
	sector: "Was verkaufen Sie?",
	sectorHint: "Wir schlagen Ihnen ein Design für Ihr Geschäft vor.",
	signInAs: "Sie melden sich mit {email} an",
	password: "Passwort erstellen",
	passwordHint: "Mindestens 8 Zeichen.",
	showPassword: "Passwort anzeigen",
	hidePassword: "Passwort verbergen",
	submit: "Meinen Shop erstellen",
	submitting: "Shop wird erstellt…",
	footnote: "Das Einrichten ist kostenlos. Sie wählen Ihren Plan und zahlen erst, wenn Sie ihn veröffentlichen.",
	asideLinkTitle: "Ihr Shop, in der Vorschau",
	asidePreviewNote: "Richten Sie ihn ein und testen Sie ihn mit seinem Link. Bis Sie ihn veröffentlichen, sehen nur Sie ihn.",
	freeTitle: "Kostenlos beim Einrichten",
	free: ["Ihre Speisekarte mit Fotos und Preisen", "Logo, Farben und Vorlagen", "Eine KI-Lesung Ihrer Karte", "Vorschau mit Ihrem Link"],
	paidTitle: "Mit Ihrem Plan, beim Veröffentlichen",
	paid: ["Shop für Ihre Kunden geöffnet", "Online-Bestellungen und Lieferung", "Kasse, Küchenbons und Lager"],
	existingTitle: "Sie haben bereits ein Konto mit {email}",
	existingBody: "Melden Sie sich mit Ihrem bisherigen Passwort an, oder wählen Sie zuerst Ihren Plan.",
	existingLogin: "Anmelden",
	existingClassic: "Plan wählen",
	createdTitle: "Ihr Shop ist bereits erstellt",
	createdBody: "Melden Sie sich mit E-Mail und Passwort an, um weiterzumachen.",
	panelOnlyCreatedTitle: "Ihr Konto ist bereits erstellt",
	panelOnlyCreatedBody: "Melden Sie sich mit Ihrer E-Mail an, um Ihr CEO-Panel zu nutzen. Noch kein Passwort? Erstellen Sie es über den Link in der Willkommens-E-Mail.",
	login: "Anmelden",
	errorGeneric: "Ihr Shop konnte nicht erstellt werden. Bitte erneut versuchen.",
	errorSignIn: "Ihr Shop wurde erstellt. Melden Sie sich mit E-Mail und Passwort an.",
	errors: {
		password: "Dein Passwort muss zwischen {min} und {max} Zeichen lang sein.",
		notFound: "Wir finden deine Anmeldung nicht. Öffne den Link aus der E-Mail erneut.",
		notReady: "Bestätige zuerst deine E-Mail mit dem Link, den wir dir geschickt haben.",
		slugTaken: "Diesen Link hat schon ein anderer Shop. Probier einen anderen.",
		slugInvalid: "Dieser Link kann nicht verwendet werden. Nutze mindestens 3 Buchstaben oder Zahlen und probier einen anderen.",
		rateLimited: "Zu viele Versuche. Warte ein paar Minuten und versuch es noch einmal.",
		missingLink: "Der Link zu deiner Anmeldung fehlt. Öffne ihn erneut aus der E-Mail.",
	},
};

const it: StoreStartCopy = {
	title: "Crea il tuo negozio",
	subtitle: "Scegli il link e la tua password. Poi crealo con il tuo menu, il tuo logo e i tuoi colori, e guardalo prima di pagare.",
	storeName: "Nome del negozio",
	storeNameHint: "È così che lo vedranno i clienti. Puoi cambiarlo dopo.",
	link: "Link del tuo negozio",
	linkChecking: "Controllo…",
	linkAvailable: "È libero",
	linkTaken: "È già occupato.",
	linkUseSuggestion: "Usa {slug}",
	linkShort: "Usa almeno 3 lettere o numeri.",
	linkReserved: "Questo link è riservato. Provane un altro.",
	sector: "Cosa vendi?",
	sectorHint: "Ti suggeriamo un design per il tuo tipo di attività.",
	signInAs: "Entrerai con {email}",
	password: "Crea la tua password",
	passwordHint: "Almeno 8 caratteri.",
	showPassword: "Mostra password",
	hidePassword: "Nascondi password",
	submit: "Crea il mio negozio",
	submitting: "Creazione del negozio…",
	footnote: "Crearlo è gratis. Scegli il piano e paghi solo quando vuoi pubblicarlo.",
	asideLinkTitle: "Il tuo negozio, in anteprima",
	asidePreviewNote: "Crealo e provalo con il suo link. Finché non lo pubblichi, lo vedi solo tu.",
	freeTitle: "Gratis mentre lo crei",
	free: ["Il tuo menu, con foto e prezzi", "Logo, colori e modelli", "Una lettura del menu con l’IA", "Anteprima con il tuo link"],
	paidTitle: "Con il tuo piano, alla pubblicazione",
	paid: ["Negozio aperto ai clienti", "Ordini online e consegna", "Cassa, comande e magazzino"],
	existingTitle: "Hai già un account con {email}",
	existingBody: "Entra con la tua password di sempre, oppure continua scegliendo prima il piano.",
	existingLogin: "Accedi",
	existingClassic: "Scegli il mio piano",
	createdTitle: "Il tuo negozio è già creato",
	createdBody: "Accedi con email e password per continuare a crearlo.",
	panelOnlyCreatedTitle: "Il tuo account è già creato",
	panelOnlyCreatedBody: "Accedi con la tua email per usare il tuo pannello CEO. Se non hai ancora una password, creala con il link dell’email di benvenuto.",
	login: "Accedi",
	errorGeneric: "Non siamo riusciti a creare il negozio. Riprova.",
	errorSignIn: "Il negozio è stato creato. Accedi con email e password.",
	errors: {
		password: "La password deve avere tra {min} e {max} caratteri.",
		notFound: "Non troviamo la tua registrazione. Apri di nuovo il link dell’email.",
		notReady: "Prima conferma la tua email con il link che ti abbiamo inviato.",
		slugTaken: "Un altro negozio ha già questo link. Provane un altro.",
		slugInvalid: "Questo link non si può usare. Usa almeno 3 lettere o numeri e provane un altro.",
		rateLimited: "Troppi tentativi. Aspetta qualche minuto e riprova.",
		missingLink: "Manca il link della tua registrazione. Riaprilo dall’email.",
	},
};

const COPY: Record<OnboardingLocale, StoreStartCopy> = { es, en, pt, fr, de, it };

export function getStoreStartCopy(locale: string | null | undefined): StoreStartCopy {
	return COPY[resolveOnboardingLocale(locale)];
}

/** Códigos que manda `start-store` (lib/onboarding/start-store.ts y su ruta en el servicio). */
const START_STORE_ERROR_KEYS: Record<string, keyof StoreStartCopy["errors"]> = {
	invalid: "password",
	not_found: "notFound",
	not_ready: "notReady",
	slug_taken: "slugTaken",
	slug_invalid: "slugInvalid",
	rate_limited: "rateLimited",
	missing_link: "missingLink",
};

/**
 * El texto de un rechazo de «Crear mi tienda» en el idioma de la página. Sin código conocido:
 * 429 es «demasiados intentos» y lo demás, el error genérico (el servidor ya deshizo todo).
 */
export function startStoreErrorMessage(
	copy: StoreStartCopy,
	code: string | null | undefined,
	status: number,
	limits: { min: number; max: number },
): string {
	const key = (code ? START_STORE_ERROR_KEYS[code] : undefined) ?? (status === 429 ? "rateLimited" : null);
	if (!key) return copy.errorGeneric;
	return copy.errors[key].replace("{min}", String(limits.min)).replace("{max}", String(limits.max));
}
