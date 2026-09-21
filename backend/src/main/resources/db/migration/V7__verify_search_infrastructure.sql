-- Asserts the search layer is actually usable, and says plainly what is wrong if not.
--
-- Not decoration. On a managed Postgres such as Supabase, enabling pg_trgm and unaccent
-- through the provider's dashboard installs them into an `extensions` schema rather than
-- `public`. V2's norm_text() resolves `public.unaccent`, so in that case the schema
-- migrates, the application starts, and every search silently fails at runtime instead.
--
-- Flyway is the schema authority, so the check belongs here: a deployment with the wrong
-- extension layout stops at migration with a readable message.
DO $$
DECLARE
    dictionary_schema text;
    probe text;
BEGIN
    -- 1. Both extensions must exist at all.
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        RAISE EXCEPTION
            'pg_trgm is not installed. Search cannot work without it. Let Flyway create '
            'it (migration V2) rather than enabling it in a provider dashboard.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') THEN
        RAISE EXCEPTION
            'unaccent is not installed. Search cannot work without it. Let Flyway create '
            'it (migration V2) rather than enabling it in a provider dashboard.';
    END IF;

    -- 2. The unaccent dictionary must be where norm_text() looks for it.
    SELECT n.nspname INTO dictionary_schema
    FROM pg_ts_dict d JOIN pg_namespace n ON n.oid = d.dictnamespace
    WHERE d.dictname = 'unaccent'
    LIMIT 1;

    IF dictionary_schema IS DISTINCT FROM 'public' THEN
        RAISE EXCEPTION
            'The unaccent dictionary is in schema "%" but norm_text() resolves '
            '"public.unaccent". This happens when the extension is enabled through a '
            'provider dashboard instead of by Flyway. Fix with: '
            'DROP EXTENSION unaccent CASCADE; then re-run migrations so V2 creates it '
            'in public.', dictionary_schema;
    END IF;

    -- 3. norm_text() must actually fold accents and typographic apostrophes. A function
    --    that exists but returns the input unchanged would pass every structural check
    --    and still break search.
    SELECT norm_text('L’Étranger') INTO probe;
    IF probe IS DISTINCT FROM 'l''etranger' THEN
        RAISE EXCEPTION
            'norm_text() returned "%" for "L''Étranger", expected "l''etranger". '
            'Accent or apostrophe folding is not working, so search will miss.', probe;
    END IF;

    -- 4. The similarity operator must be reachable — this is the typo-tolerance path.
    PERFORM 1 WHERE similarity('dune', 'duen') > 0;
END $$;

-- 5. The indexes search depends on must exist. Without them the queries still return
--    correct results, just slowly enough to be a different product.
DO $$
DECLARE
    missing text;
BEGIN
    SELECT string_agg(expected, ', ') INTO missing
    FROM (VALUES ('book_fts_idx'), ('book_trgm_idx'), ('book_title_prefix_idx')) AS t(expected)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = t.expected
    );

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'Search indexes missing: %. Expected from migration V2.', missing;
    END IF;
END $$;
