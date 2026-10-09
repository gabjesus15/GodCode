# Laboratorio del menú (`/dev/menu-lab`)

Pinta el menú público con una carta de ejemplo por tipo de negocio y el tema que digan los
parámetros de la URL, sin base de datos. Sirve para comparar plantillas y sacar capturas.
Solo existe en desarrollo: en producción la página responde 404 (`notFound()`), igual que
`/dev/menu-lab/plantillas`, el laboratorio del selector de plantillas de «Tienda».

## Fotos

Las fotos viven en `public/dev-lab/` y no se versionan (la carpeta está en `.gitignore`):
cada quien pone las suyas. Sin ellas, las tarjetas muestran su estado «sin foto» (la inicial
del producto), que también hay que ver bien.

Nombres que espera `fixtures.ts`:

| Archivo | Dónde sale |
| --- | --- |
| `margherita.jpg`, `pepperoni.jpg`, `cuatro-quesos.jpg`, `pizza-champinon.jpg`, `pizza-quesos-miel.jpg` | Pizzería (`pepperoni.jpg` y `margherita.jpg` también en Hamburguesas y Restaurante) |
| `sushi-alaska.jpg`, `sushi-california.jpg`, `sushi-chicken.jpg`, `sushi-ebi.jpg`, `sushi-tabla.jpg` | Sushi |
| `hero-sushi.jpg` | Banner del carrusel de Sushi |
| `burger.jpg` | Hamburguesas y Comida rápida |
| `cafe.jpg` | Cafetería y Panadería y pastelería |

Con `?cut=1` las cinco pizzas se piden como PNG recortado con alfa (`margherita-cut.png`,
`pepperoni-cut.png`, `cuatro-quesos-cut.png`, `pizza-champinon-cut.png`, `pizza-quesos-miel-cut.png`),
como las fotos reales de Rica Pizza.

## Parámetros

- `sector`: Pizzería, Sushi, Hamburguesas, Comida rápida, Restaurante, Cafetería, Panadería y pastelería u Otro.
- `template`: id de plantilla (`horno`, `nori`…) o `auto` para la recomendada del sector.
- Retoques del tema: `card`, `nav`, `details`, `font`, `scheme`, `bg`, `primary`, `secondary`, `price`, `hover`,
  `discount`, `brand`, `bgmode`, `header`, `featured`, `cart`. Los colores van con `x` en vez de `#`: `primary=xd62828`.
- `logo` y `cover` (URLs), `banners=0` para esconder el carrusel, `cut=1` para las fotos recortadas.

Ejemplo: `/dev/menu-lab?sector=Sushi&template=auto&cut=1`.
