# Baseline: rendimiento menú tenant (móvil)

Capturar **antes y después** de cada fase del plan de optimización.

## Comandos

```bash
# Bundle analyzer (genera .next/analyze/)
npm run analyze

# Build producción
npm run build

# Tests regresión tenant
npm run test
```

## Lighthouse (móvil)

1. Abrir `/menu` de un tenant con catálogo grande (100+ productos).
2. DevTools → Lighthouse → Mobile → Performance.
3. Registrar: **LCP**, **TBT**, **CLS**, **Speed Index**, **Total JS**, **Total CSS**.

| Métrica | Baseline | Post Fase 1 | Post Fase 2 |
|---------|----------|-------------|-------------|
| LCP (s) | — | — | — |
| TBT (ms) | — | — | — |
| CLS | — | — | — |
| JS transfer (KiB) | — | — | — |

## Network (Samsung Chrome)

- Cero requests a `/api/debug-ingest`
- Chunk `CartModal` solo tras abrir carrito
- Imágenes producto: máx. 6 con `priority`

## Dispositivos QA

- Samsung Chrome
- Samsung Internet
- iPhone Safari
