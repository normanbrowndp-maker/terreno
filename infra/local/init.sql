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
\connect travel_test_foundation
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO travel_test_runtime;
\connect travel_test_restore
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO travel_test_runtime;
