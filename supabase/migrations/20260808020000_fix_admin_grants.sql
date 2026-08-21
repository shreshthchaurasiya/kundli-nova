-- 20260808020000_fix_admin_grants.sql
-- Fix admin panel permissions by granting authenticated execution access 
-- to all admin functions.

DO $$ 
DECLARE
  v_func text;
BEGIN
  -- Ensure regprocedure fully qualifies schema by clearing search_path locally
  PERFORM set_config('search_path', '', true);

  FOR v_func IN (
    SELECT oid::regprocedure::text
    FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace 
      AND (
        proname LIKE 'get_admin_%' OR 
        proname LIKE 'admin_%' OR 
        proname LIKE 'approve_%' OR 
        proname LIKE 'reject_%' OR 
        proname LIKE 'set_%' OR 
        proname = 'get_financial_ledger'
      )
  ) LOOP
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || v_func || ' TO authenticated, service_role';
  END LOOP;
END $$;
