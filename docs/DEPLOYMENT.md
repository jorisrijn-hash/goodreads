# Deployment

```
Browser
  → Next.js frontend        (Vercel)
  → Spring Boot API         (separate host — not yet deployed)
  → PostgreSQL              (managed)
```

The Spring backend is **not** deployed on Vercel and never will be. Vercel builds and
serves the Next.js application only. Java does not move into Next.js route handlers;
Spring owns the business logic.

## Vercel project settings

The repository is a workspace with the Next.js app in a subdirectory:

```
/
  backend/     Spring Boot
  frontend/    Next.js   <- the Vercel application root
  docs/
  scripts/
```

| Setting | Value |
|---|---|
| **Root Directory** | **`frontend`** |
| Framework preset | Next.js (auto-detected once the root is correct) |
| Build command | Vercel default (`next build`) |
| Install command | Vercel default (`npm install`) |
| Output directory | Vercel default |
| Node version | 20 or later (developed on 24) |
| Production branch | `main` |

Everything except Root Directory is a Vercel default, deliberately. No `vercel.json`
is needed and none is committed.

> **Root Directory cannot be set from the repository.** It is a Vercel project setting,
> configurable only in the dashboard (Settings → Build & Deployment → Root Directory) or
> through the Vercel API. There is no `rootDirectory` key in `vercel.json`, so this one
> setting has to be changed in Vercel itself.

### Symptom when it is wrong

With Root Directory left at the repository root, Vercel finds no `package.json`, no
framework and no `index.html`. The build **succeeds** — there is nothing to fail — the
deployment reports **READY**, and every path returns Vercel's `404: NOT_FOUND`. A READY
deployment serving 404 on `/` is the signature of a wrong Root Directory, not of a
missing page.

## Environment variables

### Frontend (Vercel)

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Production: **yes** | Origin of the deployed Spring API, e.g. `https://api.example.com` |

Unset, it falls back to `http://localhost:8080` **in development only**. A production
build with it unset fails loudly rather than asking the visitor's own machine for an API.

`NEXT_PUBLIC_` variables are compiled into the browser bundle. The API's URL is not a
secret and belongs there; database credentials and backend-only secrets never do.

### Backend (its own host)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | No default outside local development |
| `DATABASE_USER` | yes | |
| `DATABASE_PASSWORD` | yes | Must be a real secret — see below |
| `SPRING_PROFILES_ACTIVE` | yes | e.g. `prod`. Anything other than `local`/`test` |
| `SESSION_COOKIE_SECURE` | yes | `true` — HTTPS everywhere in production |
| `FRONTEND_ORIGIN` | yes | The Vercel origin, for CORS |
| `PORT` | host-dependent | |

**The development database password never reaches production.** The base configuration
carries no credential fallback at all; the local defaults live in
`application-local.yml`, active only when no profile is set. A `CredentialGuard` bean
additionally refuses to start if a non-local profile is running with the documented
development password.

## Same-site requirement

The session cookie is `SameSite=Lax`, so the frontend and API must be **same-site** in
production — typically `example.com` and `api.example.com`. Different registrable
domains would require `SameSite=None`, which weakens CSRF defence and is not the design
here. Locally both are on `localhost`, which already satisfies this.

## Current status

The Spring API is **not deployed yet**. Until it is:

- `/`, `/login` and `/signup` render correctly on Vercel.
- Signing in, signing up and the demo account cannot work in production, because there
  is no API to reach. The UI reports this honestly rather than failing silently.
- `/home` redirects to `/login`, since no session can be established.

This is a real limitation and is stated here rather than disguised with a mock API.
