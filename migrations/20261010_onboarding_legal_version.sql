-- Versión de los Términos y la Política de privacidad que aceptó cada solicitud del alta.
--
-- Qué hace: agrega `onboarding_applications.legal_version` (texto corto, opcional).
--
-- Por qué: el formulario guardaba `terms_accepted` / `privacy_accepted` como booleanos, sin
-- decir qué versión de los textos vio la persona. Al cambiar los documentos no había forma
-- de saber a quién pedirle que acepte los nuevos. El paso 1 manda ahora
-- `LEGAL_DOCUMENTS_VERSION` (lib/legal/legal-documents.ts) y el servicio de alta la guarda
-- aquí. Las solicitudes anteriores quedan en null (aceptaron una versión anterior a este
-- registro).
--
-- Se puede correr antes o después del deploy: si la columna todavía no existe, el alta
-- reintenta el insert sin ella y deja `onboarding_legal_version_column_missing` en el log.
--
-- Idempotente: `add column if not exists`.

alter table public.onboarding_applications
  add column if not exists legal_version text;

comment on column public.onboarding_applications.legal_version is
  'Versión de Términos y Privacidad aceptada en el paso 1 del alta (LEGAL_DOCUMENTS_VERSION). Null en solicitudes anteriores.';
