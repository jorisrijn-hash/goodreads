# 0003: Editorial collections (deferred)

**Status:** approved as a future direction, deferred. Revisit after Book Detail, Library
and Checkpoint E.
**Recorded:** 2026-09-22, COS-inspired visual identity audit.

## Idea

Campaign-style collection pages built from real catalogue books: one large image, a
title, a short factual introduction, 4-8 books with one dominant cover. Not a
recommender and not personalised.

## What the catalogue supports today

- Deterministic collections from existing API filters: genre, page count, publication
  year (e.g. "Short books for an evening": under 200 pages within chosen genres).
- Hand-picked slug lists, labelled as a selection (the landing's "Selected" pattern).
- Not supported by data: nationality or subject collections ("Japanese fiction",
  "Books about design"). There is no author-nationality field, `language` is the
  edition's language, and there is no design genre. Those can only be explicit lists.

## Not to build until revisited

No collection route, no Discover entry point, no curated-slug infrastructure, no
campaign pages.
