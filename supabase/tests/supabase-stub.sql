-- The parts of a Supabase database the migration relies on, for testing it on a plain Postgres:
-- the API roles, `auth.users` and `auth.uid()` (read from the request's JWT claims, as Supabase
-- does). Default privileges are as generous as older Supabase projects', so the tests also show
-- that the migration's own revokes and grants are what limit access.

-- Roles belong to the whole server, so a second run finds them.
do $$ begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text
);

create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
grant execute on function auth.jwt() to anon, authenticated, service_role;

-- The sign-in sessions (refreshed_at has no time zone there).
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  refreshed_at timestamp,
  user_agent text,
  ip inet
);

-- Storage: buckets, objects (with row-level security, as on Supabase) and foldername().
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null, owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;
create function storage.foldername(name text) returns text[] language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant execute on function storage.foldername(text) to anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
