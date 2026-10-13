-- Quraani: accounts and sync (step 1).
--
-- The phone keeps the main copy of everything and the account holds a mirror of it. Personal data
-- is kept as whole documents, one per dataset (goals, adhkar, practice, bookmarks, preferences).
-- Halaqat are kept as records (the halaqa, each participant, each participant's day) so that they
-- can be shared with their members later (step 2) and two people can record on the same day.
--
-- Every write gets a revision number from the database; the app sends the revision it based a
-- change on, and a change on top of an older revision is refused, so a phone that missed a change
-- can never silently overwrite it. Each halaqa also counts every change in it (`version`), so a
-- phone downloads only what changed since it last looked.
--
-- Access: row-level security on every table, column grants so that revisions and owners are set
-- only by the database, and the app goes through the functions at the end, which run as the
-- signed-in user so the same rules apply to them.
--
-- Run once in the Supabase SQL editor.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Documents ---------------------------------------------------------------------------------------

create table public.documents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9][a-z0-9:._-]{0,63}$'),
  data jsonb not null check (octet_length(data::text) <= 4194304),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create function private.stamp_document() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
  elsif new.data is distinct from old.data then
    new.revision := old.revision + 1;
  else
    return new;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger documents_stamp before insert or update on public.documents
  for each row execute function private.stamp_document();

alter table public.documents enable row level security;
create policy documents_owner on public.documents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Halaqat -----------------------------------------------------------------------------------------

create table public.halaqat (
  id text primary key check (id ~ '^halaqa-[a-z0-9-]{1,80}$'),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- name, riwayah, weekdays, time, reminder, createdOn
  data jsonb not null check (octet_length(data::text) <= 65536),
  revision bigint not null default 1,
  -- Counts every change in the halaqa: to it, its participants and their days.
  version bigint not null default 1,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Who may see a halaqa, and edit it. Step 1: only its creator, as teacher.
create table public.halaqa_members (
  halaqa text not null references public.halaqat (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('teacher', 'member')),
  -- The participant a member is (step 2).
  student text check (student ~ '^student-[a-z0-9-]{1,80}$'),
  joined_at timestamptz not null default now(),
  primary key (halaqa, user_id)
);
create index halaqa_members_user on public.halaqa_members (user_id);

create table public.halaqa_students (
  halaqa text not null references public.halaqat (id) on delete cascade,
  id text not null check (id ~ '^student-[a-z0-9-]{1,80}$'),
  data jsonb not null check (octet_length(data::text) <= 262144),
  revision bigint not null default 1,
  version bigint not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (halaqa, id)
);
create index halaqa_students_version on public.halaqa_students (halaqa, version);

-- One participant on one day: attendance, recitations, grades, next portions, note.
create table public.halaqa_entries (
  halaqa text not null,
  date date not null,
  student text not null,
  session text not null check (session ~ '^session-[a-z0-9-]{1,80}$'),
  data jsonb not null check (octet_length(data::text) <= 262144),
  revision bigint not null default 1,
  version bigint not null default 0,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (halaqa, date, student),
  foreign key (halaqa, student) references public.halaqa_students (halaqa, id) on delete cascade
);
create index halaqa_entries_version on public.halaqa_entries (halaqa, version);

-- The signed-in user's role in a halaqa, and the participant they are. Used by the policies; they
-- read the members table directly so its own policy doesn't apply to them.
create function private.halaqa_role(p_halaqa text) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.halaqa_members m where m.halaqa = p_halaqa and m.user_id = (select auth.uid())
$$;

create function private.halaqa_student(p_halaqa text) returns text
language sql stable security definer set search_path = '' as $$
  select m.student from public.halaqa_members m where m.halaqa = p_halaqa and m.user_id = (select auth.uid())
$$;

-- Whether a halaqa id is taken, by anyone (ids are made on phones).
create function private.halaqa_exists(p_halaqa text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.halaqat h where h.id = p_halaqa)
$$;

-- A halaqa's own changes count in its version; a deleted halaqa takes no more changes.
create function private.stamp_halaqa() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted then raise exception 'halaqa_deleted' using errcode = 'P0001'; end if;
    new.revision := 1;
    new.version := 1;
  else
    if old.deleted then raise exception 'halaqa_deleted' using errcode = 'P0001'; end if;
    if new.data is distinct from old.data or new.deleted is distinct from old.deleted then
      new.revision := old.revision + 1;
      new.version := old.version + 1;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger halaqat_stamp before insert or update on public.halaqat
  for each row execute function private.stamp_halaqa();

-- Its creator teaches it.
create function private.add_teacher() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.halaqa_members (halaqa, user_id, role) values (new.id, new.owner, 'teacher');
  return null;
end $$;

create trigger halaqat_teacher after insert on public.halaqat
  for each row execute function private.add_teacher();

-- A participant or a day: its own revision, and the halaqa's next version.
create function private.stamp_record() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['revision', 'version', 'updated_at']) = (to_jsonb(old) - array['revision', 'version', 'updated_at']) then
      return new;
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  update public.halaqat set version = version + 1 where id = new.halaqa returning version into new.version;
  new.updated_at := now();
  return new;
end $$;

create trigger halaqa_students_stamp before insert or update on public.halaqa_students
  for each row execute function private.stamp_record();
create trigger halaqa_entries_stamp before insert or update on public.halaqa_entries
  for each row execute function private.stamp_record();

alter table public.halaqat enable row level security;
alter table public.halaqa_members enable row level security;
alter table public.halaqa_students enable row level security;
alter table public.halaqa_entries enable row level security;

create policy halaqat_read on public.halaqat for select to authenticated
  using (owner = (select auth.uid()) or private.halaqa_role(id) is not null);
create policy halaqat_create on public.halaqat for insert to authenticated
  with check (owner = (select auth.uid()));
create policy halaqat_edit on public.halaqat for update to authenticated
  using (private.halaqa_role(id) = 'teacher') with check (private.halaqa_role(id) = 'teacher');

create policy halaqa_members_read on public.halaqa_members for select to authenticated
  using (user_id = (select auth.uid()) or private.halaqa_role(halaqa) = 'teacher');

create policy halaqa_students_read on public.halaqa_students for select to authenticated
  using (private.halaqa_role(halaqa) is not null);
create policy halaqa_students_create on public.halaqa_students for insert to authenticated
  with check (private.halaqa_role(halaqa) = 'teacher');
create policy halaqa_students_edit on public.halaqa_students for update to authenticated
  using (private.halaqa_role(halaqa) = 'teacher') with check (private.halaqa_role(halaqa) = 'teacher');

-- Teachers see every day; a member (step 2) sees only their own.
create policy halaqa_entries_read on public.halaqa_entries for select to authenticated
  using (private.halaqa_role(halaqa) = 'teacher' or student = private.halaqa_student(halaqa));
create policy halaqa_entries_create on public.halaqa_entries for insert to authenticated
  with check (private.halaqa_role(halaqa) = 'teacher');
create policy halaqa_entries_edit on public.halaqa_entries for update to authenticated
  using (private.halaqa_role(halaqa) = 'teacher') with check (private.halaqa_role(halaqa) = 'teacher');

-- Grants: only signed-in users, and only the columns they may set ------------------------------

revoke all on public.documents, public.halaqat, public.halaqa_members, public.halaqa_students, public.halaqa_entries
  from public, anon, authenticated;
grant select, insert (key, data), update (data) on public.documents to authenticated;
grant select, insert (id, data), update (data, deleted) on public.halaqat to authenticated;
grant select on public.halaqa_members to authenticated;
grant select, insert (halaqa, id, data, deleted), update (data, deleted) on public.halaqa_students to authenticated;
grant select, insert (halaqa, date, student, session, data, deleted), update (session, data, deleted)
  on public.halaqa_entries to authenticated;

-- What the app calls ------------------------------------------------------------------------------

-- The revision of each of the user's documents.
create function public.document_revisions() returns table (key text, revision bigint)
language sql stable security invoker set search_path = '' as $$
  select d.key, d.revision from public.documents d where d.user_id = (select auth.uid()) order by d.key
$$;

create function public.get_documents(p_keys text[]) returns table (key text, revision bigint, data jsonb)
language sql stable security invoker set search_path = '' as $$
  select d.key, d.revision, d.data from public.documents d
  where d.user_id = (select auth.uid()) and d.key = any (p_keys)
$$;

-- Keeps a document, on top of revision `p_base` (0: the account has none yet). Returns its new
-- revision, or null when the account's copy changed since `p_base`.
create function public.put_document(p_key text, p_data jsonb, p_base bigint) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  v_revision bigint;
begin
  if p_base = 0 then
    insert into public.documents (key, data) values (p_key, p_data)
    on conflict (user_id, key) do nothing
    returning revision into v_revision;
  else
    update public.documents set data = p_data
    where user_id = (select auth.uid()) and key = p_key and revision = p_base
    returning revision into v_revision;
  end if;
  return v_revision;
end $$;

-- The halaqat the user is in, with how far each has changed.
create function public.halaqa_versions()
returns table (id text, revision bigint, version bigint, deleted boolean, role text)
language sql stable security invoker set search_path = '' as $$
  select h.id, h.revision, h.version, h.deleted, m.role
  from public.halaqat h
  join public.halaqa_members m on m.halaqa = h.id and m.user_id = (select auth.uid())
  order by h.id
$$;

-- A halaqa, and its participants and days changed after version `p_since` (deleted ones too).
create function public.pull_halaqa(p_halaqa text, p_since bigint) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', h.id, 'revision', h.revision, 'version', h.version, 'deleted', h.deleted, 'data', h.data,
    'students', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'revision', s.revision, 'deleted', s.deleted, 'data', s.data) order by s.version)
      from public.halaqa_students s where s.halaqa = h.id and s.version > p_since), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('date', e.date, 'student', e.student, 'session', e.session, 'revision', e.revision,
        'deleted', e.deleted, 'data', e.data) order by e.version)
      from public.halaqa_entries e where e.halaqa = h.id and e.version > p_since), '[]'::jsonb))
  from public.halaqat h where h.id = p_halaqa
$$;

-- Keeps changes to a halaqa, each on top of the revision it was based on (0: new):
--   p_meta     null, or { base, data, deleted }
--   p_students [{ id, base, data, deleted }]
--   p_entries  [{ date, student, session, base, data, deleted }]
-- A deletion may leave out `data` (and `session`): what the account has stays with it.
-- Returns each one's new revision, or null when it changed since its base, and the halaqa's
-- version before and after (when `before` is the version the phone last downloaded, nobody else
-- changed the halaqa in between).
create function public.push_halaqa(p_halaqa text, p_meta jsonb, p_students jsonb, p_entries jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_before bigint;
  v_after bigint;
  v_revision bigint;
  v_meta bigint;
  v_students jsonb := '{}'::jsonb;
  v_entries jsonb := '{}'::jsonb;
  r jsonb;
begin
  if p_meta is not null and (p_meta ->> 'base')::bigint = 0 and not private.halaqa_exists(p_halaqa) then
    insert into public.halaqat (id, data) values (p_halaqa, p_meta -> 'data')
    on conflict (id) do nothing
    returning revision into v_meta;
    v_before := 0;
  elsif p_meta is not null and (p_meta ->> 'base')::bigint = 0 then
    -- Already there: a retry whose answer was lost (who else changed it since is unknown), or
    -- someone else's halaqa with the same id (the phone holds another account's data).
    if private.halaqa_role(p_halaqa) is distinct from 'teacher' then raise exception 'halaqa_taken' using errcode = 'P0001'; end if;
    perform 1 from public.halaqat h where h.id = p_halaqa for update;
    v_before := -1;
  else
    select h.version into v_before from public.halaqat h where h.id = p_halaqa for update;
    if v_before is null then raise exception 'halaqa_not_found' using errcode = 'P0001'; end if;
    if p_meta is not null then
      update public.halaqat set data = coalesce(p_meta -> 'data', data), deleted = coalesce((p_meta ->> 'deleted')::boolean, false)
      where id = p_halaqa and revision = (p_meta ->> 'base')::bigint
      returning revision into v_meta;
    end if;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_students, '[]'::jsonb)) loop
    v_revision := null;
    -- (Checked first: a skipped insert would still count in the halaqa's version.)
    if (r ->> 'base')::bigint = 0 then
      if exists (select 1 from public.halaqa_students s where s.halaqa = p_halaqa and s.id = r ->> 'id') then
        v_students := v_students || jsonb_build_object(r ->> 'id', null);
        continue;
      end if;
      insert into public.halaqa_students (halaqa, id, data, deleted)
      values (p_halaqa, r ->> 'id', r -> 'data', coalesce((r ->> 'deleted')::boolean, false))
      on conflict (halaqa, id) do nothing
      returning revision into v_revision;
    else
      update public.halaqa_students set data = coalesce(r -> 'data', data), deleted = coalesce((r ->> 'deleted')::boolean, false)
      where halaqa = p_halaqa and id = r ->> 'id' and revision = (r ->> 'base')::bigint
      returning revision into v_revision;
    end if;
    v_students := v_students || jsonb_build_object(r ->> 'id', v_revision);
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_revision := null;
    if (r ->> 'base')::bigint = 0 then
      if exists (select 1 from public.halaqa_entries e where e.halaqa = p_halaqa and e.date = (r ->> 'date')::date and e.student = r ->> 'student') then
        v_entries := v_entries || jsonb_build_object((r ->> 'date') || '|' || (r ->> 'student'), null);
        continue;
      end if;
      insert into public.halaqa_entries (halaqa, date, student, session, data, deleted)
      values (p_halaqa, (r ->> 'date')::date, r ->> 'student', r ->> 'session', r -> 'data', coalesce((r ->> 'deleted')::boolean, false))
      on conflict (halaqa, date, student) do nothing
      returning revision into v_revision;
    else
      update public.halaqa_entries set session = coalesce(r ->> 'session', session), data = coalesce(r -> 'data', data),
        deleted = coalesce((r ->> 'deleted')::boolean, false)
      where halaqa = p_halaqa and date = (r ->> 'date')::date and student = r ->> 'student' and revision = (r ->> 'base')::bigint
      returning revision into v_revision;
    end if;
    v_entries := v_entries || jsonb_build_object((r ->> 'date') || '|' || (r ->> 'student'), v_revision);
  end loop;

  select h.version into v_after from public.halaqat h where h.id = p_halaqa;
  return jsonb_build_object('meta', v_meta, 'students', v_students, 'entries', v_entries, 'before', v_before, 'after', v_after);
end $$;

-- Deletes the account and everything kept with it (required by Google Play). The phone keeps its
-- own copy of the data.
create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  delete from auth.users where id = (select auth.uid());
end $$;

revoke all on function private.halaqa_role(text), private.halaqa_student(text), private.halaqa_exists(text), private.stamp_document(),
  private.stamp_halaqa(), private.add_teacher(), private.stamp_record() from public, anon, authenticated;
grant execute on function private.halaqa_role(text), private.halaqa_student(text), private.halaqa_exists(text) to authenticated;

revoke all on function public.document_revisions(), public.get_documents(text[]), public.put_document(text, jsonb, bigint),
  public.halaqa_versions(), public.pull_halaqa(text, bigint), public.push_halaqa(text, jsonb, jsonb, jsonb),
  public.delete_account() from public, anon;
grant execute on function public.document_revisions(), public.get_documents(text[]), public.put_document(text, jsonb, bigint),
  public.halaqa_versions(), public.pull_halaqa(text, bigint), public.push_halaqa(text, jsonb, jsonb, jsonb),
  public.delete_account() to authenticated;
