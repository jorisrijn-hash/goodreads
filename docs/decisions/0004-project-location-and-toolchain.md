# 0004 — Project location, JDK, and local toolchain

**Status:** Accepted · 2026-09-20

## Context
The project was initially placed at `/Users/joris/dev/02:: personal/goodreads`.
The JVM splits `java.class.path` on `:`, so that path breaks every Java process:
compilation succeeds, execution fails with `ClassNotFoundException`. Reproduced by
probe — `java.class.path` resolved to three broken fragments.

## Decisions
- **Location:** `/Users/joris/dev/goodreads`. Sibling projects `portfolio` and
  `modus` already sit directly in `~/dev`, so this follows existing precedent and
  leaves the ten projects under `02:: personal` untouched.
- **Git:** own repository, matching `portfolio`, `ghost-ai` and `triage-v2`. The
  home directory is itself a git repo (145 tracked files) but mixing the case study
  with client work would prevent a clean public push.
- **JDK 25 LTS** (`brew install openjdk@25`), not the pre-installed JDK 26.
  Spring Initializr does not offer 26 as a target, and a non-LTS runtime that goes
  end-of-life in six months is a poor choice for a portfolio artefact.
- **PostgreSQL 17** via Homebrew. Chosen over 18 for hosting-provider compatibility.

## Note on Spring Initializr
Initializr reports its Boot version as `4.1.1.RELEASE`, which is an internal id.
The Maven Central artifact is `4.1.1`. The generated POM must be corrected or the
parent POM will not resolve.
