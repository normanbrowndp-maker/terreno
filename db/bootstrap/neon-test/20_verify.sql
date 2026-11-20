-- PREPARED ONLY. Same direct session as 10_prepare.sql; verification precedes the only commit.
DO $verify$
DECLARE role_name text; r record; stage text := 'entry';
BEGIN
  stage := 'identity_database';
  IF current_database()<>'travel_test_foundation' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_current_role';
  IF current_user<>'terreno_bootstrap_owner' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_session_role';
  IF session_user<>current_user THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_pg_major';
  IF current_setting('server_version_num')::int/10000<>17 THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_project';
  IF current_setting('travel.bootstrap.project_id',true) IS DISTINCT FROM 'broad-wind-62771105' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_branch';
  IF current_setting('travel.bootstrap.branch_id',true) IS DISTINCT FROM 'br-mute-river-bavdwjwl' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_endpoint';
  IF current_setting('travel.bootstrap.endpoint_id',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'identity_host';
  IF current_setting('travel.bootstrap.host',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech' THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'database_owner';
  IF NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba='travel_test_migrator'::regrole) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'extensions';
  IF (SELECT count(*) FROM pg_extension WHERE extname IN ('postgis','pg_trgm') AND extnamespace='public'::regnamespace)<>2 THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  stage := 'marker_validated_checks';
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c' AND convalidated
      AND regexp_replace(pg_get_expr(conbin,conrelid),'[[:space:]()]','','g') IN ('singleton','purpose=''test''::text'))<>2 THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_table_acl';
  IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid='public.travel_neon_test_identity'::regclass AND a.grantee<>'terreno_bootstrap_owner'::regrole
      AND (a.grantee NOT IN ('travel_test_runtime'::regrole,'travel_test_migrator'::regrole) OR a.privilege_type<>'SELECT' OR a.is_grantable)) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_column_acl';
  IF EXISTS(SELECT 1 FROM pg_attribute t CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE t.attrelid='public.travel_neon_test_identity'::regclass
      AND a.grantee<>'terreno_bootstrap_owner'::regrole) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  FOREACH role_name IN ARRAY ARRAY['travel_test_runtime','travel_test_migrator'] LOOP
    stage := 'role_lookup/' || role_name;
    SELECT * INTO STRICT r FROM pg_roles WHERE rolname=role_name;
    stage := 'role_login' || '/' || role_name;
    IF r.rolcanlogin THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_superuser' || '/' || role_name;
    IF r.rolsuper THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_createdb' || '/' || role_name;
    IF r.rolcreatedb THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_createrole' || '/' || role_name;
    IF r.rolcreaterole THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_replication' || '/' || role_name;
    IF r.rolreplication THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_bypassrls' || '/' || role_name;
    IF r.rolbypassrls THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_inherit' || '/' || role_name;
    IF r.rolinherit THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_settings' || '/' || role_name;
    IF r.rolconfig IS NOT NULL THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_membership_up' || '/' || role_name;
    IF EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_membership_down' || '/' || role_name;
    IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r.oid AND member<>'terreno_bootstrap_owner'::regrole) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_marker_table_write' || '/' || role_name;
    IF has_table_privilege(role_name,'public.travel_neon_test_identity','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_marker_column_write' || '/' || role_name;
    IF has_any_column_privilege(role_name,'public.travel_neon_test_identity','INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
    stage := 'role_marker_select' || '/' || role_name;
    IF NOT has_table_privilege(role_name,'public.travel_neon_test_identity','SELECT') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  END LOOP;
  stage := 'marker_relation_owner_rls';
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.travel_neon_test_identity'::regclass AND relkind='r'
      AND relowner='terreno_bootstrap_owner'::regrole AND NOT relrowsecurity AND NOT relforcerowsecurity) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_columns';
  IF (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped)
      IS DISTINCT FROM ARRAY['singleton','project_id','branch_id','endpoint_id','database_name','purpose']::text[] THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_column_types_nullability';
  IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped
      AND (NOT attnotnull OR atttypid<>CASE WHEN attnum=1 THEN 'boolean'::regtype ELSE 'text'::regtype END)) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_pk';
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='p' AND conkey=ARRAY[1]::smallint[]) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_check_count';
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c')<>2 THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_row_count';
  IF (SELECT count(*) FROM public.travel_neon_test_identity)<>1 THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'marker_identity';
  IF EXISTS(SELECT 1 FROM public.travel_neon_test_identity WHERE singleton IS DISTINCT FROM true OR project_id IS DISTINCT FROM 'broad-wind-62771105'
      OR branch_id IS DISTINCT FROM 'br-mute-river-bavdwjwl' OR endpoint_id IS DISTINCT FROM 'ep-curly-moon-ba3f3csy' OR database_name IS DISTINCT FROM 'travel_test_foundation' OR purpose IS DISTINCT FROM 'test') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'unexpected_public_relations';
  IF EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f','S')
      AND c.relname<>'travel_neon_test_identity' AND NOT (c.relkind='r' AND c.relname IN ('countries','country_translations','regions','region_translations','categories','category_translations','places','place_translations','place_categories','data_sources','place_sources','place_media','cities','travel_migrations','travel_migration_checksums') AND c.relowner='travel_test_migrator'::regrole)
      AND NOT EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND e.extname IN ('postgis','pg_trgm'))) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_database_create_temp';
  IF has_database_privilege('travel_test_runtime',current_database(),'CREATE,TEMPORARY') THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_schema_create';
  IF EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND has_schema_privilege('travel_test_runtime',n.oid,'CREATE')) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'migrator_default_acl';
  IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE d.defaclrole='travel_test_migrator'::regrole AND a.grantee IN (0,'travel_test_runtime'::regrole)) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_table_column_write';
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
      AND CASE WHEN c.relkind IN ('r','p','v','m','f') THEN
        has_table_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR has_any_column_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,REFERENCES') ELSE false END) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_sequence_write';
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND c.relkind='S'
      AND CASE WHEN c.relkind='S' THEN has_sequence_privilege('travel_test_runtime',c.oid,'USAGE,UPDATE') ELSE false END) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_security_definer';
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
      AND p.prosecdef AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  stage := 'runtime_routine_allowlist';
  IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE')
      AND NOT (p.proname IN ('st_x','st_y','st_isempty','st_setsrid','st_makepoint','st_point','st_distance','st_dwithin','geography','geometry') AND NOT p.prosecdef AND p.provolatile IN ('i','s') AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' AND e.extname='postgis'))) THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Neon bootstrap refused (verify)' USING ERRCODE='P0001', DETAIL=stage||':'||SQLSTATE;
END $verify$;
COMMIT;
