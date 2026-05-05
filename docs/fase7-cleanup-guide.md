# Fase 7 - Limpieza post-migracion

## Resumen

Una vez que el microservicio `onboarding-billing` esta validado en produccion,
esta guia describe como hacer la transicion final y limpiar el codigo duplicado.

## Proceso de migracion gradual

El feature flag `FF_ONBOARDING_BILLING_EXTERNAL` tiene 3 modos:

| Valor | Modo | Comportamiento |
|---|---|---|
| `false` | Off | Sin proxy: rutas `/api/onboarding/*` responden 503 (no hay implementacion local) |
| `true` | On | Proxy al micro; sin URL -> 503; error de red/upstream -> 502 |
| `proxy_only` | Proxy-only | Igual que `on` para errores; distincion solo informativa en logs/headers |

### Ruta de migracion recomendada

```
false  -->  true / proxy_only  -->  BFF solo proxy (estado actual del repo)
```

1. **false**: Solo para entornos donde no quieras llamar al micro (onboarding queda en 503).
2. **true** / **proxy_only**: Produccion; el BFF reenvia todo a `onboarding-billing`.

## Paso 3: Activar proxy_only

```bash
# En Vercel (BFF), cambiar:
FF_ONBOARDING_BILLING_EXTERNAL=proxy_only
```

Redesplegar y monitorear:
- Verificar que `/api/system/health` del BFF reporta `proxy.status: "reachable"`
- Revisar logs en Vercel por errores `proxy_error`
- Verificar que el header `x-proxy-mode: proxy_only` esta presente en las respuestas

### Rollback

Si el micro falla, corregir el micro o la URL; el BFF ya no ejecuta la logica de onboarding localmente (recuperarla desde git si hiciera falta).

## Paso 4: Borrar logica local (hecho en el monorepo)

Las 14 rutas bajo `app/api/onboarding/*/route.ts` solo reenvian con `forwardOnboardingBilling` (`lib/onboarding-bff-proxy.ts`). El helper responde 503 si el proxy no aplica (flag `off`).

Ejemplo actual:

```typescript
import { NextRequest } from "next/server";
import { forwardOnboardingBilling } from "../../../../lib/onboarding-bff-proxy";

export async function GET(req: NextRequest) {
  return forwardOnboardingBilling(req, "/api/onboarding/addons");
}
```

### Rutas a simplificar

- `app/api/onboarding/addons/route.ts`
- `app/api/onboarding/application/route.ts`
- `app/api/onboarding/apply/route.ts`
- `app/api/onboarding/bcv-rate/route.ts`
- `app/api/onboarding/check-beta/route.ts`
- `app/api/onboarding/checkout/route.ts`
- `app/api/onboarding/complete/route.ts`
- `app/api/onboarding/delete/route.ts`
- `app/api/onboarding/expire-unverified/route.ts`
- `app/api/onboarding/finalize/route.ts`
- `app/api/onboarding/paypal-capture/route.ts`
- `app/api/onboarding/plan-payment-methods/route.ts`
- `app/api/onboarding/upload-payment-reference/route.ts`
- `app/api/onboarding/verify/route.ts`

**Siguen en el BFF** (no son proxy al micro de onboarding): `app/api/super-admin/payments/validate`, `app/api/cron/subscription-status` — usan `lib/onboarding/billing-activation.ts` y `welcome-provisioning.ts`.

### Modulos eliminados del BFF (ya aplicado)

- `lib/onboarding/checkout-service.ts` (solo lo usaba checkout local)
- `lib/onboarding/recaptcha.ts` (solo apply local)

### Modulos que se conservan en el BFF

- `lib/onboarding/billing-activation.ts`, `welcome-provisioning.ts`, `emails.ts` — usados por validate/cron/welcome.

### Dependencias npm

- Eliminado `@paypal/paypal-server-sdk` del BFF raiz (queda en `services/onboarding-billing`).
- `stripe` se mantiene (conexion Stripe Connect en tenant).

## Checklist final

- [ ] `proxy_only` o `true` en produccion con `ONBOARDING_BILLING_SERVICE_URL` correcto
- [ ] Todas las rutas `/api/onboarding/*` del BFF responden via micro
- [ ] Cron `subscription-status` y validate de pagos siguen funcionando en el BFF
- [ ] No hay errores `proxy_error` recurrentes en logs
- [x] Rutas onboarding del BFF reducidas a proxy + `forwardOnboardingBilling`
- [x] Modulos onboarding muertos eliminados del BFF donde aplica
- [x] `npm test` y `npm run build` OK
