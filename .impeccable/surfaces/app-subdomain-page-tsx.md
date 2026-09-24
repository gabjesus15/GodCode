---
version: 1
slug: "app-subdomain-page-tsx"
primary_target: "app/[subdomain]/page.tsx"
related_targets: ["components/tenant/home","components/customer-portal/account/tabs/account-perfil-publico-tab.tsx"]
---

# Página de inicio del negocio (link-in-bio)

Scope: `app/[subdomain]/page.tsx` (pública) y su editor en `/cuenta` → «Página de inicio». Mode: Persuade (el visitante decide y toca: carta, WhatsApp, ubicación). Visual system: el tema de cada negocio (colores, logo, foto, tipografía del nombre, claro/oscuro) manda; la plataforma se retira.

Audience/job: cliente final en el móvil que llega desde la bio de Instagram o un QR; quiere la carta o el contacto en un toque y saber si está abierto. Constraints: cualquier combinación de logo/foto/colores debe verse bien; el botón «Crea tu menú» de Gcode queda como un botón más, al final; guardado inmediato en el editor.

## Direction contract

THESIS: La puerta del local: su foto y su color arriba, y debajo una lista corta y exacta de puertas. Rechaza el link-in-bio de plantilla: manchas de luz, burbujas de colores por red, título degradado, talón de ticket.

OWN-WORLD: Neutros del esquema claro/oscuro del negocio sin tinte; un único acento, el primario del negocio, solo en la puerta destacada y el punto de estado. Nombre en la tipografía del negocio, UI en Montserrat. Puertas de ancho completo, 60px, filo de 1px y sombra de dos capas; ícono a la izquierda, etiqueta centrada, flecha o número de sucursales a la derecha. Forma y estilo de botón los elige el dueño. «Crea tu menú» de Gcode: un botón más, 24px tras la lista, nunca pegado al fondo.

STORY: Reconoce el negocio al instante (foto, logo, nombre), ve si está abierto y toca la carta o WhatsApp en un segundo.

FIRST VIEWPORT: 390×844: portada a sangre 0–212px; logo 108px centrado sobre el borde (no 96: muchos logos son sellos circulares con letra chica); nombre 28px; frase 2 líneas; chip de estado + redes; la carta (acento) visible antes de y≈480, tres puertas sobre el pliegue. Escritorio: fondo = portada atenuada, hoja central 560px, QR de 248px a la derecha. Interacción firma: compartir (hoja nativa o copiar enlace) y selector de sucursal en hoja inferior con estado por local.

FORM: canon link-in-bio fijado por el brief («a nivel Linktree»); sin tirada de semilla (dirección fijada por el usuario).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
