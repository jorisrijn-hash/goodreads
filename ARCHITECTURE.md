# Architecture

## Shape

```
Browser
  │  HTTPS, HttpOnly session cookie
  ▼
Next.js 16 (App Router, RSC)          ← rendering, routing, layout, optimistic UI
  │  REST/JSON over /api/v1/*            NO business logic
  ▼
Spring Boot 4.1 modular monolith      ← ALL domain rules, validation, authorization
  │  JDBC                                search ranking, progress calculation
  ▼
PostgreSQL 17 (pg_trgm, unaccent)     ← relational integrity, FTS + trigram indexes
  ▲
  │  offline, never in a request path
Ingest job ── Open Library ──► object storage (covers)
```

## The rule

**Spring Boot owns all business logic.** Next.js renders, routes, composes and
handles client interaction. It never decides anything.

If a `for` loop over domain objects appears in TypeScript, it belongs in Java.

Concretely, Next.js may: render server and client components, fetch from the Spring
API server-side, forward the session cookie, run presentation-level validation for
UX, and apply optimistic updates with rollback.

Next.js may not: compute progress percentages, decide valid status transitions,
rank search results, authorize anything, or talk to PostgreSQL.

## Backend modules

Package-by-feature under `dev.jorisvrr.reading`:

| Module | Owns | May depend on |
|---|---|---|
| `identity` | users, passwords, sessions, the demo account | — |
| `catalog` | books, authors, genres, search | — |
| `library` | library items, statuses, save reasons | `catalog`, `identity` |
| `reading` | progress updates, reading events, journal | `library` |

Dependencies point one way. `catalog` must never depend on `reading`.

There is no `social`, `recommendation` or `challenge` module. Those are later
milestones and are not stubbed out.

## Authentication

Spring owns all of it: credentials, session lifecycle, authorisation and the decision
about who may reach what. Next.js renders the forms, forwards the request and displays
what comes back.

The browser talks to Spring directly, with CORS restricted to the one frontend origin
and `allowCredentials` enabled so the session and CSRF cookies travel. Server Components
read identity by forwarding the incoming cookie header to `GET /api/v1/me` — the cookie
is `HttpOnly`, so the page can pass it on but never read it.

`middleware.ts` checks only whether a session cookie is *present*. That is a
user-experience guard, not a security boundary: it cannot tell whether the cookie is
valid, and a forged one simply fails at the API. Real enforcement is Spring's
deny-by-default filter chain plus a per-request check during server rendering.

See [docs/decisions/0008](docs/decisions/0008-session-and-csrf.md).

## Data model

`library_item` is the centre: exactly one row per `(user_id, book_id)`, enforced by
a unique constraint. **Status is a state on that row, never a shelf.** This is what
makes reading history survive status changes.

`progress_update` is append-only and is the substrate for the Reading Journal.
`library_item.current_page` is the denormalised latest value for fast reads.
`reading_event` records status transitions so the Journal can render "Started
reading" and "Finished reading" without inferring them from mutable columns.

Deliberately absent: `edition` (see `docs/decisions/0003`), ratings, reviews,
follows, challenges. They are not Phase 1.

## Search

Hybrid, verified against PostgreSQL 17.11 — see `docs/decisions/0002`.

0. A query that is a valid ISBN-13 or ISBN-10 (hyphens and spaces allowed, checksum
   verified) is an exact lookup on `book_isbn13_idx`.
1. `tsvector` full-text, title weighted above author. Handles exact, partial,
   author, punctuation and accent queries. ~0.08 ms.
2. `pg_trgm` similarity fallback when FTS returns nothing. Recovers typos that
   both Open Library and Goodreads miss entirely. ~3.7 ms at 10k rows.
3. Prefix index for queries under ~5 characters, where trigram similarity is
   unreliable.

Normalisation (`norm_text`) lowercases, strips accents and folds typographic
apostrophes, and runs inside generated columns so the database owns it.

## External data

Open Library only, ingested offline into our own PostgreSQL. Covers are downloaded
once and served from our own storage — the spike measured a 2.17 s median fetch
from Open Library's CDN, far too slow for a request path.

No external API is ever called while serving a user request.
