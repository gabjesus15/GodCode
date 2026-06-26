"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

interface OnboardingRecaptchaProviderProps {
  children: React.ReactNode;
}

export function OnboardingRecaptchaProvider({ children }: OnboardingRecaptchaProviderProps) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    return <>{children}</>;
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
