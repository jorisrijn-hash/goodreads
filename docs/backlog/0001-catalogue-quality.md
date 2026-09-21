# 0001 — Catalogue quality pass

**Status:** open — deliberately deferred. Not part of the frontend visual overhaul.
**Found:** 2026-09-21, during the frontend design audit, by looking at what the
deterministic Discover rows actually put on screen.

## Problem

The ingest's quality gates admit records that are real Open Library works but are not
what a reader means by "a book" in a browsing context. Plain result lists tolerate them;
an editorial layout that makes covers the centrepiece puts them in the spotlight.

Measured in production (9,021 books):

| Kind | Count | Example |
|---|---:|---|
| Study guides | 21 | *SparkNotes for 1984*; *Haruki Murakami* by Mark Mussari |
| Omnibus / collected editions | 15 | *Works (Hitch Hiker's Guide to the Galaxy / …)*, *Novels (Pride and Prejudice / Sense and …)* |
| Titles with more than one edition | 39 titles, 83 rows | three separate *The Great Gatsby* records, one of them *The Great Gatsby / The Last Tycoon* |
| Language anomalies | not yet counted | *Et la joie de vivre* (French) tagged `eng`; *Never Let Me Go*, *Galatea* and *The Little Friend* stored as Spanish editions |
| Unusable covers | not yet counted | *The last tycoon*: a blank cloth binding; *Rites of the Starling*: a 3D product render |

Queries used for the counts:

```sql
-- study guides
SELECT count(*) FROM book WHERE title ~* '(sparknotes|cliffsnotes|cliff''s notes|study guide|summary of|summary &|analysis of|workbook)';
-- omnibus-style titles
SELECT count(*) FROM book WHERE title ~* '^(works|novels|collected works|the complete)\s*\(' OR title ~* 'box set|boxed set';
-- repeated title + author
SELECT count(*) FROM (SELECT 1 FROM book GROUP BY norm_text(title), author_names HAVING count(*) > 1) t;
```

## Rules for the fix

- **Fix it in the catalogue, not the UI.** The frontend must not quietly filter these
  records out of search or browse; the catalogue is the catalogue. Curated surfaces
  (the landing hero, Discover's "Selected" shelf) use an explicit list of real slugs
  instead, which is honest because it is labelled as a selection.
- Prefer ingest-time gates and a recorded reason per excluded record over deleting rows
  by hand, so the result stays reproducible from the cached artifacts.
- Duplicate editions need a canonical-edition rule (see ADR 0003, no edition entity):
  which record represents the work, and what happens to the others.
- Language: `language` currently trusts Open Library's tag. A detected-language check
  on title and description would catch the obvious cases.
- Covers: define "unusable" measurably (e.g. near-uniform colour, very low detail,
  non-cover aspect ratio) rather than by eye.
- Re-run `scripts/verify-catalogue.sh` and extend its integrity checks with each new
  rule, so a regression is visible.
