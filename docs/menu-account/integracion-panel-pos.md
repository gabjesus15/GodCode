# Cuentas de clientes del menú — qué debe saber el panel/POS

> Para el repositorio del **panel del negocio (POS)**, que es distinto de este.
> Este documento describe las tablas nuevas que aparecieron en la base de datos
> compartida y cómo debe tratarlas el POS.

## Qué se agregó y por qué

El menú público ahora tiene login de clientes finales. Antes, un "cliente" solo
existía como efecto secundario de un pedido: al tipear una venta manual se creaba una
fila en `clients` con lo que hubiera a mano. Por eso esa tabla **no es un padrón de
personas** y tiene los datos que tiene:

- 789 filas, de las que solo 298 tienen `phone_normalized`.
- 346 filas comparten el documento literal `"19"` (el RUT genérico), y hay otras con
  `"SINRUT"`, `"00"`, `"43"`.
- Teléfonos de relleno repetidos: `56999999999`, `56900000000`, `"56"`.
- Ningún índice único: ni por documento, ni por teléfono.

Como no se puede construir una identidad encima de eso, la identidad vive en **tablas
nuevas** y `clients` **no cambió en absoluto**.

## Modelo

```
auth.users              la PERSONA. Única por correo en todo el proyecto Supabase.
   │                    Clientes y staff comparten este espacio de nombres.
   │
   └── menu_client_accounts     su CUENTA en un negocio (una por negocio)
           │
           └── client_id  →  clients   (NULL por ahora; ver "Fases siguientes")
```

Una misma persona puede tener cuenta en varios negocios: **un** `auth.users`, **varias**
filas en `menu_client_accounts`. La contraseña es una sola y vale para todas.

## Tablas

### `menu_client_accounts`

| Columna | Notas |
|---|---|
| `id` | PK |
| `company_id` | FK → `companies`, `on delete cascade` |
| `auth_user_id` | FK lógica a `auth.users.id`. Nullable: el alta reserva la fila antes de crear el usuario |
| `email` | Correo real, siempre en minúsculas (hay un CHECK) |
| `document_normalized` | Documento canónico, sin puntos ni guiones. **Único por `company_id`** |
| `document_raw` | Lo que tecleó la persona, tal cual |
| `document_country` | `CL`, `VE`, `CO`… decide el formato de validación |
| `full_name`, `phone` | NOT NULL |
| `phone_normalized` | Solo dígitos |
| `client_id` | FK → `clients`, `on delete set null`. **Único parcial**: una ficha respalda como máximo una cuenta |
| `preferred_branch_id` | FK → `branches`. Sucursal habitual elegida por la persona |
| `is_active` | Baja lógica |
| `last_login_at`, `reset_grant_expires_at` | Operativos del flujo de login |

Índices únicos: `(company_id, document_normalized)`, `(company_id, auth_user_id)`,
y `client_id` (parcial, donde no es NULL).

### `menu_client_link_requests`

Solicitudes pendientes de confirmar por correo, que aparecen cuando alguien intenta
registrarse en un negocio con un correo que ya usa en otro. Se consumen al abrir el
enlace y no requieren nada del POS. Se pueden purgar las que tengan `consumed_at`
no nulo o `expires_at` en el pasado.

## Reglas que el POS debe respetar

### 1. No crear staff con un correo que ya sea de un cliente del menú

`auth.users.email` es único **en todo el proyecto**, y clientes y staff comparten ese
espacio. Si el POS intenta dar de alta un empleado con un correo que ya pertenece a un
cliente del menú, `auth.admin.createUser` va a fallar con un error crudo de Supabase.

Conviene comprobarlo antes para mostrar un mensaje claro:

```sql
select 1
from public.menu_client_accounts
where email = lower($1)
limit 1;
```

Nota: usa `=` sobre el correo en minúsculas, **no `ilike`**. En PostgREST/SQL con
`ilike`, `_` y `%` son comodines, y los correos reales llevan `_` de forma legítima
(`juan_perez@gmail.com` haría match contra `juanXperez@gmail.com`).

### 2. Las tablas nuevas son *deny-all* en RLS

Ambas tienen RLS habilitada y forzada, **cero políticas**, y `revoke all` para `anon` y
`authenticated`. Solo se llega a ellas con `service_role`. Una consulta con la anon key
no devuelve cero filas: devuelve `403 / 42501 insufficient_privilege`.

Si el POS necesita leerlas, tiene que hacerlo desde el servidor con service role.

### 3. Distinguir en el listado de clientes quién tiene cuenta

No hace falta ninguna columna nueva en `clients`. Basta con el join:

```sql
select
  c.*,
  a.id            as menu_account_id,
  a.email         as menu_account_email,
  a.last_login_at as menu_account_last_login
from public.clients c
left join public.menu_client_accounts a on a.client_id = c.id
where c.company_id = $1;
```

Las filas con `menu_account_id` no nulo son personas que se registraron en el menú:
sus datos son de fiar (documento validado, correo confirmado). El resto son las fichas
históricas del POS.

### 4. Limpieza manual de `clients` — cuáles se pueden borrar

La FK es `on delete set null`. Eso significa que **borrar una ficha vinculada no da
error**: deja la cuenta sin su registro de ventas, en silencio. Antes de borrar, filtra
por las que no tienen cuenta:

```sql
-- Candidatas seguras a borrado: sin cuenta asociada.
select c.id, c.name, c.phone, c.rut, c.total_orders, c.last_order_at
from public.clients c
left join public.menu_client_accounts a on a.client_id = c.id
where c.company_id = $1
  and a.id is null
  and coalesce(c.total_orders, 0) = 0;   -- opcional: solo las que nunca compraron
```

```sql
-- Nunca borrar estas: tienen una cuenta de menú colgando.
select c.id, c.name
from public.clients c
join public.menu_client_accounts a on a.client_id = c.id
where c.company_id = $1;
```

## Estado actual (Fase 1)

- `client_id` está **NULL en todas las cuentas**: el registro en el menú **no escribe
  nada en `clients`**. Se decidió no vincular con las fichas históricas para no mezclar
  datos, dado el estado de esa tabla.
- El POS no necesita ningún cambio para que esto funcione. Todo lo de abajo es lo que
  vendrá después.

## Fases siguientes

- **Fase 3**: al primer pedido de una persona logueada se creará su ficha en `clients`
  y se rellenará `client_id`. El pedido pasará `p_client_id` a
  `create_order_transaction`, que ya acepta ese parámetro; con él, el RPC deja de
  buscar por `phone_normalized` y además dispara `upsert_client_delivery_address` con
  el cliente correcto.
- **Fase 4**: reseteo de contraseña asistido desde el POS, para clientes que pierdan
  el acceso al correo. Hoy la recuperación es autoservicio por correo, así que esto es
  una red de seguridad, no un requisito.
