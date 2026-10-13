#!/usr/bin/env bash
# Tests the migrations on a throwaway database of a local Postgres (not Supabase):
#   PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
db="quraani_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
run() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
run -f tests/supabase-stub.sql
for migration in migrations/*.sql; do run -f "$migration"; done
run -f tests/helpers.sql
for test in tests/*.test.sql; do run -o /dev/null -f "$test" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'; done
