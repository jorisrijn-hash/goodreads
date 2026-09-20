# 0008 — Server-side sessions in PostgreSQL, with CSRF protection

**Status:** Accepted · 2026-09-21

## Context
Checkpoint A shipped with CSRF disabled and a note that it had to be reconsidered once
cookie sessions existed. They now do.

## Decisions

### Sessions, not JWTs
A server-side session identified by an opaque cookie. Not a JWT.

This is one first-party web application talking to one API. Statelessness buys nothing
here and costs instant revocation: a logout has to actually end the session, and with a
self-contained token it cannot until the token expires. The session is the authority and
lives in the database.

**Never in `localStorage`.** Any XSS becomes full account takeover, because JavaScript can
read it. The cookie is `HttpOnly`, so script cannot reach it at all.

### Stored in PostgreSQL (Spring Session JDBC)
In-memory sessions die with the process. The deployment target scales to zero, so every
cold start would sign every reader out. Spring Session JDBC fixes that using the database
we already run — **no Redis**, no new infrastructure. It also means a second instance
would work unchanged.

Flyway owns the schema (`V4__spring_session.sql`, copied verbatim from the Spring Session
jar); `initialize-schema: never` stops Spring creating its own.

### Cookie attributes, set explicitly
```
GRSESSION=…; Path=/; HttpOnly; SameSite=Lax   (Secure in production)
```

Declared through a `CookieSerializer` bean rather than `server.servlet.session.cookie.*`.
**Spring Session takes cookie handling over from the servlet container and ignores those
properties entirely.** Configuring them there looks correct and silently yields a cookie
named `SESSION` with no HttpOnly flag and no SameSite attribute — found by reading the
actual `Set-Cookie` header, not the configuration. A test now asserts the attributes so a
silent downgrade cannot recur.

`SameSite=Lax` still sends the cookie on top-level navigation, so following a link back
into the app keeps the reader signed in, while withholding it from cross-site form posts.

### CSRF: cookie-to-header, nothing exempt
`CookieCsrfTokenRepository` issues a JavaScript-readable `XSRF-TOKEN` cookie; the client
echoes it in `X-XSRF-TOKEN`. A cross-origin attacker can cause the cookie to be *sent* but
cannot *read* it, so they cannot produce the header.

The plain `CsrfTokenRequestAttributeHandler` is used rather than the XOR default, because
the client compares a cookie value it read itself.

**Login is protected too.** Exempting it is common and wrong: login-CSRF silently signs a
victim into an account the attacker controls, and everything the victim then does happens
in the attacker's account.

The token is **rotated on authentication**, as is the session id. Without rotation, a
token or session obtained before login stays valid against the authenticated session —
fixation, in both forms. Spring's form-login filter does this automatically; a
programmatic JSON login must ask for it. Rotation is done explicitly rather than through
`CsrfAuthenticationStrategy`, which clears the old token and defers writing the
replacement until something reads it, leaving a JSON client holding nothing.

### Passwords
Argon2id (memory-hard, current OWASP guidance), via Spring Security's encoder. It
requires BouncyCastle on the classpath — without it the encoder constructs fine and fails
only at the first `encode()`, so the dependency is explicit.

Policy is **length-based**: at least 10 characters, no composition rules. A memorable
passphrase beats eight characters mangled to satisfy a symbol requirement, and
composition rules mostly produce predictable substitutions.

### Account enumeration
A wrong password and an unknown account return byte-identical responses, asserted by a
test that compares them directly. `hideUserNotFoundExceptions` keeps the timing similar
too. Failures are logged without the submitted email, since a log that records which
addresses were tried reconstructs the same exposure.

## Consequences
- Sessions survive restarts and deploys.
- Logout is immediate and total.
- Every state-changing request needs a CSRF token, including the first login, so the
  frontend primes it with `GET /api/v1/csrf`.
- The frontend and API must be same-site in production (an `api.` subdomain) for
  `SameSite=Lax` to apply. In local development they are both on `localhost`.
