# A better home for your reading life

An independent Goodreads redesign — a product and software-engineering case study.

**Not affiliated with Goodreads or Amazon.** No Goodreads data is used. The book
catalogue comes from [Open Library](https://openlibrary.org) (CC0).

> Goodreads doesn't need to become another social network.
> It needs to become the best digital home for your reading life.

## Status

**Phase 1 — Core Reading System.** Checkpoints A (foundation) and B (catalogue) complete.

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

## Environment variables

Copy `.env.example` to `.env`. Defaults work for local development; no secrets are
required until deployment. `.env` is gitignored.

## Tests

```bash
cd backend && JAVA_HOME=$(brew --prefix openjdk@25) ./mvnw test   # needs goodreads_test
cd frontend && npm run build                                      # typecheck + build
```

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

## Demo account

Not yet implemented — Checkpoint C.

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
