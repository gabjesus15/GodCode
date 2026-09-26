---
name: Gcode · Página de inicio del negocio
description: El link-in-bio de cada local (mundo `gh-`), donde el tema de cada negocio pone la marca y la plataforma queda en segundo plano.
colors:
  accent-fallback: "#e63946"
  ink-on-light-accent: "#141414"
  dark-canvas: "#111113"
  dark-backdrop: "#09090a"
  dark-surface: "#1c1c1f"
  dark-surface-hover: "#232327"
  dark-line: "rgba(255, 255, 255, 0.09)"
  dark-line-strong: "rgba(255, 255, 255, 0.2)"
  dark-fg: "#f5f4f2"
  dark-fg-2: "rgba(245, 244, 242, 0.76)"
  dark-fg-3: "rgba(245, 244, 242, 0.58)"
  dark-ok: "#5fd38d"
  light-canvas: "#f2f2f2"
  light-backdrop: "#dcdcdc"
  light-surface: "#ffffff"
  light-surface-hover: "#fafafa"
  light-line: "#e0e0e0"
  light-line-strong: "#c4c4c4"
  light-fg: "#151515"
  light-fg-2: "rgba(21, 21, 21, 0.76)"
  light-fg-3: "rgba(21, 21, 21, 0.6)"
  light-ok: "#1e7f47"
  qr-paper: "#ffffff"
typography:
  display:
    fontFamily: "var(--gh-name-font), Montserrat, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 7.4cqi, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.3
  door:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.97rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  door-pill: "999px"
  door-rounded: "16px"
  door-square: "6px"
  card-pill: "28px"
  card-rounded: "24px"
  card-square: "12px"
  item: "16px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
components:
  door:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-fg}"
    typography: "{typography.door}"
    rounded: "{rounded.door-pill}"
    padding: "10px 58px"
    height: "60px"
    width: "100%"
  door-hover:
    backgroundColor: "{colors.dark-surface-hover}"
  door-featured:
    backgroundColor: "{colors.accent-fallback}"
    textColor: "#ffffff"
    rounded: "{rounded.door-pill}"
    height: "60px"
  status-chip:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-fg-2}"
    typography: "{typography.label}"
    rounded: "{rounded.door-pill}"
    padding: "0 13px 0 11px"
    height: "30px"
  round-button:
    textColor: "#ffffff"
    rounded: "{rounded.circle}"
    size: "40px"
  social-button:
    textColor: "{colors.dark-fg}"
    rounded: "{rounded.circle}"
    size: "46px"
  logo:
    backgroundColor: "{colors.dark-surface}"
    rounded: "{rounded.circle}"
    size: "108px"
  picker-item:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-fg}"
    rounded: "{rounded.item}"
    padding: "12px 14px"
    height: "60px"
  toast:
    backgroundColor: "{colors.dark-fg}"
    textColor: "{colors.dark-canvas}"
    rounded: "{rounded.door-pill}"
    padding: "10px 16px"
---

# Design System: Gcode · Página de inicio del negocio

> **Alcance.** Este archivo documenta solo el mundo `gh-`: la página de inicio pública de cada negocio (`app/[subdomain]/page.tsx` → `components/tenant/home/home-page-view.tsx` + `home-page.css`) y su vista previa dentro del editor de `/cuenta`. El menú del local, el super admin y la landing de Gcode tienen su propio lenguaje visual, que aquí no se describe. El editor «Página de inicio» de `/cuenta` hereda el lenguaje del portal (Tailwind, tinta `#1d1d1f`, secundario `#6e6e73`, filetes `#e5e5ea`, acciones indigo-600) y tampoco se codifica aquí.
>
> **Lo que pone cada negocio en tiempo de ejecución** (desde `companies.theme_config`, resuelto en `lib/tenant/home-page/resolve-home-page.ts`): el acento (`--gh-accent`, su color primario), la tinta sobre el acento (`--gh-on-accent`, blanca o `#141414` según qué contraste gane), la tipografía y el peso del nombre (`--gh-name-font` / `--gh-name-weight`), el color del nombre (`--gh-name-color`, solo si contrasta al menos 3:1 con el lienzo), el logo, la foto de portada y el esquema claro u oscuro (`data-scheme`). El dueño también elige la forma (`data-shape`: pill / rounded / square) y el estilo (`data-style`: solid / soft / outline) de las puertas. Los valores de la cabecera YAML son los neutros del sistema y los valores de respaldo.

## Overview

**Creative North Star: "La puerta del local"**

La página es la entrada del negocio: arriba su foto y su color, en el centro su logo y su nombre, y debajo una lista corta y exacta de puertas (carta, WhatsApp, cómo llegar, sucursales). La plataforma se queda en segundo plano: todo lo que no es marca del local es neutro y sin tinte, en el claro o el oscuro que eligió el dueño, y el único color con voz es el primario del negocio, en la puerta destacada.

Es una columna única, pensada para el móvil y para un toque con prisa. En pantallas anchas la misma hoja flota sobre la portada desenfocada y aparece un QR hacia la carta a la derecha. El diseño responde al ancho de su contenedor (`container: gh`) y no al de la ventana, así que la página pública y la vista previa del editor se ven iguales.

El movimiento se limita a una entrada: el perfil y cada puerta suben 14px en escalera, y la foto de portada se acerca un poco. Nada más se mueve si el usuario no lo toca.

**Key Characteristics:**
- Neutros sin tinte, en dos esquemas completos (oscuro por defecto, claro).
- Un solo acento, el del negocio, lleno solo en la puerta destacada.
- Puertas de ancho completo y 60px: ícono a la izquierda, etiqueta centrada y al final flecha o número de sucursales.
- El nombre va en la tipografía del negocio y toda la interfaz en Montserrat.
- Foto a sangre arriba, con el logo de 108px montado sobre el borde.
- Adaptación por contenedor: columna en el móvil, hoja flotante con QR en escritorio.

## Colors

La paleta es neutra y funcional en dos esquemas. El único color de marca es el del negocio y llega en tiempo de ejecución.

### Primary
- **Acento del local** (`--gh-accent`, runtime; respaldo {colors.accent-fallback}): relleno de la puerta destacada, campo de portada cuando no hay foto o el menú usa fondo sólido (`brandCoverFill`: brillo del segundo tono —el hover del local si es más luminoso, si no el acento aclarado— arriba a la izquierda, profundidad hacia abajo a la derecha y grano fino en `soft-light`), halo detrás de la hoja en escritorio en ese mismo caso (30% arriba al centro, 12% sin portada), tinte del 16% en las iniciales cuando falta el logo, tinte del 13% (20% en hover) en las puertas de estilo «soft» y selección de texto al 32%. El rojo de respaldo no es un color de marca de Gcode. Solo aparece si el tema no trae primario.
- **Tinta sobre acento** (`--gh-on-accent`): blanca, o {colors.ink-on-light-accent} cuando el acento es claro. La elige el contraste, no el dueño.

### Neutral (esquema oscuro, por defecto)
- **Lienzo** ({colors.dark-canvas}): fondo de la hoja y del panel del selector. Tiene que coincidir con `SCHEME_CANVAS` en el resolvedor, porque ahí se mide el contraste del nombre.
- **Telón** ({colors.dark-backdrop}): lo que se ve detrás de la hoja en escritorio. Si el menú del local usa fondo sólido, el telón es ese color (`--gh-page`), así la portada y la carta se sienten del mismo lugar.
- **Superficie** ({colors.dark-surface}) y **superficie hover** ({colors.dark-surface-hover}): puertas, chips, ítems del selector y el disco del logo.
- **Filete** ({colors.dark-line}) y **filete fuerte** ({colors.dark-line-strong}): bordes de 1px. El fuerte solo aparece en hover.
- **Tinta** en tres niveles: {colors.dark-fg} (texto principal), {colors.dark-fg-2} (bio, horario, chip cerrado) y {colors.dark-fg-3} (flechas, pistas, punto cerrado).
- **Verde abierto** ({colors.dark-ok}): el punto de «Abierto ahora» y la etiqueta «Abierto» del selector.

### Neutral (esquema claro)
- Los mismos roles, con gris cálido y sin tinte: lienzo {colors.light-canvas}, telón {colors.light-backdrop}, superficie {colors.light-surface}, filetes {colors.light-line} / {colors.light-line-strong}, tinta {colors.light-fg} con los niveles 76% y 60%, y verde {colors.light-ok}, más oscuro para leerse sobre claro.
- **Papel del QR** ({colors.qr-paper}): el QR va siempre oscuro sobre blanco, en cualquier esquema.

### Named Rules
**The One Voice Rule.** El acento del local solo va lleno en la puerta destacada. Todo lo demás (íconos del selector, contador, chips, redes) es neutro. En el código, el ícono del selector lleva a propósito el lienzo y no el acento.

**The Live Green Rule.** El verde se usa únicamente para decir «abierto» y sale de datos reales (cajas abiertas). No se usa como éxito genérico ni como decoración.

**The Legible Name Rule.** El nombre toma el color de marca que eligió el dueño solo si contrasta al menos 3:1 con el lienzo. Si no llega, usa la tinta. Esto se aplica con código y no queda a criterio de nadie.

## Typography

**Display Font:** la del negocio (`--gh-name-font`): una de Montserrat, Inter, Poppins, Nunito, Playfair Display, Lora, Anton, Bebas Neue, Luckiest Guy o Lilita One, con su peso propio (700, o 400 para las de cartel).
**Body Font:** Montserrat (con system-ui, sans-serif).

**Character:** El nombre en la voz del local y todo lo demás en una sans geométrica y amable. La pareja cambia en cada negocio, pero la interfaz queda siempre igual.

### Hierarchy
- **Display** (peso del negocio, `clamp(1.7rem, 7.4cqi, 2.2rem)`, 1.1): solo el nombre del negocio. Máximo 20ch, con `text-wrap: balance`.
- **Title** (700, 0.9–1.1rem, 1.3): título del selector (1.1rem), título del QR (0.98rem) y título del horario (0.9rem).
- **Door** (600, 1rem, 1.25, −0.005em): etiqueta de las puertas, recortada a 2 líneas. Sube a 700 en la destacada.
- **Body** (400, 0.97rem, 1.5): la frase del negocio, a 34ch como máximo, con `text-wrap: pretty`.
- **Small** (400, 0.9rem, 1.65, cifras tabulares): líneas del horario.
- **Label** (600–700, 0.72–0.8rem): chip de estado, estado en el selector, URL del QR y contador de sucursales (0.75rem, 700, tabular).

### Named Rules
**The Borrowed Voice Rule.** La tipografía del negocio se usa solo en el nombre y en las iniciales de respaldo del logo. Nunca llega a puertas, chips ni textos de interfaz.

**The Tabular Numbers Rule.** Horarios y contadores usan `font-variant-numeric: tabular-nums`.

## Layout

- **Móvil / contenedor estrecho:** hoja a sangre con alto mínimo `var(--gh-viewport-h, 100dvh)`. La portada mide `clamp(190px, 56cqi, 264px)` y el lienzo sube sobre ella con las esquinas superiores redondeadas al radio de tarjeta (`.gh-cover::before`), así la unión no es un corte recto. El perfil sube −54px para montar el logo sobre ese borde. Las puertas van en una columna con 20px de margen lateral y 12px entre ellas, a 580px como máximo. El horario deja 32px arriba y el pie de Gcode, 24px después de lo anterior. El fondo respeta `safe-area-inset`.
- **Sin portada** (`data-cover="none"`): queda una franja de 68px (72px en escritorio) solo para los botones redondos, y el perfil no se superpone.
- **Contenedor ≥ 700px:** rejilla de tres columnas `1fr / 560px / 1fr` con relleno 48/24/64. La hoja se vuelve una tarjeta con borde y sombra de hoja. Detrás va la portada como telón, a 96px de muestra con blur de 48px, saturación 1.25 y velo del telón al 72%. La portada baja a 228px fijos y las puertas pasan a 32px de margen.
- **Contenedor ≥ 1180px:** aparece el QR como tarjeta *sticky* de 244px en la tercera columna, a 28px de la hoja.
- **Ritmo:** 8 / 12 / 16 / 20 / 24 / 32. Los ajustes ópticos puntuales (13/11 en el chip, 58 en el relleno lateral de las puertas) son de ese componente y no forman escala.

### Named Rules
**The Container, Not Viewport Rule.** Los cambios de disposición de la página se escriben con `@container gh`, nunca con `@media` de ancho. La vista previa del editor depende de eso. El selector de sucursal es la excepción porque es un `<dialog>` a pantalla completa.

**The Last Door Rule.** «Crea tu menú» de Gcode es una puerta más, con la misma forma y estilo que las del local, 24px después del contenido. Nunca queda pegada al fondo de la pantalla ni se trata como anuncio.

## Elevation & Depth

La profundidad es híbrida. Las superficies se separan por tono (lienzo → superficie) y por un filete de 1px, y encima llevan una sombra de dos capas, una de contacto corta y otra de ambiente larga con spread negativo. En el esquema oscuro las sombras son mucho más densas que en el claro. Los estilos «soft» y «outline» quitan la sombra de las puertas.

### Shadow Vocabulary
- **Puerta** (`--gh-shadow-door`; oscuro `0 1px 2px rgba(0,0,0,.35), 0 10px 22px -14px rgba(0,0,0,.75)`; claro `0 1px 2px rgba(0,0,0,.05), 0 8px 20px -12px rgba(0,0,0,.2)`): puertas en estilo solid y botones redondos sin portada.
- **Puerta hover** (`--gh-shadow-door-hover`): acompaña la subida de −2px en hover, solo con puntero fino.
- **Destacada** (`0 1px 2px rgba(0,0,0,.2), 0 14px 28px -16px color-mix(accent 75%, #000)`): sombra teñida del propio acento, que es la única sombra de color.
- **Hoja** (`--gh-shadow-sheet`; oscuro `0 2px 6px rgba(0,0,0,.4), 0 40px 90px -30px rgba(0,0,0,.85)`): hoja de escritorio, tarjeta QR y panel del selector.
- **Anillo del logo** (`0 0 0 4px var(--gh-canvas), 0 12px 28px -12px rgba(0,0,0,.55)`): recorta el logo contra la portada con el color del lienzo.

### Named Rules
**The Glass-Only-On-Photo Rule.** El cristal (blur 14px, saturación 1.4 y fondo `rgba(14,14,16,.42)`) solo se usa en los botones redondos que flotan sobre una foto. Sin portada, esos botones pasan a superficie opaca con sombra de puerta.

## Shapes

La forma la elige el dueño y afecta a la vez a puertas y tarjetas: **pill** (puertas 999px, tarjetas 28px, que es lo predeterminado), **rounded** (16px / 24px) y **square** (6px / 12px). Hay cosas que no cambian con esa elección: el logo, los botones redondos, las redes y los puntos de estado son siempre círculos; los chips, el contador, la URL del QR y el aviso son siempre pastilla; los ítems del selector usan 16px, el papel del QR 16px y la marca de Gcode 6px. En el móvil, el panel del selector es una hoja inferior (24px arriba y 0 abajo) y en ≥700px pasa a 24px en las cuatro esquinas.

## Components

### Puerta (botón de enlace)
Es el componente principal: ancho completo, tranquilo y exacto.
- **Shape:** según `data-shape` (pill 999px por defecto), 60px de alto mínimo y relleno `10px 58px` para que la etiqueta quede centrada de verdad.
- **Anatomía:** ícono de 24px fijo a 20px de la izquierda (16px en square), etiqueta centrada y un elemento final fijo a 20px de la derecha: chevron hacia la carta, flecha diagonal para enlaces externos o contador en pastilla con el número de sucursales.
- **Solid (predeterminado):** superficie, filete de 1px y sombra de puerta. En hover, superficie hover y filete fuerte.
- **Soft:** sin borde ni sombra, con fondo del acento al 13% sobre la superficie (20% en hover).
- **Outline:** fondo transparente y borde de 1.5px con la tinta al 28% (55% en hover).
- **Destacada:** igual en los tres estilos: acento lleno, tinta sobre acento, etiqueta en 700 y sombra teñida. En hover el acento se mezcla al 90% con su tinta.
- **Hover / Focus / Active:** subida de −2px con sombra de hover (solo con `hover: hover` y `pointer: fine`), foco con contorno de 2px en la tinta a 3px de separación y `:active` a `scale(.985)` en 80ms. Con movimiento reducido no hay transformaciones.

### Chip de estado
Pastilla de 30px con superficie y filete, texto de etiqueta en tinta 2 y punto de 8px. Abierto: el texto pasa a tinta, el punto se vuelve verde y lleva un halo de 3px al 24%. Cerrado: punto en tinta 3. Con varias sucursales muestra «1 de 2 locales abiertos».

### Botones redondos (compartir, administrar)
Círculos de 40px en la barra superior, a 12px de los bordes (o a la zona segura). Sobre foto van en cristal oscuro con borde blanco al 16%, ícono blanco y foco blanco; sin foto van en superficie opaca. Compartir usa la hoja nativa o copia el enlace y confirma con el aviso.

### Redes
Glifos de marca rellenos, dibujados en SVG en la caja de 24 de los íconos de trazo, dentro de círculos de 46px sin fondo. En hover toman la superficie y suben −1px. Van centrados con 2px de separación.

### Logo
Disco de 108px con la imagen del local tal cual, sin recomprimir, y anillo del color del lienzo. Si falta el logo o no carga, muestra las iniciales en la tipografía del negocio a 2.1rem sobre la superficie teñida al 16% del acento.

### Selector de sucursal
`<dialog>` nativo con fondo `rgba(0,0,0,.5)`: hoja inferior de hasta 480px de ancho y `min(80dvh, 640px)` de alto, que se centra en ≥700px. Cada ítem mide 60px, con radio de 16px, superficie y filete, y lleva un disco neutro de 36px con el ícono, el nombre en 600, el estado en pastilla (verde al 15% si está abierto, lienzo si está cerrado) y una flecha. Los locales abiertos van primero. El cierre es un círculo de 36px.

### Tarjeta QR (escritorio ancho)
Papel blanco de 172px con radio de 16px y el QR hacia la carta, un título en 700, una pista en tinta 3 y una pastilla con la URL que se copia al tocarla.

### Aviso
Pastilla invertida (tinta de fondo y lienzo de texto) fija abajo al centro, que entra subiendo 16px. Es `role="status"`.

### Motion
- Curva única `--gh-ease: cubic-bezier(0.16, 1, 0.3, 1)`.
- Entrada `gh-rise`: 0.75s, desde opacidad .3 y +14px, con escalera de 80ms + 45ms × índice. El perfil sale sin retraso.
- Portada `gh-cover`: 1.4s desde `scale(1.06)`.
- Panel del selector: 0.42s desde +24px.
- Todo queda bajo `prefers-reduced-motion: no-preference` y se apaga en la vista previa (`data-preview`).

## Do's and Don'ts

### Do:
- **Do** usar solo los `--gh-*` para color. Cualquier color nuevo sale de lienzo, superficie, filete, tinta 1–3, verde o acento, y existe en los dos esquemas.
- **Do** reservar el acento lleno para la puerta destacada. Si hace falta un tinte de marca, que sea una mezcla baja (13–26%) sobre superficie o telón, como en soft, iniciales y telón.
- **Do** mantener las puertas a 60px de alto mínimo, ancho completo y con la etiqueta centrada entre ícono y final fijos.
- **Do** mantener el lienzo del CSS y `SCHEME_CANVAS` del resolvedor sincronizados. De ellos dependen el contraste del nombre y la tinta sobre acento.
- **Do** escribir los cambios de disposición con `@container gh` para que la vista previa del editor siga siendo fiel.
- **Do** dar foco visible de 2px en la tinta (o blanco sobre foto) a todo lo interactivo, y apagar transformaciones con movimiento reducido.

### Don't:
- **Don't** teñir los neutros con el acento ni con ningún otro color. El lienzo y la superficie no llevan tinte.
- **Don't** pintar con el acento los íconos, contadores, chips o redes. El selector usa el lienzo a propósito.
- **Don't** usar la tipografía del negocio fuera del nombre y las iniciales.
- **Don't** dar a cada red un fondo de su color de marca. Las redes son glifos en la tinta.
- **Don't** usar degradados en texto, manchas de luz ni bordes de «ticket». La única forma decorativa es la foto del local o, si no hay foto, el campo de su color.
- **Don't** fijar «Crea tu menú» al fondo del viewport ni darle un estilo distinto del de las puertas del local.
- **Don't** inventar estados: «abierto», número de sucursales y enlaces salen de datos reales, nunca de texto fijo.
