-- Barrido de altas a medias (lib/onboarding/reconcile.ts): un aviso por fila y por día.
--
-- Qué hace: agrega `onboarding_applications.reconcile_alerted_at`, cuándo se avisó por
-- última vez al equipo (Telegram) de esa solicitud trabada. Null: nunca se avisó.
--
-- Por qué: el barrido corre cada hora y avisaba de las mismas altas trabadas en cada
-- corrida, sin tope. Con la columna, el aviso de una misma solicitud se repite como mucho
-- una vez cada 24 horas. El barrido la escribe sin tocar `updated_at` (de esa fecha dependen
-- sus ventanas de búsqueda).
--
-- Se puede correr antes o después del deploy: sin la columna el barrido sigue funcionando y
-- avisa en cada corrida, como antes (deja `reconcile_alerted_at_missing` en el log).
--
-- Idempotente: `add column if not exists`.

alter table public.onboarding_applications
  add column if not exists reconcile_alerted_at timestamptz;

comment on column public.onboarding_applications.reconcile_alerted_at is
  'Último aviso por Telegram del barrido de altas a medias (reconcile): como mucho uno cada 24 horas por solicitud.';
