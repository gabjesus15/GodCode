-- Advisor: multiple_permissive_policies (cientos de políticas OR por tabla).
-- La consolidación debe hacerse en el SQL Editor con el volcado real de pg_policies,
-- agrupando por (tabla, rol, comando) en migraciones dedicadas por dominio.
-- Guía: docs/supabase/advisor-runbook.md sección "Consolidación de políticas permisivas".

SELECT 1;
