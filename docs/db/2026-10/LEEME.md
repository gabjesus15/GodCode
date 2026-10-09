# Base de datos: cambios de octubre de 2026

Estos archivos se corren a mano en el SQL editor de Supabase, **antes** de desplegar la versión
nueva de la app. La app nueva lee dos columnas que crea este SQL (`branches.binance_pay` y
`branches.exchange_rate_source`): si se despliega sin ellas, el menú público y «Mi cuenta» se
quedan sin sucursales. Al revés no pasa nada: la app que está en producción hoy funciona igual con
estos cambios ya aplicados.

Todo se probó dos veces seguidas en un PostgreSQL 18 de prueba, con un esquema que imita las tablas y
funciones que estos cambios tocan: las tres tandas son idempotentes (se pueden volver a correr) y cada una va en su propia transacción (si
algo falla, esa tanda no aplica nada).

## Antes de empezar

Saca un respaldo de la base (snapshot del servidor o `pg_dump`). Los cambios son aditivos, pero
tocan las funciones que crean los pedidos.

## Orden

| Paso | Archivo | Qué hace |
|---|---|---|
| 0 | `0-comprobacion-previa.sql` | Solo lectura. Revisa que la base tenga lo que estos cambios y la app nueva dan por hecho. Todo debe decir «sí». |
| 1 | `1-columnas.sql` | `branches.binance_pay` (datos de Binance Pay que ve el cliente), la versión de los Términos que acepta cada alta y la marca del último aviso del barrido de altas trabadas. |
| 2 | `2-tasas-de-cambio.sql` | Historial de tasas BCV (dólar y euro), fuente de tasa por sucursal (las de Venezuela arrancan con el dólar BCV, también las que se creen después) y la tasa con que se cotizó cada pedido. |
| 3 | `3-pedidos-solo-tiendas-abiertas.sql` | El menú ya no puede crear pedidos en tiendas en vista previa («Arma y paga» sin publicar), suspendidas o vencidas. La caja del propio negocio sigue vendiendo como hoy. |
| 4 | `9-comprobacion-posterior.sql` | Solo lectura. Todo debe decir «sí». |
| 5 | Avisar | Con el paso 4 en «sí», se sube la app nueva a `main`. |

Cada archivo se pega entero en el SQL editor y se ejecuta de una vez.

## Si algo sale mal

- **El paso 0 da algún «NO»:** no sigas. Manda el resultado completo al equipo: dice qué falta
  (una migración anterior que la base nueva no tiene, un permiso, una función del Panel).
- **Una tanda falla con `lock timeout`:** alguna tabla estaba ocupada más de 5 segundos (pedidos
  entrando). No se aplicó nada de esa tanda: vuelve a correrla en un momento más tranquilo.
- **La tanda 3 falla con «create_order_transaction cambió»:** la función que crea los pedidos en
  la base no es la que espera la migración. No se aplicó nada: avisa al equipo.
- **Cualquier otro error:** esa tanda no se aplicó. Manda el mensaje completo.

No vuelvas a correr la tanda 2 sin necesidad: vuelve a poner el dólar BCV en las sucursales de
Venezuela a las que se les haya quitado la fuente de tasa a mano.

## Qué NO se corre ahora

- `migrations/panel/`: cobro en bolívares y caja por moneda, y la política de Binance Pay en la
  caja. Son de la caja del Panel y van con sus parches (0009 a 0015 de la tasa BCV), que están en
  el hilo de trabajo de Venezuela. Ver `migrations/panel/README.md`.

## Opcional, cuando lo decidas

- **Plan Básico en dos variantes** («Básico · Menú digital» y «Básico · Panel CEO»):
  `docs/db/plan-basico-dos-variantes.sql`. Antes, revisa que el plan base se llame «Básico» en
  la tabla `plans`. El landing muestra el selector Menú / Panel solo cuando las dos existen.
- **Mercado Pago en el alta (Chile):** si todavía no se corrió, el SQL está en
  `docs/guias/mercado-pago-checkout-pro.md`, sección 2. Es idempotente.

## Fuera de la base

En Coolify, para la app y el servicio de alta (la lista completa está en
`docs/guias/bot-telegram-y-webhook-paypal.md`, parte 4):

- `NEXT_PUBLIC_APP_URL` en la app: obligatoria detrás del proxy (sin ella, «Crear mi contraseña»
  redirige mal).
- `REVALIDATION_SECRET` en el servicio de alta, con el mismo valor que en la app: sin él, una
  tienda recién pagada sigue en «abre pronto» hasta 5 minutos.
- `STORE_DRAFT_PURGE`: decide si las tiendas en vista previa sin publicar se borran a los 30 días
  (`on`) o no (`dry-run`, el valor por defecto, solo lo registra).
- `NEXT_PUBLIC_LEGAL_PROVIDER_RUT` y `NEXT_PUBLIC_LEGAL_PROVIDER_ADDRESS`: sin ellas, las páginas
  legales no muestran RUT ni domicilio.
- Opcionales: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (límites compartidos entre
  instancias), `RECAPTCHA_MIN_SCORE` (0,5 por defecto).

En el Supabase autoalojado (GoTrue):

- `GOTRUE_MAILER_OTP_EXP=3600`: el código que llega por correo para eliminar una cuenta del menú
  (y para entrar) dura 1 hora, que es lo que dice la pantalla. Sin la variable dura 24 horas.
- La plantilla «Magic Link» de los correos de Supabase la usan el código para entrar y el de
  eliminar la cuenta: que su texto sea genérico («Tu código es…»), sin hablar solo de iniciar
  sesión.

## Para decidir (consultas de solo lectura)

Planes con `features` en formato viejo (lista): la app del menú y el Panel no los leen igual.

```sql
select name, jsonb_typeof(features) as tipo, features ->> 'product_mode' as modo
from public.plans order by name;
```

Sucursales con la caja nueva (pedido manual V2), que todavía no deja cobrar productos con
tamaños desde la caja:

```sql
select c.public_slug, b.name
from public.branches b join public.companies c on c.id = b.company_id
where b.manual_order_settings ->> 'enabled' = 'true';
```

## Para la próxima: versionar lo que vive solo en la base

Varias funciones que usan la app y la caja no están en ningún repositorio. Esta consulta las
exporta; con el resultado quedan guardadas en `migrations/` y se pueden revisar como el resto.

```sql
select p.proname as funcion, pg_get_functiondef(p.oid) as definicion
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'create_order_transaction', 'quote_manual_order_v2', 'create_manual_order_v2',
  'create_manual_order_atomic_v1', 'update_order_v3', 'settle_order_payment_v3',
  'payment_method_policy_v3', 'payment_method_key_v3', 'admin_create_category_with_overrides',
  'admin_upsert_product_with_branch', 'admin_delete_product_with_branch', 'get_public_menu',
  'get_cart_branch_prices', 'attach_public_order_evidence_v1', 'is_super_admin',
  'current_user_company_id'
)
order by 1;
```
