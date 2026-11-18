-- Preserve both parents' invariants when a required child is reassigned.
-- The previously applied migration remains immutable.
CREATE OR REPLACE FUNCTION check_place_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE candidate uuid; candidates uuid[]; current_status text;
BEGIN
  IF TG_TABLE_NAME = 'places' THEN
    IF TG_OP = 'INSERT' THEN candidates := ARRAY[NEW.id]; ELSE candidates := ARRAY[NEW.id,OLD.id]; END IF;
  ELSIF TG_OP = 'INSERT' THEN candidates := ARRAY[NEW.place_id];
  ELSIF TG_OP = 'DELETE' THEN candidates := ARRAY[OLD.place_id];
  ELSE candidates := ARRAY[NEW.place_id,OLD.place_id]; END IF;
  FOR candidate IN SELECT DISTINCT unnest(candidates) AS id ORDER BY id LOOP
    SELECT status INTO current_status FROM places WHERE id=candidate FOR UPDATE;
    IF current_status='published' AND (
      NOT EXISTS(SELECT 1 FROM place_translations WHERE place_id=candidate) OR
      NOT EXISTS(SELECT 1 FROM place_categories WHERE place_id=candidate) OR
      NOT EXISTS(SELECT 1 FROM place_sources WHERE place_id=candidate)
    ) THEN RAISE EXCEPTION 'Published place requires a translation, category and verified source' USING ERRCODE='23514'; END IF;
  END LOOP;
  RETURN NULL;
END $$;
