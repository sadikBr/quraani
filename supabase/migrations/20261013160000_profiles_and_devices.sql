-- Quraani: the account's profile (a name and a photo) and the devices signed in to it.
--
-- The profile is a row of its own (not the sign-in record's metadata) so that, once halaqat are
-- shared, their members can be allowed to see each other's names and photos. Photos are kept in
-- a private Storage bucket, each user's in a folder named by their id. The devices are the
-- account's sign-in sessions (auth.sessions), with the name each phone gave itself.
--
-- Run once in the Supabase SQL Editor, after 20261013120000_accounts_and_sync.sql.

-- Profiles ----------------------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  -- The photo's path in the `avatars` bucket: always in the user's own folder.
  avatar text check (avatar ~ '^[0-9a-f-]{36}/[a-z0-9-]{1,80}\.jpg$'),
  updated_at timestamptz not null default now(),
  check (avatar is null or split_part(avatar, '/', 1) = user_id::text)
);

create function private.stamp_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_stamp before insert or update on public.profiles
  for each row execute function private.stamp_profile();

alter table public.profiles enable row level security;
create policy profiles_own on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.profiles from public, anon, authenticated;
grant select, insert (full_name, avatar), update (full_name, avatar) on public.profiles to authenticated;

-- The user's profile (none until they set one).
create function public.my_profile() returns table (full_name text, avatar text)
language sql stable security invoker set search_path = '' as $$
  select p.full_name, p.avatar from public.profiles p where p.user_id = (select auth.uid())
$$;

-- The name and the photo change apart, so that a phone that hasn't read the profile yet (or
-- has an old copy) never writes back the other one.
create function public.set_profile_name(p_full_name text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.profiles (full_name) values (trim(p_full_name))
  on conflict (user_id) do update set full_name = excluded.full_name
$$;

-- Puts a photo in the profile (or none) and returns the one it replaces, whose file the app then
-- removes: the account's, whatever this phone last saw.
create function public.set_profile_photo(p_avatar text) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v_previous text;
begin
  select p.avatar into v_previous from public.profiles p where p.user_id = (select auth.uid()) for update;
  insert into public.profiles (avatar) values (p_avatar)
  on conflict (user_id) do update set avatar = excluded.avatar;
  return v_previous;
end $$;

-- Photos --------------------------------------------------------------------------------------

-- Private: a photo is shown through a signed link the app asks for. JPEGs only, 512 KB at most
-- (the app sends a 512 px square of a few tens of KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg'])
on conflict (id) do nothing;

create policy avatars_read_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_add_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_change_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_remove_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Devices -------------------------------------------------------------------------------------

-- The name each phone gave itself when it signed in, by sign-in session. Reached only through the
-- functions below.
create table public.devices (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now()
);
create index devices_user on public.devices (user_id);
alter table public.devices enable row level security;
revoke all on public.devices from public, anon, authenticated;

-- The session the request was made with.
create function private.current_session() returns uuid
language sql stable set search_path = '' as $$
  select nullif((select auth.jwt()) ->> 'session_id', '')::uuid
$$;

-- The user, when the session the request was made with is still theirs: an access token
-- outlives a session signed out from another device by up to an hour, and such a device must not
-- see or sign out the others in that time.
create function private.signed_in_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_session uuid := private.current_session();
begin
  if v_user is null or v_session is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if not exists (select 1 from auth.sessions s where s.id = v_session and s.user_id = v_user) then
    raise exception 'session_not_found' using errcode = 'P0001';
  end if;
  return v_user;
end $$;

-- Names this phone's session; forgets the names of sessions that have ended.
create function public.register_device(p_name text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.signed_in_user();
  v_session uuid := private.current_session();
begin
  insert into public.devices (session_id, user_id, name, platform)
  values (v_session, v_user, left(trim(p_name), 80), p_platform)
  on conflict (session_id) do update set name = excluded.name, platform = excluded.platform
    where public.devices.user_id = v_user;
  delete from public.devices d
  where d.user_id = v_user and not exists (select 1 from auth.sessions s where s.id = d.session_id);
end $$;

-- The account's sign-in sessions, newest first, with their device names and which is this one.
-- Read through to_jsonb so that columns the auth schema adds or drops over time don't break it.
create function public.my_sessions() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := private.signed_in_user();
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'created_at', j ->> 'created_at',
      'refreshed_at', j ->> 'refreshed_at',
      'updated_at', j ->> 'updated_at',
      'user_agent', j ->> 'user_agent',
      'name', d.name,
      'platform', d.platform,
      'current', s.id = private.current_session())
    order by s.created_at desc), '[]'::jsonb)
  from auth.sessions s
  cross join lateral to_jsonb(s) j
  left join public.devices d on d.session_id = s.id
  where s.user_id = v_user);
end $$;

-- Signs one of the account's sessions out (it can't refresh its access any more).
create function public.end_session(p_session uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.signed_in_user();
  v_ended boolean;
begin
  delete from auth.sessions s where s.id = p_session and s.user_id = v_user;
  v_ended := found;
  delete from public.devices d where d.session_id = p_session and d.user_id = v_user;
  return v_ended;
end $$;

revoke all on function private.stamp_profile(), private.current_session(), private.signed_in_user() from public, anon, authenticated;
grant execute on function private.current_session(), private.signed_in_user() to authenticated;

revoke all on function public.my_profile(), public.set_profile_name(text), public.set_profile_photo(text),
  public.register_device(text, text), public.my_sessions(), public.end_session(uuid) from public, anon;
grant execute on function public.my_profile(), public.set_profile_name(text), public.set_profile_photo(text),
  public.register_device(text, text), public.my_sessions(), public.end_session(uuid) to authenticated;
