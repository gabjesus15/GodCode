# Arquitectura del monorepo

*Versión en español (visión ampliada): [arquitectura.md](./arquitectura.md).*

## Visión general

| Pieza | Ubicación | Responsabilidad |
| --- | --- | --- |
| **BFF (app principal)** | Raíz del repo (`app/`, `lib/`, `components/`) | UI super-admin, UI tenant (subdominio), APIs que no viven en el micro, proxy a onboarding-billing |
| **Micro onboarding-billing** | `services/onboarding-billing/` | Apply, verify, checkout, complete, finalize, cron de suscripciones asociado al dominio onboarding, etc. |
| **Proxy de subdominios** | `proxy.ts` (importado como middleware por Next) | Enruta `tenant.ejemplo.com` → rutas `[subdomain]`, admin en dominio principal |

En desarrollo, `next.config.ts` ignora `services/**` en watch de webpack para aligerar el build del BFF; el micro se ejecuta con su propio `npm run dev` en esa carpeta.

### Layout de `services/onboarding-billing/`

| Ruta | Rol |
| --- | --- |
| `app/api/**` | Handlers del micro (apply, verify, checkout, health, crons). |
| `lib/**` | Supabase service, Stripe/PayPal, emails y utilidades propias del servicio. |
| `package.json`, `next.config.*` | Build y despliegue independientes del BFF. |

Variables típicas del micro: credenciales Supabase, secretos de pasarelas, `INTERNAL_API_KEY` / clave alineada con `SERVICE_API_KEY` del BFF.

## Flujo onboarding (BFF → micro)

1. El cliente llama `POST /api/onboarding/*` en el dominio del BFF.
2. [`lib/onboarding/onboarding-bff-proxy.ts`](../lib/onboarding/onboarding-bff-proxy.ts) invoca [`lib/onboarding/service-proxy.ts`](../lib/onboarding/service-proxy.ts) → `fetch(ONBOARDING_BILLING_SERVICE_URL + path)`.
3. Header interno: `x-internal-api-key: SERVICE_API_KEY` (debe coincidir con el micro).

### Variables de entorno (BFF)

| Variable | Uso |
| --- | --- |
| `FF_ONBOARDING_BILLING_EXTERNAL` | `false` = sin proxy (rutas onboarding responden 503 en este despliegue). `true` o `proxy_only` = reenvío al micro. |
| `ONBOARDING_BILLING_SERVICE_URL` | Base URL del micro (sin barra final). |
| `SERVICE_API_KEY` | Clave compartida BFF ↔ micro. |

Detalle en [`.env.example`](../.env.example) y en [fase7-cleanup-guide.md](./fase7-cleanup-guide.md).

## Dónde está la lógica (referencia rápida)

| Dominio | Lugar |
| --- | --- |
| Onboarding público (formularios, pago, verify) | Micro `services/onboarding-billing` (vía proxy desde BFF) |
| Tickets SaaS (super-admin + tenant) | `app/api/super-admin/tickets`, `app/api/tenant/tickets` |
| Staff / equipo tenant | `app/api/tenant/staff` |
| Broadcasts tenant | `app/api/tenant/broadcasts` |
| Pagos conectados del tenant (Stripe/PayPal) | **No** en rutas BFF de este repo: la gestión vive en el **panel tenant** (app de escritorio) o un futuro BFF dedicado; no usar `app/api/tenant-payment-methods/*` (eliminado). |
| Validación de pagos manuales / activación | BFF `app/api/super-admin/payments/validate` + `lib/onboarding/billing-activation.ts` |
| Cron suspensión suscripciones | BFF `app/api/system/cron/subscription-status` (cron de Vercel; proxy opcional al micro o lógica local según flag) |

## `proxy.ts` (multi-tenant)

- Lista de rutas “admin” en dominio principal: dashboard, companies, login, plans, onboarding solicitudes, etc.
- Rutas bajo `/api`, `/_next`, `/onboarding` no se reescriben como subdominio.
- El host `tenantBaseDomain` y subdominios `*.tenantBaseDomain` definen el contexto tenant.

## Convenciones

- Alias TypeScript: `@/*` → raíz del repo; alias explícitos `@/lib/*`, `@/components/*`, `@/utils/*`, `@/hooks/*` ([`tsconfig.json`](../tsconfig.json)).
- Cliente Supabase service role: [`lib/infra/supabase-admin.ts`](../lib/infra/supabase-admin.ts) (`import { supabaseAdmin } from "@/lib/infra/supabase-admin"`).
- Respuestas JSON API: [`lib/api/response.ts`](../lib/api/response.ts) (`jsonOk`, `jsonError`).
- Validación: Zod en [`lib/api/schemas/`](../lib/api/schemas/) por dominio (ampliar gradualmente).
- Capas visuales (onboarding vs consola): [ui-design-tokens.md](./ui-design-tokens.md).

## Seguridad HTTP (BFF)

Cabeceras aplicadas vía [`next.config.ts`](../next.config.ts): `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`. No se activa CSP estricta por defecto para no romper integraciones (Stripe, Cloudinary, scripts de terceros); valorar CSP con `report-uri` / Report-Only en una fase posterior.

**Rate limiting**: las rutas públicas costosas pueden protegerse en el edge (Vercel Firewall, Upstash) o middleware; no está centralizado en código — documentar en runbooks si se añade.

## Legacy

- **`app/api/system/client-info`**: autocompletado de cliente por teléfono en el menú tenant (App Router). La antigua ruta `pages/api/system/client-info` fue retirada.

## Diseño de `app/api` (BFF)

Prefijos de primer nivel tras el refactor **Esquema Perfecto**:

| Prefijo | Rol |
| --- | --- |
| `app/api/tenant/*` | APIs con sesión tenant (staff, tickets, broadcasts, delivery helpers, etc.). |
| `app/api/super-admin/*` | Panel central (empresas, planes, roles, módulos, tickets, broadcasts, landing CMS, pagos, …). |
| `app/api/geo/*` | Búsqueda de dirección, geocodificación, cotización delivery, preview de cupón. |
| `app/api/system/*` | Salud agregada, OG, crons (`/api/system/cron/*`), `client-info`. |
| `app/api/customer-account/*` | Portal de cuenta cliente (billing, tema tienda, addons). |
| `app/api/onboarding/*` | Acciones de onboarding del BFF (a menudo proxied a `services/onboarding-billing`). |
| `app/api/auth/*` | Cierre de sesión, bootstrap de usuario super-admin. |
| `app/api/landing/*`, `app/api/public/*`, `app/api/analytics/*`, `app/api/webhooks/*` | Público / marketing / analytics / webhooks según nombre. |

El micro de onboarding sigue exponiendo sus propias rutas bajo su `app/api` (p. ej. `{micro}/api/health`). La ruta `app/api/system/health` del BFF **no** debe llamarse a sí misma: consulta el micro en `{base}/api/health`.

## Carpetas grandes / backups

- `supabase-functions-backup/`, `tenant-template/`, `_vercel_exclude/`: no son el runtime principal del BFF; ver exclusiones en `next.config.ts`.

---

## Estrategia frente al código duplicado con `onboarding-billing`

El micro copia módulos como `lib/onboarding/*`, emails y checkout. Opciones (de menor a mayor coste):

1. **Checklist en release** (actual): al cambiar contratos o lógica compartida, actualizar ambos sitios y revisar [fase7-cleanup-guide.md](./fase7-cleanup-guide.md).
2. **Paquete interno** `packages/onboarding-shared` (workspaces npm/pnpm): tipos Zod compartidos, constantes, utilidades sin acoplar a Next.
3. **Contrato OpenAPI** generado desde el micro y cliente tipado en el BFF (solo tipos, sin lógica duplicada).

Recomendación: mantener **1** hasta que el desvío entre repos duela; entonces **2** para constantes/schemas; **3** si hay muchos clientes del micro.

## Modularización incremental (UI / lib)

Algunos módulos siguen siendo **monolitos legibles** pero candidatos a troceo futuro si crecen: `PlansAdminClient`, `LandingAdminClient`, `company-global-form`, `menu-client`, `branch-row`, formularios grandes de onboarding paso 2, `lib/onboarding/emails.ts`. La lógica crítica ya se extrajo donde más impactaba performance (`next/dynamic` vía componentes cliente lazzy en super-admin, validación de carrito, hook de flags de sucursal en carrito, consultas batch en creación de pedidos).

**Medición de bundle**: `npm run analyze` (requiere `ANALYZE=true` vía script en `package.json`).
