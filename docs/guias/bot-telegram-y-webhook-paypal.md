# Guía: bot de Telegram (avisos del alta) y webhook de PayPal

Dos configuraciones que viven fuera del código. Ninguna cambia cómo cobras ni cómo se registran los negocios: son extras. Sin ellas la app funciona igual y simplemente no manda avisos a Telegram ni aplica sola los pagos de PayPal que la captura no alcanzó a aplicar.

---

## Parte 1 · Bot de Telegram

Con esto recibes un mensaje por cada paso del alta de un negocio: solicitud nueva, correo verificado, plan elegido, comprobante subido y negocio activado.

Telegram **no necesita webhook** para esto. La app solo envía mensajes; nadie le escribe al bot. Por eso basta con dos datos: el token del bot y el id del chat donde quieres recibir los avisos.

### 1. Crear el bot

1. Abre Telegram y busca el usuario **@BotFather** (es el oficial, con verificación azul).
2. Escribe `/newbot`.
3. Te pide un nombre para mostrar. Por ejemplo: `Gcode avisos`.
4. Te pide un nombre de usuario, que tiene que terminar en `bot`. Por ejemplo: `gcode_avisos_bot`.
5. BotFather responde con el **token**, una cadena parecida a `123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Cópialo.

Ese token es una contraseña: no lo pegues en el repositorio ni en chats. Si se filtra, en BotFather escribes `/revoke`, eliges el bot y te da uno nuevo.

### 2. Decidir dónde llegan los avisos

Tienes dos opciones:

- **Chat privado contigo.** Abre el bot que acabas de crear y pulsa **Iniciar** (o escribe `/start`). Es lo que tienes configurado ahora: el mensaje de prueba del 5 de octubre llegó a tu chat privado.
- **Un grupo** (mejor si son varias personas). Crea un grupo, añade el bot como miembro y, para que no haya problemas de permisos, hazlo administrador del grupo. Escribe cualquier mensaje en el grupo, por ejemplo «hola».

### 3. Obtener el id del chat

1. Después del paso anterior, abre en el navegador esta dirección, cambiando `TOKEN` por el token del bot:

```
https://api.telegram.org/botTOKEN/getUpdates
```

2. Busca en la respuesta el bloque `"chat":{"id":…}`. Ese número es el **chat id**.
   - En un chat privado es un número positivo, por ejemplo `444855753`.
   - En un grupo es negativo, por ejemplo `-1001234567890`.
3. Si la respuesta viene vacía (`"result":[]`), es que todavía no hay ningún mensaje: pulsa Iniciar en el bot o escribe algo en el grupo y vuelve a cargar la dirección.

Atajo: en un chat privado también puedes escribirle a **@userinfobot** y te devuelve tu id.

### 4. Poner las variables en producción

En el entorno donde corren **la app** y **el servicio `onboarding-billing`** (los dos, porque los avisos salen desde ambos), define:

```
TELEGRAM_BOT_TOKEN=123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=444855753
```

Después vuelve a desplegar. En tu `.env` local ya están con valor, así que en desarrollo funciona desde ya.

### 5. Comprobar que funciona

Prueba rápida sin tocar la app, desde una terminal (cambia `TOKEN` y `CHAT`):

```bash
curl -s "https://api.telegram.org/botTOKEN/sendMessage" -H "Content-Type: application/json" -d "{\"chat_id\":\"CHAT\",\"text\":\"Prueba de avisos\"}"
```

Si responde `"ok":true`, el bot y el chat están bien. La prueba completa es registrar un negocio de prueba desde la página de alta: tiene que llegar «Nueva solicitud de alta» al instante y «Correo verificado» cuando confirmes el correo.

### 6. Qué significa cada error

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `401 Unauthorized` | Token mal copiado o revocado | Vuelve a copiarlo de BotFather |
| `400 chat not found` | Chat id equivocado, o nunca pulsaste Iniciar en el bot | Repite el paso 3 |
| `403 bot was blocked` o `kicked` | Bloqueaste el bot o lo sacaron del grupo | Desbloquéalo o vuelve a añadirlo |
| No llega nada y no hay error | Las variables no están en producción | Revisa el entorno de la app y del servicio |

En los logs de la app, un fallo aparece como `telegram_send_failed` con el código que devolvió Telegram. El token nunca se escribe en el log.

---

## Parte 2 · Webhook de PayPal

Con esto, los pagos de PayPal que PayPal termina de cobrar **después** de que la persona volvió a tu página (o cerró la pestaña) se aplican solos en `/cuenta`. Hoy, sin el webhook, esos pocos casos quedan cobrados en PayPal y hay que aplicarlos a mano desde el super admin. El cobro normal, el que se captura al volver de PayPal, no depende de esto.

### 1. Registrar el webhook en PayPal

1. Entra a developer.paypal.com y ve a **Apps & Credentials**.
2. Arriba elige el entorno: **Sandbox** para probar, **Live** para producción. Cada entorno tiene su app y su webhook id propios.
3. Abre la app cuyas credenciales ya usas en `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Tiene que ser esa misma app: la verificación de la firma del webhook usa esas credenciales.
4. Baja hasta **Webhooks** y pulsa **Add Webhook**.
5. En **Webhook URL** pon la ruta pública de la app:

```
https://www.godcode.me/api/payments/paypal/webhook
```

6. En **Event types** marca solo `PAYMENT.CAPTURE.COMPLETED`. Es el único que la ruta procesa; cualquier otro responde 200 y se ignora.
7. Guarda. En la lista de webhooks aparece la columna **Webhook ID**, una cadena como `8PT597110X687430LKGECATA`. Ese es el valor que necesitas.

### 2. Poner la variable

En el entorno de **la app** (el webhook lo recibe la app, no el servicio):

```
PAYPAL_WEBHOOK_ID=8PT597110X687430LKGECATA
```

Revisa que `PAYPAL_ENVIRONMENT` coincida con el entorno del webhook: `production` para Live, vacío o `sandbox` para Sandbox. Un webhook id de Sandbox no valida contra Live. Vuelve a desplegar.

### 3. Comprobar que funciona

- La prueba fiable es un pago de renovación desde `/cuenta` en Sandbox, con una cuenta de comprador de prueba de PayPal.
- En PayPal, dentro del webhook, la pestaña de eventos muestra cada envío y el código que devolvió tu servidor. Un **200** significa que la firma validó y el pago se aplicó o ya estaba aplicado.
- El simulador de webhooks de PayPal sirve para ver que la URL responde, pero sus eventos pueden no pasar la verificación de firma. Un 401 desde el simulador no indica un problema.

### 4. Qué significa cada respuesta

| Respuesta | Significado |
|---|---|
| `503` con `paypal_webhook_not_configured` en el log | Falta `PAYPAL_WEBHOOK_ID`. Es a propósito: sin id no se procesa nada |
| `401` con `paypal_webhook_invalid_signature` | PayPal no reconoce la firma: el id es de otro entorno o de otra app |
| `503` «Reintentar más tarde» | PayPal aún no da la orden por cobrada; PayPal reintenta solo |
| `200` | Todo bien. Si no había nada que aplicar, lo dice en `outcome` |

PayPal reintenta cualquier respuesta que no sea 2xx durante varias horas, así que un despliegue en curso no pierde eventos.
