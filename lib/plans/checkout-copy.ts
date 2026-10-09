/**
 * Textos de las páginas de vuelta del pago (`/checkout/success` y `/checkout/cancel`) y del
 * recuadro que confirma el pago, en los seis idiomas del sitio. `{n}` se reemplaza al usarlo.
 */

export type CheckoutLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export type CheckoutSuccessCopy = {
  titlePaid: string;
  /** «Arma y paga»: el pago abrió la tienda que armó en vista previa. */
  titleDraft: string;
  /** Hay un pago, pero todavía no figura como cobrado. */
  titlePending: string;
  titleFallback: string;
  leadPaid: string;
  leadDraft: string;
  leadPending: string;
  leadFallback: string;
  accountButtonPaid: string;
  accountButtonFallback: string;
  onboardingButton: string;
  supportButton: string;
  stepLabel: string;
  stepText: string;
  stepTextDraft: string;
  supportLabel: string;
  recoveryTitle: string;
  recoveryText: string;
  validationTitle: string;
  validationText: string;
  noReferenceTitle: string;
  noReferenceText: string;
  finalizeNote: string;
  detailTitle: string;
  companyLabel: string;
  planLabel: string;
  monthsLabel: string;
  methodLabel: string;
  referenceLabel: string;
  noPaymentTitle: string;
  noPaymentText: string;
};

/** El recuadro que consulta el pago al volver y, si corresponde, pide la contraseña. */
export type CheckoutFinalizeCopy = {
  draftTitle: string;
  draftText: string;
  draftButton: string;
  loadingTitle: string;
  loadingText: string;
  paidTitle: string;
  ownerPendingText: string;
  setPasswordHereText: string;
  checkEmailText: string;
  pendingTitle: string;
  pendingText: string;
  errorTitle: string;
  errorText: string;
  passwordTitle: string;
  passwordLabel: string;
  passwordRepeatLabel: string;
  passwordTooShort: string;
  passwordMismatch: string;
  passwordSaveError: string;
  passwordSavedSignIn: string;
  passwordSubmit: string;
};

export type CheckoutStatusCopy = {
  paid: string;
  pending: string;
  review: string;
  rejected: string;
  cancelled: string;
};

export type CheckoutCancelCopy = {
  badge: string;
  titlePaid: string;
  titleFallback: string;
  leadPaid: string;
  leadFallback: string;
  accountButtonPaid: string;
  accountButtonFallback: string;
  retryButton: string;
  supportButton: string;
  statusLabel: string;
  statusText: string;
  recoveryLabel: string;
  recoveryText: string;
  supportLabel: string;
  noReferenceTitle: string;
  noReferenceText: string;
  noteText: string;
  summaryTitlePaid: string;
  summaryTitleFallback: string;
  detailTitle: string;
  companyLabel: string;
  planLabel: string;
  monthsLabel: string;
  methodLabel: string;
  referenceLabel: string;
  actionTitle: string;
  actionText: string;
  timingTitle: string;
  timingText: string;
  protectedTitle: string;
  protectedText: string;
};

export type CheckoutCopy = {
  success: CheckoutSuccessCopy;
  finalize: CheckoutFinalizeCopy;
  status: CheckoutStatusCopy;
  cancel: CheckoutCancelCopy;
};

const COPY: Record<CheckoutLocale, CheckoutCopy> = {
  es: {
    success: {
      titlePaid: "Tu cuenta ya está activa",
      titleDraft: "Tu tienda ya está abierta",
      titlePending: "Estamos confirmando tu pago",
      titleFallback: "Aún no vemos tu pago",
      leadPaid: "Ya registramos tu pago. Crea tu contraseña para entrar a tu cuenta; también te enviamos el enlace por correo.",
      leadDraft: "Recibimos tu pago. Tus clientes ya pueden entrar con tu link y hacerte pedidos.",
      leadPending: "Te avisamos por correo apenas se confirme. No hace falta que vuelvas a pagar.",
      leadFallback: "Si acabas de pagar, espera un minuto y recarga esta página. Si no llegaste a pagar, vuelve al registro y retómalo desde el pago.",
      accountButtonPaid: "Ir a mi cuenta",
      accountButtonFallback: "Entrar a mi cuenta",
      onboardingButton: "Volver al registro",
      supportButton: "Contactar soporte",
      stepLabel: "Siguiente paso",
      stepText: "Crear tu contraseña aquí o desde el correo que te enviamos",
      stepTextDraft: "Compartir tu link y tu QR con tus clientes",
      supportLabel: "Soporte",
      recoveryTitle: "Guarda la referencia",
      recoveryText: "Con ella te ayudamos si algo falla.",
      validationTitle: "Pagos por transferencia",
      validationText: "Revisamos el comprobante y te avisamos por correo.",
      noReferenceTitle: "No encontramos una referencia de pago",
      noReferenceText: "Si cerraste la ventana o se cortó la conexión, vuelve al registro y retómalo desde el pago.",
      finalizeNote: "Si algo no se ve bien aquí, tu pago no se pierde: escríbenos con la referencia y lo resolvemos.",
      detailTitle: "Detalle del pago",
      companyLabel: "Negocio",
      planLabel: "Plan",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referencia",
      noPaymentTitle: "Todavía no encontramos el pago",
      noPaymentText: "Si ya pagaste, espera un minuto y recarga. Si no, retoma el registro desde el pago.",
    },
    finalize: {
      draftTitle: "Te llevamos a compartirla",
      draftText: "Ahí tienes tu link y tu QR para las mesas.",
      draftButton: "Compartir mi tienda",
      loadingTitle: "Confirmando tu pago…",
      loadingText: "Esto toma unos segundos.",
      paidTitle: "Pago confirmado",
      ownerPendingText: "Estamos preparando tu acceso. Te escribimos por correo apenas esté listo.",
      setPasswordHereText: "Crea tu contraseña aquí y entra a tu cuenta. También te enviamos el enlace por correo.",
      checkEmailText: "Te enviamos un correo para crear tu contraseña y entrar a tu cuenta. Revisa también spam.",
      pendingTitle: "Tu pago aún no se confirma",
      pendingText: "Si ya pagaste, espera un minuto y recarga esta página. Si sigue igual, escríbenos.",
      errorTitle: "No pudimos confirmar el pago",
      errorText: "Recarga la página en un minuto. Si sigue igual, escríbenos con la referencia.",
      passwordTitle: "Crea tu contraseña",
      passwordLabel: "Contraseña",
      passwordRepeatLabel: "Repítela",
      passwordTooShort: "Usa al menos {n} caracteres.",
      passwordMismatch: "Las contraseñas no coinciden.",
      passwordSaveError: "No pudimos guardar la contraseña. Intenta de nuevo.",
      passwordSavedSignIn: "Tu contraseña quedó guardada. Entra desde el login con tu correo.",
      passwordSubmit: "Entrar a mi cuenta",
    },
    status: { paid: "Pagado", pending: "Pendiente", review: "En revisión", rejected: "Rechazado", cancelled: "Cancelado" },
    cancel: {
      badge: "Pago interrumpido",
      titlePaid: "El pago no se completó",
      titleFallback: "No encontramos tu intento de pago",
      leadPaid: "No se cobró nada ni cambió nada en tu cuenta. Puedes intentarlo de nuevo cuando quieras.",
      leadFallback: "Si cerraste la ventana o vienes de otro dispositivo, vuelve al registro y retómalo desde el pago.",
      accountButtonPaid: "Ir a mi cuenta",
      accountButtonFallback: "Entrar",
      retryButton: "Intentar de nuevo",
      supportButton: "Contactar soporte",
      statusLabel: "Estado",
      statusText: "Sin cobro",
      recoveryLabel: "Para seguir",
      recoveryText: "Pulsa «Intentar de nuevo»",
      supportLabel: "Soporte",
      noReferenceTitle: "No hay un pago que retomar",
      noReferenceText: "Vuelve al registro y repite el paso del pago.",
      noteText: "Si fue un problema de conexión, del navegador o del medio de pago, no pierdes nada: tu plan sigue elegido y solo falta el pago.",
      summaryTitlePaid: "Pago sin aplicar",
      summaryTitleFallback: "Intento no encontrado",
      detailTitle: "Detalle del pago",
      companyLabel: "Negocio",
      planLabel: "Plan",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referencia",
      actionTitle: "Qué hacer",
      actionText: "Intenta pagar de nuevo o entra a tu cuenta para ver si el pago ya quedó.",
      timingTitle: "Antes de reintentar",
      timingText: "Si el medio de pago está lento, espera unos minutos para no pagar dos veces.",
      protectedTitle: "Tu registro sigue guardado",
      protectedText: "Aunque el pago se haya cortado, tus datos y tu plan siguen ahí para retomarlo.",
    },
  },
  en: {
    success: {
      titlePaid: "Your account is active",
      titleDraft: "Your store is open",
      titlePending: "We are confirming your payment",
      titleFallback: "We can’t see your payment yet",
      leadPaid: "We recorded your payment. Create your password to sign in to your account; we also emailed you the link.",
      leadDraft: "We received your payment. Your customers can now open your link and place orders.",
      leadPending: "We will email you as soon as it is confirmed. You don’t need to pay again.",
      leadFallback: "If you just paid, wait a minute and reload this page. If you didn’t get to pay, go back to sign-up and continue from the payment step.",
      accountButtonPaid: "Go to my account",
      accountButtonFallback: "Sign in to my account",
      onboardingButton: "Back to sign-up",
      supportButton: "Contact support",
      stepLabel: "Next step",
      stepText: "Create your password here or from the email we sent you",
      stepTextDraft: "Share your link and your QR code with your customers",
      supportLabel: "Support",
      recoveryTitle: "Keep the reference",
      recoveryText: "It lets us help you if anything goes wrong.",
      validationTitle: "Bank transfers",
      validationText: "We review the receipt and email you.",
      noReferenceTitle: "We could not find a payment reference",
      noReferenceText: "If you closed the window or lost the connection, go back to sign-up and continue from the payment step.",
      finalizeNote: "If something looks wrong here, your payment is not lost: write to us with the reference and we will fix it.",
      detailTitle: "Payment details",
      companyLabel: "Business",
      planLabel: "Plan",
      monthsLabel: "Months",
      methodLabel: "Method",
      referenceLabel: "Reference",
      noPaymentTitle: "We could not find the payment yet",
      noPaymentText: "If you already paid, wait a minute and reload. Otherwise, continue sign-up from the payment step.",
    },
    finalize: {
      draftTitle: "Taking you to share it",
      draftText: "Your link and your QR code for the tables are there.",
      draftButton: "Share my store",
      loadingTitle: "Confirming your payment…",
      loadingText: "This takes a few seconds.",
      paidTitle: "Payment confirmed",
      ownerPendingText: "We are preparing your access. We will email you as soon as it is ready.",
      setPasswordHereText: "Create your password here and sign in to your account. We also emailed you the link.",
      checkEmailText: "We emailed you a link to create your password and sign in. Check your spam folder too.",
      pendingTitle: "Your payment is not confirmed yet",
      pendingText: "If you already paid, wait a minute and reload this page. If nothing changes, write to us.",
      errorTitle: "We could not confirm the payment",
      errorText: "Reload the page in a minute. If nothing changes, write to us with the reference.",
      passwordTitle: "Create your password",
      passwordLabel: "Password",
      passwordRepeatLabel: "Repeat it",
      passwordTooShort: "Use at least {n} characters.",
      passwordMismatch: "The passwords do not match.",
      passwordSaveError: "We could not save the password. Please try again.",
      passwordSavedSignIn: "Your password was saved. Sign in from the login page with your email.",
      passwordSubmit: "Sign in to my account",
    },
    status: { paid: "Paid", pending: "Pending", review: "In review", rejected: "Rejected", cancelled: "Cancelled" },
    cancel: {
      badge: "Payment interrupted",
      titlePaid: "The payment did not go through",
      titleFallback: "We could not find your payment attempt",
      leadPaid: "Nothing was charged and nothing changed in your account. You can try again whenever you want.",
      leadFallback: "If you closed the window or came from another device, go back to sign-up and continue from the payment step.",
      accountButtonPaid: "Go to my account",
      accountButtonFallback: "Sign in",
      retryButton: "Try again",
      supportButton: "Contact support",
      statusLabel: "Status",
      statusText: "Not charged",
      recoveryLabel: "To continue",
      recoveryText: "Tap “Try again”",
      supportLabel: "Support",
      noReferenceTitle: "There is no payment to resume",
      noReferenceText: "Go back to sign-up and repeat the payment step.",
      noteText: "If it was a connection, browser or payment provider issue, you lose nothing: your plan is still selected and only the payment is missing.",
      summaryTitlePaid: "Payment not applied",
      summaryTitleFallback: "Attempt not found",
      detailTitle: "Payment details",
      companyLabel: "Business",
      planLabel: "Plan",
      monthsLabel: "Months",
      methodLabel: "Method",
      referenceLabel: "Reference",
      actionTitle: "What to do",
      actionText: "Try paying again, or open your account to check whether the payment went through.",
      timingTitle: "Before you retry",
      timingText: "If the payment provider is slow, wait a few minutes so you don’t pay twice.",
      protectedTitle: "Your sign-up is still saved",
      protectedText: "Even if the payment was interrupted, your details and your plan are still there to pick up.",
    },
  },
  pt: {
    success: {
      titlePaid: "Sua conta já está ativa",
      titleDraft: "Sua loja já está aberta",
      titlePending: "Estamos confirmando seu pagamento",
      titleFallback: "Ainda não vemos seu pagamento",
      leadPaid: "Registramos seu pagamento. Crie sua senha para entrar na sua conta; também enviamos o link por e-mail.",
      leadDraft: "Recebemos seu pagamento. Seus clientes já podem entrar pelo seu link e fazer pedidos.",
      leadPending: "Avisamos por e-mail assim que for confirmado. Não é preciso pagar de novo.",
      leadFallback: "Se você acabou de pagar, aguarde um minuto e recarregue a página. Se não chegou a pagar, volte ao cadastro e continue pelo pagamento.",
      accountButtonPaid: "Ir para minha conta",
      accountButtonFallback: "Entrar na minha conta",
      onboardingButton: "Voltar ao cadastro",
      supportButton: "Falar com o suporte",
      stepLabel: "Próximo passo",
      stepText: "Criar sua senha aqui ou pelo e-mail que enviamos",
      stepTextDraft: "Compartilhar seu link e seu QR com seus clientes",
      supportLabel: "Suporte",
      recoveryTitle: "Guarde a referência",
      recoveryText: "Com ela ajudamos você se algo falhar.",
      validationTitle: "Pagamentos por transferência",
      validationText: "Revisamos o comprovante e avisamos por e-mail.",
      noReferenceTitle: "Não encontramos uma referência de pagamento",
      noReferenceText: "Se você fechou a janela ou a conexão caiu, volte ao cadastro e continue pelo pagamento.",
      finalizeNote: "Se algo não parecer certo aqui, seu pagamento não se perde: escreva para nós com a referência e resolvemos.",
      detailTitle: "Detalhes do pagamento",
      companyLabel: "Negócio",
      planLabel: "Plano",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referência",
      noPaymentTitle: "Ainda não encontramos o pagamento",
      noPaymentText: "Se você já pagou, aguarde um minuto e recarregue. Caso contrário, continue o cadastro pelo pagamento.",
    },
    finalize: {
      draftTitle: "Levamos você para compartilhá-la",
      draftText: "Lá estão seu link e seu QR para as mesas.",
      draftButton: "Compartilhar minha loja",
      loadingTitle: "Confirmando seu pagamento…",
      loadingText: "Isso leva alguns segundos.",
      paidTitle: "Pagamento confirmado",
      ownerPendingText: "Estamos preparando seu acesso. Avisamos por e-mail assim que estiver pronto.",
      setPasswordHereText: "Crie sua senha aqui e entre na sua conta. Também enviamos o link por e-mail.",
      checkEmailText: "Enviamos um e-mail para você criar sua senha e entrar na sua conta. Confira também o spam.",
      pendingTitle: "Seu pagamento ainda não foi confirmado",
      pendingText: "Se você já pagou, aguarde um minuto e recarregue esta página. Se continuar igual, escreva para nós.",
      errorTitle: "Não conseguimos confirmar o pagamento",
      errorText: "Recarregue a página em um minuto. Se continuar igual, escreva para nós com a referência.",
      passwordTitle: "Crie sua senha",
      passwordLabel: "Senha",
      passwordRepeatLabel: "Repita a senha",
      passwordTooShort: "Use pelo menos {n} caracteres.",
      passwordMismatch: "As senhas não coincidem.",
      passwordSaveError: "Não conseguimos salvar a senha. Tente novamente.",
      passwordSavedSignIn: "Sua senha foi salva. Entre pelo login com seu e-mail.",
      passwordSubmit: "Entrar na minha conta",
    },
    status: { paid: "Pago", pending: "Pendente", review: "Em análise", rejected: "Recusado", cancelled: "Cancelado" },
    cancel: {
      badge: "Pagamento interrompido",
      titlePaid: "O pagamento não foi concluído",
      titleFallback: "Não encontramos sua tentativa de pagamento",
      leadPaid: "Nada foi cobrado e nada mudou na sua conta. Você pode tentar de novo quando quiser.",
      leadFallback: "Se você fechou a janela ou veio de outro dispositivo, volte ao cadastro e continue pelo pagamento.",
      accountButtonPaid: "Ir para minha conta",
      accountButtonFallback: "Entrar",
      retryButton: "Tentar de novo",
      supportButton: "Falar com o suporte",
      statusLabel: "Status",
      statusText: "Sem cobrança",
      recoveryLabel: "Para continuar",
      recoveryText: "Toque em “Tentar de novo”",
      supportLabel: "Suporte",
      noReferenceTitle: "Não há pagamento para retomar",
      noReferenceText: "Volte ao cadastro e repita o passo do pagamento.",
      noteText: "Se foi um problema de conexão, do navegador ou do meio de pagamento, você não perde nada: seu plano continua escolhido e só falta o pagamento.",
      summaryTitlePaid: "Pagamento não aplicado",
      summaryTitleFallback: "Tentativa não encontrada",
      detailTitle: "Detalhes do pagamento",
      companyLabel: "Negócio",
      planLabel: "Plano",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referência",
      actionTitle: "O que fazer",
      actionText: "Tente pagar de novo ou entre na sua conta para ver se o pagamento foi concluído.",
      timingTitle: "Antes de tentar de novo",
      timingText: "Se o meio de pagamento estiver lento, aguarde alguns minutos para não pagar duas vezes.",
      protectedTitle: "Seu cadastro continua salvo",
      protectedText: "Mesmo com o pagamento interrompido, seus dados e seu plano continuam lá para retomar.",
    },
  },
  fr: {
    success: {
      titlePaid: "Votre compte est actif",
      titleDraft: "Votre boutique est ouverte",
      titlePending: "Nous confirmons votre paiement",
      titleFallback: "Nous ne voyons pas encore votre paiement",
      leadPaid: "Votre paiement est enregistré. Créez votre mot de passe pour accéder à votre compte ; nous vous avons aussi envoyé le lien par e-mail.",
      leadDraft: "Nous avons reçu votre paiement. Vos clients peuvent déjà ouvrir votre lien et commander.",
      leadPending: "Nous vous écrivons dès qu’il est confirmé. Inutile de payer à nouveau.",
      leadFallback: "Si vous venez de payer, attendez une minute et rechargez la page. Sinon, revenez à l’inscription et reprenez à l’étape du paiement.",
      accountButtonPaid: "Aller à mon compte",
      accountButtonFallback: "Accéder à mon compte",
      onboardingButton: "Retour à l’inscription",
      supportButton: "Contacter le support",
      stepLabel: "Étape suivante",
      stepText: "Créer votre mot de passe ici ou depuis l’e-mail envoyé",
      stepTextDraft: "Partager votre lien et votre QR avec vos clients",
      supportLabel: "Support",
      recoveryTitle: "Gardez la référence",
      recoveryText: "Elle nous permet de vous aider en cas de problème.",
      validationTitle: "Paiements par virement",
      validationText: "Nous vérifions le justificatif et vous écrivons.",
      noReferenceTitle: "Aucune référence de paiement trouvée",
      noReferenceText: "Si vous avez fermé la fenêtre ou perdu la connexion, revenez à l’inscription et reprenez à l’étape du paiement.",
      finalizeNote: "Si quelque chose semble incorrect ici, votre paiement n’est pas perdu : écrivez-nous avec la référence.",
      detailTitle: "Détails du paiement",
      companyLabel: "Établissement",
      planLabel: "Offre",
      monthsLabel: "Mois",
      methodLabel: "Moyen de paiement",
      referenceLabel: "Référence",
      noPaymentTitle: "Nous n’avons pas encore trouvé le paiement",
      noPaymentText: "Si vous avez déjà payé, attendez une minute et rechargez. Sinon, reprenez l’inscription à l’étape du paiement.",
    },
    finalize: {
      draftTitle: "Nous vous emmenons la partager",
      draftText: "Votre lien et votre QR pour les tables vous y attendent.",
      draftButton: "Partager ma boutique",
      loadingTitle: "Confirmation de votre paiement…",
      loadingText: "Cela prend quelques secondes.",
      paidTitle: "Paiement confirmé",
      ownerPendingText: "Nous préparons votre accès. Nous vous écrivons dès qu’il est prêt.",
      setPasswordHereText: "Créez votre mot de passe ici et accédez à votre compte. Nous vous avons aussi envoyé le lien par e-mail.",
      checkEmailText: "Nous vous avons envoyé un e-mail pour créer votre mot de passe et accéder à votre compte. Vérifiez aussi les spams.",
      pendingTitle: "Votre paiement n’est pas encore confirmé",
      pendingText: "Si vous avez déjà payé, attendez une minute et rechargez cette page. Si rien ne change, écrivez-nous.",
      errorTitle: "Nous n’avons pas pu confirmer le paiement",
      errorText: "Rechargez la page dans une minute. Si rien ne change, écrivez-nous avec la référence.",
      passwordTitle: "Créez votre mot de passe",
      passwordLabel: "Mot de passe",
      passwordRepeatLabel: "Répétez-le",
      passwordTooShort: "Utilisez au moins {n} caractères.",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      passwordSaveError: "Nous n’avons pas pu enregistrer le mot de passe. Réessayez.",
      passwordSavedSignIn: "Votre mot de passe est enregistré. Connectez-vous avec votre e-mail.",
      passwordSubmit: "Accéder à mon compte",
    },
    status: { paid: "Payé", pending: "En attente", review: "En cours de vérification", rejected: "Refusé", cancelled: "Annulé" },
    cancel: {
      badge: "Paiement interrompu",
      titlePaid: "Le paiement n’a pas abouti",
      titleFallback: "Nous n’avons pas trouvé votre tentative de paiement",
      leadPaid: "Rien n’a été débité et rien n’a changé dans votre compte. Vous pouvez réessayer quand vous voulez.",
      leadFallback: "Si vous avez fermé la fenêtre ou venez d’un autre appareil, revenez à l’inscription et reprenez à l’étape du paiement.",
      accountButtonPaid: "Aller à mon compte",
      accountButtonFallback: "Se connecter",
      retryButton: "Réessayer",
      supportButton: "Contacter le support",
      statusLabel: "Statut",
      statusText: "Aucun débit",
      recoveryLabel: "Pour continuer",
      recoveryText: "Appuyez sur « Réessayer »",
      supportLabel: "Support",
      noReferenceTitle: "Aucun paiement à reprendre",
      noReferenceText: "Revenez à l’inscription et refaites l’étape du paiement.",
      noteText: "Si le problème venait de la connexion, du navigateur ou du moyen de paiement, vous ne perdez rien : votre offre reste choisie et il ne manque que le paiement.",
      summaryTitlePaid: "Paiement non appliqué",
      summaryTitleFallback: "Tentative introuvable",
      detailTitle: "Détails du paiement",
      companyLabel: "Établissement",
      planLabel: "Offre",
      monthsLabel: "Mois",
      methodLabel: "Moyen de paiement",
      referenceLabel: "Référence",
      actionTitle: "Que faire",
      actionText: "Réessayez le paiement ou ouvrez votre compte pour vérifier s’il a abouti.",
      timingTitle: "Avant de réessayer",
      timingText: "Si le moyen de paiement est lent, attendez quelques minutes pour ne pas payer deux fois.",
      protectedTitle: "Votre inscription reste enregistrée",
      protectedText: "Même si le paiement a été interrompu, vos informations et votre offre sont toujours là pour reprendre.",
    },
  },
  de: {
    success: {
      titlePaid: "Ihr Konto ist aktiv",
      titleDraft: "Ihr Shop ist geöffnet",
      titlePending: "Wir bestätigen Ihre Zahlung",
      titleFallback: "Wir sehen Ihre Zahlung noch nicht",
      leadPaid: "Ihre Zahlung ist erfasst. Erstellen Sie Ihr Passwort, um sich anzumelden; den Link haben wir Ihnen auch per E-Mail geschickt.",
      leadDraft: "Wir haben Ihre Zahlung erhalten. Ihre Kunden können Ihren Link jetzt öffnen und bestellen.",
      leadPending: "Wir schreiben Ihnen, sobald sie bestätigt ist. Sie müssen nicht erneut zahlen.",
      leadFallback: "Wenn Sie gerade bezahlt haben, warten Sie eine Minute und laden Sie die Seite neu. Andernfalls setzen Sie die Registrierung beim Zahlungsschritt fort.",
      accountButtonPaid: "Zu meinem Konto",
      accountButtonFallback: "Bei meinem Konto anmelden",
      onboardingButton: "Zurück zur Registrierung",
      supportButton: "Support kontaktieren",
      stepLabel: "Nächster Schritt",
      stepText: "Passwort hier oder über die gesendete E-Mail erstellen",
      stepTextDraft: "Link und QR-Code mit Ihren Kunden teilen",
      supportLabel: "Support",
      recoveryTitle: "Referenz aufbewahren",
      recoveryText: "Damit helfen wir Ihnen, falls etwas schiefgeht.",
      validationTitle: "Zahlungen per Überweisung",
      validationText: "Wir prüfen den Beleg und schreiben Ihnen per E-Mail.",
      noReferenceTitle: "Keine Zahlungsreferenz gefunden",
      noReferenceText: "Wenn Sie das Fenster geschlossen haben oder die Verbindung abbrach, gehen Sie zurück zur Registrierung und setzen Sie beim Zahlungsschritt fort.",
      finalizeNote: "Wenn hier etwas nicht stimmt, ist Ihre Zahlung nicht verloren: Schreiben Sie uns mit der Referenz.",
      detailTitle: "Zahlungsdetails",
      companyLabel: "Geschäft",
      planLabel: "Plan",
      monthsLabel: "Monate",
      methodLabel: "Zahlungsart",
      referenceLabel: "Referenz",
      noPaymentTitle: "Die Zahlung wurde noch nicht gefunden",
      noPaymentText: "Wenn Sie bereits bezahlt haben, warten Sie eine Minute und laden Sie neu. Andernfalls setzen Sie die Registrierung beim Zahlungsschritt fort.",
    },
    finalize: {
      draftTitle: "Wir bringen Sie zum Teilen",
      draftText: "Dort finden Sie Ihren Link und Ihren QR-Code für die Tische.",
      draftButton: "Meinen Shop teilen",
      loadingTitle: "Ihre Zahlung wird bestätigt…",
      loadingText: "Das dauert ein paar Sekunden.",
      paidTitle: "Zahlung bestätigt",
      ownerPendingText: "Wir bereiten Ihren Zugang vor. Wir schreiben Ihnen, sobald er bereit ist.",
      setPasswordHereText: "Erstellen Sie hier Ihr Passwort und melden Sie sich an. Den Link haben wir Ihnen auch per E-Mail geschickt.",
      checkEmailText: "Wir haben Ihnen eine E-Mail geschickt, um Ihr Passwort zu erstellen und sich anzumelden. Prüfen Sie auch den Spam-Ordner.",
      pendingTitle: "Ihre Zahlung ist noch nicht bestätigt",
      pendingText: "Wenn Sie bereits bezahlt haben, warten Sie eine Minute und laden Sie diese Seite neu. Wenn sich nichts ändert, schreiben Sie uns.",
      errorTitle: "Wir konnten die Zahlung nicht bestätigen",
      errorText: "Laden Sie die Seite in einer Minute neu. Wenn sich nichts ändert, schreiben Sie uns mit der Referenz.",
      passwordTitle: "Passwort erstellen",
      passwordLabel: "Passwort",
      passwordRepeatLabel: "Passwort wiederholen",
      passwordTooShort: "Verwenden Sie mindestens {n} Zeichen.",
      passwordMismatch: "Die Passwörter stimmen nicht überein.",
      passwordSaveError: "Das Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.",
      passwordSavedSignIn: "Ihr Passwort ist gespeichert. Melden Sie sich mit Ihrer E-Mail an.",
      passwordSubmit: "Bei meinem Konto anmelden",
    },
    status: { paid: "Bezahlt", pending: "Ausstehend", review: "In Prüfung", rejected: "Abgelehnt", cancelled: "Storniert" },
    cancel: {
      badge: "Zahlung unterbrochen",
      titlePaid: "Die Zahlung wurde nicht abgeschlossen",
      titleFallback: "Wir haben Ihren Zahlungsversuch nicht gefunden",
      leadPaid: "Es wurde nichts abgebucht und in Ihrem Konto hat sich nichts geändert. Sie können es jederzeit erneut versuchen.",
      leadFallback: "Wenn Sie das Fenster geschlossen haben oder von einem anderen Gerät kommen, gehen Sie zurück zur Registrierung und setzen Sie beim Zahlungsschritt fort.",
      accountButtonPaid: "Zu meinem Konto",
      accountButtonFallback: "Anmelden",
      retryButton: "Erneut versuchen",
      supportButton: "Support kontaktieren",
      statusLabel: "Status",
      statusText: "Nicht abgebucht",
      recoveryLabel: "So geht es weiter",
      recoveryText: "Tippen Sie auf „Erneut versuchen“",
      supportLabel: "Support",
      noReferenceTitle: "Keine Zahlung zum Fortsetzen",
      noReferenceText: "Gehen Sie zurück zur Registrierung und wiederholen Sie den Zahlungsschritt.",
      noteText: "Lag es an der Verbindung, am Browser oder am Zahlungsanbieter, verlieren Sie nichts: Ihr Plan bleibt gewählt, es fehlt nur die Zahlung.",
      summaryTitlePaid: "Zahlung nicht angewendet",
      summaryTitleFallback: "Versuch nicht gefunden",
      detailTitle: "Zahlungsdetails",
      companyLabel: "Geschäft",
      planLabel: "Plan",
      monthsLabel: "Monate",
      methodLabel: "Zahlungsart",
      referenceLabel: "Referenz",
      actionTitle: "Was tun",
      actionText: "Versuchen Sie die Zahlung erneut oder öffnen Sie Ihr Konto, um zu prüfen, ob sie durchgegangen ist.",
      timingTitle: "Vor dem erneuten Versuch",
      timingText: "Wenn der Zahlungsanbieter langsam ist, warten Sie ein paar Minuten, damit Sie nicht doppelt zahlen.",
      protectedTitle: "Ihre Registrierung bleibt gespeichert",
      protectedText: "Auch wenn die Zahlung unterbrochen wurde, sind Ihre Daten und Ihr Plan noch da, um fortzufahren.",
    },
  },
  it: {
    success: {
      titlePaid: "Il tuo account è attivo",
      titleDraft: "Il tuo negozio è aperto",
      titlePending: "Stiamo confermando il tuo pagamento",
      titleFallback: "Non vediamo ancora il tuo pagamento",
      leadPaid: "Abbiamo registrato il tuo pagamento. Crea la password per entrare nel tuo account; ti abbiamo inviato il link anche via email.",
      leadDraft: "Abbiamo ricevuto il tuo pagamento. I tuoi clienti possono già aprire il tuo link e ordinare.",
      leadPending: "Ti scriviamo appena è confermato. Non serve pagare di nuovo.",
      leadFallback: "Se hai appena pagato, aspetta un minuto e ricarica la pagina. Altrimenti riprendi la registrazione dal pagamento.",
      accountButtonPaid: "Vai al mio account",
      accountButtonFallback: "Entra nel mio account",
      onboardingButton: "Torna alla registrazione",
      supportButton: "Contatta il supporto",
      stepLabel: "Prossimo passo",
      stepText: "Crea la password qui o dall’email che ti abbiamo inviato",
      stepTextDraft: "Condividi il tuo link e il tuo QR con i clienti",
      supportLabel: "Supporto",
      recoveryTitle: "Conserva il riferimento",
      recoveryText: "Ci permette di aiutarti se qualcosa va storto.",
      validationTitle: "Pagamenti con bonifico",
      validationText: "Controlliamo la ricevuta e ti scriviamo.",
      noReferenceTitle: "Non abbiamo trovato un riferimento di pagamento",
      noReferenceText: "Se hai chiuso la finestra o la connessione si è interrotta, torna alla registrazione e riprendi dal pagamento.",
      finalizeNote: "Se qualcosa non torna qui, il tuo pagamento non è perso: scrivici con il riferimento.",
      detailTitle: "Dettagli del pagamento",
      companyLabel: "Attività",
      planLabel: "Piano",
      monthsLabel: "Mesi",
      methodLabel: "Metodo",
      referenceLabel: "Riferimento",
      noPaymentTitle: "Non abbiamo ancora trovato il pagamento",
      noPaymentText: "Se hai già pagato, aspetta un minuto e ricarica. Altrimenti riprendi la registrazione dal pagamento.",
    },
    finalize: {
      draftTitle: "Ti portiamo a condividerlo",
      draftText: "Lì trovi il tuo link e il tuo QR per i tavoli.",
      draftButton: "Condividi il mio negozio",
      loadingTitle: "Stiamo confermando il pagamento…",
      loadingText: "Ci vogliono pochi secondi.",
      paidTitle: "Pagamento confermato",
      ownerPendingText: "Stiamo preparando il tuo accesso. Ti scriviamo appena è pronto.",
      setPasswordHereText: "Crea la password qui ed entra nel tuo account. Ti abbiamo inviato il link anche via email.",
      checkEmailText: "Ti abbiamo inviato un’email per creare la password ed entrare nel tuo account. Controlla anche lo spam.",
      pendingTitle: "Il tuo pagamento non è ancora confermato",
      pendingText: "Se hai già pagato, aspetta un minuto e ricarica questa pagina. Se non cambia nulla, scrivici.",
      errorTitle: "Non siamo riusciti a confermare il pagamento",
      errorText: "Ricarica la pagina tra un minuto. Se non cambia nulla, scrivici con il riferimento.",
      passwordTitle: "Crea la tua password",
      passwordLabel: "Password",
      passwordRepeatLabel: "Ripetila",
      passwordTooShort: "Usa almeno {n} caratteri.",
      passwordMismatch: "Le password non coincidono.",
      passwordSaveError: "Non siamo riusciti a salvare la password. Riprova.",
      passwordSavedSignIn: "La password è salvata. Accedi dal login con la tua email.",
      passwordSubmit: "Entra nel mio account",
    },
    status: { paid: "Pagato", pending: "In sospeso", review: "In verifica", rejected: "Rifiutato", cancelled: "Annullato" },
    cancel: {
      badge: "Pagamento interrotto",
      titlePaid: "Il pagamento non è andato a buon fine",
      titleFallback: "Non abbiamo trovato il tuo tentativo di pagamento",
      leadPaid: "Non è stato addebitato nulla e il tuo account non è cambiato. Puoi riprovare quando vuoi.",
      leadFallback: "Se hai chiuso la finestra o arrivi da un altro dispositivo, torna alla registrazione e riprendi dal pagamento.",
      accountButtonPaid: "Vai al mio account",
      accountButtonFallback: "Accedi",
      retryButton: "Riprova",
      supportButton: "Contatta il supporto",
      statusLabel: "Stato",
      statusText: "Nessun addebito",
      recoveryLabel: "Per continuare",
      recoveryText: "Tocca «Riprova»",
      supportLabel: "Supporto",
      noReferenceTitle: "Nessun pagamento da riprendere",
      noReferenceText: "Torna alla registrazione e ripeti il passaggio del pagamento.",
      noteText: "Se è stato un problema di connessione, del browser o del metodo di pagamento, non perdi nulla: il piano resta scelto e manca solo il pagamento.",
      summaryTitlePaid: "Pagamento non applicato",
      summaryTitleFallback: "Tentativo non trovato",
      detailTitle: "Dettagli del pagamento",
      companyLabel: "Attività",
      planLabel: "Piano",
      monthsLabel: "Mesi",
      methodLabel: "Metodo",
      referenceLabel: "Riferimento",
      actionTitle: "Cosa fare",
      actionText: "Riprova il pagamento o entra nel tuo account per vedere se è andato a buon fine.",
      timingTitle: "Prima di riprovare",
      timingText: "Se il metodo di pagamento è lento, aspetta qualche minuto per non pagare due volte.",
      protectedTitle: "La tua registrazione resta salvata",
      protectedText: "Anche se il pagamento si è interrotto, i tuoi dati e il piano sono ancora lì per riprendere.",
    },
  },
};

export function getCheckoutCopy(locale: string | null | undefined): CheckoutCopy {
  const normalized = String(locale ?? "es").toLowerCase();
  const short = normalized.startsWith("en")
    ? "en"
    : normalized.startsWith("pt")
      ? "pt"
      : normalized.startsWith("fr")
        ? "fr"
        : normalized.startsWith("de")
          ? "de"
          : normalized.startsWith("it")
            ? "it"
            : "es";

  return COPY[short as CheckoutLocale] ?? COPY.es;
}

/** El estado de un pago en palabras; `null` si no es uno conocido: mejor no mostrar el código interno. */
export function checkoutStatusLabel(status: string | null | undefined, labels: CheckoutStatusCopy): string | null {
  switch (String(status ?? "").trim().toLowerCase()) {
    case "paid":
    case "approved":
      return labels.paid;
    case "pending":
      return labels.pending;
    case "pending_validation":
      return labels.review;
    case "rejected":
      return labels.rejected;
    case "cancelled":
      return labels.cancelled;
    default:
      return null;
  }
}

/** ¿El pago ya figura como cobrado? (PayPal y Mercado Pago lo dejan así antes de volver). */
export function isCheckoutPaidStatus(status: string | null | undefined): boolean {
  const value = String(status ?? "").trim().toLowerCase();
  return value === "paid" || value === "approved";
}
