-- PREPARED ONLY. Future authorized direct verify-full transport + fresh management check required.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public, pg_temp;
DO $guard$ BEGIN
  IF current_database()<>'travel_test_foundation' OR current_user<>'terreno_bootstrap_owner' OR session_user<>current_user
    OR current_setting('server_version_num')::int/10000<>17
    OR current_setting('travel.bootstrap.project_id',true) IS DISTINCT FROM 'broad-wind-62771105'
    OR current_setting('travel.bootstrap.branch_id',true) IS DISTINCT FROM 'br-mute-river-bavdwjwl'
    OR current_setting('travel.bootstrap.endpoint_id',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy'
    OR current_setting('travel.bootstrap.host',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech'
  THEN RAISE EXCEPTION 'Neon bootstrap refused (inspect)' USING ERRCODE='P0001'; END IF;
END $guard$;
-- Receipt settings are caller assertions, not provider attestation. Never bypass the transport check.
SELECT current_database() AS database, current_user AS role, current_setting('server_version_num') AS version,
  pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database();
SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit
  FROM pg_roles WHERE rolname IN ('terreno_bootstrap_owner','travel_test_runtime','travel_test_migrator');
SELECT extname,extversion FROM pg_extension ORDER BY extname;
SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname;
SELECT n.nspname,p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prosecdef;
COMMIT;
