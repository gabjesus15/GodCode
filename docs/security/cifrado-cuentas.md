# Datos personales de las cuentas del menú

Quien crea una cuenta en "Mi cuenta" tiene su nombre, teléfono, documento y
direcciones **cifrados** en la base. Los compradores rápidos (sin cuenta) siguen en
`clients` en claro: esa tabla queda como secundaria.

## Qué queda en la base

| Dónde | En claro | Cifrado (`enc:v1:`) |
| --- | --- | --- |
| `menu_client_accounts` | — | nombre, teléfono, documento; correo y documento normalizado como huella HMAC |
| Ficha de la cuenta en `clients` | nombre corto ("Jhon B."), métricas | teléfono, documento; `phone_normalized` vacío |
| `orders` de la cuenta | nombre corto, zona y proveedor de envío | teléfono, documento, dirección (`delivery_address.sealed`) |
| `client_addresses` de la cuenta | zona | línea y referencia |
| `discount_coupon_redemptions` | — | teléfono |

Quién escribe cada cosa:
- el Portal: `lib/menu-account/*`, `POST /api/menu-account/order` y `public-order-delivery`;
- la base: `create_order_transaction` copia el contacto desde la ficha y nunca desde el navegador.

## Quién puede leerlo

- **El Portal** (`lib/menu-account/pii.ts`), para la dueña de la cuenta.
- **El personal**, desde el panel, vía la Edge Function `client-pii`
  (`Saas-Godcode-paneladmin-ceo/supabase/functions/client-pii`).
  - Resuelve al usuario por `auth_user_id` y su empresa, igual que la RLS.
  - Descifra solo lo de esa empresa y **no deja nada guardado**: el panel lo tiene solo en memoria.
- Nadie más. La base, sus respaldos, Studio y quien tenga la clave de servicio ven `enc:v1:…`.

## La llave

`MENU_ACCOUNT_PII_KEY`: 32 bytes aleatorios en base64. Vive en **dos** lugares, y tienen que ser la misma:

1. el entorno del Portal (GodCode);
2. los secretos del edge runtime de Supabase en el VPS (la función `client-pii`).

**Si se pierde, los datos cifrados no se recuperan.** Guárdala en un gestor de
secretos aparte del servidor, no solo en el `.env`.

El formato y la derivación los fijan
`lib/menu-account/pii-contract-cases.ts`, que es idéntico en los dos repos. Si
cambian en un lado y no en el otro, algún test falla.

### Rotarla (cuando haga falta)

No hay rotación automática. El camino previsto es:
1. Agregar un prefijo `enc:v2:` con la llave nueva.
2. Descifrar con `v1` o `v2` según el prefijo.
3. Volver a cifrar con un script como `scripts/menu-account/seal-account-data.ts`.
4. Retirar la llave vieja.

No se reescriben los casos `v1`: se agregan los de `v2`.

## Orden de despliegue (una sola vez)

1. **Panel + Edge Function `client-pii`** con su secreto. El panel acepta datos en
   claro y cifrados, así que puede ir primero sin romper nada.
2. **Portal + `migrations/20260919_account_orders_from_account.sql`, juntos.**
   - La migración rechaza que el menú anónimo cree pedidos para una cuenta.
   - El Portal nuevo los crea desde el servidor.
   - Si se aplica la migración sin el Portal nuevo, quien tiene sesión no puede pedir.
3. **Cifrar lo que ya existe**:
   `npx tsx --conditions=react-server --env-file=.env scripts/menu-account/seal-account-data.ts`
   primero sin `--apply`, para ver cuánto hay; después con `--apply`.

## Límites conocidos

- Un pedido de caja para un cliente afiliado con envío guarda la dirección que
  escribe el cajero en claro (la caja no tiene la llave). El contacto sí sale de la ficha.
- La búsqueda por teléfono del historial de caja no encuentra pedidos de cuentas.
- `auth.users.email` queda en claro: Supabase Auth lo necesita.
