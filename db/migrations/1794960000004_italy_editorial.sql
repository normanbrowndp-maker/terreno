-- Additive read-model extension. Existing migrations and production records stay intact.
CREATE TABLE cities (
  id uuid PRIMARY KEY,
  country_code char(2) NOT NULL REFERENCES countries(code),
  region_id uuid NOT NULL,
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),
  aliases text[] NOT NULL,
  location geometry(Point,4326) NOT NULL,
  subtitle text NOT NULL,
  description text NOT NULL,
  photo jsonb,
  wikidata_id text NOT NULL CHECK(wikidata_id ~ '^Q[0-9]+$'),
  source_url text NOT NULL CHECK(source_url ~ '^https://'),
  verified_at date NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  ordinal integer NOT NULL CHECK(ordinal>0),
  dataset text NOT NULL CHECK(dataset IN ('production','italy-editorial-demo-v1')),
  FOREIGN KEY(region_id,country_code) REFERENCES regions(id,country_code),
  CHECK(NOT ST_IsEmpty(location) AND ST_X(location) BETWEEN -180 AND 180 AND ST_Y(location) BETWEEN -90 AND 90)
);
CREATE INDEX cities_location ON cities USING gist(location);
CREATE INDEX cities_collection ON cities(dataset,ordinal);
ALTER TABLE places ADD COLUMN city_id uuid REFERENCES cities(id);
ALTER TABLE places ADD COLUMN slug text UNIQUE CHECK(slug ~ '^[a-z0-9-]+$');
ALTER TABLE places ADD COLUMN dataset text NOT NULL DEFAULT 'production' CHECK(dataset IN ('production','italy-editorial-demo-v1'));
ALTER TABLE places ADD COLUMN official_url text CHECK(official_url ~ '^https://');
ALTER TABLE places ADD COLUMN editorial_subtitle text;
ALTER TABLE places ADD COLUMN sources_metadata jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE place_media ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX places_city_collection ON places(city_id,dataset,status);
DO $$
DECLARE runtime_role text := CASE WHEN current_database() LIKE 'travel_test_%' THEN 'travel_test_runtime' ELSE 'travel_runtime' END;
BEGIN
  EXECUTE format('GRANT SELECT ON cities TO %I',runtime_role);
END $$;
