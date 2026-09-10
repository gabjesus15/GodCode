# Contrato de autorización de la Service Role Key

> Discrepancia nº3 del nodo *Discrepancias Arquitectónicas*.

## El problema real

El Panel POS autentica contra su BFF con la `anon key` y deja que las políticas
RLS de Postgres decidan qué filas ve cada quien. El Portal no: usa
`supabaseAdmin` —la Service Role Key— en **89 puntos de entrada**. Ese cliente
ignora RLS por completo: cada consulta ve la base entera, de todos los tenants.

Eso no es un fallo por sí solo. Un backend con la service role es una decisión
válida, y aquí es además necesaria: el storefront público tiene que leer menús y
precios sin sesión, y no hay políticas RLS que cubran ese caso.

El fallo es que **la autorización quedaba implícita**. Si un endpoint nuevo
olvidaba comprobar la sesión, nada se rompía: los tests pasaban, la aplicación
funcionaba, y la única señal era que ese endpoint devolvía datos de todas las
empresas a quien preguntara. Sin RLS debajo, no había segunda barrera.

## Qué se hizo

Cada punto de entrada que importa `supabaseAdmin` declara ahora cómo autoriza:

```ts
/** @service-role customer-account
 *
 * La sucursal se verifica contra ctx.companyId antes de actualizarla.
 */
```

`npm run security:service-role` comprueba que la declaración se corresponde con
el código. No es un comentario decorativo: el auditor busca la llamada real al
guard declarado, y la busca **en cada método HTTP exportado**, no solo en el
primero del fichero. Un endpoint sin anotar, anotado con un guard que no aparece,
o con un método nuevo que se saltó la comprobación, rompe el CI (job
`Service Role` en `.github/workflows/security.yml`).

## Posturas

| Postura | Qué exige el auditor |
| --- | --- |
| `super-admin` | `validateAdminRolesOnServer` |
| `layout-guard` | el fichero vive bajo `app/(super-admin)/`, cuyo layout ya exige el rol |
| `customer-account` | `getCustomerAccountContext` (fija el `company_id` desde la sesión) |
| `tenant-session` | sesión del panel del tenant: `getTicketAuthContext`, `getCeoSession`, `getCustomerMembership`… |
| `internal-api-key` | `validateApiKey` (cabecera `x-internal-api-key`) |
| `cron-secret` | `CRON_SECRET` en la cabecera `Authorization` |
| `capability-token` | un token no adivinable en la petición: `verification_token`, `client_request_id` |
| `webhook-signature` | firma de la pasarela verificada contra el cuerpo crudo |
| `payment-provider-verified` | el estado del pago se confirma contra Stripe o PayPal, no contra el cuerpo |
| `public` | sin sesión a propósito; **exige** una llamada de rate limit |
| `public-read` | catálogo o página pública; el auditor verifica que el fichero **no escriba nada** |

`public-read` es la única postura que se comprueba por ausencia: si el fichero
contiene `.insert(`, `.update(`, `.upsert(`, `.delete(`, `.rpc(`, `auth.admin.`
o una subida a Storage, la declaración se rechaza.

## Agujeros que aparecieron al auditar

| # | Qué | Severidad |
| --- | --- | --- |
| 1 | `DELETE /api/onboarding/delete` borraba cualquier solicitud de alta por id, **sin sesión de ningún tipo**. Nadie en el código la llamaba: `super-admin/solicitudes/delete` es la versión buena, con rol y con política de estados. Eliminada en ambos lados. | 🔴 Alta |
| 2 | `expire-unverified` y el cron del microservicio comprobaban `if (process.env.CRON_SECRET && secret !== …)`. Sin la variable en el entorno, la condición se saltaba entera y el borrado masivo quedaba abierto. Ahora responden 503 si falta el secreto. | 🟠 Media |
| 3 | Los tres secretos (`SERVICE_API_KEY`, `CRON_SECRET`, `HEALTH_CHECK_SECRET`) se comparaban con `!==`, que corta en el primer byte distinto y filtra el secreto por temporización. Ahora pasan por `secretsMatch`, que compara digests con `timingSafeEqual`. | 🟡 Baja |
| 4 | `/api/system/health` consultaba Postgres y hacía un `fetch` de hasta 5 s al microservicio **antes** de mirar la autorización, sin rate limit: un amplificador gratis. Ahora el tráfico anónimo va acotado a 30/min por IP. | 🟡 Baja |
| 5 | El `/api/health` del microservicio publicaba latencia de base de datos y qué variables de entorno faltaban a quien preguntara. El detalle ahora exige la clave interna; sin ella responde solo `alive`. | 🟡 Baja |

## Lo que esto **no** cierra

Sigue sin haber RLS como fuente de verdad. Las políticas viven en Postgres, no en
este repositorio, y escribirlas es trabajo de base de datos: hay que cubrir el
storefront anónimo antes de poder quitarle la service role a un solo endpoint.

Lo que cambia es que la autorización dejó de depender de que alguien se acuerde.
Cuando existan políticas RLS, la migración se puede hacer endpoint a endpoint
cambiando la postura declarada, y el auditor dirá cuáles quedan.

Residuo conocido: `GET /api/onboarding/check-beta` dice si un correo ya solicitó
un plan concreto. Es un oráculo de enumeración de correos; el proxy del Portal lo
acota a 90/min por IP, pero si el microservicio queda expuesto en internet por su
cuenta, no lo acota nadie. Ponlo detrás del mismo reverse proxy que el resto.

## Añadir un endpoint nuevo

1. Escribe el guard **antes** que la consulta.
2. Anota el fichero con la postura que aplique.
3. `npm run security:service-role`.

Si ninguna postura encaja, el endpoint no está autorizando a nadie. Eso no es un
problema de la anotación: es el bug.
