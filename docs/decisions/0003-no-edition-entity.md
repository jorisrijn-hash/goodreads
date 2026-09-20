# 0003 — One canonical work is one Book; no Edition entity

**Status:** Accepted · 2026-09-20

## Context
The brief wanted editions grouped beneath a canonical work ("Paperback / Hardcover /
Ebook") rather than ten duplicate search results.

## Decision
Store one Open Library *work* as one `book` row with primary-edition fields
denormalised onto it. No `edition` table, no edition-picker UI in Phase 1.

## Evidence
- **Page-count recovery from editions: 0/35 = 0.0%.** `number_of_pages_median` is
  derived from editions; when absent, no edition has one. The fallback path we were
  going to build cannot work.
- Edition-level completeness is worse than work level (pages 51.1%, covers 52.6%).
- Fan-out: median 13, mean 111.7, max 6,109 editions per work.
- `physical_format` is free text with 29 distinct values in 835 records.

## Consequences
- The duplicate-results problem is solved for free: Open Library search returns
  works, so we simply never fan out.
- The edition picker is deferred; the data does not support it.
- If editions are needed later, `book.source_key` is the join point.
