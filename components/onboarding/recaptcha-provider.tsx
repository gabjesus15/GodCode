"use client";

import { GoogleReCaptchaContext, GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

// Sin clave, `executeRecaptcha` queda vacío y el formulario envía sin token.
// El contexto por defecto de la librería lanza un error al llamarlo.
const NO_RECAPTCHA = { executeRecaptcha: undefined };

interface OnboardingRecaptchaProviderProps {
  children: React.ReactNode;
}

export function OnboardingRecaptchaProvider({ children }: OnboardingRecaptchaProviderProps) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    return <GoogleReCaptchaContext.Provider value={NO_RECAPTCHA}>{children}</GoogleReCaptchaContext.Provider>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
