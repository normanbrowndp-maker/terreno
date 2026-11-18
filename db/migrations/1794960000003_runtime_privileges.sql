-- Database-level PUBLIC privileges also reach runtime roles through inheritance.
DO $$ BEGIN
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC',current_database());
END $$;
