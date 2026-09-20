# Book Data Spike — measured findings

Run 2026-09-20 against the live Open Library API. Every number below was measured,
not estimated. Scripts in `scripts/`, raw datasets in `data/` (large files gzipped).

## Sample

1,748 unique canonical works harvested across 22 subjects in three strata:

| Bucket | Strategy | Works |
|---|---|---|
| `popular` | `subject:X` sorted by `readinglog` | 1,173 |
| `recent` | `first_publish_year:[2018 TO 2026]` | 340 |
| `new23` | `first_publish_year:[2023 TO 2026]`, sorted `new` | 235 |

Deeper passes: 180 works via `/works/*.json`, 835 edition records across 70 works,
70 author records, 160 covers verified over real HTTP, 26 live search queries.

## Headline finding

**Metadata completeness is a property of curation, not of Open Library.**

| Bucket | Cover | Page count | Usable description |
|---|---|---|---|
| `popular` | **99.7%** | **98.6%** | **80.0%** |
| `recent` | 97.1% | 92.9% | 67.5% |
| `new23` | **12.8%** | **37.9%** | **5.0%** |

## Work-level completeness (n=1,748)

| Field | Coverage |
|---|---|
| title | 100.0% |
| first_publish_year | 99.9% |
| isbn | 99.2% |
| author_name | 99.5% |
| language | 99.0% |
| number_of_pages_median | 89.3% |
| cover_i | 87.5% |
| subtitle | 8.5% (unusable) |

Descriptions require a separate `/works/{key}.json` call: 72.2% have one,
60.6% are ≥300 chars (usable). Median 766 chars.

## Editions — why we dropped the entity

- Edition-level completeness is **worse** than work level: pages 51.1%, covers 52.6%.
- **Page-count recovery from editions: 0 / 35 = 0.0%.** `number_of_pages_median` is
  *derived* from editions, so when it is absent no edition carries one either.
  There is no fallback path and building one would be pure waste.
- Fan-out: median 13 editions/work, mean 111.7, max 6,109 (~100x row multiplication).
- 37.9% of editions are non-English translations.
- `physical_format` is free text: 29 distinct strings in 835 records.

## Covers

- `cover_i` is a perfect predictor: **122/122 resolved to a real image, 0 broken, 0 placeholders.**
- Median size 40 KB (p90 62 KB).
- **Median fetch time 2.17 s** (p90 3.74 s) — far too slow for a request path.
  This is the measurement behind "ingest and self-host, never hotlink".

## Search (26 live queries)

Rank-1 77%, top-5 81%, not found 19%.

| Category | Result |
|---|---|
| Exact / partial / author / ISBN-10 / ISBN-13 | #1 |
| Missing apostrophe, accents (native + stripped) | #1 |
| **Typos** | **4 of 6 returned zero results** |

Open Library shares Goodreads' typo weakness. It also prefers native-language
canonical titles (`kafka on the shore` -> 海辺のカフカ).

## Genres — the weak area

Subjects are present on 100% of works but noisy: median 12/work (max 125),
2,550 distinct strings in 180 works, contaminated with `new york times bestseller`,
`large type books`, `reading level-grade 11`.

Precision-first mapping reaches **89.4% recall** but mediocre precision
(*Thinner* -> "science fiction"; *Spare* -> no genre). Supports broad browsing,
not precise filtering. Hence `raw_subjects` JSONB for re-mapping without re-ingest.

## Conclusions

- Open Library alone is sufficient. **No enrichment provider needed in Phase 1.**
- Curate by popularity; exclude the weak 2023+ bucket except for vetted titles.
- Store one canonical work as one book row. No Edition entity.
- Typo tolerance must be built locally in PostgreSQL — see `../decisions/0002-*.md`.
