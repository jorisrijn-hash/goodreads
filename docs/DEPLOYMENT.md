# Deployment

```
Browser
  → Next.js frontend            (Vercel)
  → /api/v1/* rewritten to →    Spring Boot API   (Railway / Fly / Render)
  → PostgreSQL                  (managed, with pg_trgm + unaccent)
```

The browser never addresses the API host. It calls `/api/v1/…` and `/covers/…` on the
frontend's own origin and Vercel forwards them, which keeps the session cookie
first-party. See [ADR 0009](decisions/0009-same-origin-api-proxy.md) for why, and what
breaks without it.

Spring is **not** deployed on Vercel and never will be. Java does not move into Next.js
route handlers; Spring owns the business logic.

---

## 1. Frontend (Vercel)

| Setting | Value |
|---|---|
| **Root Directory** | **`frontend`** |
| Framework | Next.js (auto-detected) |
| Build / install / output | Vercel defaults |
| Production branch | `main` |

> **Root Directory cannot be set from the repository.** It is a Vercel project setting
> (Settings → Build & Deployment). With it left at the repository root, Vercel finds no
> framework, the build *succeeds*, the deployment reports READY, and every path returns
> `404: NOT_FOUND`. A READY deployment 404ing on `/` is the signature of a wrong root.

### Environment variables

| Variable | Required | Value |
|---|---|---|
| `API_ORIGIN` | **yes** | The Spring API's origin, e.g. `https://reading-api.up.railway.app` |
| `COVERS_ORIGIN` | no | Defaults to `API_ORIGIN`. Point at a CDN if covers move to object storage |

**Both are server-only.** Neither is `NEXT_PUBLIC_`, deliberately: a `NEXT_PUBLIC_`
variable is compiled into the browser bundle, and exposing the API host there is what
makes the session cookie third-party. Nothing about the backend — credentials, storage
keys, internal hostnames — may ever be `NEXT_PUBLIC_`.

---

## 2. PostgreSQL — Supabase

Supabase is used as **PostgreSQL only**. No Supabase Auth, no Supabase client SDK, no
`NEXT_PUBLIC_SUPABASE_*` variable anywhere. Spring owns every database access and
Flyway remains the schema authority.

### Mapping the Supabase connection onto our variables

Take the **Session pooler** JDBC string from
*Project Settings → Database → Connection string → JDBC*. It looks like:

```
jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres
   user=postgres.<project-ref>   password=<your password>
```

| Our variable | Value from Supabase |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DATABASE_USER` | `postgres.<project-ref>` — the project ref belongs in the **username**, after the dot |
| `DATABASE_PASSWORD` | The database password (not the `anon` or `service_role` key — those are Supabase API keys and are unrelated) |

Three details that matter:

- **Port 5432, session mode.** Not 6543. Flyway takes a session-level advisory lock to
  serialise migrations, and transaction-mode pooling does not preserve session state, so
  migrations fail or corrupt under it. Session mode is also IPv4-reachable, which Render
  needs.
- **`?sslmode=require`.** The Postgres JDBC driver defaults to `prefer`, which will
  silently fall back to an unencrypted connection. Append it explicitly.
- **The username carries the project ref.** `postgres.<project-ref>`, not `postgres`.
  That is how the pooler routes to your project, and a bare `postgres` fails to
  authenticate.

### Do not enable pg_trgm or unaccent in the Supabase dashboard

Let Flyway create them (migration `V2`). Enabling them through the dashboard installs
them into an `extensions` schema, while `norm_text()` resolves `public.unaccent`. The
result is a migration failure reading:

```
ERROR: function public.unaccent(unknown, text) does not exist
```

If that happens, fix it once and re-deploy:

```sql
DROP EXTENSION IF EXISTS unaccent CASCADE;
DROP EXTENSION IF EXISTS pg_trgm  CASCADE;
-- then redeploy; V2 recreates both in public
```

Both are *trusted* extensions, so `V2` creates them as the ordinary application user —
no superuser required.

Migration `V7` then asserts the whole search layer actually works: both extensions
present, the unaccent dictionary in the schema `norm_text()` expects, `norm_text('L’Étranger')`
actually returning `l'etranger`, the similarity operator reachable, and all three search
indexes built. A deployment with a broken search layer stops at migration with a readable
message rather than starting up and returning empty results forever.

### Connection pool

`DB_POOL_SIZE` defaults to 10, which suits one small instance behind a pooler. Supabase's
free tier allows a limited number of pooled connections; if the ingest runs against
production while the API is live, both are drawing from that budget.

**Do not copy the local database.** Flyway builds the schema from scratch on first
startup and the ingest builds the catalogue. There is no manual schema step and no dump.

---

## 3. Spring API

A `Dockerfile` is in `backend/`. It builds with JDK 25, runs on a JRE as a non-root user,
and sizes the heap from the container limit rather than a fixed `-Xmx`.

```bash
# Railway, from the repository root
railway up --service reading-api   # root directory: backend
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **yes** | Supabase session-pooler JDBC URL **with `?sslmode=require`** |
| `DATABASE_USER` | **yes** | `postgres.<project-ref>` |
| `DATABASE_PASSWORD` | **yes** | The Supabase database password |
| `DB_POOL_SIZE` | no | Defaults to 10 |
| `SPRING_PROFILES_ACTIVE` | **yes** | `prod` — anything other than `local`/`test` |
| `SESSION_COOKIE_SECURE` | **yes** | `true` |
| `FRONTEND_ORIGIN` | **yes** | The Vercel origin |
| `COVER_DIR` | **yes** | `/app/data/covers`, on a persistent volume |
| `PORT` | platform | Railway and Fly set this |

There is **no credential fallback outside local development.** The base configuration
carries no database defaults at all; they live in the `local` profile, which is only
active when no profile is set. `CredentialGuard` additionally refuses to start when a
non-local profile has an insecure session cookie, a missing or localhost frontend origin,
or the documented development password.

That is deliberate: a deployment that forgets a variable should stop, not quietly come up
using a password published in `.env.example`.

---

## 4. Cover storage

27,330 files, about 709 MB — three derivatives for each of 9,021 books.

**A platform's application filesystem is ephemeral.** Without a persistent volume every
deploy silently deletes the covers and every cover 404s, while the application otherwise
looks healthy. Mount a volume at `COVER_DIR`.

Two supported options:

1. **Persistent volume** (simplest). Mount at `/app/data/covers`, set
   `COVER_DIR=/app/data/covers`, and run the ingest once (below) to populate it.
2. **Object storage / CDN.** Upload the `<shard>/<id>-<width>.jpg` tree preserving its
   paths, then set `COVERS_ORIGIN` on the frontend to the bucket's public origin. No
   application change: the public path is identical either way.

---

## 5. Populating the production catalogue

Use the existing ingest — never a database dump, never a hand-written row.

```bash
cd backend
DATABASE_URL=jdbc:postgresql://<prod-host>:5432/<db> \
DATABASE_USER=<user> DATABASE_PASSWORD=<secret> \
COVER_DIR=/path/to/cover/volume \
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
```

Notes:

- `ingest` is a **task** profile, not an environment, so `CredentialGuard` does not treat
  it as production. Run it as `prod,ingest` against a real deployment and the guard still
  applies.
- Run it **from a machine that already has `backend/data/ingest/`** and it replays from
  cache: about a minute, no network. Run it anywhere else and it re-harvests from Open
  Library at 3 req/s — roughly 1–2 hours, but entirely reproducible.
- It is idempotent. Re-running updates rows rather than duplicating them.

Expected afterwards: **9,021 books, 7,984 authors, 25 genres**. Verify against the
production database:

```bash
PGPASSWORD='<password>' psql \
  "host=aws-0-<region>.pooler.supabase.com port=5432 dbname=postgres \
   user=postgres.<project-ref> sslmode=require" \
  -c "SELECT (SELECT count(*) FROM book)    AS books,
             (SELECT count(*) FROM author)  AS authors,
             (SELECT count(*) FROM genre)   AS genres;"
```

`./scripts/verify-catalogue.sh` runs the full battery — coverage, distributions, demo
books, the search tests and the integrity checks — against a local `psql` connection.

---

## 6. Same-site requirement

With the proxy there is nothing to configure: the session cookie is first-party because
the browser only ever sees the frontend origin. If the proxy is ever removed in favour of
`app.example.com` + `api.example.com`, both must be the same registrable domain, and
`FRONTEND_ORIGIN` must list the exact frontend origin. Never `Access-Control-Allow-Origin: *`
with credentials.

---

## 7. Observability

`/actuator/health` is the only exposed endpoint, and it returns `UP`/`DOWN` with no
component detail — no database URLs, no disk paths. `env`, `configprops`, `beans`,
`mappings`, `heapdump` and `loggers` all return 401. Use `/actuator/health/readiness` and
`/actuator/health/liveness` for platform probes.

---

## Current status

The Spring API is **not deployed yet**, so production serves the frontend only:

- `/`, `/login`, `/signup` render correctly. The landing hero falls back to its blank
  paper composition, because there are no covers to show.
- `/discover` renders its "catalogue is unavailable" state.
- Signing in cannot work — there is no API to reach.

Stated here rather than disguised with a mock API. Everything above has been verified
locally through the same proxy path production will use.
