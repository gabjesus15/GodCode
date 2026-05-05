# Supabase advisors: runbook

## Leaked Password Protection (HIBP)

1. Abre el proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. **Authentication → Security**.
3. Activa **Leaked Password Protection** (Have I Been Pwned).
4. No requiere migración SQL.

## Re-ejecutar advisors tras migraciones

En el SQL Editor o con MCP `get_advisors` (performance + security):

1. Aplica una migración.
2. Vuelve a lanzar el advisor.
3. Anota contadores (`auth_rls_initplan`, `multiple_permissive_policies`, `unindexed_foreign_keys`, etc.).
4. Compara con la ejecución anterior.

## auth_rls_initplan

En cada política RLS generada en el Dashboard, sustituye llamadas directas:

- `auth.uid()` → `(select auth.uid())`
- `auth.jwt()` → `(select auth.jwt())` cuando aplique

Para volcar políticas:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

## Consolidación de políticas permisivas

Objetivo: una política permisiva por **(tabla, rol, comando)** combinando condiciones con `OR` cuando sea seguro, o eliminar duplicados legacy.

Proceso recomendado:

1. Exportar `pg_policies` (consulta anterior).
2. Agrupar por dominio (pedidos, productos, caja, inventario).
3. Por tabla, diseñar la política unificada y probar con usuarios `anon`, `authenticated` tenant y admin.
4. Aplicar en una rama de base de datos / preview antes de producción.

## Índices FK

La migración `20260505100000_add_missing_fk_indexes.sql` cubre la mayoría de FKs listados por el advisor. Re-ejecutar el advisor para confirmar que `unindexed_foreign_keys` baja.

## Índices sin uso

No eliminar índices recién creados. Tras al menos una semana de tráfico, revisar `unused_index` y ejecutar `DROP INDEX CONCURRENTLY` en mantenimiento.

---

## Snapshot cualitativo (post refactor Esquema Perfecto, 2026)

Ejecuciones recientes de **`get_advisors`** (security + performance) suelen mostrar:

| Tema | Severidad típica | Acción |
| --- | --- | --- |
| `rls_enabled_no_policy` | INFO | Tablas con RLS activado pero sin políticas explícitas: revisar si es intencional (bloqueo total) o falta migración de políticas. |
| `*_security_definer_function_executable` (roles `anon` / `authenticated`) | WARN | Auditar cada función `SECURITY DEFINER`: reducir superficie, fijar `search_path`, encapsular en RPC mínimas. |
| `auth_leaked_password_protection` | WARN / manual | Activar HIBP en **Authentication → Security** (sin SQL). |
| `auth_rls_initplan`, `multiple_permissive_policies`, `unindexed_foreign_keys` | según proyecto | Seguir secciones anteriores de este runbook; comparar delta entre ejecuciones. |

Los volcados completos del advisor conviene guardarlos fuera del repo o en el sistema de tickets; aquí solo se documenta el **patrón** de hallazgos para onboarding del equipo.
