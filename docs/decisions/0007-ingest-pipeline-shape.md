# 0007 — Ingest is a phased task, not a service

**Status:** Accepted · 2026-09-20

## Context
The catalogue must be built from ~10,000 Open Library works, repeatably, without adding
infrastructure the project does not need.

## Decision
A standalone Spring Boot task activated by the `ingest` profile with
`web-application-type: none`. It runs the pipeline and exits. No queue, no scheduler, no
worker, no Airflow, no Kafka.

## Why the pipeline is phased

The first implementation processed one book at a time through all stages. That is
simple, but it makes every cover download wait behind the API rate limiter, because both
shared one throttle. Measured consequence: roughly six hours for the cover stage alone.

The pipeline is therefore split:

| Phase | Work | Constraint |
|---|---|---|
| 0 | select + warm hydration cache | **Rate-bound**, 3 threads under a shared global floor |
| A | read cache + genre map | Disk-bound once the cache is warm |
| B | cover download | **Latency-bound** — 2.17 s median against a CDN, so 8 threads |
| C | validate + upsert | Database-bound, fast |

This distinction matters and is not premature optimisation: the two external endpoints
have genuinely different constraints. Open Library rate-limits cover lookups by ISBN
(100 per IP per 5 minutes) but **exempts lookups by `cover_id`**, which is what we use.

### Why hydration is concurrent but still rate-limited

A fully serial hydration loop was measured at **~1.2 req/s** — well under the 2.85 req/s
we are permitted. The cost per book is roughly 350 ms of deliberate pacing *plus* ~500 ms
of network latency, and serialising them adds those together.

Three threads fix this without exceeding the allowance, because the pacer enforces a
**global** 350 ms floor between request starts regardless of which thread is calling. The
threads fill the latency gap; they do not raise the request rate above the documented
limit. Measured effect: hydration drops from roughly two hours to under one.

Selection runs before warming, so we only fetch books we might actually keep — with an
18% margin, since some will later fail genre mapping.

## Why JDBC rather than JPA for the write
This is a bulk upsert keyed on an external identifier. `ON CONFLICT ... DO UPDATE`
expresses it in one statement; JPA would need a read-modify-write per row. JPA remains
the right tool for the application's own aggregates from Checkpoint C onwards.

## Idempotency
The Open Library work key is the idempotency key, with a UNIQUE constraint behind it.
Authors deduplicate on their own source key — or, when Open Library omits one, on a
synthetic key derived from the normalised name. Join rows are reconciled rather than
accumulated, so removing an author on re-ingest drops the stale link.

Verified: re-running an unchanged catalogue reported 0 inserted / 137 updated with
identical row counts across `book`, `author` and `book_genre`.

## Consequences
- Resumable: raw responses and hydrated works are cached to disk, cover derivatives are
  skipped when present.
- Cheap to re-run, which is what makes the genre taxonomy safely iterable.
- Not suitable for continuous or incremental syncing. That is not a Phase 1 requirement.
