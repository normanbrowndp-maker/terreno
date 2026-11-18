-- Additive integrity fix. Do not edit the already-applied city migration.
ALTER TABLE cities ADD CONSTRAINT cities_id_country_unique UNIQUE(id,country_code);
ALTER TABLE places ADD CONSTRAINT places_city_country_fkey FOREIGN KEY(city_id,country_code) REFERENCES cities(id,country_code);
