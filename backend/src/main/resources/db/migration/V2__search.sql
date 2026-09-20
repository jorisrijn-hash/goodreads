-- Search layer. Verified against PostgreSQL 17.11 during Checkpoint A with
-- 1,748 real Open Library works and again at 10,488 rows (target catalogue size),
-- where the planner chose the trigram GIN index unaided (3.7 ms).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Denormalised author names so title+author search can live in a generated
-- column. Maintained by the ingest job; book_author remains the relational truth.
ALTER TABLE book ADD COLUMN author_names text NOT NULL DEFAULT '';

-- unaccent() is STABLE, not IMMUTABLE, so it cannot appear in an index
-- expression as-is. Passing the dictionary explicitly makes the call
-- deterministic, which lets us mark this wrapper IMMUTABLE.
-- translate() folds typographic apostrophes so "L’Étranger" and "l'etranger" match.
CREATE OR REPLACE FUNCTION norm_text(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$$ SELECT lower(public.unaccent('public.unaccent', translate(t, '’‘`´', ''''''''))) $$;

ALTER TABLE book ADD COLUMN search_text text
    GENERATED ALWAYS AS (norm_text(title || ' ' || author_names)) STORED;

ALTER TABLE book ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
         setweight(to_tsvector('simple', norm_text(title)),        'A')
      || setweight(to_tsvector('simple', norm_text(author_names)), 'B')
    ) STORED;

-- FTS handles exact/partial/author/punctuation/accents (verified 0.08 ms).
CREATE INDEX book_fts_idx  ON book USING GIN (search_vector);
-- Trigram is the typo-tolerance fallback: recovers all four misspellings that
-- Open Library's own search returns zero results for (verified 3.7 ms at 10k rows).
CREATE INDEX book_trgm_idx ON book USING GIN (search_text gin_trgm_ops);
-- Prefix path for short queries (<5 chars), where trigram similarity is unreliable:
-- "Duen" scores 0.250, below pg_trgm's 0.3 default. Lowering set_limit() globally
-- was measured to inflate long-query matches 2 -> 10, so we do not do that.
CREATE INDEX book_title_prefix_idx ON book (norm_text(title) text_pattern_ops);
