# saas-godcode-admin

Panel SaaS multi-tenant con Next.js + Supabase.

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase configurado

## Desarrollo local

1. Copia variables:
   - Duplicar `.env.example` como `.env.local`
2. Instala dependencias:
   - `npm install`
3. Ejecuta:
   - `npm run dev`

## Build de producciÃ³n (igual que Vercel)

- `npm run build`

## Variables de entorno para Vercel

Configurar en Project Settings â†’ Environment Variables:

### Obligatorias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_TENANT_BASE_DOMAIN`

### Recomendadas

- `NEXT_PUBLIC_APP_URL` = URL canÃ³nica de la app (ej. `https://www.godcode.me`). Usada en correos de onboarding y redirecciones; debe ser el dominio principal (sin subdominio de tenant). Si no se define, se usa `VERCEL_URL` o `NEXT_PUBLIC_TENANT_BASE_DOMAIN`.

   En producciÃ³n, evita depender de `VERCEL_URL` para SEO: debe quedar fijada una URL pÃºblica real.
- `NEXT_PUBLIC_TENANT_PROTOCOL` = `https`
- `GOOGLE_SITE_VERIFICATION` = token de Search Console para exponer `<meta name="google-site-verification" ...>` desde `app/layout.tsx`.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- Cloudinary: el preset debe ser `unsigned` para subir imagenes desde cliente.

### Opcionales legacy

- `NEXT_PUBLIC_PUBLIC_COMPANY_SLUG`
- `NEXT_PUBLIC_COMPANY_SLUG`

## Checklist para no fallar en Vercel

- Confirmar que `npm run build` pasa localmente.
- Agregar todas las env vars obligatorias en Vercel para `Production` (y `Preview` si usas previews).
- Verificar que el dominio base en `NEXT_PUBLIC_TENANT_BASE_DOMAIN` coincide con tu wildcard/subdominios.
- Elegir una sola variante canÃ³nica del dominio principal (`www` o sin `www`) y usar esa misma variante en `NEXT_PUBLIC_APP_URL`.
- Si hay redirecciÃ³n entre variantes del dominio (ej. `godcode.me` â†’ `www.godcode.me`), asegurarse de que la redirecciÃ³n conserve el query string (habitual en la mayorÃ­a de configuraciones).
- Si usas subida de imÃ¡genes, configurar tambiÃ©n variables de Cloudinary.

## Nota tÃ©cnica de build

El build de Next excluye carpetas no-app (`supabase-functions-backup/**`) en `tsconfig.json` para evitar errores de tipado Deno durante deploy.
## Panel de dueños (fuera de este repo)

El login y el panel operativo del negocio viven en la **aplicación de escritorio** del tenant (otro repositorio y despliegue). Este proyecto publica la **home, el menú y el carrito** del tenant en el subdominio.

Opcional: si hospedas un panel web aparte y quieres un enlace desde la home del tenant, define `NEXT_PUBLIC_TENANT_PANEL_URL` (URL base, sin barra final). Si está vacío, ese botón no se muestra (comportamiento actual en `components/tenant/home/home-client.tsx`). No existe carpeta `services/tenant-panel` en este árbol; el historial del antiguo kit admin queda solo en Git si lo necesitas.
