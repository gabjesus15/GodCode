-- Revoca ejecución de funciones admin_* (y *_internal si existen) para anon/authenticated.
-- Mantiene accesibles desde service_role. No toca get_public_*, create_order_transaction, cash_*, etc.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname LIKE 'admin\_%' ESCAPE '\'
        OR p.proname LIKE '%\_internal' ESCAPE '\'
      )
      AND p.proname NOT LIKE 'pg\_%' ESCAPE '\'
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXCEPTION
      WHEN undefined_function THEN
        NULL;
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'skip revoke (privilege): %', r.sig;
    END;
  END LOOP;
END $$;
