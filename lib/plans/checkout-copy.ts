export type CheckoutLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export type CheckoutSuccessCopy = {
  badgePaid: string;
  badgeFallback: string;
  titlePaid: string;
  titleFallback: string;
  leadPaid: string;
  leadFallback: string;
  accountButtonPaid: string;
  accountButtonFallback: string;
  onboardingButton: string;
  supportButton: string;
  statusLabel: string;
  statusPaid: string;
  statusPending: string;
  stepLabel: string;
  stepText: string;
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
  cancel: CheckoutCancelCopy;
};

const COPY: Record<CheckoutLocale, CheckoutCopy> = {
  es: {
    success: {
      badgePaid: "Pago confirmado",
      badgeFallback: "Verificando pago",
      titlePaid: "Tu cuenta ya está activa",
      titleFallback: "Aún no vemos tu pago",
      leadPaid: "Ya registramos tu pago. Te enviamos un correo para crear tu contraseña y entrar a tu cuenta.",
      leadFallback: "Si acabas de pagar, espera un minuto y recarga esta página. Si no llegaste a pagar, vuelve al registro y retómalo desde el pago.",
      accountButtonPaid: "Ir a mi cuenta",
      accountButtonFallback: "Abrir cuenta",
      onboardingButton: "Volver al registro",
      supportButton: "Contactar soporte",
      statusLabel: "Estado",
      statusPaid: "Pagado",
      statusPending: "Pendiente de confirmar",
      stepLabel: "Siguiente paso",
      stepText: "Crear tu contraseña desde el correo que te enviamos",
      supportLabel: "Soporte",
      recoveryTitle: "Recuperación",
      recoveryText: "Guarda la referencia de pago: con ella te ayudamos si algo falla.",
      validationTitle: "Validación",
      validationText: "Si pagaste por transferencia, revisamos el comprobante y te avisamos por correo.",
      noReferenceTitle: "No encontramos una referencia de pago",
      noReferenceText: "Si cerraste la ventana o hubo un corte en la red, vuelve al onboarding y retoma desde el paso de pago.",
      finalizeNote: "Si algo no se ve bien aquí, tu pago no se pierde: escríbenos con la referencia y lo resolvemos.",
      detailTitle: "Detalle de pago",
      companyLabel: "Empresa",
      planLabel: "Plan",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referencia",
      noPaymentTitle: "No encontramos el pago todavía",
      noPaymentText: "Si ya pagaste, espera un minuto y recarga. Si no, retoma el registro desde el pago.",
    },
    cancel: {
      badge: "Pago interrumpido",
      titlePaid: "Tu intento de pago no se completó",
      titleFallback: "No pudimos identificar tu intento de pago",
      leadPaid: "No se aplicó ningún cambio. Si el pago fue cancelado por tu banco, por la sesión o por una validación, puedes retomar el flujo sin perder el contexto.",
      leadFallback: "Si cerraste la ventana o llegaste desde otra sesión, vuelve a iniciar el onboarding para recuperar el paso exacto del pago.",
      accountButtonPaid: "Ir a mi cuenta",
      accountButtonFallback: "Entrar",
      retryButton: "Reintentar pago",
      supportButton: "Contactar soporte",
      statusLabel: "Estado",
      statusText: "Sin cambios",
      recoveryLabel: "Recuperación",
      recoveryText: "Reintenta desde el mismo contexto",
      supportLabel: "Soporte",
      noReferenceTitle: "No hay referencia para reintentar",
      noReferenceText: "Vuelve al onboarding y repite el paso de pago para generar una nueva referencia.",
      noteText: "Si el problema es de red, navegador o pasarela, no se pierde el plan: solo quedó pendiente el cobro.",
      summaryTitlePaid: "Pago no aplicado",
      summaryTitleFallback: "Intento no reconocido",
      detailTitle: "Detalle de pago",
      companyLabel: "Empresa",
      planLabel: "Plan",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referencia",
      actionTitle: "Acción recomendada",
      actionText: "Reintenta el pago desde el onboarding o entra a tu cuenta para revisar si ya quedó activo.",
      timingTitle: "Tiempo",
      timingText: "Si el proveedor tarda, espera unos minutos antes de reintentar para no duplicar intentos.",
      protectedTitle: "El flujo sigue protegido",
      protectedText: "Aunque el checkout se haya interrumpido, tu onboarding sigue intacto y puedes retomarlo.",
    },
  },
  en: {
    success: {
      badgePaid: "Payment confirmed",
      badgeFallback: "Checking payment",
      titlePaid: "Your account is ready to continue",
      titleFallback: "We can’t see your payment yet",
      leadPaid: "We recorded your payment. We sent you an email to create your password and sign in.",
      leadFallback: "If you just paid, wait a minute and reload this page. If you didn’t get to pay, go back to sign-up and continue from the payment step.",
      accountButtonPaid: "Go to my account",
      accountButtonFallback: "Open account",
      onboardingButton: "Back to onboarding",
      supportButton: "Contact support",
      statusLabel: "Status",
      statusPaid: "Paid",
      statusPending: "Awaiting validation",
      stepLabel: "Next step",
      stepText: "Create your password from the email we sent you",
      supportLabel: "Support",
      recoveryTitle: "Recovery",
      recoveryText: "Keep the payment reference: it lets us help you if anything goes wrong.",
      validationTitle: "Validation",
      validationText: "If you paid by bank transfer, we review the receipt and email you.",
      noReferenceTitle: "We could not find a payment reference",
      noReferenceText: "If you closed the window or the network dropped, go back to onboarding and resume from the payment step.",
      finalizeNote: "If something looks wrong here, your payment is not lost: write to us with the reference and we will fix it.",
      detailTitle: "Payment details",
      companyLabel: "Company",
      planLabel: "Plan",
      monthsLabel: "Months",
      methodLabel: "Method",
      referenceLabel: "Reference",
      noPaymentTitle: "We could not find the payment yet",
      noPaymentText: "If you already paid, wait a minute and reload. Otherwise, continue sign-up from the payment step.",
    },
    cancel: {
      badge: "Payment interrupted",
      titlePaid: "Your payment attempt did not complete",
      titleFallback: "We could not identify your payment attempt",
      leadPaid: "No changes were applied. If your bank, the session, or a validation cancelled the payment, you can resume without losing context.",
      leadFallback: "If you closed the window or arrived from another session, restart onboarding to recover the exact payment step.",
      accountButtonPaid: "Go to my account",
      accountButtonFallback: "Enter",
      retryButton: "Retry payment",
      supportButton: "Contact support",
      statusLabel: "Status",
      statusText: "No changes",
      recoveryLabel: "Recovery",
      recoveryText: "Retry from the same context",
      supportLabel: "Support",
      noReferenceTitle: "No reference available to retry",
      noReferenceText: "Go back to onboarding and repeat the payment step to generate a new reference.",
      noteText: "If the issue was network, browser, or gateway related, nothing is lost: only the charge remains pending.",
      summaryTitlePaid: "Payment not applied",
      summaryTitleFallback: "Attempt not recognized",
      detailTitle: "Payment details",
      companyLabel: "Company",
      planLabel: "Plan",
      monthsLabel: "Months",
      methodLabel: "Method",
      referenceLabel: "Reference",
      actionTitle: "Recommended action",
      actionText: "Retry the payment from onboarding or open your account to check whether it is already active.",
      timingTitle: "Timing",
      timingText: "If the provider is slow, wait a few minutes before retrying to avoid duplicate attempts.",
      protectedTitle: "The flow is still protected",
      protectedText: "Even if checkout was interrupted, your onboarding remains intact and you can resume it.",
    },
  },
  pt: {
    success: {
      badgePaid: "Pagamento confirmado",
      badgeFallback: "Verificando pagamento",
      titlePaid: "Sua conta já ficou pronta para continuar",
      titleFallback: "Ainda não vemos seu pagamento",
      leadPaid: "Registramos seu pagamento. Enviamos um e-mail para você criar sua senha e entrar na conta.",
      leadFallback: "Se você acabou de pagar, aguarde um minuto e recarregue a página. Se não chegou a pagar, volte ao cadastro e continue pelo pagamento.",
      accountButtonPaid: "Ir para minha conta",
      accountButtonFallback: "Abrir conta",
      onboardingButton: "Voltar ao onboarding",
      supportButton: "Falar com suporte",
      statusLabel: "Status",
      statusPaid: "Pago",
      statusPending: "Aguardando validação",
      stepLabel: "Próximo passo",
      stepText: "Criar sua senha pelo e-mail que enviamos",
      supportLabel: "Suporte",
      recoveryTitle: "Recuperação",
      recoveryText: "Guarde a referência do pagamento: com ela ajudamos você se algo falhar.",
      validationTitle: "Validação",
      validationText: "Se você pagou por transferência, revisamos o comprovante e avisamos por e-mail.",
      noReferenceTitle: "Não encontramos uma referência de pagamento",
      noReferenceText: "Se você fechou a janela ou a rede caiu, volte ao onboarding e retome do passo de pagamento.",
      finalizeNote: "Se algo não parecer certo aqui, seu pagamento não se perde: escreva para nós com a referência e resolvemos.",
      detailTitle: "Detalhes do pagamento",
      companyLabel: "Empresa",
      planLabel: "Plano",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referência",
      noPaymentTitle: "Ainda não encontramos o pagamento",
      noPaymentText: "Se você já pagou, aguarde alguns segundos e abra sua conta novamente. Caso contrário, retome o onboarding.",
    },
    cancel: {
      badge: "Pagamento interrompido",
      titlePaid: "Sua tentativa de pagamento não foi concluída",
      titleFallback: "Não conseguimos identificar sua tentativa de pagamento",
      leadPaid: "Nenhuma alteração foi aplicada. Se o banco, a sessão ou uma validação cancelou o pagamento, você pode retomar sem perder o contexto.",
      leadFallback: "Se você fechou a janela ou veio de outra sessão, reinicie o onboarding para recuperar o passo exato do pagamento.",
      accountButtonPaid: "Ir para minha conta",
      accountButtonFallback: "Entrar",
      retryButton: "Tentar pagar novamente",
      supportButton: "Falar com suporte",
      statusLabel: "Status",
      statusText: "Sem alterações",
      recoveryLabel: "Recuperação",
      recoveryText: "Tente novamente no mesmo contexto",
      supportLabel: "Suporte",
      noReferenceTitle: "Não há referência para tentar novamente",
      noReferenceText: "Volte ao onboarding e repita o passo de pagamento para gerar uma nova referência.",
      noteText: "Se o problema foi rede, navegador ou gateway, nada se perde: só o débito ficou pendente.",
      summaryTitlePaid: "Pagamento não aplicado",
      summaryTitleFallback: "Tentativa não reconhecida",
      detailTitle: "Detalhes do pagamento",
      companyLabel: "Empresa",
      planLabel: "Plano",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referência",
      actionTitle: "Ação recomendada",
      actionText: "Tente pagar de novo pelo onboarding ou entre na sua conta para verificar se já ficou ativo.",
      timingTitle: "Tempo",
      timingText: "Se o provedor demorar, espere alguns minutos antes de tentar novamente para não duplicar tentativas.",
      protectedTitle: "O fluxo continua protegido",
      protectedText: "Mesmo com o checkout interrompido, o onboarding segue intacto e você pode retomá-lo.",
    },
  },
  fr: {
    success: {
      badgePaid: "Paiement confirmé",
      badgeFallback: "Vérification du paiement",
      titlePaid: "Votre compte est prêt à continuer",
      titleFallback: "Nous ne voyons pas encore votre paiement",
      leadPaid: "Votre paiement est enregistré. Nous vous avons envoyé un e-mail pour créer votre mot de passe et vous connecter.",
      leadFallback: "Si vous venez de payer, attendez une minute et rechargez la page. Sinon, revenez à l’inscription et reprenez à l’étape du paiement.",
      accountButtonPaid: "Aller à mon compte",
      accountButtonFallback: "Ouvrir le compte",
      onboardingButton: "Retour à l’onboarding",
      supportButton: "Contacter le support",
      statusLabel: "Statut",
      statusPaid: "Payé",
      statusPending: "En attente de validation",
      stepLabel: "Étape suivante",
      stepText: "Créer votre mot de passe depuis l’e-mail envoyé",
      supportLabel: "Support",
      recoveryTitle: "Reprise",
      recoveryText: "Conservez la référence du paiement : elle nous permet de vous aider en cas de problème.",
      validationTitle: "Validation",
      validationText: "Si vous avez payé par virement, nous vérifions le justificatif et vous écrivons.",
      noReferenceTitle: "Aucune référence de paiement trouvée",
      noReferenceText: "Si vous avez fermé la fenêtre ou si le réseau a coupé, retournez à l’onboarding et reprenez à l’étape de paiement.",
      finalizeNote: "Si quelque chose semble incorrect ici, votre paiement n’est pas perdu : écrivez-nous avec la référence.",
      detailTitle: "Détails du paiement",
      companyLabel: "Entreprise",
      planLabel: "Forfait",
      monthsLabel: "Mois",
      methodLabel: "Méthode",
      referenceLabel: "Référence",
      noPaymentTitle: "Nous n’avons pas encore trouvé le paiement",
      noPaymentText: "Si vous avez déjà payé, attendez quelques secondes puis rouvrez votre compte. Sinon, reprenez l’onboarding.",
    },
    cancel: {
      badge: "Paiement interrompu",
      titlePaid: "Votre tentative de paiement n’a pas été terminée",
      titleFallback: "Nous n’avons pas pu identifier votre tentative de paiement",
      leadPaid: "Aucune modification n’a été appliquée. Si votre banque, la session ou une validation a annulé le paiement, vous pouvez reprendre sans perdre le contexte.",
      leadFallback: "Si vous avez fermé la fenêtre ou êtes arrivé depuis une autre session, redémarrez l’onboarding pour retrouver l’étape exacte du paiement.",
      accountButtonPaid: "Aller à mon compte",
      accountButtonFallback: "Entrer",
      retryButton: "Réessayer le paiement",
      supportButton: "Contacter le support",
      statusLabel: "Statut",
      statusText: "Aucun changement",
      recoveryLabel: "Reprise",
      recoveryText: "Réessayer dans le même contexte",
      supportLabel: "Support",
      noReferenceTitle: "Aucune référence disponible pour réessayer",
      noReferenceText: "Retournez à l’onboarding et répétez l’étape de paiement pour générer une nouvelle référence.",
      noteText: "Si le problème vient du réseau, du navigateur ou de la passerelle, rien n’est perdu : seul le débit reste en attente.",
      summaryTitlePaid: "Paiement non appliqué",
      summaryTitleFallback: "Tentative non reconnue",
      detailTitle: "Détails du paiement",
      companyLabel: "Entreprise",
      planLabel: "Forfait",
      monthsLabel: "Mois",
      methodLabel: "Méthode",
      referenceLabel: "Référence",
      actionTitle: "Action recommandée",
      actionText: "Réessayez le paiement depuis l’onboarding ou ouvrez votre compte pour vérifier s’il est déjà actif.",
      timingTitle: "Délai",
      timingText: "Si le fournisseur est lent, attendez quelques minutes avant de réessayer afin d’éviter les doublons.",
      protectedTitle: "Le flux reste protégé",
      protectedText: "Même si le checkout a été interrompu, votre onboarding reste intact et vous pouvez le reprendre.",
    },
  },
  de: {
    success: {
      badgePaid: "Zahlung bestätigt",
      badgeFallback: "Zahlung wird geprüft",
      titlePaid: "Ihr Konto ist jetzt bereit",
      titleFallback: "Wir sehen Ihre Zahlung noch nicht",
      leadPaid: "Ihre Zahlung ist erfasst. Wir haben Ihnen eine E-Mail geschickt, um Ihr Passwort zu erstellen und sich anzumelden.",
      leadFallback: "Wenn Sie gerade bezahlt haben, warten Sie eine Minute und laden Sie die Seite neu. Andernfalls setzen Sie die Anmeldung beim Zahlungsschritt fort.",
      accountButtonPaid: "Zu meinem Konto",
      accountButtonFallback: "Konto öffnen",
      onboardingButton: "Zurück zum Onboarding",
      supportButton: "Support kontaktieren",
      statusLabel: "Status",
      statusPaid: "Bezahlt",
      statusPending: "Warten auf Validierung",
      stepLabel: "Nächster Schritt",
      stepText: "Passwort über die gesendete E-Mail erstellen",
      supportLabel: "Support",
      recoveryTitle: "Wiederherstellung",
      recoveryText: "Bewahren Sie die Zahlungsreferenz auf: Damit helfen wir Ihnen, falls etwas schiefgeht.",
      validationTitle: "Validierung",
      validationText: "Bei Überweisung prüfen wir den Beleg und benachrichtigen Sie per E-Mail.",
      noReferenceTitle: "Keine Zahlungsreferenz gefunden",
      noReferenceText: "Wenn Sie das Fenster geschlossen haben oder die Verbindung abbrach, gehen Sie zurück zum Onboarding und setzen Sie beim Zahlungsschritt fort.",
      finalizeNote: "Wenn hier etwas nicht stimmt, ist Ihre Zahlung nicht verloren: Schreiben Sie uns mit der Referenz.",
      detailTitle: "Zahlungsdetails",
      companyLabel: "Unternehmen",
      planLabel: "Plan",
      monthsLabel: "Monate",
      methodLabel: "Methode",
      referenceLabel: "Referenz",
      noPaymentTitle: "Die Zahlung wurde noch nicht gefunden",
      noPaymentText: "Wenn Sie bereits bezahlt haben, warten Sie ein paar Sekunden und öffnen Sie Ihr Konto erneut. Andernfalls setzen Sie das Onboarding fort.",
    },
    cancel: {
      badge: "Zahlung unterbrochen",
      titlePaid: "Ihr Zahlungsversuch wurde nicht abgeschlossen",
      titleFallback: "Wir konnten Ihren Zahlungsversuch nicht identifizieren",
      leadPaid: "Es wurden keine Änderungen vorgenommen. Wenn Ihre Bank, die Sitzung oder eine Validierung die Zahlung abgebrochen hat, können Sie ohne Kontextverlust fortfahren.",
      leadFallback: "Wenn Sie das Fenster geschlossen haben oder von einer anderen Sitzung kamen, starten Sie das Onboarding erneut, um genau beim Zahlungsschritt weiterzumachen.",
      accountButtonPaid: "Zu meinem Konto",
      accountButtonFallback: "Eintreten",
      retryButton: "Zahlung erneut versuchen",
      supportButton: "Support kontaktieren",
      statusLabel: "Status",
      statusText: "Keine Änderungen",
      recoveryLabel: "Wiederaufnahme",
      recoveryText: "Im gleichen Kontext erneut versuchen",
      supportLabel: "Support",
      noReferenceTitle: "Keine Referenz zum erneuten Versuch vorhanden",
      noReferenceText: "Gehen Sie zurück zum Onboarding und wiederholen Sie den Zahlungsschritt, um eine neue Referenz zu erzeugen.",
      noteText: "Wenn das Problem Netzwerk, Browser oder Gateway war, ist nichts verloren: Nur die Abbuchung bleibt offen.",
      summaryTitlePaid: "Zahlung nicht angewendet",
      summaryTitleFallback: "Versuch nicht erkannt",
      detailTitle: "Zahlungsdetails",
      companyLabel: "Unternehmen",
      planLabel: "Plan",
      monthsLabel: "Monate",
      methodLabel: "Methode",
      referenceLabel: "Referenz",
      actionTitle: "Empfohlene Aktion",
      actionText: "Versuchen Sie die Zahlung erneut über das Onboarding oder öffnen Sie Ihr Konto, um zu prüfen, ob sie bereits aktiv ist.",
      timingTitle: "Zeitpunkt",
      timingText: "Wenn der Anbieter langsam ist, warten Sie einige Minuten, bevor Sie erneut versuchen, um doppelte Versuche zu vermeiden.",
      protectedTitle: "Der Ablauf bleibt geschützt",
      protectedText: "Auch wenn der Checkout unterbrochen wurde, bleibt Ihr Onboarding intakt und kann fortgesetzt werden.",
    },
  },
  it: {
    success: {
      badgePaid: "Pagamento confermato",
      badgeFallback: "Verifica del pagamento",
      titlePaid: "Il tuo account è pronto per continuare",
      titleFallback: "Non vediamo ancora il tuo pagamento",
      leadPaid: "Abbiamo registrato il tuo pagamento. Ti abbiamo inviato un’email per creare la password ed entrare.",
      leadFallback: "Se hai appena pagato, aspetta un minuto e ricarica la pagina. Altrimenti riprendi la registrazione dal pagamento.",
      accountButtonPaid: "Vai al mio account",
      accountButtonFallback: "Apri account",
      onboardingButton: "Torna all’onboarding",
      supportButton: "Contatta il supporto",
      statusLabel: "Stato",
      statusPaid: "Pagato",
      statusPending: "In attesa di validazione",
      stepLabel: "Prossimo passo",
      stepText: "Crea la password dall’email che ti abbiamo inviato",
      supportLabel: "Supporto",
      recoveryTitle: "Recupero",
      recoveryText: "Conserva il riferimento del pagamento: ci permette di aiutarti se qualcosa va storto.",
      validationTitle: "Validazione",
      validationText: "Se hai pagato con bonifico, controlliamo la ricevuta e ti scriviamo.",
      noReferenceTitle: "Non abbiamo trovato un riferimento di pagamento",
      noReferenceText: "Se hai chiuso la finestra o la rete si è interrotta, torna all’onboarding e riprendi dal passaggio di pagamento.",
      finalizeNote: "Se qualcosa non torna qui, il tuo pagamento non è perso: scrivici con il riferimento.",
      detailTitle: "Dettagli del pagamento",
      companyLabel: "Azienda",
      planLabel: "Piano",
      monthsLabel: "Mesi",
      methodLabel: "Metodo",
      referenceLabel: "Riferimento",
      noPaymentTitle: "Non abbiamo ancora trovato il pagamento",
      noPaymentText: "Se hai già pagato, aspetta qualche secondo e riapri il tuo account. In caso contrario, riprendi l’onboarding.",
    },
    cancel: {
      badge: "Pagamento interrotto",
      titlePaid: "Il tuo tentativo di pagamento non è stato completato",
      titleFallback: "Non siamo riusciti a identificare il tuo tentativo di pagamento",
      leadPaid: "Non è stata applicata alcuna modifica. Se la banca, la sessione o una validazione hanno annullato il pagamento, puoi riprendere senza perdere il contesto.",
      leadFallback: "Se hai chiuso la finestra o sei arrivato da un’altra sessione, riavvia l’onboarding per recuperare esattamente il passaggio di pagamento.",
      accountButtonPaid: "Vai al mio account",
      accountButtonFallback: "Entra",
      retryButton: "Riprova il pagamento",
      supportButton: "Contatta il supporto",
      statusLabel: "Stato",
      statusText: "Nessuna modifica",
      recoveryLabel: "Ripresa",
      recoveryText: "Riprova nello stesso contesto",
      supportLabel: "Supporto",
      noReferenceTitle: "Nessun riferimento disponibile per riprovare",
      noReferenceText: "Torna all’onboarding e ripeti il passaggio di pagamento per generare un nuovo riferimento.",
      noteText: "Se il problema è stato di rete, browser o gateway, non si perde nulla: resta solo il pagamento in sospeso.",
      summaryTitlePaid: "Pagamento non applicato",
      summaryTitleFallback: "Tentativo non riconosciuto",
      detailTitle: "Dettagli del pagamento",
      companyLabel: "Azienda",
      planLabel: "Piano",
      monthsLabel: "Mesi",
      methodLabel: "Metodo",
      referenceLabel: "Riferimento",
      actionTitle: "Azione consigliata",
      actionText: "Riprova il pagamento dall’onboarding o entra nel tuo account per verificare se è già attivo.",
      timingTitle: "Tempo",
      timingText: "Se il provider è lento, aspetta qualche minuto prima di riprovare per evitare doppi tentativi.",
      protectedTitle: "Il flusso resta protetto",
      protectedText: "Anche se il checkout è stato interrotto, il tuo onboarding resta intatto e puoi riprenderlo.",
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
