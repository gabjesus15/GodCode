export type OnboardingPaymentLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

export type OnboardingPaymentCopy = {
  title: string;
  subtitle: string;
  paypalInlineTitle: string;
  paypalInlineHint: string;
  paypalInlineLoading: string;
  noTokenTitle: string;
  noTokenBody: string;
  backHome: string;
  backToStep2: string;
  planLabel: string;
  priceLabel: string;
  extrasLabel: string;
  monthsLabelSingular: string;
  monthsLabelPlural: string;
  monthsPrompt: string;
  continueButton: string;
  footerNote: string;
  manualTitle: string;
  manualSuccessTitle: string;
  manualSuccessBody: string;
  amountLabel: string;
  approxLabel: string;
  referenceNote: string;
  instructionsTitle: string;
  uploadLabel: string;
  uploadButton: string;
  uploadSuccessBody: string;
  uploadHint: string;
  monthSummaryLabel: string;
  supportHint: string;
  configLabels: Record<string, string>;
  errors: {
    createSession: string;
    missingUrl: string;
    unexpected: string;
    paypalCanceled: string;
    missingReceipt: string;
    uploadError: string;
  };
  paymentInstructionsFallback: Record<string, string>;
};

const COPY: Record<OnboardingPaymentLocale, OnboardingPaymentCopy> = {
  es: {
    title: "Activar suscripción",
    subtitle: "Elige los meses y completa el pago.",
    paypalInlineTitle: "Pagar con PayPal",
    paypalInlineHint: "Completa el pago desde este bloque seguro de PayPal.",
    paypalInlineLoading: "Cargando PayPal...",
    noTokenTitle: "Token faltante",
    noTokenBody: "Vuelve al formulario para continuar con tu solicitud.",
    backHome: "Volver al inicio",
    backToStep2: "Volver al paso anterior",
    planLabel: "Plan",
    priceLabel: "Precio",
    extrasLabel: "Servicios extra",
    monthsLabelSingular: "mes",
    monthsLabelPlural: "meses",
    monthsPrompt: "¿Por cuántos meses?",
    continueButton: "Ir a pagar",
    footerNote: "Al continuar aceptas los términos. Puedes cancelar en cualquier momento.",
    manualTitle: "Pago manual",
    manualSuccessTitle: "Comprobante registrado",
    manualSuccessBody: "Te avisaremos por correo cuando validemos el pago. Puedes cerrar esta página.",
    amountLabel: "Monto a pagar",
    approxLabel: "Equivalente aprox. (tasa BCV)",
    referenceNote: "Tasa de referencia; el monto oficial es en USD.",
    instructionsTitle: "Instrucciones",
    uploadLabel: "Subir comprobante de pago *",
    uploadButton: "Enviar comprobante",
    uploadSuccessBody: "Te avisaremos por correo cuando validemos el pago. Puedes cerrar esta página.",
    uploadHint: "Selecciona una imagen o PDF con el comprobante.",
    monthSummaryLabel: "meses",
    supportHint: "Si el problema persiste, revisa tu método de pago o contacta soporte.",
    configLabels: {
      banco: "Banco",
      telefono: "Teléfono",
      identificacion: "Cédula / RUT",
      email: "Correo",
      name: "Nombre del titular",
      tipo_cuenta: "Tipo de cuenta",
      nro_cuenta: "Número de cuenta",
      titular: "Nombre del titular",
      reference: "Referencia",
      instructions: "Instrucciones",
      phone: "Teléfono",
      bank: "Banco",
      account_number: "Número de cuenta",
    },
    errors: {
      createSession: "Error al crear sesión de pago",
      missingUrl: "No se recibió la URL de pago. Contacta a soporte.",
      unexpected: "Error inesperado",
      paypalCanceled: "Pago cancelado en PayPal.",
      missingReceipt: "Selecciona el comprobante de pago (imagen o PDF).",
      uploadError: "Error al subir",
    },
    paymentInstructionsFallback: {
      pago_movil: "Realiza el pago por Pago Móvil con los datos que se muestran abajo. Luego sube el comprobante.",
      zelle: "Realiza el pago por Zelle al correo indicado. Luego sube el comprobante.",
      transferencia: "Realiza la transferencia a los datos bancarios indicados. Luego sube el comprobante.",
      transferencia_bancaria: "Realiza la transferencia a los datos bancarios indicados. Luego sube el comprobante.",
    },
  },
  en: {
    title: "Activate subscription",
    subtitle: "Choose the number of months and complete the payment.",
    paypalInlineTitle: "Pay with PayPal",
    paypalInlineHint: "Complete the payment using this secure PayPal block.",
    paypalInlineLoading: "Loading PayPal...",
    noTokenTitle: "Missing token",
    noTokenBody: "Go back to the form to continue your request.",
    backHome: "Back to start",
    backToStep2: "Back to the previous step",
    planLabel: "Plan",
    priceLabel: "Price",
    extrasLabel: "Extra services",
    monthsLabelSingular: "month",
    monthsLabelPlural: "months",
    monthsPrompt: "How many months?",
    continueButton: "Go to payment",
    footerNote: "By continuing you accept the terms. You can cancel at any time.",
    manualTitle: "Manual payment",
    manualSuccessTitle: "Receipt saved",
    manualSuccessBody: "We will email you when the payment is validated. You can close this page.",
    amountLabel: "Amount due",
    approxLabel: "Approx. equivalent (BCV rate)",
    referenceNote: "Reference rate; the official amount is in USD.",
    instructionsTitle: "Instructions",
    uploadLabel: "Upload payment receipt *",
    uploadButton: "Send receipt",
    uploadSuccessBody: "We will email you when the payment is validated. You can close this page.",
    uploadHint: "Select an image or PDF with the receipt.",
    monthSummaryLabel: "months",
    supportHint: "If the issue persists, review your payment method or contact support.",
    configLabels: {
      banco: "Bank",
      telefono: "Phone",
      identificacion: "ID / tax number",
      email: "Email",
      name: "Account holder name",
      tipo_cuenta: "Account type",
      nro_cuenta: "Account number",
      titular: "Account holder name",
      reference: "Reference",
      instructions: "Instructions",
      phone: "Phone",
      bank: "Bank",
      account_number: "Account number",
    },
    errors: {
      createSession: "Error creating payment session",
      missingUrl: "Payment URL was not returned. Contact support.",
      unexpected: "Unexpected error",
      paypalCanceled: "Payment was canceled in PayPal.",
      missingReceipt: "Select the payment receipt (image or PDF).",
      uploadError: "Upload error",
    },
    paymentInstructionsFallback: {
      pago_movil: "Make the payment via Mobile Payment using the details below. Then upload the receipt.",
      zelle: "Make the payment via Zelle to the email shown below. Then upload the receipt.",
      transferencia: "Make the bank transfer using the details shown below. Then upload the receipt.",
      transferencia_bancaria: "Make the bank transfer using the details shown below. Then upload the receipt.",
    },
  },
  pt: {
    title: "Ativar assinatura",
    subtitle: "Escolha a quantidade de meses e conclua o pagamento.",
    paypalInlineTitle: "Pagar com PayPal",
    paypalInlineHint: "Conclua o pagamento neste bloco seguro do PayPal.",
    paypalInlineLoading: "Carregando PayPal...",
    noTokenTitle: "Token ausente",
    noTokenBody: "Volte ao formulário para continuar sua solicitação.",
    backHome: "Voltar ao início",
    backToStep2: "Voltar à etapa anterior",
    planLabel: "Plano",
    priceLabel: "Preço",
    extrasLabel: "Serviços extras",
    monthsLabelSingular: "mês",
    monthsLabelPlural: "meses",
    monthsPrompt: "Por quantos meses?",
    continueButton: "Ir para o pagamento",
    footerNote: "Ao continuar você aceita os termos. Você pode cancelar a qualquer momento.",
    manualTitle: "Pagamento manual",
    manualSuccessTitle: "Comprovante registrado",
    manualSuccessBody: "Vamos avisar por e-mail quando o pagamento for validado. Você pode fechar esta página.",
    amountLabel: "Valor a pagar",
    approxLabel: "Equivalente aprox. (taxa BCV)",
    referenceNote: "Taxa de referência; o valor oficial é em USD.",
    instructionsTitle: "Instruções",
    uploadLabel: "Enviar comprovante de pagamento *",
    uploadButton: "Enviar comprovante",
    uploadSuccessBody: "Vamos avisar por e-mail quando o pagamento for validado. Você pode fechar esta página.",
    uploadHint: "Selecione uma imagem ou PDF com o comprovante.",
    monthSummaryLabel: "meses",
    supportHint: "Se o problema persistir, revise seu método de pagamento ou contate o suporte.",
    configLabels: {
      banco: "Banco",
      telefono: "Telefone",
      identificacion: "Documento / RUT",
      email: "E-mail",
      name: "Nome do titular",
      tipo_cuenta: "Tipo de conta",
      nro_cuenta: "Número da conta",
      titular: "Nome do titular",
      reference: "Referência",
      instructions: "Instruções",
      phone: "Telefone",
      bank: "Banco",
      account_number: "Número da conta",
    },
    errors: {
      createSession: "Erro ao criar sessão de pagamento",
      missingUrl: "A URL de pagamento não foi retornada. Contate o suporte.",
      unexpected: "Erro inesperado",
      paypalCanceled: "Pagamento cancelado no PayPal.",
      missingReceipt: "Selecione o comprovante de pagamento (imagem ou PDF).",
      uploadError: "Erro ao enviar",
    },
    paymentInstructionsFallback: {
      pago_movil: "Faça o pagamento via Pagamento Móvel com os dados abaixo. Depois envie o comprovante.",
      zelle: "Faça o pagamento via Zelle para o e-mail informado. Depois envie o comprovante.",
      transferencia: "Faça a transferência bancária usando os dados abaixo. Depois envie o comprovante.",
      transferencia_bancaria: "Faça a transferência bancária usando os dados abaixo. Depois envie o comprovante.",
    },
  },
  fr: {
    title: "Activer l’abonnement",
    subtitle: "Choisissez le nombre de mois et finalisez le paiement.",
    paypalInlineTitle: "Payer avec PayPal",
    paypalInlineHint: "Finalisez le paiement dans ce bloc PayPal sécurisé.",
    paypalInlineLoading: "Chargement de PayPal...",
    noTokenTitle: "Jeton manquant",
    noTokenBody: "Retournez au formulaire pour continuer votre demande.",
    backHome: "Retour au début",
    backToStep2: "Retour à l’étape précédente",
    planLabel: "Forfait",
    priceLabel: "Prix",
    extrasLabel: "Services supplémentaires",
    monthsLabelSingular: "mois",
    monthsLabelPlural: "mois",
    monthsPrompt: "Pour combien de mois ?",
    continueButton: "Aller au paiement",
    footerNote: "En continuant, vous acceptez les conditions. Vous pouvez annuler à tout moment.",
    manualTitle: "Paiement manuel",
    manualSuccessTitle: "Reçu enregistré",
    manualSuccessBody: "Nous vous informerons par e-mail lorsque le paiement sera validé. Vous pouvez fermer cette page.",
    amountLabel: "Montant à payer",
    approxLabel: "Équivalent approx. (taux BCV)",
    referenceNote: "Taux de référence ; le montant officiel est en USD.",
    instructionsTitle: "Instructions",
    uploadLabel: "Téléverser le reçu de paiement *",
    uploadButton: "Envoyer le reçu",
    uploadSuccessBody: "Nous vous informerons par e-mail lorsque le paiement sera validé. Vous pouvez fermer cette page.",
    uploadHint: "Sélectionnez une image ou un PDF contenant le reçu.",
    monthSummaryLabel: "mois",
    supportHint: "Si le problème persiste, vérifiez votre moyen de paiement ou contactez le support.",
    configLabels: {
      banco: "Banque",
      telefono: "Téléphone",
      identificacion: "Carte / RUT",
      email: "E-mail",
      name: "Nom du titulaire",
      tipo_cuenta: "Type de compte",
      nro_cuenta: "Numéro de compte",
      titular: "Nom du titulaire",
      reference: "Référence",
      instructions: "Instructions",
      phone: "Téléphone",
      bank: "Banque",
      account_number: "Numéro de compte",
    },
    errors: {
      createSession: "Erreur lors de la création de la session de paiement",
      missingUrl: "L’URL de paiement n’a pas été renvoyée. Contactez le support.",
      unexpected: "Erreur inattendue",
      paypalCanceled: "Paiement annulé dans PayPal.",
      missingReceipt: "Sélectionnez le reçu de paiement (image ou PDF).",
      uploadError: "Erreur de téléversement",
    },
    paymentInstructionsFallback: {
      pago_movil: "Effectuez le paiement via Mobile Payment avec les informations ci-dessous. Puis téléversez le reçu.",
      zelle: "Effectuez le paiement via Zelle à l’adresse indiquée. Puis téléversez le reçu.",
      transferencia: "Effectuez le virement bancaire avec les informations ci-dessous. Puis téléversez le reçu.",
      transferencia_bancaria: "Effectuez le virement bancaire avec les informations ci-dessous. Puis téléversez le reçu.",
    },
  },
  de: {
    title: "Abonnement aktivieren",
    subtitle: "Wählen Sie die Anzahl der Monate und schließen Sie die Zahlung ab.",
    paypalInlineTitle: "Mit PayPal bezahlen",
    paypalInlineHint: "Schließen Sie die Zahlung in diesem sicheren PayPal-Bereich ab.",
    paypalInlineLoading: "PayPal wird geladen...",
    noTokenTitle: "Token fehlt",
    noTokenBody: "Gehen Sie zurück zum Formular, um fortzufahren.",
    backHome: "Zurück zum Start",
    backToStep2: "Zurück zum vorherigen Schritt",
    planLabel: "Plan",
    priceLabel: "Preis",
    extrasLabel: "Zusatzleistungen",
    monthsLabelSingular: "Monat",
    monthsLabelPlural: "Monate",
    monthsPrompt: "Für wie viele Monate?",
    continueButton: "Zur Zahlung",
    footerNote: "Mit dem Fortfahren akzeptieren Sie die Bedingungen. Sie können jederzeit abbrechen.",
    manualTitle: "Manuelle Zahlung",
    manualSuccessTitle: "Beleg gespeichert",
    manualSuccessBody: "Wir benachrichtigen Sie per E-Mail, sobald die Zahlung validiert wurde. Sie können diese Seite schließen.",
    amountLabel: "Zu zahlender Betrag",
    approxLabel: "Ca. Gegenwert (BCV-Kurs)",
    referenceNote: "Referenzkurs; der offizielle Betrag ist in USD.",
    instructionsTitle: "Anweisungen",
    uploadLabel: "Zahlungsbeleg hochladen *",
    uploadButton: "Beleg senden",
    uploadSuccessBody: "Wir benachrichtigen Sie per E-Mail, sobald die Zahlung validiert wurde. Sie können diese Seite schließen.",
    uploadHint: "Wählen Sie ein Bild oder PDF mit dem Beleg aus.",
    monthSummaryLabel: "Monate",
    supportHint: "Wenn das Problem weiterhin besteht, prüfen Sie Ihre Zahlungsmethode oder kontaktieren Sie den Support.",
    configLabels: {
      banco: "Bank",
      telefono: "Telefon",
      identificacion: "Ausweis / Steuernummer",
      email: "E-Mail",
      name: "Name des Kontoinhabers",
      tipo_cuenta: "Kontotyp",
      nro_cuenta: "Kontonummer",
      titular: "Name des Kontoinhabers",
      reference: "Referenz",
      instructions: "Anweisungen",
      phone: "Telefon",
      bank: "Bank",
      account_number: "Kontonummer",
    },
    errors: {
      createSession: "Fehler beim Erstellen der Zahlungssitzung",
      missingUrl: "Die Zahlungs-URL wurde nicht zurückgegeben. Kontaktieren Sie den Support.",
      unexpected: "Unerwarteter Fehler",
      paypalCanceled: "Zahlung in PayPal abgebrochen.",
      missingReceipt: "Wählen Sie den Zahlungsbeleg aus (Bild oder PDF).",
      uploadError: "Fehler beim Hochladen",
    },
    paymentInstructionsFallback: {
      pago_movil: "Führen Sie die Zahlung per Mobile Payment mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
      zelle: "Führen Sie die Zahlung per Zelle an die angegebene E-Mail aus. Laden Sie danach den Beleg hoch.",
      transferencia: "Führen Sie die Banküberweisung mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
      transferencia_bancaria: "Führen Sie die Banküberweisung mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
    },
  },
  it: {
    title: "Attiva abbonamento",
    subtitle: "Scegli il numero di mesi e completa il pagamento.",
    paypalInlineTitle: "Paga con PayPal",
    paypalInlineHint: "Completa il pagamento in questo blocco sicuro di PayPal.",
    paypalInlineLoading: "Caricamento di PayPal...",
    noTokenTitle: "Token mancante",
    noTokenBody: "Torna al modulo per continuare la richiesta.",
    backHome: "Torna all’inizio",
    backToStep2: "Torna al passaggio precedente",
    planLabel: "Piano",
    priceLabel: "Prezzo",
    extrasLabel: "Servizi extra",
    monthsLabelSingular: "mese",
    monthsLabelPlural: "mesi",
    monthsPrompt: "Per quanti mesi?",
    continueButton: "Vai al pagamento",
    footerNote: "Proseguendo accetti i termini. Puoi annullare in qualsiasi momento.",
    manualTitle: "Pagamento manuale",
    manualSuccessTitle: "Ricevuta registrata",
    manualSuccessBody: "Ti avviseremo via email quando il pagamento sarà validato. Puoi chiudere questa pagina.",
    amountLabel: "Importo da pagare",
    approxLabel: "Equivalente approx. (tasso BCV)",
    referenceNote: "Tasso di riferimento; l’importo ufficiale è in USD.",
    instructionsTitle: "Istruzioni",
    uploadLabel: "Carica la ricevuta di pagamento *",
    uploadButton: "Invia ricevuta",
    uploadSuccessBody: "Ti avviseremo via email quando il pagamento sarà validato. Puoi chiudere questa pagina.",
    uploadHint: "Seleziona un’immagine o un PDF con la ricevuta.",
    monthSummaryLabel: "mesi",
    supportHint: "Se il problema persiste, controlla il metodo di pagamento o contatta il supporto.",
    configLabels: {
      banco: "Banca",
      telefono: "Telefono",
      identificacion: "Documento / RUT",
      email: "E-mail",
      name: "Nome del titolare",
      tipo_cuenta: "Tipo di conto",
      nro_cuenta: "Numero di conto",
      titular: "Nome del titolare",
      reference: "Riferimento",
      instructions: "Istruzioni",
      phone: "Telefono",
      bank: "Banca",
      account_number: "Numero di conto",
    },
    errors: {
      createSession: "Errore nella creazione della sessione di pagamento",
      missingUrl: "L’URL di pagamento non è stato restituito. Contatta il supporto.",
      unexpected: "Errore imprevisto",
      paypalCanceled: "Pagamento annullato in PayPal.",
      missingReceipt: "Seleziona la ricevuta di pagamento (immagine o PDF).",
      uploadError: "Errore di caricamento",
    },
    paymentInstructionsFallback: {
      pago_movil: "Effettua il pagamento tramite Mobile Payment con i dati qui sotto. Poi carica la ricevuta.",
      zelle: "Effettua il pagamento tramite Zelle all’email indicata. Poi carica la ricevuta.",
      transferencia: "Effettua il bonifico bancario con i dati qui sotto. Poi carica la ricevuta.",
      transferencia_bancaria: "Effettua il bonifico bancario con i dati qui sotto. Poi carica la ricevuta.",
    },
  },
};

export function getOnboardingPaymentCopy(locale: string | null | undefined): OnboardingPaymentCopy {
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
  return COPY[short as OnboardingPaymentLocale] ?? COPY.es;
}
