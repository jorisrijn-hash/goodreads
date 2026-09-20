# 0006 — Spring Boot 4 differences worth recording

**Status:** Accepted · 2026-09-20

## Context
Spring Boot 4.1 changes several things that older tutorials and generated code get
wrong. Each of these cost real debugging time and is recorded so it costs nothing next
time.

## Findings

**Spring Initializr writes a version that does not resolve.** It reports the Boot
version as `4.1.1.RELEASE`, which is an internal identifier. The Maven Central artifact
is `4.1.1`. The generated POM fails with `Non-resolvable parent POM` until corrected.

**Jackson 3.** Boot 4.1 ships Jackson **3.1.5**, which moved its package root from
`com.fasterxml.jackson` to `tools.jackson`. Only `jackson-annotations` remains at
2.x under the old root. Jackson 3 also makes its exceptions unchecked, so methods no
longer need to declare `JsonProcessingException`.

**Autoconfiguration packages moved.** `UserDetailsServiceAutoConfiguration` is now at
`org.springframework.boot.security.autoconfigure`, not
`org.springframework.boot.autoconfigure.security.servlet`.

**Starter names changed.** `spring-boot-starter-web` is now `spring-boot-starter-webmvc`,
and test support is split into per-starter artifacts
(`spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, …).

## Decisions
- Excluded `UserDetailsServiceAutoConfiguration` so Spring Security does not create a
  default in-memory user with a generated password.
- `SecurityConfig` is annotated `@ConditionalOnWebApplication(SERVLET)`. `HttpSecurity`
  does not exist in a non-web context, and the ingest task runs with
  `web-application-type: none`.
- The `PasswordEncoder` lives in its own configuration class, because password hashing
  is not web-specific.
- `dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()` is required. Spring
  dispatches errors as a separate internal request, so without it `anyRequest().denyAll()`
  intercepts the ERROR dispatch and every 404 reaches the client as 403 — which would
  make the error contract in the Phase 1 spec impossible to honour.
