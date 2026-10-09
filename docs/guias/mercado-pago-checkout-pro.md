# Guía: Mercado Pago en el pago del alta (Chile)

Quien registra un negocio en **Chile** puede elegir **Mercado Pago** en el paso 2 del alta («Cómo vas a pagar»), junto a PayPal y la transferencia, y pagar en el paso 3 (`/onboarding/pago`). Acepta tarjetas de crédito y débito de cualquier banco, y también dinero en cuenta de Mercado Pago. GodCode crea el cobro con el **monto exacto** de la página (meses × plan + extras − cupón) y Mercado Pago lo cobra en **pesos chilenos**, al tipo de cambio que fijas en el super admin. La cuenta se activa sola cuando el pago se confirma.

Se usa la aplicación **GdCode** de la cuenta Mercado Pago de GodCode (Tus integraciones, ID 7620657589549652).

---

## Cómo funciona

1. El paso 2 lista Mercado Pago solo si el método está activo, el país está permitido (CL), hay tasa USD→CLP y el servidor tiene `MERCADOPAGO_ACCESS_TOKEN`. Si falta algo, la opción no aparece.
2. En el paso 3, la página muestra el total en USD y debajo «Se cobra en pesos chilenos: $18.050». Si Mercado Pago se apagó después del paso 2, el botón queda desactivado y pide cambiar el método.
3. «Pagar con Mercado Pago» crea una orden (Checkout Pro, Orders API) con ese monto en CLP y lleva a la persona a Mercado Pago. La orden queda guardada como la vigente de la solicitud.
4. Al terminar, Mercado Pago la devuelve a `/api/onboarding/mercadopago-return`. El servidor **consulta la orden a Mercado Pago**, comprueba que sea la vigente y que esté cobrada por el total, y cierra el alta (empresa, suscripción, cupón, correo de bienvenida).
5. Si la persona cierra la pestaña antes de volver, el **webhook** (`/api/payments/mercadopago/webhook`) hace lo mismo. Las dos vías son idempotentes: la segunda solo confirma.

Mercado Pago no aparece en `/cuenta` (renovaciones): por ahora solo cobra el alta.

---

## Configuración

### 1. Variables de entorno

| Variable | App GodCode | Servicio onboarding | Dónde se saca |
|---|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | ✅ | ✅ | Tus integraciones → GdCode → **Credenciales de prueba** (local) o **Credenciales de producción** (Coolify) → Access Token |
| `MERCADOPAGO_WEBHOOK_SECRET` | ✅ | — | Tus integraciones → GdCode → **Webhooks** → Clave secreta |

- El Access Token tiene guiones: `TEST-1234…-123456-…-123456789` (prueba) o `APP_USR-…` (producción). La «Public Key» no sirve.
- La clave secreta del webhook son 64 caracteres hexadecimales, **sin** prefijo.
- En Coolify van en las dos aplicaciones y hay que redesplegar.
- Son contraseñas: no van al repositorio ni a chats.

### 2. Método en la base de datos

Ejecutar una vez en Supabase (SQL editor). Crea el método **apagado** y con la tasa inicial:

```sql
insert into plan_payment_methods (slug, name, countries, auto_verify, is_active, sort_order)
select 'mercadopago', 'Mercado Pago', array['CL'], true, false, 20
where not exists (select 1 from plan_payment_methods where slug = 'mercadopago');

insert into plan_payment_method_config (method_id, key, value)
select m.id, 'tasa_usd_clp', '950'
from plan_payment_methods m
where m.slug = 'mercadopago'
  and not exists (
    select 1 from plan_payment_method_config c where c.method_id = m.id and c.key = 'tasa_usd_clp'
  );
```

Después, en **Super admin → Métodos de cobro → Mercado Pago**: el switch lo activa y «Editar datos» cambia la tasa. Sin `MERCADOPAGO_ACCESS_TOKEN` en el servidor no se ofrece aunque esté activo.

### 3. Webhook

En Tus integraciones → GdCode → **Webhooks → Configurar notificaciones**:

- URL de producción: `https://www.godcode.me/api/payments/mercadopago/webhook`
- Evento: solo **Órdenes (Mercado Pago)** (tópico `order`).
- Guardar genera la clave secreta → `MERCADOPAGO_WEBHOOK_SECRET`.

Sin la clave, el webhook responde 503 y no aplica nada (falla cerrado). Con firma inválida responde 401. Mercado Pago reintenta lo que no sea 2xx.

---

## Probar sin dinero real

1. `MERCADOPAGO_ACCESS_TOKEN` de **prueba** en `.env` (raíz) y en `services/onboarding-billing/.env.local`.
2. Método activo en la base (el de producción no se ofrece mientras Coolify no tenga el token).
3. Una solicitud con país **Chile** → elegir Mercado Pago en el paso 2 → pagar en el paso 3.
4. En Mercado Pago, entrar con la **cuenta compradora de prueba** (Tus integraciones → Cuentas de prueba) y pagar con una **tarjeta de prueba** (Tus integraciones → Tarjetas de prueba; el nombre del titular define el resultado, `APRO` = aprobado).
5. Al volver, la cuenta queda activa. Si se cierra la pestaña antes, el webhook la activa (en local no llega: Mercado Pago no puede avisar a `localhost`).

Con la URL de regreso en `localhost` la orden se crea sin regreso automático (Mercado Pago no lo acepta hacia direcciones locales): para volver se usa el enlace de regreso de la pantalla final de Mercado Pago.

---

## Qué revisar si algo falla

- **No aparece Mercado Pago en el paso 2:** país distinto de Chile, método apagado, sin tasa o sin `MERCADOPAGO_ACCESS_TOKEN` en el servicio.
- **«No pudimos iniciar el pago con Mercado Pago»:** token inválido o de otra cuenta. Los logs del servicio muestran `mercadopago create order` con el código de Mercado Pago.
- **Volvió y dice «procesando»:** la orden aún no está cobrada; el webhook la activa cuando se confirme.
- **Webhook 401:** la clave secreta no coincide (¿se copió con un prefijo?).
- Telegram avisa «Eligió plan» con el monto en USD y en CLP, y «Negocio activado (pagó con Mercado Pago)».
