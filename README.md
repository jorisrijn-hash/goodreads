# A better home for your reading life

An independent Goodreads redesign — a product and software-engineering case study.

**Not affiliated with Goodreads or Amazon.** No Goodreads data is used. The book
catalogue comes from [Open Library](https://openlibrary.org) (CC0).

> Goodreads doesn't need to become another social network.
> It needs to become the best digital home for your reading life.

## Status

**Phase 1 — Core Reading System.** Checkpoints A (foundation), B (catalogue) and C (identity) complete.

The Phase 1 loop is: Discover/Search → Book Detail → Save → My Library →
Reading Progress → Reading Journal. Ratings, reviews, social features,
recommendations and the Reading Challenge are later milestones and are
deliberately not stubbed out.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16.3, React 19.2, TypeScript, Tailwind 4 |
| Backend | Spring Boot 4.1.1, Java 25 (LTS) |
| Database | PostgreSQL 17 + `pg_trgm`, `unaccent` |
| Migrations | Flyway |
| Book data | Open Library, ingested offline |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/decisions/](docs/decisions/).

## Local setup

### Prerequisites

- JDK 25 — `brew install openjdk@25`
- Node 20+ — this project is developed on Node 24
- PostgreSQL 17 — `brew install postgresql@17 && brew services start postgresql@17`

> **Path requirement:** the project directory must not contain a `:` character.
> The JVM splits the classpath on `:`, so a path like `~/dev/02:: personal/app`
> makes every Java process fail with `ClassNotFoundException`.
> See [docs/decisions/0004](docs/decisions/0004-project-location-and-toolchain.md).

### 1. Database

```bash
./scripts/setup-db.sh
```

Creates the `goodreads` role and the `goodreads` and `goodreads_test` databases.
Flyway creates the extensions and schema on first boot.

### 2. Backend

```bash
cd backend
JAVA_HOME=$(brew --prefix openjdk@25) ./mvnw spring-boot:run
```

Runs on `http://localhost:8080`. Health: `http://localhost:8080/actuator/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Authentication

Email and password, with a **server-side session** in PostgreSQL identified by an
opaque `HttpOnly` cookie. No JWTs, no tokens in `localStorage`, no OAuth providers.

| | |
|---|---|
| Hashing | Argon2id (memory-hard, current OWASP guidance) |
| Password policy | At least 10 characters. No composition rules — length beats symbols |
| Session store | PostgreSQL via Spring Session, so sessions survive restarts |
| Cookie | `GRSESSION`, `HttpOnly`, `SameSite=Lax`, `Secure` in production |
| CSRF | Cookie-to-header (`XSRF-TOKEN` → `X-XSRF-TOKEN`); nothing exempt, including login |
| On login | Session id **and** CSRF token are both rotated, against fixation |
| Failed login | A wrong password and an unknown account are byte-identical |

Endpoints: `POST /api/v1/users` (sign up), `POST /api/v1/auth/session` (log in),
`DELETE /api/v1/auth/session` (log out), `POST /api/v1/auth/demo-session`,
`GET /api/v1/me`, `GET /api/v1/csrf`. Everything else is denied by default.

Design and reasoning: [docs/decisions/0008](docs/decisions/0008-session-and-csrf.md).

### Demo account

`Explore demo account` signs in a seeded reader in one click, with **no password**. A
shared demo credential would be a real credential that works from anywhere and would
leak; instead the server authenticates a known `is_demo` identity, and the account is
stored with a hash no submitted password can produce, so ordinary login cannot reach it.

## Environment variables

Copy `.env.example` to `.env` (backend) and `frontend/.env.example` to
`frontend/.env.local`. Defaults work for local development. `.env` files are gitignored.

| Variable | Scope | Local default |
|---|---|---|
| `DATABASE_URL` / `DATABASE_USER` / `DATABASE_PASSWORD` | backend | supplied by the `local` profile |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8080` |
| `SESSION_COOKIE_SECURE` | backend | `false` |
| `FRONTEND_ORIGIN` | backend | `http://localhost:3000` |

> ### `goodreads_dev` is local development only
>
> `.env.example` contains `DATABASE_PASSWORD=goodreads_dev` deliberately: it matches
> `scripts/setup-db.sh` so a fresh clone runs with no configuration. It reaches a
> database on localhost and is not a secret.
>
> **Production and staging must supply `DATABASE_PASSWORD` explicitly**, and must never
> fall back to it. This is enforced, not merely documented:
> - the base configuration has **no credential fallback at all** — the local defaults
>   live in `application-local.yml`, active only when no profile is set;
> - `CredentialGuard` refuses to start when a non-local profile is active and the
>   development password is in use.
>
> No real credential belongs in `.env.example`, ever.

## Tests

```bash
cd backend  && JAVA_HOME=$(brew --prefix openjdk@25) ./mvnw test   # needs goodreads_test
cd frontend && npm run build      # typecheck + production build
cd frontend && npm test           # unit tests (open-redirect guard)
cd frontend && npm run test:e2e   # Playwright; needs the backend running
```

The E2E suite covers the whole authentication loop on desktop and mobile viewports:
sign up, refresh, log out, log in, wrong password, unknown account, demo entry,
`returnTo` handling including hostile targets, and keyboard-only completion.

Integration tests run against a real local PostgreSQL rather than Testcontainers,
because this machine has no container runtime — see
[docs/decisions/0005](docs/decisions/0005-no-testcontainers-no-docker.md).

## Migrations

Flyway runs automatically on backend startup. Migrations live in
`backend/src/main/resources/db/migration` and are verified to apply cleanly to an
empty database.

## Data ingest

The catalogue is built offline from Open Library (CC0) and written into our own
PostgreSQL. No external API is called while serving a user request.

```bash
cd backend
INGEST_CONTACT=you@example.com \
  JAVA_HOME=$(brew --prefix openjdk@25) \
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
```

The pipeline is resumable and idempotent — re-running updates rows rather than
duplicating them, and replays cached responses instead of re-fetching.

Full documentation, including the selection strategy, quality gates, rate limiting and
genre taxonomy: **[docs/INGEST.md](docs/INGEST.md)**.

## Deployment

The Next.js app deploys to Vercel from the `frontend` directory; the Spring API deploys
separately and is **not** on Vercel. Settings, environment variables and current status:
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Project layout

```
backend/     Spring Boot API — all business logic
  .../ingest/  Catalogue pipeline (a task, not a service)
frontend/    Next.js app — rendering and interaction only
docs/
  INGEST.md  How the catalogue is produced
  spike/     Book-data spike: scripts, raw datasets, measured findings
  decisions/ Architecture decision records
scripts/     Local development helpers
data/        Ingest artifacts and covers (gitignored, regenerable)
```
