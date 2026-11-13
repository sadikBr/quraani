-- Quraani: a session is closed a week after its day. The app stops changing it then (halaqat/
-- model.ts, `sessionClosed`); this keeps the account's copy as it is too, whatever asks (an
-- earlier version of the app on another supervisor's phone, say), since the points and the
-- portions that follow were counted from it.
--
-- A day's entry older than that keeps its attendance, recitations, portions and note. It can
-- still be marked deleted with its participant (a participant deleted takes their days along,
-- and the phones expect that); deleting the session alone is refused. A change that is refused
-- is not an error: the row stays as it was and the phone is told its revision, so its sync goes
-- on. New entries are not held back.
--
-- The phone counts the week in its own calendar and the database in UTC, so a day more is left
-- before the account refuses.
--
-- Run once in the Supabase SQL Editor, after 20261014090000_joining_halaqat.sql.

create function private.keep_closed_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.date > current_date - 8 then return new; end if;
  if new.deleted and not old.deleted and exists (
    select 1 from public.halaqa_students s where s.halaqa = old.halaqa and s.id = old.student and s.deleted
  ) then
    return new;
  end if;
  -- As it was: the triggers after this one then see no change, and count none.
  return old;
end $$;

-- Before `halaqa_entries_stamp` (triggers of one kind run in the order of their names).
create trigger halaqa_entries_closed before update on public.halaqa_entries
  for each row execute function private.keep_closed_entry();

revoke all on function private.keep_closed_entry() from public, anon, authenticated;
