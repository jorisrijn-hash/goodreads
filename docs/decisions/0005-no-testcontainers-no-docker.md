# 0005 — Integration tests run against a local PostgreSQL, not Testcontainers

**Status:** Accepted · 2026-09-20 · Supersedes the plan's Testcontainers choice

## Context
The planning document specified Testcontainers for integration tests. Testcontainers
requires a container runtime. This machine has no Docker, Colima or Podman.

## Decision
Integration tests run against a real local PostgreSQL database (`goodreads_test`),
provisioned by the documented setup script and migrated by Flyway.

## Consequences
- Tests still exercise real PostgreSQL, so `pg_trgm`, generated columns and
  constraints are genuinely covered — which was the point of Testcontainers.
- Tests require a running local PostgreSQL. This is documented in the README.
- CI will need a PostgreSQL service container. GitHub Actions provides this natively.
- If Docker is installed later, switching to Testcontainers is a contained change:
  only the test datasource configuration moves.
