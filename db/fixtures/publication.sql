-- Synthetic, transaction-only fixture. Never a real destination or seed dataset.
INSERT INTO countries(code,default_locale) VALUES('KZ','ru');
INSERT INTO regions(id,country_code,code,timezone) VALUES('22222222-2222-4222-8222-222222222222','KZ','synthetic','Asia/Almaty');
INSERT INTO categories(id,code) VALUES('33333333-3333-4333-8333-333333333333','synthetic');
INSERT INTO data_sources(id,name,canonical_url,license_code,attribution_text) VALUES('44444444-4444-4444-8444-444444444444','Test fixture','https://example.invalid/source','test-fixture','Synthetic test fixture');
INSERT INTO places(id,country_code,region_id,location,timezone,status,verified_at) VALUES('11111111-1111-4111-8111-111111111111','KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(76.9,43.2),4326),'Asia/Almaty','published',now());
INSERT INTO place_translations(place_id,locale,name) VALUES('11111111-1111-4111-8111-111111111111','ru','Синтетическое тестовое место');
INSERT INTO place_categories(place_id,category_id) VALUES('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333');
INSERT INTO place_sources(place_id,source_id,source_url,retrieved_at,checked_at) VALUES('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','https://example.invalid/source',now(),now());
INSERT INTO places(id,country_code,region_id,location,timezone) VALUES('55555555-5555-4555-8555-555555555555','KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(76.91,43.2),4326),'Asia/Almaty');
