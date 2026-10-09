# Servicio de alta (onboarding-billing) para Coolify.
# Contexto de build: raíz del repo, porque el servicio importa lib/ y utils/ de la raíz.
FROM node:22-alpine AS build

WORKDIR /repo

COPY package.json package-lock.json ./
COPY services/onboarding-billing/package.json services/onboarding-billing/
RUN npm ci --workspace onboarding-billing-service --include-workspace-root=false

COPY lib ./lib
COPY utils ./utils
COPY services/onboarding-billing ./services/onboarding-billing

# Next incrusta las NEXT_PUBLIC_* al compilar, también en el código del servidor.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TENANT_BASE_DOMAIN
ARG NEXT_PUBLIC_TENANT_PROTOCOL
ARG NEXT_PUBLIC_APP_URL

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
RUN npm run build --workspace onboarding-billing-service

FROM node:22-alpine

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0

WORKDIR /app

# Con outputFileTracingRoot en la raíz, el servidor queda en services/onboarding-billing/server.js.
COPY --from=build --chown=node:node /repo/services/onboarding-billing/.next/standalone ./
COPY --from=build --chown=node:node /repo/services/onboarding-billing/.next/static ./services/onboarding-billing/.next/static

USER node
EXPOSE 3001

# /api/health responde 200 sin tocar la base de datos.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:3001/api/health > /dev/null || exit 1

CMD ["node", "services/onboarding-billing/server.js"]
