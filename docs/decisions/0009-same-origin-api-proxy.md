# 0009 — The API is proxied so it is same-origin with the frontend

**Status:** Accepted · 2026-09-21 · Verified end to end through the proxy

## Context
The frontend is on Vercel. The Spring API will be on a different host (Railway, Fly or
similar). Left alone, that makes every authenticated request **cross-site**, and the
session design from [ADR 0008](0008-session-and-csrf.md) assumes it is not.

A cookie with `SameSite=Lax` is simply not sent on a cross-site XHR. Reaching for
`SameSite=None` to force it turns the session into a third-party cookie — which Safari
blocks outright, Chrome restricts, and which weakens the CSRF defence that `Lax` was
providing. Pointing `NEXT_PUBLIC_API_URL` at a different domain and hoping is how
authentication works locally and fails in production.

## Decision
The browser never addresses the API host. It calls `/api/v1/…` and `/covers/…` on the
frontend's own origin, and Next.js rewrites those to the API:

```
browser ──► goodreads-rose.vercel.app/api/v1/*  ──rewrite──► Spring
```

Consequences that matter:

- The session cookie is **first-party**. No `SameSite=None`, no third-party cookie.
- The CSRF cookie is readable by our own JavaScript, because it is our own origin.
- There is **no CORS preflight** on credentialed requests at all.
- No API hostname is exposed to the browser.

Server Components bypass the proxy and call `API_ORIGIN` directly — a server calling its
own public URL would loop back through the edge for nothing.

## This is not a second backend
The rewrite forwards bytes. It does not authenticate, authorise, validate or decide
anything, and there is no request handler behind it. Spring remains the backend and owns
all domain logic, exactly as `ARCHITECTURE.md` requires. The alternative — a Next.js
route handler per endpoint — *would* have been a second backend, and was rejected.

## Local development uses the same path
`API_ORIGIN` defaults to `http://localhost:8080`, so development goes through the proxy
too. What is tested is what ships; there is no production-only routing mode that is never
exercised.

## Verified
Through the proxy, against the real backend:

| Check | Result |
|---|---|
| `GET /api/v1/csrf` | 204, token issued |
| Cookie host | the **frontend** origin, `HttpOnly` |
| Signup | 201, session established |
| `GET /api/v1/me` | 200 |
| Library `PUT` | 201, and the row is readable back |
| Same `PUT` without the CSRF header | **403** |
| Logout, then `GET /api/v1/me` | 204, then **401** |
| Covers | 200, 47 KB |

## Covers
`COVERS_ORIGIN` is separate from `API_ORIGIN` and defaults to it. Moving cover bytes to
object storage or a CDN is one environment variable: the public path stays
`/covers/<shard>/<id>-<width>.jpg`, so no application code, no stored key and no rendered
URL changes.

## Alternative considered
Same-site custom domains (`app.example.com` + `api.example.com`) would also keep cookies
first-party and is a good choice once a custom domain exists. It needs DNS, a domain, and
correct CORS — the proxy needs none of those and works on the default Vercel hostname.
Nothing here forecloses moving to it later.

## Consequences
- Every browser API call takes one extra network hop through Vercel's edge.
- Vercel's rewrite timeout applies; a slow backend surfaces as a gateway error.
- `CORS` config remains in Spring as a narrow allowlist for direct access, never `*`
  with credentials.
