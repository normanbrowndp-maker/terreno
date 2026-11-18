-- Forward-only foundation schema. Extensions are provisioned by a separate admin.
CREATE TABLE countries (
  code char(2) PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),
  default_locale text NOT NULL CHECK (default_locale IN ('ru','kk','en')),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE country_translations (
  country_code char(2) NOT NULL REFERENCES countries(code),
  locale text NOT NULL CHECK (locale IN ('ru','kk','en')),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  PRIMARY KEY(country_code,locale)
);
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code char(2) NOT NULL REFERENCES countries(code),
  code text NOT NULL CHECK(length(code)>0),
  timezone text NOT NULL CHECK(length(timezone)>0),
  UNIQUE(country_code,code), UNIQUE(id,country_code)
);
CREATE TABLE region_translations (
  region_id uuid NOT NULL REFERENCES regions(id),
  locale text NOT NULL CHECK(locale IN ('ru','kk','en')),
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
  PRIMARY KEY(region_id,locale)
);
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(code ~ '^[a-z][a-z0-9_-]*$')
);
CREATE TABLE category_translations (
  category_id uuid NOT NULL REFERENCES categories(id),
  locale text NOT NULL CHECK(locale IN ('ru','kk','en')),
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
  PRIMARY KEY(category_id,locale)
);
CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code char(2) NOT NULL REFERENCES countries(code),
  region_id uuid NOT NULL,
  -- Geometry preserves invalid input for CHECK, unlike geography's normalisation.
  -- Distance queries MUST cast to geography; stored coordinates are WGS84 degrees.
  location geometry(Point,4326) NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  timezone text NOT NULL CHECK(length(timezone)>0),
  visit_duration_minutes integer CHECK(visit_duration_minutes BETWEEN 1 AND 1440),
  address_text text,
  verified_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(region_id,country_code) REFERENCES regions(id,country_code),
  CHECK (NOT ST_IsEmpty(location) AND ST_X(location) BETWEEN -180 AND 180 AND ST_Y(location) BETWEEN -90 AND 90),
  CHECK (status <> 'published' OR verified_at IS NOT NULL)
);
CREATE TABLE place_translations (
  place_id uuid NOT NULL REFERENCES places(id),
  locale text NOT NULL CHECK(locale IN ('ru','kk','en')),
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
  description text CHECK(length(description)<=20000), PRIMARY KEY(place_id,locale)
);
CREATE TABLE place_categories (
  place_id uuid NOT NULL REFERENCES places(id), category_id uuid NOT NULL REFERENCES categories(id),
  PRIMARY KEY(place_id,category_id)
);
CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(trim(name))>0),
  canonical_url text NOT NULL CHECK(canonical_url ~ '^https://'),
  license_code text NOT NULL CHECK(length(trim(license_code))>0 AND lower(license_code) <> 'unknown'),
  attribution_text text NOT NULL CHECK(length(trim(attribution_text))>0)
);
CREATE TABLE place_sources (
  place_id uuid NOT NULL REFERENCES places(id), source_id uuid NOT NULL REFERENCES data_sources(id),
  external_id text, source_url text NOT NULL CHECK(source_url ~ '^https://'),
  retrieved_at timestamptz NOT NULL, checked_at timestamptz NOT NULL,
  PRIMARY KEY(place_id,source_id)
);
CREATE UNIQUE INDEX place_sources_external ON place_sources(source_id,external_id) WHERE external_id IS NOT NULL;
CREATE TABLE place_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), place_id uuid NOT NULL REFERENCES places(id),
  storage_key text NOT NULL, alt_text text NOT NULL, author text,
  license_code text NOT NULL CHECK(length(trim(license_code))>0),
  source_url text NOT NULL CHECK(source_url ~ '^https://'),
  position integer NOT NULL CHECK(position>=0), UNIQUE(place_id,position)
);
CREATE INDEX places_public_filters ON places(status,country_code,region_id,id);
CREATE INDEX places_region ON places(region_id,country_code);
CREATE INDEX places_bbox ON places USING gist(location);
CREATE INDEX places_radius ON places USING gist((location::geography));
CREATE INDEX place_names_search ON place_translations USING gin(lower(name) gin_trgm_ops);
CREATE INDEX place_categories_category ON place_categories(category_id,place_id);
CREATE INDEX place_sources_source ON place_sources(source_id,place_id);

-- A deferred constraint permits an atomic draft -> fully sourced publication.
-- Parent locking serialises concurrent writers of a place's required children.
CREATE FUNCTION check_place_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate uuid; current_status text;
BEGIN
  IF TG_TABLE_NAME = 'places' THEN candidate := COALESCE(NEW.id,OLD.id);
  ELSE candidate := COALESCE(NEW.place_id,OLD.place_id); END IF;
  SELECT status INTO current_status FROM places WHERE id=candidate FOR UPDATE;
  IF current_status='published' AND (
    NOT EXISTS(SELECT 1 FROM place_translations WHERE place_id=candidate) OR
    NOT EXISTS(SELECT 1 FROM place_categories WHERE place_id=candidate) OR
    NOT EXISTS(SELECT 1 FROM place_sources WHERE place_id=candidate)
  ) THEN RAISE EXCEPTION 'Published place requires a translation, category and verified source' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER places_publication AFTER INSERT OR UPDATE ON places
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_place_publication();
CREATE CONSTRAINT TRIGGER translation_publication AFTER INSERT OR UPDATE OR DELETE ON place_translations
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_place_publication();
CREATE CONSTRAINT TRIGGER category_publication AFTER INSERT OR UPDATE OR DELETE ON place_categories
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_place_publication();
CREATE CONSTRAINT TRIGGER source_publication AFTER INSERT OR UPDATE OR DELETE ON place_sources
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_place_publication();

-- Runtime reads only catalog data. Account/trip writes belong to a later stage.
DO $$
DECLARE runtime_role text := CASE WHEN current_database() LIKE 'travel_test_%' THEN 'travel_test_runtime' ELSE 'travel_runtime' END;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=runtime_role) THEN RAISE EXCEPTION 'Required runtime role missing'; END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I',runtime_role);
  EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I',runtime_role);
END $$;
