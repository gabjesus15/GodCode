# Límite servidor / cliente (`use client`)

Auditoría ligera post–**Esquema Perfecto**:

- Solo marcar `"use client"` en componentes que usan **hooks de estado/efecto**, navegación del cliente, APIs del navegador o contextos de UI que no tienen equivalente en servidor.
- Páginas que solo componen datos ya resueltos en el servidor pueden permanecer como Server Components y pasar props serializables a hijos cliente pequeños.
- Para bloques pesados (admin landing/planes, mapas, carrito modal), ya se usa **`next/dynamic`** en los puntos de entrada documentados en el plan de refactor.

Revisar periódicamente con `grep '"use client"'` en carpetas `app/` donde no haya interactividad.
