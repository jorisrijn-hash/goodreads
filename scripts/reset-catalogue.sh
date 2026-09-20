#!/usr/bin/env bash
#
# ============================================================================
#  DESTRUCTIVE — CATALOGUE DATA ONLY
# ============================================================================
#
#  Empties the catalogue so a subsequent ingest rebuilds it cleanly. Cached
#  ingest artifacts and downloaded covers are NOT touched, so the rebuild runs
#  from disk and takes seconds rather than hours.
#
#  IN SCOPE — these tables are emptied:
#      book, author, book_author, genre, book_genre
#
#  NEVER IN SCOPE — user-owned data:
#      app_user, library_item, progress_update, reading_event
#
#  This script must NOT become a generic database wipe. As later checkpoints add
#  users, sessions, library items, reading progress and journal data, those tables
#  stay out of scope. If a full reset is ever needed, write a separate, explicitly
#  named command for it — do not widen this one.
#
#  Guard: TRUNCATE ... CASCADE would silently propagate into library_item, which
#  references book with ON DELETE CASCADE. This script therefore never uses CASCADE.
#  Instead it discovers every table referencing the catalogue, proves each is empty,
#  and truncates them together. If any referencing table holds rows, it refuses.
#  A future table referencing book can therefore never be wiped by surprise: it either
#  is empty (truncating it is a no-op) or the script stops.
#
set -euo pipefail
export PATH="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}:$PATH"
DB="${1:-goodreads}"

CATALOGUE_TABLES="book_genre book_author book author genre"
USER_TABLES="app_user library_item progress_update reading_event"

exists() { psql -d "$DB" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$1'"; }
rows()   { psql -d "$DB" -tAc "SELECT count(*) FROM $1" 2>/dev/null || echo 0; }

echo "Target database : $DB"
echo
echo "Catalogue tables to be EMPTIED:"
for t in $CATALOGUE_TABLES; do
  [ -n "$(exists "$t")" ] && printf '  %-14s %s rows\n' "$t" "$(rows "$t")"
done

echo
echo "User-owned tables that will NOT be touched:"
blocked=0
for t in $USER_TABLES; do
  if [ -n "$(exists "$t")" ]; then
    n=$(rows "$t")
    printf '  %-18s %s rows\n' "$t" "$n"
    [ "$n" -gt 0 ] && blocked=1
  fi
done

if [ "$blocked" -eq 1 ]; then
  echo
  echo "REFUSING TO RUN: user-owned data is present."
  echo "Emptying the catalogue would cascade into it. Remove that data deliberately"
  echo "with a separate command first, or run this against a database without it."
  exit 1
fi

# PostgreSQL will not truncate a table that is referenced by a foreign key unless the
# referencing table is truncated in the same statement. Discover those tables rather
# than hardcoding them, so this keeps working as the schema grows.
# PostgreSQL will not truncate a table referenced by a foreign key unless the
# referencing table is truncated in the same statement. The dependency is transitive
# (progress_update -> library_item -> book), so walk the whole graph rather than
# hardcoding one level.
REFERENCING=$(psql -d "$DB" -tAc "
  WITH RECURSIVE fk AS (
    SELECT c.conrelid AS child, c.confrelid AS parent
    FROM pg_constraint c WHERE c.contype = 'f'
  ), seed AS (
    SELECT oid AS t FROM pg_class
    WHERE relname IN ('book','author','genre') AND relkind = 'r'
  ), dependents AS (
    SELECT fk.child FROM fk JOIN seed ON fk.parent = seed.t
    UNION
    SELECT fk.child FROM fk JOIN dependents d ON fk.parent = d.child
  )
  SELECT DISTINCT c.relname FROM dependents d JOIN pg_class c ON c.oid = d.child
  WHERE c.relname NOT IN ('book_genre','book_author','book','author','genre')
  ORDER BY 1")

if [ -n "$REFERENCING" ]; then
  echo
  echo "Tables referencing the catalogue (must be empty):"
  for t in $REFERENCING; do
    n=$(rows "$t")
    printf '  %-18s %s rows\n' "$t" "$n"
    if [ "$n" -gt 0 ]; then
      echo
      echo "REFUSING TO RUN: '$t' references the catalogue and is not empty."
      echo "Emptying the catalogue would require deleting its rows. Do that"
      echo "deliberately with a separate command first."
      exit 1
    fi
  done
fi

echo
read -r -p "Empty the catalogue tables listed above in '${DB}'? [y/N] " reply
[[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "aborted"; exit 1; }

# No CASCADE anywhere. Referencing tables are included only because each was just
# proven empty, so truncating them removes nothing.
TRUNCATE_LIST=$(echo "book_genre book_author book author genre $REFERENCING" | tr ' ' '\n' \
                 | grep -v '^$' | paste -sd, -)
psql -d "$DB" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
TRUNCATE ${TRUNCATE_LIST} RESTART IDENTITY;
COMMIT;
SQL

echo
echo "Catalogue emptied:"
for t in $CATALOGUE_TABLES; do
  [ -n "$(exists "$t")" ] && printf '  %-14s %s rows\n' "$t" "$(rows "$t")"
done
echo
echo "Re-run the ingest to rebuild from cached artifacts:"
echo "  cd backend && JAVA_HOME=\$(brew --prefix openjdk@25) \\"
echo "    ./mvnw spring-boot:run -Dspring-boot.run.profiles=local,ingest"
