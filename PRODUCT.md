# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Dueños de negocios de comida** (pizzerías, sushi, cafeterías, restaurantes) en Latinoamérica —hoy Chile (CLP) y Venezuela (VES con precios en USD)—. Configuran su tienda desde el portal `/cuenta` (rol CEO) y operan caja y pedidos desde un panel aparte (repo `Saas-Godcode-paneladmin-ceo`).
- **Clientes finales de cada negocio**: llegan desde el enlace de la bio de Instagram, un QR en la mesa o el mostrador, o un enlace compartido. Casi siempre en el móvil, con prisa: quieren ver la carta, escribir por WhatsApp, saber dónde está el local o si está abierto.
- **Equipo Gcode (super admin)**: da de alta empresas, planes y soporte.

## Product Purpose

Gcode POS da a cada negocio su menú digital, pedidos online y punto de venta sin comisiones, bajo su propia marca (`godcode.me/<slug>`, subdominio o dominio propio). La página de inicio de cada negocio es su tarjeta de presentación tipo link-in-bio: tiene que hacer ver al negocio profesional y confiable, y llevar al cliente a la carta o al contacto en un toque.

## Positioning

La página de inicio no es un Linktree suelto: está conectada al menú, a las sucursales y a la caja del propio negocio (estado abierto/cerrado real, WhatsApp e Instagram por sucursal, QR hacia la carta), así que se mantiene al día sola.

## Operating Context

- Multi-tenant: cada negocio tiene tema propio en `companies.theme_config` (colores, logo, imagen de fondo, tipografía del nombre, claro/oscuro).
- Los datos de contacto viven por sucursal (`branches`: WhatsApp, Instagram, mapa, teléfono); con varias sucursales el cliente elige cuál.
- «Abierto» se deduce de las cajas abiertas (`cash_shifts`).
- El dueño edita desde `/cuenta` con guardado y publicación inmediatos en la pestaña «Página de inicio» (decisión 2026-09-24).

## Capabilities and Constraints

- Next.js 16 App Router + Supabase self-hosted; ISR de 60 s en el storefront; caché por tags `menu:<companyId>` y `company-slug:<slug>`.
- i18n con next-intl (es, en, pt, fr, it, de); español es el idioma base.
- El botón «Crea tu menú» de Gcode se mantiene como un botón más de la página de inicio de cada negocio (decisión del dueño, 2026-09-24).
- Sin migraciones nuevas salvo necesidad: se pasan por un compañero con acceso MCP.

## Brand Commitments

- La marca visible de la plataforma es **Gcode** («Gcode POS», «Gcode Labs»), nunca «GodCode». El dominio `godcode.me` y los correos no cambian.
- En el storefront manda la marca de cada negocio; Gcode aparece solo como crédito y como el botón «Crea tu menú».

## Evidence on Hand

- Negocios reales para probar: `rica-pizza` (Venezuela, doble moneda) y `oishi-sushi` (Chile).
- No hay testimonios, métricas ni reseñas reales de clientes finales: no se inventan.

## Product Principles

1. El negocio es el protagonista: su logo, su foto y su color mandan; la plataforma se retira.
2. Un toque a lo importante: carta, WhatsApp, ubicación.
3. Verdad en vivo: lo que la página dice (abierto, sucursales, enlaces) sale de los datos reales, nunca de texto fijo.
4. Configurable sin romperse: cualquier combinación de logo, foto, colores y enlaces tiene que verse bien.

## Accessibility & Inclusion

WCAG 2.2 AA en el storefront: zoom con pellizco permitido, foco visible, nombres accesibles que contienen el texto visible, movimiento reducido respetado (criterios ya aplicados en el código existente).
