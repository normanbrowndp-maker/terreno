-- PREPARED ONLY. Execute with 20_verify.sql on the SAME authorized direct session. No early commit.
BEGIN;
SET LOCAL search_path = pg_catalog, public, pg_temp;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
DO $prepare$
DECLARE role_name text; r record; f record; owner_name text; stage text := 'guard';
BEGIN
  IF current_database()<>'travel_test_foundation' OR current_user<>'terreno_bootstrap_owner' OR session_user<>current_user
    OR current_setting('server_version_num')::int/10000<>17
    OR current_setting('travel.bootstrap.project_id',true) IS DISTINCT FROM 'broad-wind-62771105'
    OR current_setting('travel.bootstrap.branch_id',true) IS DISTINCT FROM 'br-mute-river-bavdwjwl'
    OR current_setting('travel.bootstrap.endpoint_id',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy'
    OR current_setting('travel.bootstrap.host',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech'
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  PERFORM pg_advisory_xact_lock(23942026::bigint);
  SELECT pg_get_userbyid(datdba) INTO owner_name FROM pg_database WHERE datname=current_database();
  IF owner_name NOT IN ('terreno_bootstrap_owner','travel_test_migrator') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  stage := 'roles';
  SET LOCAL createrole_self_grant = 'inherit,set';
  FOREACH role_name IN ARRAY ARRAY['travel_test_runtime','travel_test_migrator'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT',role_name);
    END IF;
    SELECT * INTO r FROM pg_roles WHERE rolname=role_name;
    IF r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit OR r.rolconfig IS NOT NULL
      OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
      OR EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r.oid AND member<>'terreno_bootstrap_owner'::regrole)
    THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  END LOOP;

  -- Preparation accepts only the initial/extension/marker inventory; migrated databases require inspection, not re-bootstrap.
  IF EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f','S')
      AND c.relname<>'travel_neon_test_identity' AND NOT EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
        WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND e.extname IN ('postgis','pg_trgm')))
    OR EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND NOT EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
      WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e' AND e.extname IN ('postgis','pg_trgm')))
    OR EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE d.defaclrole='travel_test_migrator'::regrole AND a.grantee IN (0,'travel_test_runtime'::regrole))
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'drift';
  IF EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND has_schema_privilege('travel_test_runtime',n.oid,'CREATE')) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  -- Do not silently repair pre-existing DML/column/sequence or callable definer drift.
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
      AND CASE WHEN c.relkind IN ('r','p','v','m','f') THEN
        has_table_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR has_any_column_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,REFERENCES') ELSE false END)
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S'
      AND CASE WHEN c.relkind='S' THEN has_sequence_privilege('travel_test_runtime',c.oid,'USAGE,UPDATE') ELSE false END)
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND p.prosecdef AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE'))
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  stage := 'extensions';
  -- Downward admin->migrator membership is explicit and retained for repeat/default ACL/owner operations.
  -- Neither application role is a member of bootstrap/admin or of the other application role.
  IF NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='travel_test_migrator'::regrole
    AND member='terreno_bootstrap_owner'::regrole AND admin_option AND inherit_option AND set_option) THEN
    GRANT travel_test_migrator TO terreno_bootstrap_owner WITH ADMIN TRUE, INHERIT TRUE, SET TRUE;
  END IF;
  CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
  CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname IN ('postgis','pg_trgm') AND extnamespace<>'public'::regnamespace)
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  stage := 'marker';
  CREATE TABLE IF NOT EXISTS public.travel_neon_test_identity (
    singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
    project_id text NOT NULL, branch_id text NOT NULL, endpoint_id text NOT NULL,
    database_name text NOT NULL, purpose text NOT NULL CHECK(purpose='test')
  );
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.travel_neon_test_identity'::regclass
      AND relkind='r' AND relowner='terreno_bootstrap_owner'::regrole AND NOT relrowsecurity AND NOT relforcerowsecurity)
    OR (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped)
      IS DISTINCT FROM ARRAY['singleton','project_id','branch_id','endpoint_id','database_name','purpose']::text[]
    OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped
      AND (NOT attnotnull OR atttypid<>CASE WHEN attnum=1 THEN 'boolean'::regtype ELSE 'text'::regtype END))
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='p' AND conkey=ARRAY[1]::smallint[])
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c')<>2
    OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.travel_neon_test_identity'::regclass AND NOT tgisinternal)
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.travel_neon_test_identity) THEN
    INSERT INTO public.travel_neon_test_identity VALUES(true,'broad-wind-62771105','br-mute-river-bavdwjwl','ep-curly-moon-ba3f3csy','travel_test_foundation','test');
  END IF;
  IF (SELECT count(*) FROM public.travel_neon_test_identity)<>1 OR EXISTS(SELECT 1 FROM public.travel_neon_test_identity
    WHERE singleton IS DISTINCT FROM true OR project_id IS DISTINCT FROM 'broad-wind-62771105' OR branch_id IS DISTINCT FROM 'br-mute-river-bavdwjwl'
      OR endpoint_id IS DISTINCT FROM 'ep-curly-moon-ba3f3csy' OR database_name IS DISTINCT FROM 'travel_test_foundation' OR purpose IS DISTINCT FROM 'test')
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  stage := 'acl';

  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c' AND convalidated
      AND regexp_replace(pg_get_expr(conbin,conrelid),'[[:space:]()]','','g') IN ('singleton','purpose=''test''::text'))<>2
    OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid='public.travel_neon_test_identity'::regclass AND a.grantee<>'terreno_bootstrap_owner'::regrole
      AND (a.grantee NOT IN ('travel_test_runtime'::regrole,'travel_test_migrator'::regrole) OR a.privilege_type<>'SELECT' OR a.is_grantable))
    OR EXISTS(SELECT 1 FROM pg_attribute t CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE t.attrelid='public.travel_neon_test_identity'::regclass
      AND a.grantee<>'terreno_bootstrap_owner'::regrole)
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  REVOKE ALL ON public.travel_neon_test_identity FROM PUBLIC,travel_test_runtime,travel_test_migrator;
  GRANT SELECT ON public.travel_neon_test_identity TO travel_test_runtime,travel_test_migrator;
  REVOKE CREATE,TEMPORARY ON DATABASE travel_test_foundation FROM PUBLIC,travel_test_runtime;
  GRANT CONNECT ON DATABASE travel_test_foundation TO terreno_bootstrap_owner,travel_test_runtime,travel_test_migrator;
  REVOKE ALL ON SCHEMA public FROM PUBLIC,travel_test_runtime;
  GRANT USAGE,CREATE ON SCHEMA public TO terreno_bootstrap_owner WITH GRANT OPTION;
  GRANT USAGE ON SCHEMA public TO travel_test_runtime;
  GRANT USAGE,CREATE ON SCHEMA public TO travel_test_migrator;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC,travel_test_runtime;
  REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;
  -- Narrow immutable/stable PostGIS surface; no blanket routine grant to runtime.
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND NOT p.prosecdef AND p.provolatile IN ('i','s')
      AND p.proname IN ('st_x','st_y','st_isempty','st_setsrid','st_makepoint','st_point','st_distance','st_dwithin','geography','geometry')
      AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
        WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' AND e.extname='postgis')
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO travel_test_runtime,travel_test_migrator',f.signature); END LOOP;
  -- Do not auto-grant SELECT on future tables: later private account/trip tables must remain private.
  ALTER DEFAULT PRIVILEGES FOR ROLE travel_test_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
  stage := 'ownership';
  IF owner_name='terreno_bootstrap_owner' THEN
    ALTER DATABASE travel_test_foundation OWNER TO travel_test_migrator;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Neon bootstrap refused (prepare)' USING ERRCODE='P0001',DETAIL=stage||':'||SQLSTATE;
END $prepare$;
-- Transaction deliberately stays open; 20_verify.sql must pass before COMMIT.
