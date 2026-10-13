-- TESTS ONLY: assertions for the SQL tests (run.sh loads this first).
\set ON_ERROR_STOP 1

create schema test;
grant usage on schema test to anon, authenticated;

create function test.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Runs a statement that must fail, with an error whose message contains `expected`.
create function test.fails(statement text, expected text, label text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) = 0 then raise exception 'FAILED: % (wrong error: %)', label, sqlerrm; end if;
    raise notice 'ok - %', label;
    return;
  end;
  raise exception 'FAILED: % (no error)', label;
end $$;
grant execute on all functions in schema test to anon, authenticated;

