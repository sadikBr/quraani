-- TESTS ONLY — do not run this in Supabase's SQL Editor. The database setup is in
-- supabase/migrations/. These tests run with run.sh on a throwaway local Postgres; they add fake
-- users (helpers in helpers.sql).
\set ON_ERROR_STOP 1
\set QUIET 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com');

-- Anonymous callers reach nothing ------------------------------------------------------------------
set role anon;
select test.fails('select * from public.documents', 'permission denied', 'anon cannot read documents');
select test.fails('select public.document_revisions()', 'permission denied', 'anon cannot call document_revisions');
select test.fails('select public.put_document(''plans:v1'', ''{}'', 0)', 'permission denied', 'anon cannot put documents');
select test.fails('select * from public.halaqat', 'permission denied', 'anon cannot read halaqat');
select test.fails('select public.delete_account()', 'permission denied', 'anon cannot delete accounts');
reset role;

-- Documents ----------------------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select test.ok(public.put_document('plans:v1', '{"version": 1, "plans": []}', 0) = 1, 'a new document starts at revision 1');
select test.ok(public.put_document('plans:v1', '{"version": 1, "plans": [1]}', 0) is null, 'creating it again is refused');
select test.ok(public.put_document('plans:v1', '{"version": 1, "plans": [1]}', 1) = 2, 'a change on the current revision is kept');
select test.ok(public.put_document('plans:v1', '{"version": 1, "plans": [2]}', 1) is null, 'a change on an older revision is refused');
select test.ok(public.put_document('plans:v1', '{"version": 1, "plans": [1]}', 2) = 2, 'the same content keeps its revision');
select test.ok((select data from public.get_documents(array['plans:v1'])) = '{"version": 1, "plans": [1]}', 'the refused change did not land');
select test.ok(public.put_document('adhkar:v1', '{"a": 1}', 0) = 1, 'a second document');
select test.ok((select count(*) from public.document_revisions()) = 2, 'the user sees their two documents');
select test.fails('update public.documents set revision = 99', 'permission denied', 'revisions cannot be set directly');
select test.fails('update public.documents set user_id = ''00000000-0000-0000-0000-00000000000b''', 'permission denied', 'owners cannot be changed');
select test.fails('insert into public.documents (user_id, key, data) values (''00000000-0000-0000-0000-00000000000b'', ''x'', ''{}'')', 'permission denied', 'documents cannot be made for someone else');
select test.fails('select public.put_document(''Bad Key'', ''{}'', 0)', 'violates check constraint', 'keys are checked');

set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select test.ok((select count(*) from public.document_revisions()) = 0, 'another user sees none of them');
select test.ok((select count(*) from public.documents) = 0, 'not even by reading the table');
select test.ok(public.put_document('plans:v1', '{"mine": true}', 0) = 1, 'their own document of the same name is separate');
select test.ok(public.put_document('adhkar:v1', '{"x": 1}', 1) is null, 'and they cannot change the first user''s');

-- Halaqat ------------------------------------------------------------------------------------------
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';

select test.ok(public.push_halaqa('halaqa-family',
  '{"base": 0, "data": {"name": "حلقة العائلة", "riwayah": "warsh", "weekdays": [0, 3], "createdOn": "2026-10-01"}}',
  '[{"id": "student-me", "base": 0, "data": {"name": "إبراهيم"}}, {"id": "student-b", "base": 0, "data": {"name": "أحمد"}}]',
  '[{"date": "2026-10-11", "student": "student-me", "session": "session-1", "base": 0, "data": {"attendance": "present"}},
    {"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 0, "data": {"attendance": "absent"}}]')
  = '{"meta": 1, "students": {"student-b": 1, "student-me": 1}, "entries": {"2026-10-11|student-b": 1, "2026-10-11|student-me": 1}, "before": 0, "after": 5}',
  'a new halaqa with its participants and a day');
select test.ok((select role from public.halaqa_versions() where id = 'halaqa-family') = 'teacher', 'its creator teaches it');
select test.ok((select version from public.halaqa_versions() where id = 'halaqa-family') = 5, 'each record counts in its version');

select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-family', 0) -> 'entries') = 2, 'pulling from 0 gets every day');
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-family', 5) -> 'students') = 0, 'pulling from the latest version gets nothing');

select test.ok(public.push_halaqa('halaqa-family', null, '[]',
  '[{"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 1, "data": {"attendance": "late"}}]')
  = '{"meta": null, "students": {}, "entries": {"2026-10-11|student-b": 2}, "before": 5, "after": 6}', 'a changed day');
select test.ok((public.pull_halaqa('halaqa-family', 5) -> 'entries' -> 0 ->> 'student') = 'student-b'
  and jsonb_array_length(public.pull_halaqa('halaqa-family', 5) -> 'entries') = 1, 'pulling from 5 gets only that day');
select test.ok(public.push_halaqa('halaqa-family', null, '[]',
  '[{"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 1, "data": {"attendance": "present"}}]')
  -> 'entries' -> '2026-10-11|student-b' = 'null'::jsonb, 'a day changed on an older revision is refused');
select test.ok(public.push_halaqa('halaqa-family', null, '[]',
  '[{"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 2, "data": {"attendance": "late"}}]')
  = '{"meta": null, "students": {}, "entries": {"2026-10-11|student-b": 2}, "before": 6, "after": 6}', 'the same day again changes nothing');
select test.ok(public.push_halaqa('halaqa-family', '{"base": 0, "data": {"name": "x"}}',
  '[{"id": "student-me", "base": 0, "data": {"name": "إبراهيم"}}]',
  '[{"date": "2026-10-11", "student": "student-me", "session": "session-1", "base": 0, "data": {"attendance": "present"}}]')
  = '{"meta": null, "students": {"student-me": null}, "entries": {"2026-10-11|student-me": null}, "before": -1, "after": 6}',
  'sending a new halaqa again (a lost answer): nothing changes, not even its version');
select test.fails('select public.push_halaqa(''halaqa-family'', null, ''[]'', ''[{"date": "2026-10-12", "student": "student-nobody", "session": "session-2", "base": 0, "data": {}}]'')',
  'foreign key', 'a day needs its participant');
select test.fails('update public.halaqat set version = 1', 'permission denied', 'versions cannot be set directly');
select test.fails('update public.halaqa_entries set revision = 1', 'permission denied', 'record revisions cannot be set directly');
select test.fails('insert into public.halaqa_members (halaqa, user_id, role) values (''halaqa-family'', ''00000000-0000-0000-0000-00000000000b'', ''teacher'')',
  'permission denied', 'members cannot be added from the app');
select test.ok(public.push_halaqa('halaqa-family', null, '[{"id": "student-c", "base": 0, "data": {"name": "علي"}}]', '[]') -> 'students' ->> 'student-c' = '1',
  'a participant joins');
select test.ok(public.push_halaqa('halaqa-family', null, '[{"id": "student-c", "base": 1, "deleted": true}]', '[]') -> 'students' ->> 'student-c' = '2',
  'and is deleted without sending their data');
select test.ok((select data ->> 'name' from public.halaqa_students where id = 'student-c') = 'علي', 'what the account had stays with them');

-- Someone else
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select test.ok((select count(*) from public.halaqa_versions()) = 0, 'another user is in no halaqa');
select test.ok(public.pull_halaqa('halaqa-family', 0) is null, 'and cannot pull it');
select test.ok((select count(*) from public.halaqa_entries) = 0, 'or read its days');
select test.fails('select public.push_halaqa(''halaqa-family'', null, ''[]'', ''[{"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 2, "data": {}}]'')',
  'halaqa_not_found', 'or change it');
select test.fails('select public.push_halaqa(''halaqa-family'', null, ''[{"id": "student-x", "base": 0, "data": {}}]'', ''[]'')',
  'halaqa_not_found', 'or add to it');
select test.fails('select public.push_halaqa(''halaqa-family'', ''{"base": 0, "data": {"name": "mine"}}'', ''[]'', ''[]'')',
  'halaqa_taken', 'or take its id for a halaqa of their own');

-- A member (step 2), added as the database would
reset role;
insert into public.halaqa_members (halaqa, user_id, role, student) values ('halaqa-family', '00000000-0000-0000-0000-00000000000c', 'member', 'student-b');
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c"}';
select test.ok((select role from public.halaqa_versions()) = 'member', 'a member sees the halaqa');
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-family', 0) -> 'students') = 3, 'and its participants (deleted ones too)');
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-family', 0) -> 'entries') = 1
  and (public.pull_halaqa('halaqa-family', 0) -> 'entries' -> 0 ->> 'student') = 'student-b', 'but only their own days');
select test.ok((select count(*) from public.halaqa_members) = 1, 'and not the other members');
select test.fails('select public.push_halaqa(''halaqa-family'', null, ''[]'', ''[{"date": "2026-10-11", "student": "student-b", "session": "session-1", "base": 2, "data": {}}]'')',
  'halaqa_not_found', 'and cannot change them');

-- Deleting a halaqa
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select test.ok(public.push_halaqa('halaqa-family', '{"base": 1, "data": {"name": "حلقة العائلة"}, "deleted": true}', '[]', '[]') ->> 'meta' = '2', 'a halaqa is deleted');
select test.ok((select deleted from public.halaqa_versions() where id = 'halaqa-family'), 'other phones learn of it');
select test.fails('select public.push_halaqa(''halaqa-family'', null, ''[{"id": "student-z", "base": 0, "data": {}}]'', ''[]'')',
  'halaqa_deleted', 'a deleted halaqa takes no more changes');

-- Deleting the account
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';
select test.ok(public.push_halaqa('halaqa-b', '{"base": 0, "data": {"name": "حلقة"}}', '[]', '[]') ->> 'meta' = '1', 'another user''s halaqa');
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a"}';
select public.delete_account();
reset role;
select test.ok(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000a'), 'deleting the account removes the user');
select test.ok(not exists (select 1 from public.documents where user_id = '00000000-0000-0000-0000-00000000000a'), 'their documents');
select test.ok(not exists (select 1 from public.halaqat where owner = '00000000-0000-0000-0000-00000000000a')
  and not exists (select 1 from public.halaqa_entries where halaqa = 'halaqa-family'), 'their halaqat, with participants and days');
select test.ok((select count(*) from public.documents where user_id = '00000000-0000-0000-0000-00000000000b') = 1
  and exists (select 1 from public.halaqat where id = 'halaqa-b'), 'and nobody else''s');

\echo 'all tests passed'
