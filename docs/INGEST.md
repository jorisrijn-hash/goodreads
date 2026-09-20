# Catalogue ingest

How the Phase 1 book catalogue is produced. A fresh developer should be able to
reproduce it from this document alone.

## Source and licensing

All book data comes from [Open Library](https://openlibrary.org). Its bibliographic
metadata is released under **CC0** (public domain dedication). Attribution is not
legally required; we give it anyway in the application footer.

**Not used, deliberately:** Goodreads (API closed since December 2020; its Terms of Use
prohibit reproducing content and `robots.txt` disallows the relevant paths), Google
Books, ISBNdb, or any other provider. See
[ADR 0001](decisions/0001-open-library-as-sole-data-source.md).

**No external API is called while serving a user request.** Everything below runs
offline, and the application reads only from our own PostgreSQL and cover storage.

## Running it

```bash
cd backend
INGEST_CONTACT=you@example.com \
  JAVA_HOME=$(brew --prefix openjdk@25) \
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
```

The `ingest` profile sets `web-application-type: none`, so this is a task that runs to
completion and exits — not a server.

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `INGEST_CONTACT` | `jorisvrr@gmail.com` | Contact address in the User-Agent |
| `INGEST_DATA_DIR` | `./data/ingest` | Raw artifacts, review queue, report |
| `INGEST_COVER_DIR` | `./data/covers` | Cover derivatives |
| `INGEST_TARGET_ESTABLISHED` | `8500` | Popularity-curated target |
| `INGEST_TARGET_CONTEMPORARY` | `1200` | 2018–2022 target |
| `INGEST_TARGET_RECENT` | `300` | 2023–2026 target (cap, not a quota) |
| `INGEST_PAGES_*` | `6` / `3` / `2` | Search pages harvested per subject |

Targets are **caps, not quotas**. If only 180 recent books clear the quality gates,
180 are ingested. Requirements are never relaxed to reach a number.

## Rate limiting

Open Library permits **1 request/second anonymously and 3 req/s for clients that
identify themselves** with a contact address in the User-Agent. We identify, then
self-throttle to one request per 350 ms (≈2.85 req/s) with all API calls serialised
through a single lock.

Cover downloads use a **separate** path. Open Library rate-limits cover lookups by ISBN
(100 per IP per 5 minutes) but exempts lookups by `cover_id`, which is what we use. That
path is latency-bound rather than rate-bound — the spike measured a 2.17 s median fetch
— so it runs on a pool of 8 threads with a 40 ms floor between starts. Serialising it
behind the API throttle would turn a one-hour stage into roughly six.

Failures retry with exponential backoff, four attempts.

## Catalogue selection strategy

The spike established that metadata completeness is a property of **curation**, not of
the provider:

| Bucket | Cover | Page count | Usable description |
|---|---|---|---|
| popularity-curated | 99.7% | 98.6% | 80.0% |
| 2018–2026 | 97.1% | 92.9% | 67.5% |
| 2023–2026 | 12.8% | 37.9% | 5.0% |

So candidates are harvested by reader popularity (`sort=readinglog`) across 22 subjects,
in three buckets — established, contemporary (2018–2022) and recent (2023–2026) — with
the weak recent bucket capped low and subject to the same gates as everything else.

Books referenced by the case-study demo are additionally harvested by targeted title
search and exempted from the bucket caps, but **not** from the quality gates. A demo
book with no cover is still rejected; no metadata is ever fabricated.

## Quality gates

A candidate must have all of:

- a title
- at least one author
- English among its languages
- a real cover (`cover_i` present, and the download must succeed)
- a page count between **40 and 2000** — outside that range is a data error, not a short
  or long book
- at least one genre mapped to our controlled taxonomy
- a plausible publication year, when present

**Description is not a gate.** Roughly 20% of otherwise excellent books lack one, and
Book Detail has a real empty state for it.

Every rejection is counted by reason: `NO_TITLE`, `NO_AUTHOR`, `NON_ENGLISH`,
`MISSING_COVER`, `INVALID_PAGE_COUNT`, `IMPLAUSIBLE_YEAR`, `NO_GENRE_MAPPING`,
`COVER_DOWNLOAD_FAILED`.

## Pipeline stages

```
HARVEST -> FILTER -> SELECT -> HYDRATE -> NORMALISE -> GENRE MAP -> COVERS -> VALIDATE -> UPSERT
```

1. **Harvest** — `search.json` per subject and bucket. Every response is written to
   `data/ingest/raw/` before anything else touches it.
2. **Filter** — cheap gates applied before any per-book network cost is incurred.
3. **Select + hydrate** — bucket caps are applied first (with an 18% margin for books
   that will later fail genre mapping) so we only fetch what we might keep. Then
   `/works/{key}.json` is fetched for description and full subjects, which the search
   endpoint does not return, on 3 threads under the shared global rate floor. Cached to
   `data/ingest/works/`.
4. **Normalise** — whitespace collapsed, typographic apostrophes folded. Display strings
   are never destructively stripped; search-normalised forms are separate.
5. **Genre map** — noisy subjects to controlled taxonomy (below).
6. **Covers** — downloaded once, three derivatives generated.
7. **Validate** — domain invariants re-checked immediately before the write.
8. **Upsert** — idempotent write keyed on the Open Library work key.

### Resumability and failure handling

**Implemented.** Every stage is resumable. Harvested pages and hydrated works are
replayed from disk, cover derivatives are skipped when already present, and the write is
an upsert.

Hydration is the expensive, rate-bound stage, so its resume behaviour matters most:

- Cache writes are **atomic** — written to a temp file and moved into place — so a
  process killed mid-write cannot leave a truncated JSON file.
- A **corrupt** cache entry is detected, deleted and re-fetched rather than trusted.
- A **failed** fetch writes nothing, so the next run retries it. We never persist a
  record we could not verify.

Failures are classified rather than collapsed, because they are different problems:

| Outcome | Meaning | Retried? |
|---|---|---|
| `CACHED` | Served from disk, no request made | n/a |
| `FETCHED` | Retrieved this run | n/a |
| `NOT_FOUND` | HTTP 404/410 — Open Library has no such record. **Permanent.** | No |
| `FAILED` | Network error or 5xx surviving all retries. **Transient in nature.** | Yes, bounded |

Retries use exponential backoff with a hard ceiling of **3 attempts** — bounded, never
indefinite. A book whose hydration fails transiently is skipped for this run and picked
up by the next one.

Covers distinguish three further cases, because they indicate different faults:

| Outcome | Meaning |
|---|---|
| `NOT_FOUND` | No image exists for this cover id — a gap in Open Library's data |
| `DOWNLOAD_FAILED` | Network or server failure on our side, after retries |
| `PROCESSING_FAILED` | Bytes arrived but were undecodable, blank, or too small to be a real cover |

Each is counted separately in the ingest report. None are silently discarded.

## Genre taxonomy

Defined in [`backend/src/main/resources/ingest/genre-taxonomy.json`](../backend/src/main/resources/ingest/genre-taxonomy.json)
— version-controlled, reviewable, and editable without touching code.

Open Library subjects are noisy: a median of 12 per work (max 125), 2,550 distinct
strings across 180 works, contaminated with entries like `new york times bestseller`,
`large type books` and `reading level-grade 11`. The mapper therefore:

- strips known **noise** patterns;
- matches **anchored** regexes, not greedy substrings, so `science fiction` does not also
  match `science` and `historical fiction` does not leak into `history`;
- separates **strong** from **weak** patterns — weak ones only contribute when nothing
  strong matched, and produce a low confidence score;
- caps each book at **3 genres**, recording what was dropped.

`book.raw_subjects` retains the denoised subject list as JSONB, so the taxonomy can be
revised and re-applied **without re-ingesting** anything.

### Review queue

Books are not individually inspected. Anomalies drive a queue written to
`data/ingest/review-queue.json`:

| Flag | Meaning |
|---|---|
| `NO_GENRE` | Nothing mapped — the book is rejected |
| `TOO_MANY_GENRES` | 5+ candidates before capping; likely over-tagged |
| `CONFLICTING_GENRES` | e.g. `childrens` + `horror` |
| `LOW_CONFIDENCE` | Only weak patterns matched |
| `DEMO_BOOK` | Always reviewed — these appear in the case study |

The queue is JSON and version-controllable, so review decisions are reproducible.

## Covers

Downloaded once at ingest and served from our own storage. Never hotlinked: the spike
measured a 2.17 s median fetch from Open Library's CDN, far too slow for a request path.

Three derivatives per book — **160 / 320 / 640 px** wide (grid thumbnail, card, detail
hero) — JPEG at quality 0.82, never upscaled beyond the source.

Layout is object-storage-safe so the same keys work unchanged on R2 or S3:

```
covers/<shard>/<coverId>-<width>.jpg      shard = coverId mod 256, two hex digits
```

`book.cover_key` stores `covers/<shard>/<coverId>`; the client appends the width it
needs.

## Data ownership

| From Open Library (ingested copy) | Ours, authoritative |
|---|---|
| Work key, title, description | Users, credentials, sessions |
| Authors | Library items and statuses |
| Publication year, ISBN, language | Reading progress and history |
| Page count | Save reasons and notes |
| Cover images | The Reading Journal |
| Raw subjects, mapped genres | Any future ratings — first-party only |

**No ratings are imported.** Open Library exposes its own, but they are far too sparse
(median count 26) to present as community signal, and Goodreads ratings are unavailable
to us entirely.

## Reported statistics

Each run writes `data/ingest/ingest-report.txt` covering harvested and accepted counts
per bucket, rejections by reason, hydration and cover outcomes, API request/retry
totals, genre mapping rates, genre and decade distributions, description coverage,
review-queue size, cover storage and duration.

## Rebuilding the catalogue

```bash
./scripts/reset-catalogue.sh          # DESTRUCTIVE — catalogue tables only
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
```

`reset-catalogue.sh` empties **only** `book`, `author`, `book_author`, `genre` and
`book_genre`. Cached ingest artifacts and downloaded covers are left in place, so the
rebuild runs from disk in seconds rather than re-fetching for hours.

**It is deliberately not a database wipe.** User-owned tables — `app_user`,
`library_item`, `progress_update`, `reading_event` — are never in scope. As later
checkpoints add users, sessions, library items and journal data, that must stay true. If
a full reset is ever needed, write a separate, explicitly named command; do not widen
this one.

The script **refuses to run while any user-owned row exists**. This is not a
precaution in the abstract: `library_item` has a foreign key to `book` with
`ON DELETE CASCADE`, so a `TRUNCATE ... CASCADE` on the catalogue would silently delete
every reader's library. The script therefore truncates without `CASCADE`, which fails
loudly if a new referencing table ever appears.

## Verifying the result

```bash
./scripts/verify-catalogue.sh          # or: ./scripts/verify-catalogue.sh goodreads_test
```

Reports coverage statistics, genre and decade distributions, storage sizes, demo-book
presence, the full search battery (exact, partial, author, ISBN, typo, accent, short
query) with `EXPLAIN ANALYZE`, and a block of **data-integrity checks that must all
return zero** — duplicate keys or slugs, books without authors or genres, books over the
genre cap, invalid page counts, missing cover keys, orphaned join rows, and duplicate
author keys.

## Status of claims in this document

Figures quoted here are separated by provenance:

- **Measured during the spike** — bucket completeness percentages, the 2.17 s median
  cover fetch, subject noise counts, the 0/35 edition page-count recovery. Evidence and
  scripts in [`docs/spike/`](spike/README.md).
- **Measured during Checkpoint A** — search latency and index selection against
  PostgreSQL 17.11. See [ADR 0002](decisions/0002-postgres-search-no-elasticsearch.md).
- **Implemented** — everything under Pipeline stages, quality gates, rate limiting,
  failure handling and covers.
- **Actual catalogue results** — recorded in `data/ingest/ingest-report.txt` for each
  run, and summarised in the Checkpoint B report.
