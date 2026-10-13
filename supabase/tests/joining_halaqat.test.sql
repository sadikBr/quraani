-- TESTS ONLY — do not run this in Supabase's SQL Editor (see run.sh).
\set ON_ERROR_STOP 1
\set QUIET 1

-- t: the owner, u: a co-teacher, m and n: members, x: someone else.
insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-00000000000a', 't@example.com'),
  ('f0000000-0000-0000-0000-00000000000b', 'u@example.com'),
  ('f0000000-0000-0000-0000-00000000000c', 'm@example.com'),
  ('f0000000-0000-0000-0000-00000000000d', 'n@example.com'),
  ('f0000000-0000-0000-0000-00000000000e', 'x@example.com');

set role authenticated;
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select public.set_profile_name('الشيخ عمر');
select public.push_halaqa('halaqa-joining',
  '{"base": 0, "data": {"name": "حلقة المسجد", "riwayah": "warsh", "weekdays": [0, 3], "createdOn": "2026-10-01"}}',
  '[{"id": "student-old", "base": 0, "data": {"name": "أحمد", "joinedOn": "2026-10-01", "direction": "backward", "known": []}}]',
  '[{"date": "2026-10-04", "student": "student-old", "session": "session-1", "base": 0,
     "data": {"attendance": "late", "recitations": [{"kind": "revision", "grade": "good", "portion": {}, "marks": []}]}}]');

-- Names, as the app reads them ---------------------------------------------------------------------
reset role;
select test.ok(private.participant_name(E'\u00a0 يوسف\u3000\n') = 'يوسف', 'every kind of space trimmed, as JavaScript trims');
select test.ok(private.participant_name(E'\u00a0\u2003') = '', 'nothing but spaces is no name');
select test.ok(private.participant_name(E'أحمد\nعلي') = 'أحمد علي', 'no control characters');
select test.ok(private.participant_name(repeat('😀', 40)) = repeat('😀', 30), 'at most 60 UTF-16 units (a character beyond them counts twice)');
select test.ok(private.participant_name(repeat('ا', 70)) = repeat('ا', 60), 'at most 60 letters');

-- Points ------------------------------------------------------------------------------------------
select test.ok(private.entry_points('{"attendance": "present", "recitations": [{"kind": "new", "grade": "excellent"}, {"kind": "revision", "grade": "good"}]}') = 10,
  'points: present 2, a new portion excellent 6, a revision good 2');
select test.ok(private.entry_points('{"attendance": "absent", "recitations": []}') = 0 and private.entry_points('{}') = 0, 'none for an absence, or nothing');
select test.ok(private.entry_points('{"attendance": "late", "recitations": [{"kind": "new", "grade": "repeat"}, {"kind": "revision", "grade": "fair"}]}') = 2,
  'late 1, a portion to repeat 0, a revision fair 1');

-- Codes -------------------------------------------------------------------------------------------
set role authenticated;
select public.halaqa_invite('halaqa-joining', 'member') ->> 'code' as open_code \gset
select test.ok(:'open_code' ~ '^[A-HJ-NP-Z2-9]{8}$', 'the halaqa''s code: eight letters and digits, none to confuse');
select test.ok(public.halaqa_invite('halaqa-joining', 'member') ->> 'code' = :'open_code', 'the same code until it is renewed');
select public.halaqa_invite('halaqa-joining', 'member', true) ->> 'code' as renewed \gset
select test.ok(:'renewed' <> :'open_code', 'renewed, it changes');
select test.fails('select public.halaqa_invite(''halaqa-joining'', ''student'')', 'invalid_kind', 'a code is for members or a co-teacher');

set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000e"}';
select test.fails('select public.halaqa_invite(''halaqa-joining'', ''member'')', 'not_teacher', 'someone else can''t make a code for it');
select test.ok(public.preview_halaqa_invite(:'open_code') is null, 'and the old code no longer opens it');

-- Joining with the halaqa's code -------------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000c"}';
select test.ok((public.preview_halaqa_invite(lower(substr(:'renewed', 1, 4)) || '-' || substr(:'renewed', 5)) ->> 'teacher') = 'الشيخ عمر',
  'a code typed in lower case, with a dash, opens the halaqa: who teaches it');
select test.ok((public.preview_halaqa_invite(:'renewed') ->> 'kind') = 'member' and (public.preview_halaqa_invite(:'renewed') -> 'data' ->> 'name') = 'حلقة المسجد'
  and public.preview_halaqa_invite(:'renewed') -> 'role' = 'null'::jsonb, 'its name, and that they are not in it yet');
select test.fails(format('select public.join_halaqa(%L, %L, current_date)', :'renewed', '   '), 'name_required', 'a new participant needs a name');
select test.fails(format('select public.join_halaqa(%L, E''\u00a0'', current_date)', :'renewed'), 'name_required', 'not a name of spaces of another kind');
select public.join_halaqa(:'renewed', '  يوسف  ', current_date) ->> 'student' as new_student \gset
select test.ok(:'new_student' ~ '^student-[a-z0-9]{16}$', 'they join as a new participant');
select test.ok((select role from public.halaqa_versions() where id = 'halaqa-joining') = 'member'
  and not (select owner from public.halaqa_versions() where id = 'halaqa-joining'), 'a member, not its owner');
select test.ok((public.join_halaqa(:'renewed', 'يوسف', current_date) ->> 'already')::boolean, 'joining again changes nothing');
select test.ok((select count(*) from public.halaqa_members where halaqa = 'halaqa-joining') = 1, 'and makes no second participant');

reset role;
select test.ok((select data from public.halaqa_students where id = :'new_student')
  = jsonb_build_object('name', 'يوسف', 'joinedOn', to_char(current_date, 'YYYY-MM-DD'), 'direction', 'backward', 'known', '[]'::jsonb),
  'their participant reads as the app''s own: a name, the day they joined, an order, nothing known yet');
set role authenticated;
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-joining', 3) -> 'students') = 1, 'the teacher''s phone gets the new participant');

-- A second member (linked to the participant from before, as the database would, to test the
-- points of someone with a history).
reset role;
insert into public.halaqa_members (halaqa, user_id, role, student) values ('halaqa-joining', 'f0000000-0000-0000-0000-00000000000d', 'member', 'student-old');
set role authenticated;
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';

-- The teacher records a day for the new member.
select public.push_halaqa('halaqa-joining', null, '[]', format('[{"date": "%s", "student": "%s", "session": "session-2", "base": 0,
  "data": {"attendance": "present", "recitations": [{"kind": "new", "grade": "excellent", "portion": {}, "marks": []}], "note": "أحسنت"}}]',
  to_char(current_date, 'YYYY-MM-DD'), :'new_student')::jsonb);

-- What a member sees -------------------------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000c"}';
select test.ok((select count(*) from public.halaqa_students) = 1 and (select id from public.halaqa_students) = :'new_student',
  'a member reads only their own participant record');
select test.ok((select count(*) from public.halaqa_entries) = 1, 'and only their own days');
select public.joined_halaqa('halaqa-joining', date_trunc('month', current_date)::date) as view \gset
select test.ok((:'view'::jsonb -> 'data' ->> 'name') = 'حلقة المسجد' and (:'view'::jsonb -> 'student' ->> 'id') = :'new_student', 'their halaqa, and their participant');
select test.ok(jsonb_array_length(:'view'::jsonb -> 'entries') = 1 and (:'view'::jsonb -> 'entries' -> 0 -> 'data' ->> 'note') = 'أحسنت', 'their days, with the note');
select test.ok((:'view'::jsonb -> 'teachers' -> 0 ->> 'name') = 'الشيخ عمر' and (:'view'::jsonb -> 'teachers' -> 0 ->> 'owner')::boolean, 'who teaches it');
select test.ok(jsonb_array_length(:'view'::jsonb -> 'roster') = 2, 'everyone in it');
select test.ok((select r from jsonb_array_elements(:'view'::jsonb -> 'roster') r where r ->> 'student' = :'new_student')
  @> jsonb_build_object('name', 'يوسف', 'me', true, 'total', 8, 'recent', 8), 'they see their points');
select test.ok((select r from jsonb_array_elements(:'view'::jsonb -> 'roster') r where r ->> 'student' = 'student-old')
  @> '{"name": "أحمد", "me": false, "total": 3}', 'and the others'' names and points');
select test.ok(not exists (select 1 from jsonb_array_elements(:'view'::jsonb -> 'roster') r where r ? 'data' or r ? 'known'),
  'but nothing else of theirs');
select test.ok((select r ->> 'recent' from jsonb_array_elements(public.joined_halaqa('halaqa-joining', current_date + 1) -> 'roster') r
  where r ->> 'student' = :'new_student')::int = 0, 'points since a day count only the days from it');
select test.fails('select public.halaqa_people(''halaqa-joining'')', 'not_teacher', 'a member doesn''t see who else is in it beyond names and photos');
select test.fails('select public.push_halaqa(''halaqa-joining'', null, ''[]'', ''[]'')', 'halaqa_not_found', 'nor changes anything');
select test.fails('select public.halaqa_invite(''halaqa-joining'', ''member'')', 'not_teacher', 'nor makes codes');

set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000e"}';
select test.fails('select public.joined_halaqa(''halaqa-joining'', current_date)', 'not_member', 'someone else sees nothing of it');
select test.fails('select public.halaqa_people(''halaqa-joining'')', 'not_teacher', 'nor who is in it');

-- Photos: those who share a halaqa see each other's ----------------------------------------------------
reset role;
insert into storage.buckets (id, name) values ('avatars', 'avatars') on conflict do nothing;
insert into storage.objects (bucket_id, name) values
  ('avatars', 'f0000000-0000-0000-0000-00000000000c/m.jpg'), ('avatars', 'f0000000-0000-0000-0000-00000000000e/x.jpg');
set role authenticated;
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000d"}';
select test.ok((select count(*) from storage.objects where name like 'f0000000-0000-0000-0000-00000000000c/%') = 1, 'a member sees another member''s photo');
select test.ok((select count(*) from storage.objects where name like 'f0000000-0000-0000-0000-00000000000e/%') = 0, 'not someone else''s');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000e"}';
select test.ok((select count(*) from storage.objects where name like 'f0000000-0000-0000-0000-00000000000c/%') = 0, 'nor they the member''s');

-- Co-teachers --------------------------------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select public.halaqa_invite('halaqa-joining', 'teacher') ->> 'code' as teacher_code \gset
select test.ok((public.halaqa_invite('halaqa-joining', 'teacher') ->> 'expires_at') is not null, 'a co-teacher''s code expires');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000b"}';
select test.ok((public.preview_halaqa_invite(:'teacher_code') ->> 'kind') = 'teacher', 'it says it is to teach');
select test.ok((public.join_halaqa(:'teacher_code', '', current_date) ->> 'role') = 'teacher', 'a co-teacher joins');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000e"}';
select test.ok(public.join_halaqa(:'teacher_code', 'x', current_date) is null, 'a co-teacher''s code works once');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000b"}';
select test.ok((select role from public.halaqa_versions() where id = 'halaqa-joining') = 'teacher'
  and not (select owner from public.halaqa_versions() where id = 'halaqa-joining'), 'to teach it, not to own it');
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-joining', 0) -> 'students') = 2, 'they see every participant');
select test.ok(jsonb_array_length(public.pull_halaqa('halaqa-joining', 0) -> 'entries') = 2, 'and every day');
select test.ok((public.push_halaqa('halaqa-joining', null, '[]', format('[{"date": "%s", "student": "student-old", "session": "session-2", "base": 0, "data": {"attendance": "present"}}]',
  to_char(current_date, 'YYYY-MM-DD'))::jsonb) -> 'entries' ->> (to_char(current_date, 'YYYY-MM-DD') || '|student-old')) = '1', 'they record sessions');
select test.ok((public.push_halaqa('halaqa-joining', format('{"base": %s, "data": {"name": "حلقة المسجد الكبير", "riwayah": "warsh", "weekdays": [0], "createdOn": "2026-10-01"}}',
  (select revision from public.halaqa_versions() where id = 'halaqa-joining'))::jsonb, '[]', '[]') ->> 'meta') is not null, 'and change its settings');
select test.fails(format('select public.push_halaqa(''halaqa-joining'', ''{"base": %s, "deleted": true}'', ''[]'', ''[]'')',
  (select revision from public.halaqa_versions() where id = 'halaqa-joining')), 'not_owner', 'but can''t delete it');
select test.fails('select public.halaqa_invite(''halaqa-joining'', ''teacher'')', 'not_owner', 'nor bring in another co-teacher');
select test.ok((public.halaqa_invite('halaqa-joining', 'member') ->> 'code') = :'renewed', 'they share the halaqa''s code');
select test.ok((select count(*) from jsonb_array_elements(public.halaqa_people('halaqa-joining')) p where p ->> 'user' is not null) = 4, 'and see who is in it');
select test.fails('select public.remove_halaqa_member(''halaqa-joining'', ''f0000000-0000-0000-0000-00000000000a'')', 'not_owner', 'but can''t take its owner out');

-- Members leave, or are taken out ----------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000d"}';
select public.leave_halaqa('halaqa-joining', current_date);
select test.ok(not exists (select 1 from public.halaqa_versions() where id = 'halaqa-joining'), 'a member leaves');
reset role;
select test.ok((select data ->> 'leftOn' from public.halaqa_students where id = 'student-old') = to_char(current_date, 'YYYY-MM-DD'),
  'their participant is marked as having left, their history kept');
set role authenticated;
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select test.fails('select public.leave_halaqa(''halaqa-joining'', current_date)', 'owner_cannot_leave', 'its owner can''t leave it');
select test.ok(public.remove_halaqa_member('halaqa-joining', 'f0000000-0000-0000-0000-00000000000b'), 'the owner takes a co-teacher out');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000b"}';
select test.ok(not exists (select 1 from public.halaqa_versions() where id = 'halaqa-joining'), 'who no longer sees it');

-- A participant deleted by the teacher takes their account out.
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select public.push_halaqa('halaqa-joining', null, format('[{"id": "%s", "base": 1, "deleted": true}]', :'new_student')::jsonb, '[]');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000c"}';
select test.ok(not exists (select 1 from public.halaqa_versions() where id = 'halaqa-joining'), 'a deleted participant''s account is out of the halaqa');

-- Guessing codes ------------------------------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000e"}';
select count(public.preview_halaqa_invite('ZZZZZZZ' || n)) from generate_series(2, 9) n;
select count(public.join_halaqa('YYYYYYY' || n, 'x', current_date)) from generate_series(2, 9) n;
select count(public.preview_halaqa_invite('WWWWWW' || n)) from generate_series(22, 23) n;
select test.fails(format('select public.preview_halaqa_invite(%L)', :'renewed'), 'too_many_attempts', 'after twenty codes not found in an hour, no more tries');

-- A deleted halaqa ------------------------------------------------------------------------------------
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000a"}';
select public.push_halaqa('halaqa-joining', format('{"base": %s, "deleted": true}', (select revision from public.halaqa_versions() where id = 'halaqa-joining'))::jsonb, '[]', '[]');
set request.jwt.claims = '{"sub": "f0000000-0000-0000-0000-00000000000d"}';
select test.fails(format('select public.join_halaqa(%L, %L, current_date)', :'renewed', 'n'), 'halaqa_deleted', 'a deleted halaqa takes no one in');
reset role;
-- (The other tests count the photos they put.)
delete from storage.objects where name like 'f0000000-%';

\echo 'joining halaqat: all tests passed'
