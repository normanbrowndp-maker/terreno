-- Disposable/local-only credentials. Never use this script against other hosts.
-- Docker entrypoint runs it only when the dedicated volume is first created.
CREATE ROLE travel_migrator LOGIN PASSWORD 'local-example' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE travel_runtime LOGIN PASSWORD 'local-example' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE travel_test_migrator LOGIN PASSWORD 'local-example' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE travel_test_runtime LOGIN PASSWORD 'local-example' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE travel_dev OWNER travel_migrator;
CREATE DATABASE travel_test_foundation OWNER travel_test_migrator;
CREATE DATABASE travel_test_restore OWNER travel_test_migrator;
\connect travel_dev
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO travel_runtime;
REVOKE TEMPORARY ON DATABASE travel_dev FROM PUBLIC;
CREATE TABLE travel_database_identity(project_id text PRIMARY KEY, purpose text NOT NULL CHECK(purpose IN ('development','test','restore')));
INSERT INTO travel_database_identity VALUES(current_setting('cluster_name'),'development');
REVOKE ALL ON travel_database_identity FROM PUBLIC;
GRANT SELECT ON travel_database_identity TO travel_migrator,travel_runtime;
\connect travel_test_foundation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO travel_test_runtime;
REVOKE TEMPORARY ON DATABASE travel_test_foundation FROM PUBLIC;
CREATE TABLE travel_database_identity(project_id text PRIMARY KEY, purpose text NOT NULL CHECK(purpose IN ('development','test','restore')));
INSERT INTO travel_database_identity VALUES(current_setting('cluster_name'),'test');
REVOKE ALL ON travel_database_identity FROM PUBLIC;
GRANT SELECT ON travel_database_identity TO travel_test_migrator,travel_test_runtime;
\connect travel_test_restore
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO travel_test_runtime;
REVOKE TEMPORARY ON DATABASE travel_test_restore FROM PUBLIC;
CREATE TABLE travel_database_identity(project_id text PRIMARY KEY, purpose text NOT NULL CHECK(purpose IN ('development','test','restore')));
INSERT INTO travel_database_identity VALUES(current_setting('cluster_name'),'restore');
REVOKE ALL ON travel_database_identity FROM PUBLIC;
GRANT SELECT ON travel_database_identity TO travel_test_migrator,travel_test_runtime;
