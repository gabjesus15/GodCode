# Plan: Login, Usuarios por Sucursal e Integración con Clientes

## Estado

- [x] Explorar arquitectura actual del repo GodCode.
- [x] Configurar MCP de Supabase en `~/.config/opencode/opencode.jsonc` (puerto 54321).
- [x] Verificar esquema real de base de datos con MCP en nueva sesión.
- [ ] **PENDIENTE:** Definir integración con el sistema de caja (otro repositorio).
- [ ] Definir scope final de usuarios, sucursales y clientes.
- [ ] Aprobar arquitectura y empezar implementación.

---

## Contexto actual del repo GodCode

- **Stack:** Next.js 16 + Supabase Auth (`@supabase/ssr`).
- **Autenticación:** dos scopes de cookies separados:
  - `sb-super-admin-auth-token` → panel SaaS (`/login`, `/dashboard`, `/companies`, etc.).
  - `sb-tenant-auth-token` → panel de cada local/tenant.
- **Tablas clave:**
  - `users` → empleados del negocio. Tiene `company_id` y `branch_id`.
  - `clients` → clientes finales (agenda/comensales), **sin login propio**.
  - `branches` → sucursales del negocio.
  - `companies` → tenants/negocios.
  - `role_definitions` → catálogo de roles: `super_admin`, `ceo`, `admin`, `cashier`, `owner` (legacy).
  - `admin_users` → super admins del SaaS (resuelto por email de `auth.users`).
  - `client_addresses` → direcciones de clientes, vinculadas a `clients`.
- **Observaciones:**
  - Aunque `users.branch_id` existe, no hay un flujo claro de asignación a sucursal.
  - No existe autenticación para clientes finales.
  - El esquema completo de la base de datos no está en `migrations/`; hay que inspeccionarlo directamente en Supabase.

---

## Hallazgos reales del esquema (MCP)

### Tablas encontradas

Todas las relevantes ya existen en `public`:

- `users`, `clients`, `branches`, `companies`, `role_definitions`, `admin_users`, `client_addresses`, `cash_shifts`.
- **No existe** `user_branches` ni tabla de roles intermedia.

### Estructura de `users`

| Columna | Tipo | Default | Notas |
|---------|------|---------|-------|
| `id` | uuid | `gen_random_uuid()` | PK |
| `auth_id` | text | null | Campo legacy; no usar para nuevos flujos. |
| `auth_user_id` | uuid | null | Vínculo real con `auth.users.id`. |
| `company_id` | uuid | null | FK → `companies.id`. |
| `email` | text | - | Requerido. |
| `full_name` | text | null | - |
| `role` | text | `'cashier'` | Valor libre; validado por `role_definitions`. |
| `branch_id` | uuid | null | FK → `branches.id` (sucursal única). |
| `is_active` | boolean | `true` | - |
| `locale` | text | `'es'` | - |
| `allowed_tabs` | jsonb | null | Lista blanca de tabs del panel. |
| `created_by` | uuid | null | FK → `users.id` (autorreferencia). |

### Estructura de `clients`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | uuid | PK |
| `company_id` | uuid | FK → `companies.id` (nullable, pero el trigger lo asigna). |
| `name` | text | - |
| `phone` | text | Requerido. Clave natural para clientes. |
| `phone_normalized` | text | null |
| `rut` | text | null |
| `is_frequent`, `total_orders`, `total_spent` | - | Métricas del cliente. |
| `default_delivery_address` | jsonb | null |

**Importante:** `clients` **no tiene** `auth_user_id` ni `email`. Hoy un cliente no puede loguearse.

### Roles (`role_definitions`)

| `name` | Descripción |
|--------|-------------|
| `super_admin` | Administrador del SaaS |
| `ceo` | Dueño del negocio |
| `admin` | Administrador del tenant |
| `cashier` | Staff/Cajero |
| `owner` | Rol legacy owner |

La función `is_admin()` considera admin a quien tenga `role IN ('admin', 'owner', 'ceo')`.

### Funciones de seguridad clave

- `current_user_company_id()` → `company_id` desde `public.users` donde `auth_user_id = auth.uid()`.
- `is_admin()` → true si el usuario staff tiene rol admin/owner/ceo o es super_admin.
- `is_super_admin()` → true si existe fila en `admin_users` con el email de `auth.users` y `role = 'super_admin'`.
- `saas_staff_session_email_norm()` → email normalizado de `auth.users` en la sesión actual.
- `current_user_profile()` → `(company_id, role, user_id)` del usuario staff logueado.
- `get_current_user()`, `get_user_company()`, `get_user_role()` → helpers varios.

### RLS relevantes

- **`users`:**
  - `select_self` / `update_self`: por `auth_user_id = auth.uid()`.
  - `select_tenant` / `update_tenant`: por `company_id = current_user_company_id()`.
  - `insert_tenant`: `company_id = current_user_company_id()`.
  - Admin/super_admin tienen permisos extendidos.
- **`clients`:**
  - Solo políticas tenant (`company_id = current_user_company_id()`).
  - **No hay RLS para que un cliente vea sus propios datos** porque no hay autenticación de cliente.
- **`branches`:**
  - `select_tenant` por `company_id = current_user_company_id()`.
  - `public_menu_read_active_branches` para anon (menú público).
- **`companies`:**
  - `select_tenant` por `id = current_user_company_id()`.
  - `public_menu_read_active_companies` para anon.

### Triggers

- `set_updated_at` en `users` y `clients`.
- `trigger_auto_assign_company_to_client` en `clients` (asigna `company_id` desde `get_user_company_id()` si viene null).

### Integración con `auth.users`

- `public.users.auth_user_id` apunta a `auth.users.id` (sin FK formal, pero semánticamente).
- **No hay triggers** que automaticen la creación de `public.users` o `clients` al registrar un `auth.users`.
- El login actual en `app/(auth)/login/page.tsx` usa `createSupabaseBrowserClient("super-admin")` y redirige a `/post-login`.

---

## Objetivos

1. Login funcional para los usuarios que operan el negocio (staff/ceo/admin).
2. Que los usuarios se asignen correctamente a una o más sucursales.
3. Combinar el concepto de "cliente" con un usuario logueable (cliente final con login).

---

## Preguntas abiertas / respuestas tras MCP

1. **¿Un usuario puede estar en varias sucursales?**
   - **Respuesta parcial:** hoy el modelo solo permite **una** sucursal por usuario (`users.branch_id`).
   - **Decisión pendiente:** si el negocio necesita asignar un mismo cajero/admin a varias sucursales, habrá que crear `user_branches`. Si no, basta con hacer funcional `branch_id`.
2. **¿Los clientes finales se loguean?**
   - **Respuesta parcial:** hoy no. `clients` no tiene `auth_user_id` ni `email`, y no hay RLS de cliente.
   - **Decisión pendiente:** confirmar si se requiere login de cliente para historial de pedidos, recompensas, etc. Si es sí, se vinculará `auth.users` con `clients`.
3. **¿Cliente y usuario interno comparten tabla `auth.users`?**
   - **Respuesta técnica:** sí, compartirían `auth.users`. La diferenciación se haría en el registro/login (distinto scope o flujo) y en la tabla `public` vinculada (`users` para staff, `clients` para clientes).
4. **¿Cómo se integra con el sistema de caja (otro repo)?**
   - **Pendiente.** Ver Fase 5.

---

## Fases propuestas

### Fase 1: Verificación con MCP ✅

- [x] Listar tablas, columnas, constraints, índices y RLS policies relevantes.
- [x] Confirmar relaciones entre `users`, `clients`, `branches` y `companies`.
- [x] Revisar si existen tablas auxiliares como `user_branches`, `role_definitions`, etc.
- [x] Documentar hallazgos en esta sección.

### Fase 2: Fundamentos de autenticación

- Revisar login actual (`/login`, `/post-login`, scopes de cookies).
- Asegurar que `/post-login` derive `company_id` y `branch_id` desde `public.users`.
- Estandarizar helpers de sesión (`current_user_company_id`, `current_user_branch_id`, etc.).
- Definir roles mínimos: `super_admin`, `ceo`, `admin`, `cashier`, `staff`, `client`.
- Auditar `types/supabase-database.ts` y regenerar si hay discrepancias.

### Fase 3: Usuario ↔ Sucursal

- Hacer funcional `users.branch_id`.
- UI para crear/editar usuarios y asignar sucursal.
- Filtrar datos del panel según la sucursal asignada (pedidos, caja, inventario, etc.).
- **Decisión:** si se requiere multi-sucursal, crear tabla `user_branches`; si no, documentar que `branch_id` es suficiente.

### Fase 4: Cliente como usuario logueable

- Decidir si se implementa login de cliente final.
- Agregar `auth_user_id` (o similar) a `clients`.
- Crear flujo de registro/login por email/teléfono + OTP o contraseña.
- Si un cliente ya existe en `clients`, unirlo; si no, crearlo.
- Agregar RLS para que un cliente solo vea sus propios datos y los de su empresa.

### Fase 5: Integración con sistema de caja

- Definir contrato con el otro repositorio.
- Decidir si se comparte base de datos, API o sincronización.
- Documentar en `docs/login/integracion-caja.md`.

### Fase 6: UI/UX

- Login para clientes en el menú/tenant.
- Login para staff en el panel interno.
- Gestión de usuarios por sucursal en el panel del negocio.

---

## Notas importantes

- El **sistema de caja es otro repositorio**, por lo que el diseño de autenticación debe considerar la integración cross-repo desde el inicio.
- Los tipos de TypeScript (`types/supabase-database.ts`) pueden no estar 100% sincronizados con la base de datos; hay que regenerarlos después de los cambios DDL.
- El proxy multi-tenant (`proxy.ts`) y los dos scopes de auth deben mantenerse; cualquier cambio de auth debe probarse tanto en subdominio como en dominio principal.

---

## Próximo paso inmediato

1. **Resolver decisiones de scope:**
   - ¿Un usuario puede estar en varias sucursales o basta con `users.branch_id`?
   - ¿Se implementa login de cliente final en esta iteración?
2. **Definir integración con el sistema de caja** (otro repositorio):
   - ¿Comparten base de datos? ¿API REST/Edge Functions? ¿Eventos/webhooks?
3. **Aprobar arquitectura** y comenzar con la Fase 2 (fundamentos de autenticación).
