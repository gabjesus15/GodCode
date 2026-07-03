# QA móvil — menú y carrito tenant

Checklist tras deploy de optimización de rendimiento.

## Samsung Chrome

- [ ] Menú carga sin requests a `/api/debug-ingest`
- [ ] Scroll fluido con 100+ productos (virtualización activa)
- [ ] Abrir carrito: chunk modal carga al abrir, no al elegir sucursal
- [ ] Checkout completo + gesto atrás en pasos del carrito
- [ ] Selector de sucursal y detalle de producto abren correctamente

## Samsung Internet

- [ ] Mismo flujo que Chrome
- [ ] Bottom nav sin blur excesivo (fondo sólido en móvil)
- [ ] Teclado en checkout: tap fuera cierra teclado

## iPhone Safari

- [ ] Hero LCP: primera imagen carga rápido
- [ ] Carrito checkout Venezuela/Chile formulario correcto
- [ ] `history.back` cierra overlays (contacto, producto, carrito)

## Desktop (regresión)

- [ ] Glass/blur visible en tarjetas (>768px)
- [ ] Paginación por categorías intacta
- [ ] Preview embebido del portal sigue funcionando
