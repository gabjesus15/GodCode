import { resolveOnboardingLocale, type OnboardingLocale } from "./onboarding-ui-copy";

/**
 * «Crear mi tienda» (`/onboarding/tienda`): con el correo confirmado, el dueño elige el
 * link y su contraseña y entra a armar su tienda en vista previa. `{name}`, `{email}` y
 * `{slug}` se reemplazan al usarlos.
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
	login: string;
	errorGeneric: string;
	errorSignIn: string;
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
	login: "Iniciar sesión",
	errorGeneric: "No pudimos crear tu tienda. Intenta de nuevo.",
	errorSignIn: "Tu tienda quedó creada. Entra desde el inicio de sesión con tu correo y tu contraseña.",
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
	login: "Sign in",
	errorGeneric: "We couldn’t create your store. Please try again.",
	errorSignIn: "Your store was created. Sign in with your email and password.",
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
	login: "Entrar",
	errorGeneric: "Não conseguimos criar sua loja. Tente novamente.",
	errorSignIn: "Sua loja foi criada. Entre com seu e-mail e sua senha.",
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
	login: "Se connecter",
	errorGeneric: "Nous n’avons pas pu créer votre boutique. Réessayez.",
	errorSignIn: "Votre boutique est créée. Connectez-vous avec votre e-mail et votre mot de passe.",
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
	login: "Anmelden",
	errorGeneric: "Ihr Shop konnte nicht erstellt werden. Bitte erneut versuchen.",
	errorSignIn: "Ihr Shop wurde erstellt. Melden Sie sich mit E-Mail und Passwort an.",
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
	login: "Accedi",
	errorGeneric: "Non siamo riusciti a creare il negozio. Riprova.",
	errorSignIn: "Il negozio è stato creato. Accedi con email e password.",
};

const COPY: Record<OnboardingLocale, StoreStartCopy> = { es, en, pt, fr, de, it };

export function getStoreStartCopy(locale: string | null | undefined): StoreStartCopy {
	return COPY[resolveOnboardingLocale(locale)];
}
