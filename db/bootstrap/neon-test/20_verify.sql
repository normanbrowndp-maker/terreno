-- PREPARED ONLY. Same direct session as 10_prepare.sql; verification precedes the only commit.
DO $verify$
DECLARE role_name text; r record;
BEGIN
  IF current_database()<>'travel_test_foundation' OR current_user<>'terreno_bootstrap_owner' OR session_user<>current_user
    OR current_setting('server_version_num')::int/10000<>17
    OR current_setting('travel.bootstrap.project_id',true) IS DISTINCT FROM 'broad-wind-62771105'
    OR current_setting('travel.bootstrap.branch_id',true) IS DISTINCT FROM 'br-mute-river-bavdwjwl'
    OR current_setting('travel.bootstrap.endpoint_id',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy'
    OR current_setting('travel.bootstrap.host',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech'
    OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND datdba='travel_test_migrator'::regrole)
    OR (SELECT count(*) FROM pg_extension WHERE extname IN ('postgis','pg_trgm') AND extnamespace='public'::regnamespace)<>2
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;

  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c' AND convalidated
      AND regexp_replace(pg_get_expr(conbin,conrelid),'[[:space:]()]','','g') IN ('singleton','purpose=''test''::text'))<>2
    OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid='public.travel_neon_test_identity'::regclass AND a.grantee<>'terreno_bootstrap_owner'::regrole
      AND (a.grantee NOT IN ('travel_test_runtime'::regrole,'travel_test_migrator'::regrole) OR a.privilege_type<>'SELECT' OR a.is_grantable))
    OR EXISTS(SELECT 1 FROM pg_attribute t CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE t.attrelid='public.travel_neon_test_identity'::regclass
      AND a.grantee<>'terreno_bootstrap_owner'::regrole)
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  FOREACH role_name IN ARRAY ARRAY['travel_test_runtime','travel_test_migrator'] LOOP
    SELECT * INTO STRICT r FROM pg_roles WHERE rolname=role_name;
    IF r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit OR r.rolconfig IS NOT NULL
      OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
      OR EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r.oid AND member<>'terreno_bootstrap_owner'::regrole)
      OR has_table_privilege(role_name,'public.travel_neon_test_identity','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
      OR has_any_column_privilege(role_name,'public.travel_neon_test_identity','INSERT,UPDATE,REFERENCES')
      OR NOT has_table_privilege(role_name,'public.travel_neon_test_identity','SELECT')
    THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.travel_neon_test_identity'::regclass AND relkind='r'
      AND relowner='terreno_bootstrap_owner'::regrole AND NOT relrowsecurity AND NOT relforcerowsecurity)
    OR (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped)
      IS DISTINCT FROM ARRAY['singleton','project_id','branch_id','endpoint_id','database_name','purpose']::text[]
    OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.travel_neon_test_identity'::regclass AND attnum>0 AND NOT attisdropped
      AND (NOT attnotnull OR atttypid<>CASE WHEN attnum=1 THEN 'boolean'::regtype ELSE 'text'::regtype END))
    OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='p' AND conkey=ARRAY[1]::smallint[])
    OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.travel_neon_test_identity'::regclass AND contype='c')<>2
    OR (SELECT count(*) FROM public.travel_neon_test_identity)<>1
    OR EXISTS(SELECT 1 FROM public.travel_neon_test_identity WHERE singleton IS DISTINCT FROM true OR project_id IS DISTINCT FROM 'broad-wind-62771105'
      OR branch_id IS DISTINCT FROM 'br-mute-river-bavdwjwl' OR endpoint_id IS DISTINCT FROM 'ep-curly-moon-ba3f3csy' OR database_name IS DISTINCT FROM 'travel_test_foundation' OR purpose IS DISTINCT FROM 'test')

    OR EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','f','S')
      AND c.relname<>'travel_neon_test_identity' AND NOT (c.relkind='r' AND c.relname IN ('countries','country_translations','regions','region_translations','categories','category_translations','places','place_translations','place_categories','data_sources','place_sources','place_media','cities','travel_migrations','travel_migration_checksums') AND c.relowner='travel_test_migrator'::regrole)
      AND NOT EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND e.extname IN ('postgis','pg_trgm')))
    OR has_database_privilege('travel_test_runtime',current_database(),'CREATE,TEMPORARY')
    OR EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND has_schema_privilege('travel_test_runtime',n.oid,'CREATE'))
    OR EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
      WHERE d.defaclrole='travel_test_migrator'::regrole AND a.grantee IN (0,'travel_test_runtime'::regrole))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
      AND CASE WHEN c.relkind IN ('r','p','v','m','f') THEN
        has_table_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR has_any_column_privilege('travel_test_runtime',c.oid,'INSERT,UPDATE,REFERENCES') ELSE false END)
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND c.relkind='S'
      AND CASE WHEN c.relkind='S' THEN has_sequence_privilege('travel_test_runtime',c.oid,'USAGE,UPDATE') ELSE false END)
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
      AND p.prosecdef AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE'))
    OR EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE')
      AND NOT (p.proname IN ('st_x','st_y','st_isempty','st_setsrid','st_makepoint','st_point','st_distance','st_dwithin','geography','geometry') AND NOT p.prosecdef AND p.provolatile IN ('i','s') AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' AND e.extname='postgis')))
  THEN RAISE EXCEPTION 'Neon bootstrap refused'; END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Neon bootstrap refused (verify)' USING ERRCODE='P0001';
END $verify$;
COMMIT;
