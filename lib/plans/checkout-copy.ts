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
      badgeFallback: "Acceso preparado",
      titlePaid: "Tu cuenta ya quedó lista para seguir",
      titleFallback: "No pudimos verificar todo, pero sí tenemos tu ruta de recuperación",
      leadPaid: "Ya registramos el pago y ahora puedes entrar a tu cuenta para ver el estado, revisar tu suscripción y continuar la configuración del negocio.",
      leadFallback: "Si el pago falló por una validación, cierre de sesión o pérdida del retorno, abajo tienes una salida clara para retomar el proceso sin perder el contexto.",
      accountButtonPaid: "Ir a mi cuenta",
      accountButtonFallback: "Abrir cuenta",
      onboardingButton: "Volver al onboarding",
      supportButton: "Contactar soporte",
      statusLabel: "Estado",
      statusPaid: "Activo o en sincronización",
      statusPending: "Pendiente de validación",
      stepLabel: "Siguiente paso",
      stepText: "Entrar a la cuenta y completar el set up",
      supportLabel: "Soporte",
      recoveryTitle: "Recuperación",
      recoveryText: "Si algo falló, el pago queda trazable por referencia y puedes volver a entrar sin perder el contexto.",
      validationTitle: "Validación",
      validationText: "El finalizador confirma la sincronización y te avisa si hubo un problema.",
      noReferenceTitle: "No encontramos una referencia de pago",
      noReferenceText: "Si cerraste la ventana o hubo un corte en la red, vuelve al onboarding y retoma desde el paso de pago.",
      finalizeNote: "Si el finalizador falla, no pierdes el pago: la pantalla detecta el problema y te deja volver a entrar a tu cuenta o retomar el onboarding.",
      detailTitle: "Detalle de pago",
      companyLabel: "Empresa",
      planLabel: "Plan",
      monthsLabel: "Meses",
      methodLabel: "Método",
      referenceLabel: "Referencia",
      noPaymentTitle: "No encontramos el pago todavía",
      noPaymentText: "Si ya pagaste, espera unos segundos y vuelve a abrir la cuenta. Si no, retoma el onboarding.",
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
      badgeFallback: "Access ready",
      titlePaid: "Your account is ready to continue",
      titleFallback: "We could not verify everything, but we do have your recovery path",
      leadPaid: "We already recorded the payment. You can now open your account to review status, check your subscription, and continue setting up your business.",
      leadFallback: "If the payment failed because of a validation, session drop, or lost return, you still have a clear path to continue without losing context.",
      accountButtonPaid: "Go to my account",
      accountButtonFallback: "Open account",
      onboardingButton: "Back to onboarding",
      supportButton: "Contact support",
      statusLabel: "Status",
      statusPaid: "Active or syncing",
      statusPending: "Awaiting validation",
      stepLabel: "Next step",
      stepText: "Enter your account and finish setup",
      supportLabel: "Support",
      recoveryTitle: "Recovery",
      recoveryText: "If something failed, the payment is still traceable by reference and you can return without losing context.",
      validationTitle: "Validation",
      validationText: "The finalizer confirms synchronization and warns you if something went wrong.",
      noReferenceTitle: "We could not find a payment reference",
      noReferenceText: "If you closed the window or the network dropped, go back to onboarding and resume from the payment step.",
      finalizeNote: "If the finalizer fails, you do not lose the payment: the page detects the issue and lets you return to your account or resume onboarding.",
      detailTitle: "Payment details",
      companyLabel: "Company",
      planLabel: "Plan",
      monthsLabel: "Months",
      methodLabel: "Method",
      referenceLabel: "Reference",
      noPaymentTitle: "We could not find the payment yet",
      noPaymentText: "If you already paid, wait a few seconds and reopen your account. Otherwise, resume onboarding.",
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
      badgeFallback: "Acesso pronto",
      titlePaid: "Sua conta já ficou pronta para continuar",
      titleFallback: "Não conseguimos validar tudo, mas temos o caminho de recuperação",
      leadPaid: "Já registramos o pagamento. Agora você pode entrar na sua conta para ver o status, revisar a assinatura e continuar configurando o negócio.",
      leadFallback: "Se o pagamento falhou por validação, sessão encerrada ou retorno perdido, abaixo você tem um caminho claro para retomar sem perder o contexto.",
      accountButtonPaid: "Ir para minha conta",
      accountButtonFallback: "Abrir conta",
      onboardingButton: "Voltar ao onboarding",
      supportButton: "Falar com suporte",
      statusLabel: "Status",
      statusPaid: "Ativo ou sincronizando",
      statusPending: "Aguardando validação",
      stepLabel: "Próximo passo",
      stepText: "Entrar na conta e concluir a configuração",
      supportLabel: "Suporte",
      recoveryTitle: "Recuperação",
      recoveryText: "Se algo falhou, o pagamento continua rastreável pela referência e você pode voltar sem perder o contexto.",
      validationTitle: "Validação",
      validationText: "O finalizador confirma a sincronização e avisa se houver algum problema.",
      noReferenceTitle: "Não encontramos uma referência de pagamento",
      noReferenceText: "Se você fechou a janela ou a rede caiu, volte ao onboarding e retome do passo de pagamento.",
      finalizeNote: "Se o finalizador falhar, você não perde o pagamento: a página detecta o problema e permite voltar à conta ou retomar o onboarding.",
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
      badgeFallback: "Accès prêt",
      titlePaid: "Votre compte est prêt à continuer",
      titleFallback: "Nous n’avons pas pu tout vérifier, mais le chemin de reprise est disponible",
      leadPaid: "Le paiement a bien été enregistré. Vous pouvez maintenant ouvrir votre compte pour consulter l’état, vérifier l’abonnement et continuer la configuration de votre activité.",
      leadFallback: "Si le paiement a échoué à cause d’une validation, d’une session interrompue ou d’un retour perdu, vous avez encore un chemin clair pour reprendre sans perdre le contexte.",
      accountButtonPaid: "Aller à mon compte",
      accountButtonFallback: "Ouvrir le compte",
      onboardingButton: "Retour à l’onboarding",
      supportButton: "Contacter le support",
      statusLabel: "Statut",
      statusPaid: "Actif ou en synchronisation",
      statusPending: "En attente de validation",
      stepLabel: "Étape suivante",
      stepText: "Ouvrir votre compte et terminer la configuration",
      supportLabel: "Support",
      recoveryTitle: "Reprise",
      recoveryText: "Si quelque chose a échoué, le paiement reste traçable par référence et vous pouvez revenir sans perdre le contexte.",
      validationTitle: "Validation",
      validationText: "Le finaliseur confirme la synchronisation et vous avertit en cas de problème.",
      noReferenceTitle: "Aucune référence de paiement trouvée",
      noReferenceText: "Si vous avez fermé la fenêtre ou si le réseau a coupé, retournez à l’onboarding et reprenez à l’étape de paiement.",
      finalizeNote: "Si le finaliseur échoue, vous ne perdez pas le paiement : la page détecte le problème et vous permet de revenir à votre compte ou de reprendre l’onboarding.",
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
      timingTitle: "Zeit",
      timingText: "Si le fournisseur est lent, attendez quelques minutes avant de réessayer afin d’éviter les doublons.",
      protectedTitle: "Le flux reste protégé",
      protectedText: "Même si le checkout a été interrompu, votre onboarding reste intact et vous pouvez le reprendre.",
    },
  },
  de: {
    success: {
      badgePaid: "Zahlung bestätigt",
      badgeFallback: "Zugang bereit",
      titlePaid: "Ihr Konto ist jetzt bereit",
      titleFallback: "Wir konnten nicht alles prüfen, aber der Wiederherstellungspfad ist da",
      leadPaid: "Die Zahlung wurde bereits erfasst. Sie können jetzt Ihr Konto öffnen, den Status prüfen, Ihr Abo ansehen und die Einrichtung fortsetzen.",
      leadFallback: "Wenn die Zahlung wegen einer Validierung, einer unterbrochenen Sitzung oder eines verlorenen Rücksprungs fehlgeschlagen ist, haben Sie trotzdem einen klaren Weg zurück.",
      accountButtonPaid: "Zu meinem Konto",
      accountButtonFallback: "Konto öffnen",
      onboardingButton: "Zurück zum Onboarding",
      supportButton: "Support kontaktieren",
      statusLabel: "Status",
      statusPaid: "Aktiv oder in Synchronisierung",
      statusPending: "Warten auf Validierung",
      stepLabel: "Nächster Schritt",
      stepText: "Konto öffnen und Einrichtung abschließen",
      supportLabel: "Support",
      recoveryTitle: "Wiederherstellung",
      recoveryText: "Wenn etwas fehlschlug, bleibt die Zahlung über die Referenz nachvollziehbar und Sie können ohne Kontextverlust zurückkehren.",
      validationTitle: "Validierung",
      validationText: "Der Finalizer bestätigt die Synchronisierung und meldet Probleme.",
      noReferenceTitle: "Keine Zahlungsreferenz gefunden",
      noReferenceText: "Wenn Sie das Fenster geschlossen haben oder die Verbindung abbrach, gehen Sie zurück zum Onboarding und setzen Sie beim Zahlungsschritt fort.",
      finalizeNote: "Wenn der Finalizer fehlschlägt, geht die Zahlung nicht verloren: Die Seite erkennt das Problem und bringt Sie zurück in Ihr Konto oder zum Onboarding.",
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
      timingTitle: "Timing",
      timingText: "Wenn der Anbieter langsam ist, warten Sie einige Minuten, bevor Sie erneut versuchen, um doppelte Versuche zu vermeiden.",
      protectedTitle: "Der Ablauf bleibt geschützt",
      protectedText: "Auch wenn der Checkout unterbrochen wurde, bleibt Ihr Onboarding intakt und kann fortgesetzt werden.",
    },
  },
  it: {
    success: {
      badgePaid: "Pagamento confermato",
      badgeFallback: "Accesso pronto",
      titlePaid: "Il tuo account è pronto per continuare",
      titleFallback: "Non siamo riusciti a verificare tutto, ma il percorso di recupero c’è",
      leadPaid: "Abbiamo già registrato il pagamento. Ora puoi aprire il tuo account per vedere lo stato, controllare l’abbonamento e continuare la configurazione del business.",
      leadFallback: "Se il pagamento è fallito per una validazione, una sessione interrotta o un ritorno perso, hai comunque un percorso chiaro per riprendere senza perdere il contesto.",
      accountButtonPaid: "Vai al mio account",
      accountButtonFallback: "Apri account",
      onboardingButton: "Torna all’onboarding",
      supportButton: "Contatta il supporto",
      statusLabel: "Stato",
      statusPaid: "Attivo o in sincronizzazione",
      statusPending: "In attesa di validazione",
      stepLabel: "Prossimo passo",
      stepText: "Entra nel tuo account e completa la configurazione",
      supportLabel: "Supporto",
      recoveryTitle: "Recupero",
      recoveryText: "Se qualcosa è fallito, il pagamento resta tracciabile tramite riferimento e puoi tornare senza perdere il contesto.",
      validationTitle: "Validazione",
      validationText: "Il finalizer conferma la sincronizzazione e ti avvisa in caso di problemi.",
      noReferenceTitle: "Non abbiamo trovato un riferimento di pagamento",
      noReferenceText: "Se hai chiuso la finestra o la rete si è interrotta, torna all’onboarding e riprendi dal passaggio di pagamento.",
      finalizeNote: "Se il finalizer fallisce, non perdi il pagamento: la pagina rileva il problema e ti permette di tornare al tuo account o riprendere l’onboarding.",
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
