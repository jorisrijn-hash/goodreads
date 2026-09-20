-- Checkpoint A: pg_trgm / unaccent / FTS verification
-- Verified against PostgreSQL 17.11 (Homebrew, aarch64-apple-darwin25.6.0) on 2026-09-20
-- with 1,748 real Open Library works, and again at 10,488 rows (target catalogue scale).
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- 1.6
CREATE EXTENSION IF NOT EXISTS unaccent;  -- 1.1

-- unaccent() is STABLE, not IMMUTABLE, so it cannot be used in an index expression
-- directly. Wrapping it with an explicit dictionary argument makes it safe to mark
-- IMMUTABLE. translate() folds typographic apostrophes (’‘`´ -> ').
CREATE OR REPLACE FUNCTION norm_text(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT lower(public.unaccent('public.unaccent', translate(t, '’‘`´', ''''''''))) $$;

-- Generated columns keep normalisation in the database, not the application.
ALTER TABLE book ADD COLUMN search_text text
  GENERATED ALWAYS AS (norm_text(title || ' ' || authors)) STORED;
ALTER TABLE book ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', norm_text(title)),   'A')
   || setweight(to_tsvector('simple', norm_text(authors)), 'B')
  ) STORED;

CREATE INDEX book_fts_idx  ON book USING GIN (search_vector);
CREATE INDEX book_trgm_idx ON book USING GIN (search_text gin_trgm_ops);
