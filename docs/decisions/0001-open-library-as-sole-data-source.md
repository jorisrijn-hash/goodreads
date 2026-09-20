# 0001 — Open Library is the sole Phase 1 book-data source

**Status:** Accepted · 2026-09-20

## Context
Goodreads retired its public API in December 2020 and revoked existing keys. Its
Terms of Use prohibit reproducing content, and `robots.txt` disallows `/search`,
`/book/reviews/` and `/review/list`. Goodreads data is therefore unavailable to us
by any legitimate means.

## Decision
Ingest a curated subset of Open Library into our own PostgreSQL. No Google Books,
no ISBNdb, no second provider in Phase 1.

## Why no enrichment
The data spike measured that completeness is driven by *curation*, not by provider.
Against a popularity-curated corpus Open Library yields 99.7% covers, 98.6% page
counts and 80% usable descriptions. Enrichment would fix a problem that curation
removes for free. A live Google Books call during the spike also returned
`429 Quota exceeded` on a shared IP, and the keyed default (~1,000 req/day) is below
what a 10,000-book ingest needs in one run.

## Consequences
- Open Library metadata is CC0. Attribution is given voluntarily in the footer.
- Post-2023 titles are weak (12.8% covers) and are largely excluded.
- Revisit enrichment only if we add recent releases, author pages, or editions.
- No imported ratings. Open Library's own ratings are too sparse (median count 26)
  to present as community signal. Any future ratings are first-party only.
