-- TESTS ONLY — do not run this in Supabase's SQL Editor (see run.sh).
\set ON_ERROR_STOP 1
\set QUIET 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'e@example.com');
insert into auth.sessions (id, user_id, created_at, refreshed_at, user_agent) values
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', now() - interval '3 days', now() - interval '1 hour', 'okhttp/4.12.0'),
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000d', now() - interval '1 day', null, 'okhttp/4.12.0'),
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', now(), null, null);

-- Profiles -----------------------------------------------------------------------------------------
set role anon;
select test.fails('select * from public.my_profile()', 'permission denied', 'anon has no profile');
select test.fails('select public.my_sessions()', 'permission denied', 'anon has no sessions');
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
select test.ok(not exists (select 1 from public.my_profile()), 'no profile until one is set');
select test.ok(public.set_profile_photo('00000000-0000-0000-0000-00000000000d/a0.jpg') is null, 'a first photo replaces none');
select test.ok((select full_name from public.my_profile()) = '', 'and the profile has no name yet');
select public.set_profile_name('  إبراهيم  ');
select test.ok((select full_name from public.my_profile()) = 'إبراهيم', 'a name, trimmed');
select test.ok((select avatar from public.my_profile()) = '00000000-0000-0000-0000-00000000000d/a0.jpg', 'a name leaves the photo as it is');
select test.ok(public.set_profile_photo('00000000-0000-0000-0000-00000000000d/a1b2c3.jpg') = '00000000-0000-0000-0000-00000000000d/a0.jpg',
  'a new photo returns the one it replaces');
select public.set_profile_name('إبراهيم صادق');
select test.ok((select avatar from public.my_profile()) = '00000000-0000-0000-0000-00000000000d/a1b2c3.jpg' and (select full_name from public.my_profile()) = 'إبراهيم صادق',
  'a photo in the user''s own folder, and the name beside it');
select test.fails('select public.set_profile_photo(''00000000-0000-0000-0000-00000000000e/a1b2c3.jpg'')', 'violates check constraint', 'not in someone else''s');
select test.fails('select public.set_profile_photo(''00000000-0000-0000-0000-00000000000d/../e.jpg'')', 'violates check constraint', 'nor anywhere else');
select test.fails('select public.set_profile_name(repeat(''ا'', 81))', 'violates check constraint', 'names have a limit');
select test.fails('update public.profiles set user_id = ''00000000-0000-0000-0000-00000000000e''', 'permission denied', 'a profile can''t change hands');

set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "session_id": "22222222-0000-0000-0000-000000000001"}';
select test.ok(not exists (select 1 from public.my_profile()), 'another user doesn''t see it');
select test.ok((select count(*) from public.profiles) = 0, 'not even in the table');

-- Photos -------------------------------------------------------------------------------------------
reset role;
select test.ok((select not public and file_size_limit = 524288 from storage.buckets where id = 'avatars'), 'the photos bucket is private and small');
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-00000000000d/a1b2c3.jpg');
select test.ok((select count(*) from storage.objects) = 1, 'a user puts a photo in their folder, and sees it');
select test.fails('insert into storage.objects (bucket_id, name) values (''avatars'', ''00000000-0000-0000-0000-00000000000e/x.jpg'')', 'row-level security', 'but not in another''s');
select test.fails('insert into storage.objects (bucket_id, name) values (''avatars'', ''x.jpg'')', 'row-level security', 'nor outside any folder');
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "session_id": "22222222-0000-0000-0000-000000000001"}';
select test.ok((select count(*) from storage.objects) = 0, 'another user can''t see the photo');
delete from storage.objects;
reset role;
select test.ok((select count(*) from storage.objects) = 1, 'or remove it');

-- Devices ------------------------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
select public.register_device('Samsung SM-A546E · Android 14', 'android');
select test.ok(jsonb_array_length(public.my_sessions()) = 2, 'the account''s two sessions');
select test.ok((select s ->> 'name' from jsonb_array_elements(public.my_sessions()) s where (s ->> 'current')::boolean) = 'Samsung SM-A546E · Android 14',
  'this one is marked, with the name it gave itself');
select test.ok((select s ->> 'refreshed_at' from jsonb_array_elements(public.my_sessions()) s where (s ->> 'current')::boolean) is not null, 'and when it was last active');
select test.ok((select count(*) from jsonb_array_elements(public.my_sessions()) s where s ->> 'name' is null) = 1, 'the other has no name yet');
select test.fails('select * from public.devices', 'permission denied', 'the devices table is reached only through the functions');
select test.fails('select public.register_device(''x'', ''toaster'')', 'violates check constraint', 'platforms are checked');

set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "session_id": "11111111-0000-0000-0000-000000000002"}';
select test.fails('select public.register_device(''intruder'', ''web'')', 'session_not_found', 'a device can''t be named in another account''s session');
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "session_id": "22222222-0000-0000-0000-000000000001"}';
select test.ok(not public.end_session('11111111-0000-0000-0000-000000000002'), 'nor can another account end it');
select test.ok(jsonb_array_length(public.my_sessions()) = 1, 'each account sees only its own sessions');

set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
select test.ok(public.end_session('11111111-0000-0000-0000-000000000002'), 'a user signs another of their devices out');
select test.ok(jsonb_array_length(public.my_sessions()) = 1, 'and it is gone');
reset role;
select test.ok(not exists (select 1 from auth.sessions where id = '11111111-0000-0000-0000-000000000002'), 'from the sign-in sessions too');

-- The device signed out still has an access token for a while: it can't use it on the others.
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000002"}';
select test.fails('select public.end_session(''11111111-0000-0000-0000-000000000001'')', 'session_not_found', 'a device signed out can''t sign the others out');
select test.fails('select public.my_sessions()', 'session_not_found', 'nor list them');
select test.fails('select public.register_device(''x'', ''web'')', 'session_not_found', 'nor name itself again');
reset role;
select test.ok(exists (select 1 from auth.sessions where id = '11111111-0000-0000-0000-000000000001'), 'the others stay signed in');
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d"}';
select test.fails('select public.my_sessions()', 'not_signed_in', 'a token without a session lists nothing');
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
reset role;

-- Deleting the account takes the profile and devices with it.
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "session_id": "11111111-0000-0000-0000-000000000001"}';
select public.delete_account();
reset role;
select test.ok(not exists (select 1 from public.profiles where user_id = '00000000-0000-0000-0000-00000000000d')
  and not exists (select 1 from public.devices where user_id = '00000000-0000-0000-0000-00000000000d'), 'deleting the account takes its profile and devices');

\echo 'profiles and devices: all tests passed'
