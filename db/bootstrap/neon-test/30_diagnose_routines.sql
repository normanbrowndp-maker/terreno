-- ROLLBACK-ONLY catalog diagnostic after prepare on the exact approved target.
-- Always raises, including for zero violations. Never append a COMMIT.
DO $routine_diagnostic$
DECLARE runtime_oid oid; evidence jsonb;
BEGIN
  IF current_database()<>'travel_test_foundation' OR current_user<>'terreno_bootstrap_owner' OR session_user<>current_user
    OR current_setting('server_version_num')::int/10000<>17
    OR current_setting('travel.bootstrap.project_id',true) IS DISTINCT FROM 'broad-wind-62771105'
    OR current_setting('travel.bootstrap.branch_id',true) IS DISTINCT FROM 'br-mute-river-bavdwjwl'
    OR current_setting('travel.bootstrap.endpoint_id',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy'
    OR current_setting('travel.bootstrap.host',true) IS DISTINCT FROM 'ep-curly-moon-ba3f3csy.c-8.eu-central-1.aws.neon.tech'
    OR NOT EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND pg_get_userbyid(datdba)='travel_test_migrator')
  THEN RAISE EXCEPTION 'Routine diagnostic refused' USING ERRCODE='P0001', DETAIL='identity'; END IF;
  runtime_oid := 'travel_test_runtime'::regrole;
  SELECT jsonb_build_object('kind','runtime_routine_evidence','count',count(*),
    'functions',coalesce(jsonb_agg(item ORDER BY signature),'[]'::jsonb)) INTO evidence
  FROM (
    SELECT format('public.%I(%s)',p.proname,pg_get_function_identity_arguments(p.oid)) AS signature,
      jsonb_build_object(
        'signature',format('public.%I(%s)',p.proname,pg_get_function_identity_arguments(p.oid)),
        'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,
        'volatility',p.provolatile,'security_definer',p.prosecdef,
        'bootstrap_owner_access',pg_has_role(current_user,p.proowner,'USAGE'),
        'runtime_owner_access',pg_has_role(runtime_oid,p.proowner,'USAGE'),
        'runtime_superuser',(SELECT rolsuper FROM pg_roles WHERE oid=runtime_oid),
        'extensions',coalesce((SELECT jsonb_agg(e.extname ORDER BY e.extname)
          FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid
          WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e'),'[]'::jsonb),
        'raw_acl',p.proacl::text,'acl_is_default',p.proacl IS NULL,
        'acl',coalesce((SELECT jsonb_agg(jsonb_build_object(
          'grantor',pg_get_userbyid(a.grantor),
          'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
          'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor,a.privilege_type)
          FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb),
        'execute_sources',coalesce((SELECT jsonb_agg(jsonb_build_object(
          'via',CASE WHEN a.grantee=0 THEN 'PUBLIC' WHEN a.grantee=runtime_oid THEN 'explicit' ELSE 'membership' END,
          'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
          'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor)
          FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
          WHERE a.privilege_type='EXECUTE' AND CASE WHEN a.grantee=0 OR a.grantee=runtime_oid THEN true
            ELSE pg_has_role(runtime_oid,a.grantee,'USAGE') END),'[]'::jsonb)
      ) AS item
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND has_function_privilege('travel_test_runtime',p.oid,'EXECUTE')
      AND NOT (p.proname IN ('st_x','st_y','st_isempty','st_setsrid','st_makepoint','st_point','st_distance','st_dwithin','geography','geometry') AND NOT p.prosecdef AND p.provolatile IN ('i','s') AND EXISTS(SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid=d.refobjid WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e' AND e.extname='postgis'))
  ) violations;
  -- Only requested routine/role/ACL metadata. Never function bodies, settings, passwords or user rows.
  RAISE EXCEPTION 'Routine diagnostic rollback' USING ERRCODE='P0001',
    DETAIL=evidence::text;
END $routine_diagnostic$;
