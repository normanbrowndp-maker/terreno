-- Reject unknown license labels after whitespace/case normalisation.
ALTER TABLE data_sources ADD CONSTRAINT sources_license_known
  CHECK (lower(btrim(license_code)) <> 'unknown');
