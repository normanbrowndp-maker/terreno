-- PREPARED ONLY. Future authorized direct verify-full transport + fresh management check required.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public, pg_temp;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
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
SELECT current_database() AS database, current_user AS role, session_user AS session_role,
  current_setting('server_version') AS server_version,
  current_setting('transaction_read_only')='on' AS read_only, current_setting('server_version_num') AS version,
  pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname=current_database();
SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit
  FROM pg_roles WHERE rolname IN ('terreno_bootstrap_owner','travel_test_runtime','travel_test_migrator');
SELECT extname,extversion FROM pg_extension ORDER BY extname;
SELECT n.nspname AS schema_name,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,c.reltuples AS estimated_rows,
  e.extname AS extension_member
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e' AND d.refclassid='pg_extension'::regclass
  LEFT JOIN pg_extension e ON e.oid=d.refobjid
  WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' ORDER BY n.nspname,c.relname;
SELECT n.nspname,p.proname,pg_get_userbyid(p.proowner) AS owner,p.prosecdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$' AND p.prosecdef;
-- Server-side TLS observation is not proof of client certificate/hostname validation.
SELECT ssl,version AS tls_version,cipher,bits FROM pg_stat_ssl WHERE pid=pg_backend_pid();
SELECT parent.rolname AS granted_role,member.rolname AS member_role,grantor.rolname AS grantor,
  m.admin_option,m.inherit_option,m.set_option
  FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
  JOIN pg_roles member ON member.oid=m.member JOIN pg_roles grantor ON grantor.oid=m.grantor;
SELECT 'database' AS object_type,d.datname AS object_name,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname=current_database();
SELECT r.rolname,has_database_privilege(r.oid,current_database(),'CONNECT') AS database_connect,
  has_database_privilege(r.oid,current_database(),'CREATE') AS database_create,
  has_database_privilege(r.oid,current_database(),'TEMPORARY') AS database_temp
  FROM pg_roles r WHERE r.rolname IN ('travel_test_runtime','travel_test_migrator');
SELECT n.nspname AS schema_name,pg_get_userbyid(n.nspowner) AS owner,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_namespace n LEFT JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a ON true
  WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
SELECT r.rolname,n.nspname AS schema_name,has_schema_privilege(r.oid,n.oid,'USAGE') AS schema_usage,
  has_schema_privilege(r.oid,n.oid,'CREATE') AS schema_create
  FROM pg_roles r CROSS JOIN pg_namespace n WHERE r.rolname IN ('travel_test_runtime','travel_test_migrator')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
SELECT n.nspname AS schema_name,c.relname,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN LATERAL aclexplode(c.relacl) a ON true
  WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$'
  AND c.relkind IN ('r','p','v','m','f','S');
SELECT n.nspname AS schema_name,c.relname,t.attname AS column_name,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_attribute t JOIN pg_class c ON c.oid=t.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(t.attacl) a
  WHERE t.attnum>0 AND NOT t.attisdropped AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
SELECT r.rolname,n.nspname AS schema_name,c.relname,
  CASE WHEN c.relkind IN ('r','p','v','m','f') THEN has_table_privilege(r.oid,c.oid,'SELECT') ELSE false END AS table_select,
  CASE WHEN c.relkind IN ('r','p','v','m','f') THEN has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') ELSE false END AS table_write_or_maintain,
  CASE WHEN c.relkind IN ('r','p','v','m','f') THEN has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE,REFERENCES') ELSE false END AS column_write,
  CASE WHEN c.relkind='S' THEN has_sequence_privilege(r.oid,c.oid,'USAGE,UPDATE') ELSE false END AS sequence_write
  FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE r.rolname IN ('travel_test_runtime','travel_test_migrator') AND c.relkind IN ('r','p','v','m','f','S')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
SELECT pg_get_userbyid(d.defaclrole) AS creator,n.nspname AS schema_name,d.defaclobjtype,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a;
SELECT n.nspname AS schema_name,p.proname,p.oid::regprocedure AS signature,p.prosecdef,p.provolatile,
  CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,a.privilege_type,a.is_grantable
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
SELECT r.rolname,n.nspname AS schema_name,p.oid::regprocedure AS signature,p.prosecdef,p.provolatile,
  has_function_privilege(r.oid,p.oid,'EXECUTE') AS effective_execute
  FROM pg_roles r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE r.rolname IN ('travel_test_runtime','travel_test_migrator')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname !~ '^pg_(temp|toast_temp)_[0-9]+$';
COMMIT;
