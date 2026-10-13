-- Quraani: joining a halaqa. Its teacher shares a code; whoever enters it joins from their own
-- phone, as a new participant, or as a co-teacher with a code of their own. A member sees the halaqa, its teachers, the other participants' names and photos,
-- their own days (attendance, grades, portions, notes) and everyone's points; never another
-- participant's days.
--
-- Roles: the owner (halaqat.owner, a 'teacher' in halaqa_members), co-teachers ('teacher') and
-- members ('member', each linked to their participant). Teachers record sessions and change the
-- halaqa; only its owner deletes it or removes a co-teacher.
--
-- Run once in the Supabase SQL Editor, after 20261013160000_profiles_and_devices.sql.

-- Members see only their own participant record --------------------------------------------------

drop policy halaqa_students_read on public.halaqa_students;
create policy halaqa_students_read on public.halaqa_students for select to authenticated
  using (private.halaqa_role(halaqa) = 'teacher' or id = private.halaqa_student(halaqa));

-- One account per participant.
create unique index halaqa_members_student on public.halaqa_members (halaqa, student) where student is not null;

-- Only the owner deletes a halaqa.
create function private.owner_deletes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.deleted and not old.deleted and old.owner is distinct from (select auth.uid()) then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger halaqat_owner_deletes before update on public.halaqat
  for each row execute function private.owner_deletes();

-- Invites -------------------------------------------------------------------------------------------

-- A code to join a halaqa: its own (any number of members, until a teacher renews it), or a
-- co-teacher's (once, within a week). One of each per halaqa. Reached only through the functions
-- below.
create table public.halaqa_invites (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  halaqa text not null references public.halaqat (id) on delete cascade,
  role text not null check (role in ('teacher', 'member')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (halaqa, role)
);
alter table public.halaqa_invites enable row level security;
revoke all on public.halaqa_invites from public, anon, authenticated;

-- Codes tried and not found, to slow down guessing (a code is one of 32^8).
create table private.join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index join_attempts_user on private.join_attempts (user_id, at);
revoke all on private.join_attempts from public, anon, authenticated;

-- A new code: eight of 32 letters and digits (no I, O, 0 or 1), from the random bytes of a uuid.
create function private.new_invite_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := uuid_send(gen_random_uuid());
  v_code text := '';
  i int;
begin
  -- The bytes a version-4 uuid keeps fully random.
  foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
    v_code := v_code || substr(v_alphabet, get_byte(v_bytes, i) % 32 + 1, 1);
  end loop;
  return v_code;
end $$;

-- A code as typed: upper case, without spaces or dashes.
create function private.normal_code(p_code text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- The signed-in user, when they haven't tried too many codes that don't exist lately.
create function private.joining_user() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  delete from private.join_attempts a where a.user_id = v_user and a.at < now() - interval '1 day';
  if (select count(*) from private.join_attempts a where a.user_id = v_user and a.at > now() - interval '1 hour') >= 20 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  return v_user;
end $$;

-- The invite a code opens, if it is still good; a code not found counts as an attempt.
create function private.invite_for(p_code text, p_user uuid) returns public.halaqa_invites
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.halaqa_invites;
begin
  select * into v_invite from public.halaqa_invites i
  where i.code = private.normal_code(p_code) and (i.expires_at is null or i.expires_at > now());
  if v_invite.code is null then insert into private.join_attempts (user_id) values (p_user); end if;
  return v_invite;
end $$;

-- A participant's name as the app reads one (halaqat/model.ts, `isName`): without control
-- characters, trimmed of all whitespace (as JavaScript trims it), and 60 UTF-16 units at most
-- (a character beyond the first 65536 counts twice). Empty when nothing is left.
create function private.participant_name(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_space constant text := '[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]';
  v_name text := regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', ' ', 'g');
begin
  v_name := regexp_replace(v_name, '^' || v_space || '+|' || v_space || '+$', '', 'g');
  while char_length(v_name) + (select count(*) from regexp_matches(v_name, '[^\u0001-\uffff]', 'g')) > 60 loop
    v_name := regexp_replace(left(v_name, char_length(v_name) - 1), v_space || '+$', '');
  end loop;
  return v_name;
end $$;

-- The owner, or someone who teaches the halaqa with them.
create function private.halaqa_owner(p_halaqa text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.halaqat h where h.id = p_halaqa and h.owner = (select auth.uid()))
$$;

-- The code to share: the halaqa's own (`member`), or a co-teacher's (`teacher`, the owner's to
-- make). The same one until it is renewed, used or expired.
create function public.halaqa_invite(p_halaqa text, p_kind text, p_renew boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_invite public.halaqa_invites;
  v_code text;
begin
  if private.halaqa_role(p_halaqa) is distinct from 'teacher' then raise exception 'not_teacher' using errcode = 'P0001'; end if;
  if exists (select 1 from public.halaqat h where h.id = p_halaqa and h.deleted) then raise exception 'halaqa_deleted' using errcode = 'P0001'; end if;
  if p_kind not in ('member', 'teacher') then raise exception 'invalid_kind' using errcode = 'P0001'; end if;
  if p_kind = 'teacher' and not private.halaqa_owner(p_halaqa) then raise exception 'not_owner' using errcode = 'P0001'; end if;

  select * into v_invite from public.halaqa_invites i where i.halaqa = p_halaqa and i.role = p_kind for update;
  if v_invite.code is not null and (p_renew or (v_invite.expires_at is not null and v_invite.expires_at <= now())) then
    delete from public.halaqa_invites i where i.code = v_invite.code;
    v_invite := null;
  end if;
  if v_invite.code is null then
    for attempt in 1..5 loop
      insert into public.halaqa_invites (code, halaqa, role, created_by, expires_at)
      values (private.new_invite_code(), p_halaqa, p_kind, v_user, case p_kind when 'teacher' then now() + interval '7 days' end)
      on conflict do nothing
      returning * into v_invite;
      -- (Made at the same moment by another supervisor: that one is the code.)
      if v_invite.code is null then
        select * into v_invite from public.halaqa_invites i where i.halaqa = p_halaqa and i.role = p_kind;
      end if;
      exit when v_invite.code is not null;
    end loop;
  end if;
  return jsonb_build_object('code', v_invite.code, 'kind', p_kind, 'expires_at', v_invite.expires_at);
end $$;

-- What a code opens, before joining: the halaqa, who teaches it, and whether to teach or to learn.
create function public.preview_halaqa_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.joining_user();
  v_invite public.halaqa_invites := private.invite_for(p_code, v_user);
begin
  if v_invite.code is null then return null; end if;
  return (select jsonb_build_object(
      'halaqa', h.id, 'data', h.data, 'deleted', h.deleted,
      'kind', v_invite.role,
      'teacher', (select p.full_name from public.profiles p where p.user_id = h.owner),
      'members', (select count(*) from public.halaqa_members m where m.halaqa = h.id and m.role = 'member'),
      'role', (select m.role from public.halaqa_members m where m.halaqa = h.id and m.user_id = v_user))
    from public.halaqat h where h.id = v_invite.halaqa);
  -- (Returned whatever the user's role: the app says they are in it already.)
end $$;

-- Joins the halaqa a code opens. A new participant takes `p_name` (their name in the halaqa) and
-- starts on `p_today` (the phone's date). Null when the code is not found or expired. Joining a
-- halaqa one is already in changes nothing.
create function public.join_halaqa(p_code text, p_name text, p_today date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.joining_user();
  v_invite public.halaqa_invites := private.invite_for(p_code, v_user);
  v_role text;
  v_student text;
  v_name text := private.participant_name(p_name);
  v_today date := case when p_today between current_date - 2 and current_date + 2 then p_today else current_date end;
begin
  if v_invite.code is null then return null; end if;
  if exists (select 1 from public.halaqat h where h.id = v_invite.halaqa and h.deleted) then raise exception 'halaqa_deleted' using errcode = 'P0001'; end if;
  select m.role, m.student into v_role, v_student from public.halaqa_members m where m.halaqa = v_invite.halaqa and m.user_id = v_user;
  if v_role is not null then
    return jsonb_build_object('halaqa', v_invite.halaqa, 'role', v_role, 'student', v_student, 'already', true);
  end if;

  if v_invite.role = 'teacher' then
    insert into public.halaqa_members (halaqa, user_id, role) values (v_invite.halaqa, v_user, 'teacher');
    delete from public.halaqa_invites i where i.code = v_invite.code;
    return jsonb_build_object('halaqa', v_invite.halaqa, 'role', 'teacher', 'student', null, 'already', false);
  end if;

  if (select count(*) from public.halaqa_members m where m.halaqa = v_invite.halaqa) >= 300 then
    raise exception 'halaqa_full' using errcode = 'P0001';
  end if;
  if v_name = '' then raise exception 'name_required' using errcode = 'P0001'; end if;
  v_student := 'student-' || left(replace(gen_random_uuid()::text, '-', ''), 16);
  insert into public.halaqa_students (halaqa, id, data) values (v_invite.halaqa, v_student,
    jsonb_build_object('name', v_name, 'joinedOn', to_char(v_today, 'YYYY-MM-DD'), 'direction', 'backward', 'known', '[]'::jsonb));
  insert into public.halaqa_members (halaqa, user_id, role, student) values (v_invite.halaqa, v_user, 'member', v_student);
  return jsonb_build_object('halaqa', v_invite.halaqa, 'role', 'member', 'student', v_student, 'already', false);
end $$;

-- Leaves a halaqa (its owner can't: they delete it). A member's participant is marked as having
-- left on `p_today`, with their history kept for the teacher.
create function public.leave_halaqa(p_halaqa text, p_today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_student text;
  v_today date := case when p_today between current_date - 2 and current_date + 2 then p_today else current_date end;
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if private.halaqa_owner(p_halaqa) then raise exception 'owner_cannot_leave' using errcode = 'P0001'; end if;
  delete from public.halaqa_members m where m.halaqa = p_halaqa and m.user_id = v_user returning m.student into v_student;
  if v_student is not null then
    update public.halaqa_students s set data = s.data || jsonb_build_object('leftOn', to_char(v_today, 'YYYY-MM-DD'))
    where s.halaqa = p_halaqa and s.id = v_student and not s.deleted and not s.data ? 'leftOn';
  end if;
end $$;

-- Takes someone out of a halaqa: a member (their participant and history stay with the teachers),
-- or a co-teacher (the owner's to do). False when they weren't in it.
create function public.remove_halaqa_member(p_halaqa text, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  if private.halaqa_role(p_halaqa) is distinct from 'teacher' then raise exception 'not_teacher' using errcode = 'P0001'; end if;
  select m.role into v_role from public.halaqa_members m where m.halaqa = p_halaqa and m.user_id = p_user;
  if v_role is null then return false; end if;
  if exists (select 1 from public.halaqat h where h.id = p_halaqa and h.owner = p_user) then raise exception 'not_owner' using errcode = 'P0001'; end if;
  if v_role = 'teacher' and not private.halaqa_owner(p_halaqa) then raise exception 'not_owner' using errcode = 'P0001'; end if;
  delete from public.halaqa_members m where m.halaqa = p_halaqa and m.user_id = p_user;
  return true;
end $$;

-- A participant deleted by a teacher: their account is no longer in the halaqa.
create function private.unlink_deleted_student() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted and not old.deleted then
    delete from public.halaqa_members m where m.halaqa = new.halaqa and m.student = new.id and m.role = 'member';
  end if;
  return null;
end $$;

create trigger halaqa_students_unlink after update on public.halaqa_students
  for each row execute function private.unlink_deleted_student();

-- People and points ----------------------------------------------------------------------------

-- Points for one participant's day: attendance (present 2, late 1), and each recitation by its
-- grade (a new portion: excellent 6, good 4, fair 2; a revision: 3, 2, 1). The app counts them
-- the same way (halaqat/model.ts, `entryPoints`).
create function private.entry_points(p_data jsonb) returns integer
language sql immutable set search_path = '' as $$
  select (case p_data ->> 'attendance' when 'present' then 2 when 'late' then 1 else 0 end)
    + coalesce((select sum(case r ->> 'kind'
        when 'new' then case r ->> 'grade' when 'excellent' then 6 when 'good' then 4 when 'fair' then 2 else 0 end
        when 'revision' then case r ->> 'grade' when 'excellent' then 3 when 'good' then 2 when 'fair' then 1 else 0 end
        else 0 end)
      from jsonb_array_elements(case when jsonb_typeof(p_data -> 'recitations') = 'array' then p_data -> 'recitations' else '[]'::jsonb end) r), 0)::integer
$$;

-- Who is in a halaqa, for its supervisors: themselves and its members, each with their account
-- (to take them out), the name and photo of their profile, and a member's participant.
create function public.halaqa_people(p_halaqa text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.halaqa_role(p_halaqa) is distinct from 'teacher' then raise exception 'not_teacher' using errcode = 'P0001'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'user', m.user_id,
      'role', case when h.owner = m.user_id then 'owner' else m.role end,
      'student', m.student,
      'name', coalesce(p.full_name, ''),
      'avatar', p.avatar,
      'me', m.user_id = (select auth.uid()),
      'joined_at', m.joined_at)
    order by (h.owner = m.user_id) desc, m.role desc, m.joined_at), '[]'::jsonb)
    from public.halaqa_members m
    join public.halaqat h on h.id = m.halaqa
    left join public.profiles p on p.user_id = m.user_id
    where m.halaqa = p_halaqa);
end $$;

-- A halaqa as a member sees it: its settings, its teachers, their own participant and days, and
-- every participant's name, photo and points (in all, and since `p_from`).
create function public.joined_halaqa(p_halaqa text, p_from date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_student text;
  v_halaqa public.halaqat;
begin
  select m.student into v_student from public.halaqa_members m
  where m.halaqa = p_halaqa and m.user_id = (select auth.uid()) and m.role = 'member';
  if v_student is null then raise exception 'not_member' using errcode = 'P0001'; end if;
  select * into v_halaqa from public.halaqat h where h.id = p_halaqa;
  if v_halaqa.deleted then return jsonb_build_object('id', p_halaqa, 'deleted', true); end if;
  return jsonb_build_object(
    'id', v_halaqa.id, 'version', v_halaqa.version, 'deleted', false, 'data', v_halaqa.data,
    'student', (select jsonb_build_object('id', s.id, 'data', s.data) from public.halaqa_students s
      where s.halaqa = p_halaqa and s.id = v_student and not s.deleted),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('date', to_char(e.date, 'YYYY-MM-DD'), 'session', e.session, 'data', e.data) order by e.date)
      from public.halaqa_entries e where e.halaqa = p_halaqa and e.student = v_student and not e.deleted), '[]'::jsonb),
    'teachers', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(p.full_name, ''), 'avatar', p.avatar, 'owner', m.user_id = v_halaqa.owner)
        order by (m.user_id = v_halaqa.owner) desc, m.joined_at)
      from public.halaqa_members m left join public.profiles p on p.user_id = m.user_id
      where m.halaqa = p_halaqa and m.role = 'teacher'), '[]'::jsonb),
    'roster', coalesce((select jsonb_agg(jsonb_build_object(
        'student', s.id, 'name', s.data ->> 'name', 'avatar', p.avatar, 'me', s.id = v_student,
        'total', coalesce(pts.total, 0), 'recent', coalesce(pts.recent, 0)) order by s.data ->> 'joinedOn', s.id)
      from public.halaqa_students s
      left join public.halaqa_members m on m.halaqa = s.halaqa and m.student = s.id
      left join public.profiles p on p.user_id = m.user_id
      left join lateral (
        select sum(private.entry_points(e.data))::integer as total,
          (sum(private.entry_points(e.data)) filter (where e.date >= p_from))::integer as recent
        from public.halaqa_entries e where e.halaqa = s.halaqa and e.student = s.id and not e.deleted
      ) pts on true
      where s.halaqa = p_halaqa and not s.deleted and not s.data ? 'leftOn'), '[]'::jsonb));
end $$;

-- The halaqat the user is in, with how far each has changed, their role, and whether it is theirs.
drop function public.halaqa_versions();
create function public.halaqa_versions()
returns table (id text, revision bigint, version bigint, deleted boolean, role text, owner boolean)
language sql stable security invoker set search_path = '' as $$
  select h.id, h.revision, h.version, h.deleted, m.role, h.owner = (select auth.uid())
  from public.halaqat h
  join public.halaqa_members m on m.halaqa = h.id and m.user_id = (select auth.uid())
  order by h.id
$$;

-- Photos: those who share a halaqa see each other's ----------------------------------------------

create function private.shares_halaqa(p_user text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.halaqa_members a
    join public.halaqa_members b on b.halaqa = a.halaqa
    join public.halaqat h on h.id = a.halaqa and not h.deleted
    where a.user_id = (select auth.uid()) and b.user_id::text = p_user)
$$;

create policy avatars_read_shared on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and private.shares_halaqa((storage.foldername(name))[1]));

-- Grants -------------------------------------------------------------------------------------------

revoke all on function private.owner_deletes(), private.new_invite_code(), private.normal_code(text), private.joining_user(), private.participant_name(text),
  private.invite_for(text, uuid), private.halaqa_owner(text), private.unlink_deleted_student(), private.entry_points(jsonb),
  private.shares_halaqa(text) from public, anon, authenticated;
grant execute on function private.shares_halaqa(text) to authenticated;

revoke all on function public.halaqa_invite(text, text, boolean), public.preview_halaqa_invite(text), public.join_halaqa(text, text, date),
  public.leave_halaqa(text, date), public.remove_halaqa_member(text, uuid), public.halaqa_people(text), public.joined_halaqa(text, date),
  public.halaqa_versions() from public, anon;
grant execute on function public.halaqa_invite(text, text, boolean), public.preview_halaqa_invite(text), public.join_halaqa(text, text, date),
  public.leave_halaqa(text, date), public.remove_halaqa_member(text, uuid), public.halaqa_people(text), public.joined_halaqa(text, date),
  public.halaqa_versions() to authenticated;
