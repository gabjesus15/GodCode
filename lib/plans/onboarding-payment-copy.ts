import type { CouponProblem } from "@/lib/billing/subscription-coupons";

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
  promoTitle: string;
  promoDescription: string;
  promoBadge: string;
  alreadyPaidTitle: string;
  alreadyPaidBody: string;
  rejectedNotice: string;
  paidMonthsSuffix: string;
  activeMonthsSuffix: string;
  loginLabel: string;
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
  /**
   * «Arma y paga»: el alta viene de una tienda ya armada en vista previa (`store_draft`).
   * Reemplaza los textos que hablan de activar una cuenta o de crear la contraseña:
   * la cuenta ya existe y lo que se paga es publicar la tienda.
   */
  draft: {
    /** Título de la página de pago. */
    title: string;
    reviewBody: string;
    paidTitle: string;
    paidBody: string;
    backToStore: string;
    /** «Qué pasa después» cuando lo que se publica es la tienda ya armada: no hay contraseña que crear. */
    nextSteps: [string, string, string];
    /** PayPal o Mercado Pago: la tienda se publica sola al confirmarse el pago. */
    instantActivation: string;
    /** Transferencia, pago móvil, Zelle: se publica cuando el equipo valida el comprobante. */
    manualActivation: string;
    /** Bloque de Mercado Pago (en lugar de `mercadoPago.blockHint`). */
    mercadoPagoHint: string;
    /** Cupón que deja el total en cero (en lugar de `coupon.freeCheckout` y `coupon.freeButton`). */
    freeCheckout: string;
    freeButton: string;
  };
  /** Paso 3 rediseñado: resumen, meses, próximos pasos y datos de transferencia. */
  ui: {
    summaryTitle: string;
    planLine: string;
    perMonth: string;
    totalLabel: string;
    /**
     * Bajo cada opción de meses, cuando con ella recibes más de lo que pagas (promo o cupón):
     * «Recibes 4 meses» al pagar 3. La promo se nombra solo en `promoTitle`; aquí van los meses.
     */
    promoMonths: string;
    coverage: string;
    changeLink: string;
    payWith: string;
    paypalActivation: string;
    manualActivation: string;
    nextTitle: string;
    nextSteps: [string, string, string];
    showBankDetails: string;
    transferStep: string;
    uploadStep: string;
    copy: string;
    copied: string;
    chooseFile: string;
    noFile: string;
    submittedTitle: string;
    submittedBody: string;
    referenceLabel: string;
  };
  /** Mercado Pago como alternativa en el paso de pago (Chile, cobra en CLP). */
  mercadoPago: {
    unavailable: string;
    blockTitle: string;
    blockHint: string;
    button: string;
    clpLine: string;
    activation: string;
    pending: string;
    failure: string;
  };
  /** Cupón del alta en el paso de pago. */
  coupon: {
    prompt: string;
    placeholder: string;
    apply: string;
    applying: string;
    remove: string;
    applied: string;
    percentOff: string;
    amountOff: string;
    freeMonths: string;
    summaryLine: string;
    freeMonthsBadge: string;
    minMonths: string;
    replacesPromo: string;
    freeCheckout: string;
    freeButton: string;
    problems: Record<CouponProblem | "generic", string>;
  };
};

const COPY: Record<OnboardingPaymentLocale, OnboardingPaymentCopy> = {
  es: {
    title: "Paga y activa tu cuenta",
    subtitle: "Elige cuántos meses pagar. Después renuevas cuando quieras desde tu cuenta.",
    mercadoPago: {
      unavailable: "Mercado Pago no está disponible ahora. Cambia el método de pago en el paso anterior.",
      blockTitle: "Pagar con Mercado Pago",
      blockHint: "Te llevamos a Mercado Pago para pagar de forma segura. Al terminar vuelves aquí y tu cuenta se activa.",
      button: "Pagar con Mercado Pago",
      clpLine: "Se cobra en pesos chilenos: {amount}",
      activation: "Con Mercado Pago tu cuenta se activa en cuanto se confirma el pago.",
      pending: "Mercado Pago está procesando tu pago. Te avisamos por correo apenas se confirme; no hace falta pagar de nuevo.",
      failure: "El pago en Mercado Pago no se completó. Puedes intentarlo de nuevo o elegir otro método.",
    },
    paypalInlineTitle: "Pagar con PayPal",
    paypalInlineHint: "Completa el pago desde este bloque seguro de PayPal.",
    paypalInlineLoading: "Cargando PayPal...",
    noTokenTitle: "Falta el enlace de tu registro",
    noTokenBody: "Abre el enlace que te enviamos por correo para seguir con el pago, o empieza tu registro de nuevo.",
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
    uploadHint: "Sube una foto o captura del comprobante (JPG, PNG o WebP).",
    monthSummaryLabel: "meses",
    supportHint: "Si el problema persiste, revisa tu método de pago o contacta soporte.",
    promoTitle: "2 meses al precio de 1 en tu primer pago",
    promoDescription: "Pagas {paid} y recibes {granted}.",
    promoBadge: "Promo activa",
    alreadyPaidTitle: "Tu pago ya está registrado",
    alreadyPaidBody: "Revisa tu correo: te enviamos el enlace para crear tu contraseña y entrar a tu cuenta.",
    rejectedNotice: "No pudimos validar tu pago anterior. Revisa los datos y vuelve a pagar, o escríbenos si crees que es un error.",
    paidMonthsSuffix: "pagados",
    activeMonthsSuffix: "activos",
    loginLabel: "Ir al login",
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
    draft: {
      title: "Paga y publica tu tienda",
      reviewBody: "Te avisamos por correo apenas lo validemos y tu tienda se publica sola. Mientras tanto puedes seguir armándola.",
      paidTitle: "Tu tienda ya está abierta",
      paidBody: "Tus clientes ya pueden entrar con tu link y hacerte pedidos.",
      backToStore: "Volver a mi tienda",
      nextSteps: ["Validamos el pago", "Tu tienda se publica sola, con todo lo que armaste", "Compartes tu link"],
      instantActivation: "Tu tienda se publica en cuanto se confirma el pago.",
      manualActivation: "Publicamos tu tienda cuando validamos el comprobante. Te avisamos por correo.",
      mercadoPagoHint: "Te llevamos a Mercado Pago para pagar de forma segura. Al terminar vuelves aquí y tu tienda se publica.",
      freeCheckout: "Con este cupón no pagas nada: tu tienda se publica al confirmar.",
      freeButton: "Publicar mi tienda",
    },
    ui: {
      summaryTitle: "Tu pedido",
      planLine: "Plan {name}",
      perMonth: "/mes",
      totalLabel: "Total a pagar",
      promoMonths: "Recibes {months}",
      coverage: "Cubre {months} de servicio",
      changeLink: "Cambiar plan o método de pago",
      payWith: "Pagas con {method}",
      paypalActivation: "Con PayPal tu cuenta se activa en cuanto se confirma el pago.",
      manualActivation: "Activamos tu cuenta cuando validamos el comprobante. Te avisamos por correo.",
      nextTitle: "Qué pasa después",
      nextSteps: ["Confirmamos tu pago", "Te llega un correo para crear tu contraseña", "Te ayudamos a dejar tu menú listo"],
      showBankDetails: "Ver datos para transferir",
      transferStep: "Transfiere el monto exacto",
      uploadStep: "Sube el comprobante",
      copy: "Copiar",
      copied: "Copiado",
      chooseFile: "Elegir archivo",
      noFile: "Ningún archivo elegido",
      submittedTitle: "Recibimos tu comprobante",
      submittedBody: "Lo revisamos y te avisamos por correo apenas quede validado. Puedes cerrar esta página.",
      referenceLabel: "Referencia del pago",
    },
    coupon: {
      prompt: "¿Tienes un cupón?",
      placeholder: "Código del cupón",
      apply: "Aplicar",
      applying: "Comprobando…",
      remove: "Quitar cupón",
      applied: "Cupón {code} aplicado",
      percentOff: "{value} de descuento en tu primer pago",
      amountOff: "{value} de descuento en tu primer pago",
      freeMonths: "{months} gratis además de lo que pagues",
      summaryLine: "Cupón {code}",
      freeMonthsBadge: "+{months} gratis",
      minMonths: "Este cupón vale pagando al menos {months}. Con menos meses no se aplica.",
      replacesPromo: "Este cupón reemplaza la promo de 2 meses al precio de 1 en tu primer pago.",
      freeCheckout: "Con este cupón no pagas nada: tu cuenta se activa al confirmar.",
      freeButton: "Activar mi cuenta",
      problems: {
        invalid_format: "Ese código no tiene el formato de un cupón.",
        not_found: "No encontramos ese cupón. Revisa que esté bien escrito.",
        inactive: "Ese cupón ya no está activo.",
        not_started: "Ese cupón todavía no está vigente.",
        expired: "Ese cupón ya venció.",
        exhausted: "Ese cupón ya alcanzó su límite de usos.",
        plan_not_allowed: "Ese cupón no vale para el plan que elegiste.",
        min_months: "Ese cupón exige pagar más meses.",
        already_used: "Ese cupón ya se usó con tu correo.",
        locked: "Tu pago ya está en revisión: no se puede cambiar el cupón.",
        generic: "No pudimos aplicar el cupón. Intenta de nuevo.",
      },
    },
    errors: {
      createSession: "No pudimos iniciar el pago. Intenta de nuevo.",
      missingUrl: "No se recibió la URL de pago. Contacta a soporte.",
      unexpected: "Algo salió mal. Intenta de nuevo.",
      paypalCanceled: "Pago cancelado en PayPal.",
      missingReceipt: "Selecciona la foto o captura del comprobante.",
      uploadError: "No pudimos subir el comprobante. Intenta de nuevo.",
    },
    paymentInstructionsFallback: {
      pago_movil: "Realiza el pago por Pago Móvil con los datos que se muestran abajo. Luego sube el comprobante.",
      zelle: "Realiza el pago por Zelle al correo indicado. Luego sube el comprobante.",
      transferencia: "Realiza la transferencia a los datos bancarios indicados. Luego sube el comprobante.",
      transferencia_bancaria: "Realiza la transferencia a los datos bancarios indicados. Luego sube el comprobante.",
    },
  },
  en: {
    title: "Pay and activate your account",
    subtitle: "Choose how many months to pay. You can renew anytime from your account.",
    mercadoPago: {
      unavailable: "Mercado Pago isn't available right now. Change the payment method in the previous step.",
      blockTitle: "Pay with Mercado Pago",
      blockHint: "We'll take you to Mercado Pago to pay securely. When you're done you come back here and your account is activated.",
      button: "Pay with Mercado Pago",
      clpLine: "Charged in Chilean pesos: {amount}",
      activation: "With Mercado Pago your account is activated as soon as the payment is confirmed.",
      pending: "Mercado Pago is processing your payment. We'll email you as soon as it's confirmed; no need to pay again.",
      failure: "The Mercado Pago payment wasn't completed. You can try again or choose another method.",
    },
    paypalInlineTitle: "Pay with PayPal",
    paypalInlineHint: "Complete the payment using this secure PayPal block.",
    paypalInlineLoading: "Loading PayPal...",
    noTokenTitle: "Your sign-up link is missing",
    noTokenBody: "Open the link we emailed you to continue with the payment, or start your sign-up again.",
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
    uploadHint: "Upload a photo or screenshot of the receipt (JPG, PNG or WebP).",
    monthSummaryLabel: "months",
    supportHint: "If the issue persists, review your payment method or contact support.",
    promoTitle: "2 months for the price of 1 on your first payment",
    promoDescription: "You pay {paid} and get {granted}.",
    promoBadge: "Active promo",
    alreadyPaidTitle: "Your payment is already registered",
    alreadyPaidBody: "Check your email: we sent you the link to create your password and sign in.",
    rejectedNotice: "We couldn’t validate your previous payment. Check the details and pay again, or write to us if you think it’s a mistake.",
    paidMonthsSuffix: "paid",
    activeMonthsSuffix: "active",
    loginLabel: "Go to login",
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
    draft: {
      title: "Pay and publish your store",
      reviewBody: "We'll email you as soon as we validate it, and your store will go live on its own. Meanwhile you can keep building it.",
      paidTitle: "Your store is open",
      paidBody: "Your customers can now visit your link and place orders.",
      backToStore: "Back to my store",
      nextSteps: ["We validate your payment", "Your store goes live on its own, with everything you built", "You share your link"],
      instantActivation: "Your store goes live as soon as the payment is confirmed.",
      manualActivation: "We publish your store once we validate the receipt. We will let you know by email.",
      mercadoPagoHint: "We'll take you to Mercado Pago to pay securely. When you're done you come back here and your store goes live.",
      freeCheckout: "With this coupon you pay nothing: your store goes live when you confirm.",
      freeButton: "Publish my store",
    },
    ui: {
      summaryTitle: "Your order",
      planLine: "Plan {name}",
      perMonth: "/month",
      totalLabel: "Total to pay",
      promoMonths: "You get {months}",
      coverage: "Covers {months} of service",
      changeLink: "Change plan or payment method",
      payWith: "You pay with {method}",
      paypalActivation: "With PayPal your account is activated as soon as the payment is confirmed.",
      manualActivation: "We activate your account once we validate the receipt. We will let you know by email.",
      nextTitle: "What happens next",
      nextSteps: ["We confirm your payment", "You get an email to create your password", "We help you get your menu ready"],
      showBankDetails: "See transfer details",
      transferStep: "Transfer the exact amount",
      uploadStep: "Upload the receipt",
      copy: "Copy",
      copied: "Copied",
      chooseFile: "Choose file",
      noFile: "No file chosen",
      submittedTitle: "We received your receipt",
      submittedBody: "We will review it and email you as soon as it is validated. You can close this page.",
      referenceLabel: "Payment reference",
    },
    coupon: {
      prompt: "Have a coupon?",
      placeholder: "Coupon code",
      apply: "Apply",
      applying: "Checking…",
      remove: "Remove coupon",
      applied: "Coupon {code} applied",
      percentOff: "{value} off your first payment",
      amountOff: "{value} off your first payment",
      freeMonths: "{months} free on top of what you pay",
      summaryLine: "Coupon {code}",
      freeMonthsBadge: "+{months} free",
      minMonths: "This coupon requires paying at least {months}. With fewer months it doesn't apply.",
      replacesPromo: "This coupon replaces the promo: 2 months for the price of 1 on your first payment.",
      freeCheckout: "With this coupon you pay nothing: your account is activated when you confirm.",
      freeButton: "Activate my account",
      problems: {
        invalid_format: "That code doesn't look like a coupon.",
        not_found: "We couldn't find that coupon. Check the spelling.",
        inactive: "That coupon is no longer active.",
        not_started: "That coupon isn't valid yet.",
        expired: "That coupon has expired.",
        exhausted: "That coupon has reached its usage limit.",
        plan_not_allowed: "That coupon doesn't apply to the plan you chose.",
        min_months: "That coupon requires paying more months.",
        already_used: "That coupon was already used with your email.",
        locked: "Your payment is under review: the coupon can't be changed.",
        generic: "We couldn't apply the coupon. Try again.",
      },
    },
    errors: {
      createSession: "We couldn’t start the payment. Please try again.",
      missingUrl: "Payment URL was not returned. Contact support.",
      unexpected: "Something went wrong. Please try again.",
      paypalCanceled: "Payment was canceled in PayPal.",
      missingReceipt: "Choose the photo or screenshot of the receipt.",
      uploadError: "We couldn’t upload the receipt. Please try again.",
    },
    paymentInstructionsFallback: {
      pago_movil: "Make the payment via Mobile Payment using the details below. Then upload the receipt.",
      zelle: "Make the payment via Zelle to the email shown below. Then upload the receipt.",
      transferencia: "Make the bank transfer using the details shown below. Then upload the receipt.",
      transferencia_bancaria: "Make the bank transfer using the details shown below. Then upload the receipt.",
    },
  },
  pt: {
    title: "Pague e ative sua conta",
    subtitle: "Escolha quantos meses pagar. Depois você renova quando quiser pela sua conta.",
    mercadoPago: {
      unavailable: "O Mercado Pago não está disponível agora. Altere o método de pagamento na etapa anterior.",
      blockTitle: "Pagar com Mercado Pago",
      blockHint: "Levamos você ao Mercado Pago para pagar com segurança. Ao terminar, você volta aqui e sua conta é ativada.",
      button: "Pagar com Mercado Pago",
      clpLine: "Cobrado em pesos chilenos: {amount}",
      activation: "Com Mercado Pago sua conta é ativada assim que o pagamento é confirmado.",
      pending: "O Mercado Pago está processando seu pagamento. Avisaremos por e-mail assim que for confirmado; não precisa pagar de novo.",
      failure: "O pagamento no Mercado Pago não foi concluído. Você pode tentar de novo ou escolher outro método.",
    },
    paypalInlineTitle: "Pagar com PayPal",
    paypalInlineHint: "Conclua o pagamento neste bloco seguro do PayPal.",
    paypalInlineLoading: "Carregando PayPal...",
    noTokenTitle: "Falta o link do seu cadastro",
    noTokenBody: "Abra o link que enviamos por e-mail para continuar o pagamento, ou comece o cadastro de novo.",
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
    uploadHint: "Envie uma foto ou captura do comprovante (JPG, PNG ou WebP).",
    monthSummaryLabel: "meses",
    supportHint: "Se o problema persistir, revise seu método de pagamento ou contate o suporte.",
    promoTitle: "2 meses pelo preço de 1 no seu primeiro pagamento",
    promoDescription: "Você paga {paid} e recebe {granted}.",
    promoBadge: "Promo ativa",
    alreadyPaidTitle: "Seu pagamento já está registrado",
    alreadyPaidBody: "Confira seu e-mail: enviamos o link para criar sua senha e entrar na conta.",
    rejectedNotice: "Não conseguimos validar seu pagamento anterior. Revise os dados e pague novamente, ou fale conosco se achar que é um erro.",
    paidMonthsSuffix: "pagos",
    activeMonthsSuffix: "ativos",
    loginLabel: "Ir para o login",
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
    draft: {
      title: "Pague e publique sua loja",
      reviewBody: "Avisaremos por e-mail assim que validarmos, e sua loja será publicada automaticamente. Enquanto isso, você pode continuar montando.",
      paidTitle: "Sua loja já está aberta",
      paidBody: "Seus clientes já podem entrar pelo seu link e fazer pedidos.",
      backToStore: "Voltar para minha loja",
      nextSteps: ["Validamos o pagamento", "Sua loja é publicada sozinha, com tudo o que você montou", "Você compartilha seu link"],
      instantActivation: "Sua loja é publicada assim que o pagamento for confirmado.",
      manualActivation: "Publicamos sua loja quando validamos o comprovante. Avisamos por e-mail.",
      mercadoPagoHint: "Levamos você ao Mercado Pago para pagar com segurança. Ao terminar, você volta aqui e sua loja é publicada.",
      freeCheckout: "Com este cupom você não paga nada: sua loja é publicada ao confirmar.",
      freeButton: "Publicar minha loja",
    },
    ui: {
      summaryTitle: "Seu pedido",
      planLine: "Plano {name}",
      perMonth: "/mês",
      totalLabel: "Total a pagar",
      promoMonths: "Você recebe {months}",
      coverage: "Cobre {months} de serviço",
      changeLink: "Mudar plano ou método de pagamento",
      payWith: "Você paga com {method}",
      paypalActivation: "Com PayPal sua conta é ativada assim que o pagamento é confirmado.",
      manualActivation: "Ativamos sua conta quando validamos o comprovante. Avisamos por e-mail.",
      nextTitle: "O que acontece depois",
      nextSteps: ["Confirmamos seu pagamento", "Você recebe um e-mail para criar sua senha", "Ajudamos a deixar seu cardápio pronto"],
      showBankDetails: "Ver dados para transferir",
      transferStep: "Transfira o valor exato",
      uploadStep: "Envie o comprovante",
      copy: "Copiar",
      copied: "Copiado",
      chooseFile: "Escolher arquivo",
      noFile: "Nenhum arquivo escolhido",
      submittedTitle: "Recebemos seu comprovante",
      submittedBody: "Vamos revisá-lo e avisar por e-mail assim que for validado. Você pode fechar esta página.",
      referenceLabel: "Referência do pagamento",
    },
    coupon: {
      prompt: "Tem um cupom?",
      placeholder: "Código do cupom",
      apply: "Aplicar",
      applying: "Verificando…",
      remove: "Remover cupom",
      applied: "Cupom {code} aplicado",
      percentOff: "{value} de desconto no seu primeiro pagamento",
      amountOff: "{value} de desconto no seu primeiro pagamento",
      freeMonths: "{months} grátis além do que você pagar",
      summaryLine: "Cupom {code}",
      freeMonthsBadge: "+{months} grátis",
      minMonths: "Este cupom vale pagando pelo menos {months}. Com menos meses não se aplica.",
      replacesPromo: "Este cupom substitui a promo de 2 meses pelo preço de 1 no seu primeiro pagamento.",
      freeCheckout: "Com este cupom você não paga nada: sua conta é ativada ao confirmar.",
      freeButton: "Ativar minha conta",
      problems: {
        invalid_format: "Esse código não tem o formato de um cupom.",
        not_found: "Não encontramos esse cupom. Confira se está escrito certo.",
        inactive: "Esse cupom não está mais ativo.",
        not_started: "Esse cupom ainda não está vigente.",
        expired: "Esse cupom já venceu.",
        exhausted: "Esse cupom já atingiu o limite de usos.",
        plan_not_allowed: "Esse cupom não vale para o plano que você escolheu.",
        min_months: "Esse cupom exige pagar mais meses.",
        already_used: "Esse cupom já foi usado com o seu e-mail.",
        locked: "Seu pagamento já está em análise: não dá para mudar o cupom.",
        generic: "Não conseguimos aplicar o cupom. Tente de novo.",
      },
    },
    errors: {
      createSession: "Não foi possível iniciar o pagamento. Tente novamente.",
      missingUrl: "A URL de pagamento não foi retornada. Contate o suporte.",
      unexpected: "Algo deu errado. Tente novamente.",
      paypalCanceled: "Pagamento cancelado no PayPal.",
      missingReceipt: "Selecione a foto ou captura do comprovante.",
      uploadError: "Não foi possível enviar o comprovante. Tente novamente.",
    },
    paymentInstructionsFallback: {
      pago_movil: "Faça o pagamento via Pagamento Móvel com os dados abaixo. Depois envie o comprovante.",
      zelle: "Faça o pagamento via Zelle para o e-mail informado. Depois envie o comprovante.",
      transferencia: "Faça a transferência bancária usando os dados abaixo. Depois envie o comprovante.",
      transferencia_bancaria: "Faça a transferência bancária usando os dados abaixo. Depois envie o comprovante.",
    },
  },
  fr: {
    title: "Payez et activez votre compte",
    subtitle: "Choisissez combien de mois payer. Vous renouvelez ensuite quand vous voulez depuis votre compte.",
    mercadoPago: {
      unavailable: "Mercado Pago n'est pas disponible pour le moment. Changez de moyen de paiement à l'étape précédente.",
      blockTitle: "Payer avec Mercado Pago",
      blockHint: "Nous vous redirigeons vers Mercado Pago pour payer en toute sécurité. Ensuite vous revenez ici et votre compte est activé.",
      button: "Payer avec Mercado Pago",
      clpLine: "Débité en pesos chiliens : {amount}",
      activation: "Avec Mercado Pago, votre compte est activé dès que le paiement est confirmé.",
      pending: "Mercado Pago traite votre paiement. Nous vous écrivons dès qu'il est confirmé ; inutile de payer à nouveau.",
      failure: "Le paiement Mercado Pago n'a pas abouti. Vous pouvez réessayer ou choisir un autre moyen.",
    },
    paypalInlineTitle: "Payer avec PayPal",
    paypalInlineHint: "Finalisez le paiement dans ce bloc PayPal sécurisé.",
    paypalInlineLoading: "Chargement de PayPal...",
    noTokenTitle: "Le lien de votre inscription est manquant",
    noTokenBody: "Ouvrez le lien envoyé par e-mail pour poursuivre le paiement, ou recommencez votre inscription.",
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
    uploadHint: "Envoyez une photo ou une capture du justificatif (JPG, PNG ou WebP).",
    monthSummaryLabel: "mois",
    supportHint: "Si le problème persiste, vérifiez votre moyen de paiement ou contactez le support.",
    promoTitle: "2 mois pour le prix d'1 lors de votre premier paiement",
    promoDescription: "Vous payez {paid} et recevez {granted}.",
    promoBadge: "Promo active",
    alreadyPaidTitle: "Votre paiement est déjà enregistré",
    alreadyPaidBody: "Consultez votre e-mail : nous vous avons envoyé le lien pour créer votre mot de passe.",
    rejectedNotice: "Nous n’avons pas pu valider votre paiement précédent. Vérifiez les informations et payez à nouveau, ou écrivez-nous.",
    paidMonthsSuffix: "payés",
    activeMonthsSuffix: "actifs",
    loginLabel: "Aller à la connexion",
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
    draft: {
      title: "Payez et publiez votre boutique",
      reviewBody: "Nous vous écrirons dès sa validation et votre boutique sera publiée automatiquement. En attendant, vous pouvez continuer à la préparer.",
      paidTitle: "Votre boutique est ouverte",
      paidBody: "Vos clients peuvent déjà accéder à votre lien et passer commande.",
      backToStore: "Retour à ma boutique",
      nextSteps: ["Nous validons le paiement", "Votre boutique est publiée automatiquement, avec tout ce que vous avez préparé", "Vous partagez votre lien"],
      instantActivation: "Votre boutique est publiée dès que le paiement est confirmé.",
      manualActivation: "Nous publions votre boutique après validation du justificatif. Nous vous prévenons par e-mail.",
      mercadoPagoHint: "Nous vous redirigeons vers Mercado Pago pour payer en toute sécurité. Ensuite vous revenez ici et votre boutique est publiée.",
      freeCheckout: "Avec ce code, vous ne payez rien : votre boutique est publiée dès la confirmation.",
      freeButton: "Publier ma boutique",
    },
    ui: {
      summaryTitle: "Votre commande",
      planLine: "Offre {name}",
      perMonth: "/mois",
      totalLabel: "Total à payer",
      promoMonths: "Vous recevez {months}",
      coverage: "Couvre {months} de service",
      changeLink: "Changer d’offre ou de moyen de paiement",
      payWith: "Vous payez par {method}",
      paypalActivation: "Avec PayPal, votre compte est activé dès que le paiement est confirmé.",
      manualActivation: "Nous activons votre compte après validation du justificatif. Nous vous prévenons par e-mail.",
      nextTitle: "La suite",
      nextSteps: ["Nous confirmons votre paiement", "Vous recevez un e-mail pour créer votre mot de passe", "Nous vous aidons à préparer votre menu"],
      showBankDetails: "Voir les coordonnées du virement",
      transferStep: "Virez le montant exact",
      uploadStep: "Envoyez le justificatif",
      copy: "Copier",
      copied: "Copié",
      chooseFile: "Choisir un fichier",
      noFile: "Aucun fichier choisi",
      submittedTitle: "Nous avons reçu votre justificatif",
      submittedBody: "Nous le vérifions et vous écrivons dès qu’il est validé. Vous pouvez fermer cette page.",
      referenceLabel: "Référence du paiement",
    },
    coupon: {
      prompt: "Vous avez un code promo ?",
      placeholder: "Code promo",
      apply: "Appliquer",
      applying: "Vérification…",
      remove: "Retirer le code",
      applied: "Code {code} appliqué",
      percentOff: "{value} de réduction sur votre premier paiement",
      amountOff: "{value} de réduction sur votre premier paiement",
      freeMonths: "{months} offerts en plus de ce que vous payez",
      summaryLine: "Code {code}",
      freeMonthsBadge: "+{months} offerts",
      minMonths: "Ce code est valable à partir de {months} payés. Avec moins de mois, il ne s'applique pas.",
      replacesPromo: "Ce code remplace la promo 2 mois pour le prix d'1 lors de votre premier paiement.",
      freeCheckout: "Avec ce code, vous ne payez rien : votre compte est activé dès la confirmation.",
      freeButton: "Activer mon compte",
      problems: {
        invalid_format: "Ce code n'a pas le format d'un code promo.",
        not_found: "Nous ne trouvons pas ce code. Vérifiez l'orthographe.",
        inactive: "Ce code n'est plus actif.",
        not_started: "Ce code n'est pas encore valable.",
        expired: "Ce code a expiré.",
        exhausted: "Ce code a atteint sa limite d'utilisations.",
        plan_not_allowed: "Ce code ne s'applique pas au plan choisi.",
        min_months: "Ce code exige de payer plus de mois.",
        already_used: "Ce code a déjà été utilisé avec votre e-mail.",
        locked: "Votre paiement est en cours de vérification : le code ne peut plus changer.",
        generic: "Impossible d'appliquer le code. Réessayez.",
      },
    },
    errors: {
      createSession: "Impossible de lancer le paiement. Réessayez.",
      missingUrl: "L’URL de paiement n’a pas été renvoyée. Contactez le support.",
      unexpected: "Une erreur s’est produite. Réessayez.",
      paypalCanceled: "Paiement annulé dans PayPal.",
      missingReceipt: "Choisissez la photo ou la capture du justificatif.",
      uploadError: "Impossible d’envoyer le justificatif. Réessayez.",
    },
    paymentInstructionsFallback: {
      pago_movil: "Effectuez le paiement via Mobile Payment avec les informations ci-dessous. Puis téléversez le reçu.",
      zelle: "Effectuez le paiement via Zelle à l’adresse indiquée. Puis téléversez le reçu.",
      transferencia: "Effectuez le virement bancaire avec les informations ci-dessous. Puis téléversez le reçu.",
      transferencia_bancaria: "Effectuez le virement bancaire avec les informations ci-dessous. Puis téléversez le reçu.",
    },
  },
  de: {
    title: "Bezahlen und Konto aktivieren",
    subtitle: "Wählen Sie, wie viele Monate Sie zahlen. Verlängern können Sie jederzeit in Ihrem Konto.",
    mercadoPago: {
      unavailable: "Mercado Pago ist gerade nicht verfügbar. Ändern Sie die Zahlungsmethode im vorherigen Schritt.",
      blockTitle: "Mit Mercado Pago bezahlen",
      blockHint: "Wir leiten Sie zu Mercado Pago weiter, um sicher zu bezahlen. Danach kommen Sie hierher zurück und Ihr Konto wird aktiviert.",
      button: "Mit Mercado Pago bezahlen",
      clpLine: "Abgerechnet in chilenischen Pesos: {amount}",
      activation: "Mit Mercado Pago wird Ihr Konto aktiviert, sobald die Zahlung bestätigt ist.",
      pending: "Mercado Pago verarbeitet Ihre Zahlung. Wir benachrichtigen Sie per E-Mail, sobald sie bestätigt ist; Sie müssen nicht erneut zahlen.",
      failure: "Die Zahlung bei Mercado Pago wurde nicht abgeschlossen. Sie können es erneut versuchen oder eine andere Methode wählen.",
    },
    paypalInlineTitle: "Mit PayPal bezahlen",
    paypalInlineHint: "Schließen Sie die Zahlung in diesem sicheren PayPal-Bereich ab.",
    paypalInlineLoading: "PayPal wird geladen...",
    noTokenTitle: "Der Link Ihrer Anmeldung fehlt",
    noTokenBody: "Öffnen Sie den Link aus unserer E-Mail, um mit der Zahlung fortzufahren, oder starten Sie die Anmeldung neu.",
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
    uploadHint: "Laden Sie ein Foto oder einen Screenshot des Belegs hoch (JPG, PNG oder WebP).",
    monthSummaryLabel: "Monate",
    supportHint: "Wenn das Problem weiterhin besteht, prüfe Sie Ihre Zahlungsmethode oder kontaktieren Sie den Support.",
    promoTitle: "2 Monate zum Preis von 1 bei Ihrer ersten Zahlung",
    promoDescription: "Sie zahlen {paid} und erhalten {granted}.",
    promoBadge: "Aktive Promo",
    alreadyPaidTitle: "Ihre Zahlung ist bereits erfasst",
    alreadyPaidBody: "Prüfen Sie Ihre E-Mails: Wir haben Ihnen den Link zum Erstellen Ihres Passworts geschickt.",
    rejectedNotice: "Ihre vorherige Zahlung konnte nicht bestätigt werden. Prüfen Sie die Daten und zahlen Sie erneut, oder schreiben Sie uns.",
    paidMonthsSuffix: "bezahlt",
    activeMonthsSuffix: "aktiv",
    loginLabel: "Zum Login",
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
    draft: {
      title: "Bezahlen und Shop veröffentlichen",
      reviewBody: "Wir schreiben Ihnen, sobald wir ihn geprüft haben, und Ihr Shop geht automatisch online. Bis dahin können Sie ihn weiter einrichten.",
      paidTitle: "Ihr Shop ist geöffnet",
      paidBody: "Ihre Kunden können jetzt über Ihren Link bestellen.",
      backToStore: "Zurück zu meinem Shop",
      nextSteps: ["Wir prüfen die Zahlung", "Ihr Shop geht automatisch online, mit allem, was Sie eingerichtet haben", "Sie teilen Ihren Link"],
      instantActivation: "Ihr Shop geht online, sobald die Zahlung bestätigt ist.",
      manualActivation: "Wir veröffentlichen Ihren Shop, sobald wir den Beleg geprüft haben. Wir informieren Sie per E-Mail.",
      mercadoPagoHint: "Wir leiten Sie zu Mercado Pago weiter, um sicher zu bezahlen. Danach kommen Sie hierher zurück und Ihr Shop geht online.",
      freeCheckout: "Mit diesem Gutschein zahlen Sie nichts: Ihr Shop geht bei der Bestätigung online.",
      freeButton: "Meinen Shop veröffentlichen",
    },
    ui: {
      summaryTitle: "Ihre Bestellung",
      planLine: "Plan {name}",
      perMonth: "/Monat",
      totalLabel: "Zu zahlen",
      promoMonths: "Sie erhalten {months}",
      coverage: "Deckt {months} Service ab",
      changeLink: "Plan oder Zahlungsmethode ändern",
      payWith: "Sie zahlen mit {method}",
      paypalActivation: "Mit PayPal wird Ihr Konto aktiviert, sobald die Zahlung bestätigt ist.",
      manualActivation: "Wir aktivieren Ihr Konto, sobald wir den Beleg geprüft haben. Wir informieren Sie per E-Mail.",
      nextTitle: "So geht es weiter",
      nextSteps: ["Wir bestätigen Ihre Zahlung", "Sie erhalten eine E-Mail zum Erstellen Ihres Passworts", "Wir helfen Ihnen mit Ihrer Speisekarte"],
      showBankDetails: "Überweisungsdaten anzeigen",
      transferStep: "Überweisen Sie den genauen Betrag",
      uploadStep: "Laden Sie den Beleg hoch",
      copy: "Kopieren",
      copied: "Kopiert",
      chooseFile: "Datei wählen",
      noFile: "Keine Datei gewählt",
      submittedTitle: "Wir haben Ihren Beleg erhalten",
      submittedBody: "Wir prüfen ihn und schreiben Ihnen, sobald er bestätigt ist. Sie können diese Seite schließen.",
      referenceLabel: "Zahlungsreferenz",
    },
    coupon: {
      prompt: "Haben Sie einen Gutschein?",
      placeholder: "Gutscheincode",
      apply: "Einlösen",
      applying: "Wird geprüft…",
      remove: "Gutschein entfernen",
      applied: "Gutschein {code} eingelöst",
      percentOff: "{value} Rabatt auf Ihre erste Zahlung",
      amountOff: "{value} Rabatt auf Ihre erste Zahlung",
      freeMonths: "{months} gratis zusätzlich zu dem, was Sie zahlen",
      summaryLine: "Gutschein {code}",
      freeMonthsBadge: "+{months} gratis",
      minMonths: "Dieser Gutschein gilt ab {months}. Bei weniger Monaten wird er nicht angewendet.",
      replacesPromo: "Dieser Gutschein ersetzt die Aktion „2 Monate zum Preis von 1 bei Ihrer ersten Zahlung“.",
      freeCheckout: "Mit diesem Gutschein zahlen Sie nichts: Ihr Konto wird bei der Bestätigung aktiviert.",
      freeButton: "Mein Konto aktivieren",
      problems: {
        invalid_format: "Dieser Code hat nicht das Format eines Gutscheins.",
        not_found: "Wir finden diesen Gutschein nicht. Prüfen Sie die Schreibweise.",
        inactive: "Dieser Gutschein ist nicht mehr aktiv.",
        not_started: "Dieser Gutschein ist noch nicht gültig.",
        expired: "Dieser Gutschein ist abgelaufen.",
        exhausted: "Dieser Gutschein hat sein Nutzungslimit erreicht.",
        plan_not_allowed: "Dieser Gutschein gilt nicht für den gewählten Plan.",
        min_months: "Dieser Gutschein erfordert mehr bezahlte Monate.",
        already_used: "Dieser Gutschein wurde mit Ihrer E-Mail bereits verwendet.",
        locked: "Ihre Zahlung wird bereits geprüft: der Gutschein kann nicht mehr geändert werden.",
        generic: "Der Gutschein konnte nicht angewendet werden. Versuchen Sie es erneut.",
      },
    },
    errors: {
      createSession: "Die Zahlung konnte nicht gestartet werden. Bitte erneut versuchen.",
      missingUrl: "Die Zahlungs-URL wurde nicht zurückgegeben. Kontaktieren Sie den Support.",
      unexpected: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
      paypalCanceled: "Zahlung in PayPal abgebrochen.",
      missingReceipt: "Wählen Sie das Foto oder den Screenshot des Belegs.",
      uploadError: "Der Beleg konnte nicht hochgeladen werden. Bitte erneut versuchen.",
    },
    paymentInstructionsFallback: {
      pago_movil: "Führen Sie die Zahlung per Mobile Payment mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
      zelle: "Führen Sie die Zahlung per Zelle an die angegebene E-Mail aus. Laden Sie danach den Beleg hoch.",
      transferencia: "Führen Sie die Banküberweisung mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
      transferencia_bancaria: "Führen Sie die Banküberweisung mit den unten stehenden Angaben durch. Laden Sie danach den Beleg hoch.",
    },
  },
  it: {
    title: "Paga e attiva il tuo account",
    subtitle: "Scegli quanti mesi pagare. Poi rinnovi quando vuoi dal tuo account.",
    mercadoPago: {
      unavailable: "Mercado Pago non è disponibile al momento. Cambia il metodo di pagamento nel passaggio precedente.",
      blockTitle: "Paga con Mercado Pago",
      blockHint: "Ti portiamo su Mercado Pago per pagare in modo sicuro. Al termine torni qui e il tuo account viene attivato.",
      button: "Paga con Mercado Pago",
      clpLine: "Addebitato in pesos cileni: {amount}",
      activation: "Con Mercado Pago il tuo account si attiva appena il pagamento è confermato.",
      pending: "Mercado Pago sta elaborando il tuo pagamento. Ti avvisiamo via email appena è confermato; non serve pagare di nuovo.",
      failure: "Il pagamento con Mercado Pago non è stato completato. Puoi riprovare o scegliere un altro metodo.",
    },
    paypalInlineTitle: "Paga con PayPal",
    paypalInlineHint: "Completa il pagamento in questo blocco sicuro di PayPal.",
    paypalInlineLoading: "Caricamento di PayPal...",
    noTokenTitle: "Manca il link della tua registrazione",
    noTokenBody: "Apri il link che ti abbiamo inviato per email per continuare con il pagamento, oppure ricomincia la registrazione.",
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
    uploadHint: "Carica una foto o uno screenshot della ricevuta (JPG, PNG o WebP).",
    monthSummaryLabel: "mesi",
    supportHint: "Se il problema persiste, controlla il metodo di pagamento o contatta il supporto.",
    promoTitle: "2 mesi al prezzo di 1 sul tuo primo pagamento",
    promoDescription: "Paghi {paid} e ricevi {granted}.",
    promoBadge: "Promo attiva",
    alreadyPaidTitle: "Il tuo pagamento è già registrato",
    alreadyPaidBody: "Controlla la tua email: ti abbiamo inviato il link per creare la password ed entrare.",
    rejectedNotice: "Non siamo riusciti a convalidare il pagamento precedente. Controlla i dati e paga di nuovo, oppure scrivici.",
    paidMonthsSuffix: "pagati",
    activeMonthsSuffix: "attivi",
    loginLabel: "Vai al login",
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
    draft: {
      title: "Paga e pubblica il tuo negozio",
      reviewBody: "Ti scriveremo appena lo convalidiamo e il tuo negozio verrà pubblicato da solo. Nel frattempo puoi continuare a prepararlo.",
      paidTitle: "Il tuo negozio è aperto",
      paidBody: "I tuoi clienti possono già entrare dal tuo link e fare ordini.",
      backToStore: "Torna al mio negozio",
      nextSteps: ["Convalidiamo il pagamento", "Il tuo negozio viene pubblicato da solo, con tutto quello che hai preparato", "Condividi il tuo link"],
      instantActivation: "Il tuo negozio viene pubblicato appena il pagamento è confermato.",
      manualActivation: "Pubblichiamo il tuo negozio quando convalidiamo la ricevuta. Ti avvisiamo via email.",
      mercadoPagoHint: "Ti portiamo su Mercado Pago per pagare in modo sicuro. Al termine torni qui e il tuo negozio viene pubblicato.",
      freeCheckout: "Con questo coupon non paghi nulla: il tuo negozio viene pubblicato alla conferma.",
      freeButton: "Pubblica il mio negozio",
    },
    ui: {
      summaryTitle: "Il tuo ordine",
      planLine: "Piano {name}",
      perMonth: "/mese",
      totalLabel: "Totale da pagare",
      promoMonths: "Ricevi {months}",
      coverage: "Copre {months} di servizio",
      changeLink: "Cambia piano o metodo di pagamento",
      payWith: "Paghi con {method}",
      paypalActivation: "Con PayPal il tuo account si attiva appena il pagamento è confermato.",
      manualActivation: "Attiviamo l’account quando convalidiamo la ricevuta. Ti avvisiamo via email.",
      nextTitle: "Cosa succede dopo",
      nextSteps: ["Confermiamo il pagamento", "Ricevi un’email per creare la password", "Ti aiutiamo a preparare il menu"],
      showBankDetails: "Vedi i dati per il bonifico",
      transferStep: "Trasferisci l’importo esatto",
      uploadStep: "Carica la ricevuta",
      copy: "Copia",
      copied: "Copiato",
      chooseFile: "Scegli file",
      noFile: "Nessun file scelto",
      submittedTitle: "Abbiamo ricevuto la tua ricevuta",
      submittedBody: "La controlliamo e ti scriviamo appena è convalidata. Puoi chiudere questa pagina.",
      referenceLabel: "Riferimento del pagamento",
    },
    coupon: {
      prompt: "Hai un coupon?",
      placeholder: "Codice coupon",
      apply: "Applica",
      applying: "Verifica in corso…",
      remove: "Rimuovi coupon",
      applied: "Coupon {code} applicato",
      percentOff: "{value} di sconto sul tuo primo pagamento",
      amountOff: "{value} di sconto sul tuo primo pagamento",
      freeMonths: "{months} gratis oltre a quelli che paghi",
      summaryLine: "Coupon {code}",
      freeMonthsBadge: "+{months} gratis",
      minMonths: "Questo coupon vale pagando almeno {months}. Con meno mesi non si applica.",
      replacesPromo: "Questo coupon sostituisce la promo 2 mesi al prezzo di 1 sul tuo primo pagamento.",
      freeCheckout: "Con questo coupon non paghi nulla: il tuo account si attiva alla conferma.",
      freeButton: "Attiva il mio account",
      problems: {
        invalid_format: "Quel codice non ha il formato di un coupon.",
        not_found: "Non troviamo quel coupon. Controlla che sia scritto bene.",
        inactive: "Quel coupon non è più attivo.",
        not_started: "Quel coupon non è ancora valido.",
        expired: "Quel coupon è scaduto.",
        exhausted: "Quel coupon ha raggiunto il limite di utilizzi.",
        plan_not_allowed: "Quel coupon non vale per il piano che hai scelto.",
        min_months: "Quel coupon richiede di pagare più mesi.",
        already_used: "Quel coupon è già stato usato con la tua email.",
        locked: "Il tuo pagamento è già in revisione: il coupon non si può cambiare.",
        generic: "Non siamo riusciti ad applicare il coupon. Riprova.",
      },
    },
    errors: {
      createSession: "Impossibile avviare il pagamento. Riprova.",
      missingUrl: "L’URL di pagamento non è stato restituito. Contatta il supporto.",
      unexpected: "Qualcosa è andato storto. Riprova.",
      paypalCanceled: "Pagamento annullato in PayPal.",
      missingReceipt: "Scegli la foto o lo screenshot della ricevuta.",
      uploadError: "Impossibile caricare la ricevuta. Riprova.",
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
