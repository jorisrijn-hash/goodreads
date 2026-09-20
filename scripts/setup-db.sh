#!/usr/bin/env bash
# Creates the local development and test databases.
# Idempotent: safe to re-run.
set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
export PATH="$PG_BIN:$PATH"

DB_USER="${DATABASE_USER:-goodreads}"
DB_PASS="${DATABASE_PASSWORD:-goodreads_dev}"

if ! pg_isready -q; then
  echo "PostgreSQL is not running. Start it with:"
  echo "  brew services start postgresql@17"
  exit 1
fi

psql -d postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SQL

for db in goodreads goodreads_test; do
  if psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    echo "  ${db}: already exists"
  else
    createdb -O "${DB_USER}" "${db}"
    echo "  ${db}: created"
  fi
  psql -d "${db}" -q -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
done

echo
echo "Databases ready. Flyway will create the schema on first backend start."
