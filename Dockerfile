FROM node:22.23.4-alpine

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package*.json ./
# Con NODE_ENV=production, `npm ci` se salta las devDependencies, y el build las
# necesita (Tailwind, TypeScript). El prune de más abajo las saca de la imagen.
RUN npm ci --include=dev

COPY . .

# El build necesita las devDependencies (TypeScript, Tailwind); después se quitan para que
# la imagen no las lleve. Next sigue cargando next.config.ts con su propio SWC.
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# Sin root: Next escribe en .next/cache (ISR y optimización de imágenes), así que el
# usuario node tiene que ser dueño de /app.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# /api/system/live responde 200 sin tocar la base de datos: si Postgres cae, el
# contenedor sigue sano y las páginas que no dependen de ella siguen sirviéndose.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
	CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/system/live" > /dev/null || exit 1

CMD ["npm", "start"]
