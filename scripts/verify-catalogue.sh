#!/usr/bin/env bash
# Verifies the ingested catalogue: coverage statistics, demo books, and that the
# search behaviour proven during the spike still holds against real data.
set -uo pipefail
export PATH="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}:$PATH"
DB="${1:-goodreads}"

echo "=============== CATALOGUE VERIFICATION ($DB) ==============="
psql -d "$DB" -P pager=off -X <<'SQL'
\echo '-- size --'
SELECT count(*) AS books,
       (SELECT count(*) FROM author)     AS authors,
       (SELECT count(*) FROM genre)      AS genres,
       (SELECT count(*) FROM book_genre) AS book_genre_links
FROM book;

\echo ''
\echo '-- coverage (quality gates should make these near-total) --'
SELECT
  round(100.0 * count(*) FILTER (WHERE cover_key   IS NOT NULL) / count(*), 1) AS cover_pct,
  round(100.0 * count(*) FILTER (WHERE page_count  IS NOT NULL) / count(*), 1) AS page_pct,
  round(100.0 * count(*) FILTER (WHERE description IS NOT NULL) / count(*), 1) AS desc_pct,
  round(100.0 * count(*) FILTER (WHERE length(description) >= 300) / count(*), 1) AS usable_desc_pct,
  round(100.0 * count(*) FILTER (WHERE isbn13      IS NOT NULL) / count(*), 1) AS isbn_pct
FROM book;

\echo ''
\echo '-- page-count distribution (supports length filtering) --'
SELECT CASE WHEN page_count < 200 THEN 'short (<200)'
            WHEN page_count < 400 THEN 'medium (200-399)'
            WHEN page_count < 600 THEN 'long (400-599)'
            ELSE 'very long (600+)' END AS bucket,
       count(*)
FROM book GROUP BY 1 ORDER BY min(page_count);

\echo ''
\echo '-- publication decades --'
SELECT (published_year/10*10) || 's' AS decade, count(*)
FROM book WHERE published_year IS NOT NULL
GROUP BY 1 ORDER BY min(published_year);

\echo ''
\echo '-- genre distribution --'
SELECT g.slug, count(*) AS books
FROM book_genre bg JOIN genre g ON g.id = bg.genre_id
GROUP BY g.slug ORDER BY books DESC;

\echo ''
\echo '-- genres per book (cap is 3) --'
SELECT genres_per_book, count(*) AS books FROM (
  SELECT b.id, count(bg.genre_id) AS genres_per_book
  FROM book b LEFT JOIN book_genre bg ON bg.book_id = b.id GROUP BY b.id
) t GROUP BY 1 ORDER BY 1;

\echo ''
\echo '-- storage --'
SELECT pg_size_pretty(pg_total_relation_size('book'))           AS book_total,
       pg_size_pretty(pg_relation_size('book_trgm_idx'))        AS trgm_index,
       pg_size_pretty(pg_relation_size('book_fts_idx'))         AS fts_index,
       pg_size_pretty(pg_database_size(current_database()))     AS database;

\echo ''
\echo '-- demo books (exact title match; these carry the case-study narrative) --'
SELECT w.t AS wanted,
       COALESCE(b.title, '*** MISSING ***') AS found,
       b.author_names, b.page_count
FROM (VALUES ('the secret history'),('dune'),('the creative act'),
             ('tomorrow, and tomorrow, and tomorrow'),('project hail mary'),
             ('pride and prejudice'),('to kill a mockingbird'),('the great gatsby'),
             ('sapiens'),('clean code'),('gone girl'),('educated'),('circe'),
             ('atomic habits'),('the road'),('beloved')) AS w(t)
LEFT JOIN LATERAL (
  SELECT title, author_names, page_count FROM book WHERE norm_text(title) = w.t LIMIT 1
) b ON true
ORDER BY (b.title IS NULL) DESC, w.t;

\echo ''
\echo '-- TYPO TOLERANCE: queries Open Library itself returns nothing for --'
SELECT q.query,
       COALESCE(b.title, '*** MISS ***') AS best_match,
       round(b.sim::numeric, 3) AS similarity
FROM (VALUES ('The Secre Histroy'), ('to kill a mockingbrid'),
             ('the great gatsbi'),  ('pride and prejudise'),
             ('harry poter philosphers stone')) AS q(query)
LEFT JOIN LATERAL (
  SELECT title, similarity(search_text, norm_text(q.query)) AS sim
  FROM book WHERE search_text % norm_text(q.query)
  ORDER BY sim DESC LIMIT 1
) b ON true;

\echo ''
\echo '-- EXACT / PARTIAL / AUTHOR via full-text --'
\echo '   ranking favours an exact title match, then length, then rank'
SELECT q.query, COALESCE(b.title, '*** MISS ***') AS best_match, b.author_names
FROM (VALUES ('the secret history'), ('secret history'), ('donna tartt'),
             ('dune'), ('les miserables'), ('galapagos')) AS q(query)
LEFT JOIN LATERAL (
  SELECT title, author_names FROM book
  WHERE search_vector @@ websearch_to_tsquery('simple', norm_text(q.query))
  ORDER BY (norm_text(title) = norm_text(q.query)) DESC,
           ts_rank(search_vector, websearch_to_tsquery('simple', norm_text(q.query))) DESC,
           length(title) ASC
  LIMIT 1
) b ON true;

\echo ''
\echo '-- ACCENT HANDLING on titles actually in the catalogue --'
SELECT title AS stored, search_text AS normalised,
       (search_vector @@ websearch_to_tsquery('simple', norm_text(search_text))) AS found_unaccented
FROM book WHERE title ~ '[À-ÿ]' ORDER BY title LIMIT 5;

\echo ''
\echo '-- ISBN lookup --'
SELECT isbn13, title FROM book WHERE isbn13 IS NOT NULL LIMIT 1;
SELECT count(*) AS found_by_exact_isbn FROM book
WHERE isbn13 = (SELECT isbn13 FROM book WHERE isbn13 IS NOT NULL LIMIT 1);

\echo ''
\echo '-- SHORT QUERY: "Duen" (4 chars; trigram sim 0.25 < pg_trgm default 0.3) --'
\echo '   trigram path (expected to MISS at the default threshold):'
SELECT COALESCE((SELECT title FROM book WHERE norm_text(title) % norm_text('Duen')
                 ORDER BY similarity(norm_text(title), norm_text('Duen')) DESC LIMIT 1),
                '*** MISS (expected) ***') AS trigram_result;
\echo '   prefix fallback (what the API will use for queries under 5 chars):'
SELECT title, author_names FROM book
WHERE norm_text(title) LIKE norm_text('Dune') || '%'
ORDER BY length(title) LIMIT 3;

\echo ''
\echo '================ DATA INTEGRITY CHECKS ================'
\echo 'every count below must be 0'
SELECT 'duplicate source_key'      AS check_name, count(*) AS violations FROM (
         SELECT source_key FROM book GROUP BY source_key HAVING count(*) > 1) t
UNION ALL SELECT 'duplicate slug', count(*) FROM (
         SELECT slug FROM book GROUP BY slug HAVING count(*) > 1) t
UNION ALL SELECT 'duplicate cover_source_id', count(*) FROM (
         SELECT cover_source_id FROM book WHERE cover_source_id IS NOT NULL
         GROUP BY cover_source_id HAVING count(*) > 1) t
UNION ALL SELECT 'book without author', count(*) FROM book b
         WHERE NOT EXISTS (SELECT 1 FROM book_author ba WHERE ba.book_id = b.id)
UNION ALL SELECT 'book without genre', count(*) FROM book b
         WHERE NOT EXISTS (SELECT 1 FROM book_genre bg WHERE bg.book_id = b.id)
UNION ALL SELECT 'book with >3 genres', count(*) FROM (
         SELECT book_id FROM book_genre GROUP BY book_id HAVING count(*) > 3) t
UNION ALL SELECT 'invalid page_count', count(*) FROM book
         WHERE page_count IS NULL OR page_count < 40 OR page_count > 2000
UNION ALL SELECT 'missing cover_key', count(*) FROM book WHERE cover_key IS NULL
UNION ALL SELECT 'null title', count(*) FROM book WHERE title IS NULL OR btrim(title) = ''
UNION ALL SELECT 'null source_key', count(*) FROM book WHERE source_key IS NULL
UNION ALL SELECT 'empty search_text', count(*) FROM book
         WHERE search_text IS NULL OR btrim(search_text) = ''
UNION ALL SELECT 'orphan book_author', count(*) FROM book_author ba
         WHERE NOT EXISTS (SELECT 1 FROM book b WHERE b.id = ba.book_id)
            OR NOT EXISTS (SELECT 1 FROM author a WHERE a.id = ba.author_id)
UNION ALL SELECT 'orphan book_genre', count(*) FROM book_genre bg
         WHERE NOT EXISTS (SELECT 1 FROM book b WHERE b.id = bg.book_id)
            OR NOT EXISTS (SELECT 1 FROM genre g WHERE g.id = bg.genre_id)
UNION ALL SELECT 'author without books', count(*) FROM author a
         WHERE NOT EXISTS (SELECT 1 FROM book_author ba WHERE ba.author_id = a.id)
UNION ALL SELECT 'duplicate author source_key', count(*) FROM (
         SELECT source_key FROM author GROUP BY source_key HAVING count(*) > 1) t
UNION ALL SELECT 'non-english language tag', count(*) FROM book
         WHERE language IS DISTINCT FROM 'eng'
ORDER BY violations DESC, check_name;

\echo ''
\echo '-- recent books (2023-2026) actually in the catalogue --'
SELECT count(*) AS recent_books FROM book WHERE published_year >= 2023;

\echo ''
\echo '-- index usage on the real catalogue --'
EXPLAIN (ANALYZE, COSTS OFF)
SELECT id FROM book WHERE search_text % norm_text('The Secre Histroy')
ORDER BY similarity(search_text, norm_text('The Secre Histroy')) DESC LIMIT 20;
SQL
