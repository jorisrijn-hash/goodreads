# 0002 — PostgreSQL FTS + pg_trgm for search, no Elasticsearch

**Status:** Accepted · 2026-09-20 · **Verified against PostgreSQL 17.11**

## Context
Typo intolerance is the most-cited Goodreads search complaint. The spike confirmed
Open Library shares it: 4 of 6 common misspellings returned *zero* results.

## Decision
Hybrid search in PostgreSQL: `tsvector` full-text first, `pg_trgm` similarity as
fallback, `unaccent` + apostrophe folding at index time. No Elasticsearch.

## Verification (Checkpoint A, real database)
| Check | Result |
|---|---|
| FTS via `book_fts_idx` (Bitmap Index Scan) | 0.083 ms |
| Trigram via `book_trgm_idx`, forced, 1.7k rows | 1.585 ms |
| **Trigram index chosen by planner at 10,488 rows** | **3.689 ms** |
| All 4 typos Open Library missed | correct book at #1 |
| `L’Étranger — Albert Camus` normalisation | `l'etranger - albert camus` |
| Index size at 10,488 rows | table 11 MB, trigram GIN 5.4 MB |

## Notes
- `unaccent()` is STABLE, not IMMUTABLE. Passing the dictionary explicitly
  (`unaccent('public.unaccent', …)`) makes it deterministic so the wrapper can be
  marked IMMUTABLE and used in a generated column.
- Short queries are trigram's weak spot: `Duen` scores 0.250, below the 0.3 default.
  Lowering `set_limit()` globally was measured to inflate long-query matches from
  2 to 10 (5x noise), so queries under ~5 characters use a prefix index instead.
- At 1,748 rows the planner prefers a sequential scan. It switches to the index at
  ~10k rows, which is our target catalogue size.

## Revisit if
Postgres FTS p95 exceeds ~200 ms, or the catalogue passes ~1M documents.
