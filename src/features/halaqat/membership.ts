import type { CacheStorage } from '@/lib/quranpedia/cache';
import type { AccountApi, HalaqaPersonRow } from '@/features/account/api';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { FROM_HALAQAT_KEY } from '@/features/plans/repository';
import { decodeHalaqat, monthStart, REMINDER_LEADS, type Entry, type Halaqa, type HalaqaSession, type Portion, type ReminderLead, type Student } from './model';

/**
 * The user's place in the halaqat shared through their account: which they teach (their own, or
 * as a co-teacher), and those they are a member of, as a member sees them (read from the account,
 * remembered on the phone to show offline). A member's halaqa is never edited on their phone: its
 * teachers keep it.
 */

export type TeachingRole = 'owner' | 'teacher';
export interface Person {
  /** Their account (for a halaqa's teachers, to take someone out). */
  user?: string;
  role: 'owner' | 'teacher' | 'member';
  /** The participant a member is. */
  student?: string;
  /** Their profile's name (may be empty). */
  name: string;
  /** Their photo's path. */
  avatar?: string;
  me: boolean;
}
export interface RosterEntry { student: string; name: string; avatar?: string; me: boolean; total: number; recent: number }
export interface JoinedHalaqa {
  /** Its settings, the member's own participant (as `me`) and their own days. */
  halaqa: Halaqa;
  version: number;
  student: string;
  teachers: { name: string; avatar?: string; owner: boolean }[];
  /** Every participant: their name, photo and points (no more of theirs). */
  roster: RosterEntry[];
  /** The day the roster's `recent` points count from (the month's first). */
  from: string;
}
export interface MembershipState {
  roles: Record<string, TeachingRole>;
  joined: JoinedHalaqa[];
  people: Record<string, Person[]>;
  /** Links to photos, by path, and until when each works (ms). */
  photos: Record<string, { url: string; until: number }>;
  /** The reminder the user chose on this phone for each halaqa they are a member of. */
  reminders: Record<string, ReminderLead>;
  /** Read from the phone (and the account asked, if it could be). */
  loaded: boolean;
  refreshing: boolean;
  /** The account couldn't be asked last time (what is shown is what the phone remembers). */
  problem?: 'network' | 'failed';
}

export const membershipKey = (user: string) => `halaqat:membership:v1:${user}`;
const LINK_SECONDS = 7 * 24 * 3600;
const RENEW_MS = 24 * 3600 * 1000;

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const path = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * A member's halaqa from what the account sends (`joined_halaqa`): null when it was deleted.
 * Throws when it doesn't read as the app's own halaqat do (written by a newer version).
 */
export function joinedFrom(view: unknown, from: string): JoinedHalaqa | null {
  const v = view as Row;
  if (!v || typeof v.id !== 'string') throw new Error('Unreadable halaqa');
  if (v.deleted === true) return null;
  const own = v.student as { id?: string; data?: Row } | null;
  if (!own?.id || !own.data) throw new Error('Not a participant');
  const student = { ...own.data, id: own.id, me: true } as Student;
  const sessions: HalaqaSession[] = (Array.isArray(v.entries) ? v.entries as Row[] : []).map((e) => ({
    id: text(e.session), date: text(e.date), entries: [{ ...(e.data as Row), student: own.id } as unknown as Entry],
  }));
  const halaqa = { ...(v.data as Row), id: v.id, students: [student], sessions } as Halaqa;
  decodeHalaqat(JSON.stringify({ version: 1, halaqat: [halaqa] }));
  return {
    halaqa, student: own.id, from, version: count(v.version),
    teachers: (Array.isArray(v.teachers) ? v.teachers as Row[] : []).map((t) => ({ name: text(t.name), avatar: path(t.avatar), owner: t.owner === true })),
    roster: (Array.isArray(v.roster) ? v.roster as Row[] : []).filter((r) => typeof r.student === 'string').map((r) => ({
      student: r.student as string, name: text(r.name), avatar: path(r.avatar), me: r.me === true, total: count(r.total), recent: count(r.recent),
    })),
  };
}

export const personFrom = (row: HalaqaPersonRow): Person => ({
  ...(row.user ? { user: row.user } : {}), role: row.role, ...(row.student ? { student: row.student } : {}),
  name: row.name ?? '', ...(row.avatar ? { avatar: row.avatar } : {}), me: row.me === true,
});

type Saved = Pick<MembershipState, 'roles' | 'joined' | 'people' | 'photos' | 'reminders'>;
const LEADS: readonly number[] = REMINDER_LEADS;

/** What the phone remembers, read back: each halaqa only if it still reads whole. */
function decodeSaved(raw: string | null): Saved {
  const empty = { roles: {}, joined: [], people: {}, photos: {}, reminders: {} };
  if (!raw) return empty;
  try {
    const saved = JSON.parse(raw) as Partial<MembershipState>;
    const joined = (Array.isArray(saved.joined) ? saved.joined : []).filter((j) => {
      try { decodeHalaqat(JSON.stringify({ version: 1, halaqat: [j.halaqa] })); return Array.isArray(j.roster) && Array.isArray(j.teachers); } catch { return false; }
    });
    const roles = Object.fromEntries(Object.entries(saved.roles ?? {}).filter(([, r]) => r === 'owner' || r === 'teacher')) as Record<string, TeachingRole>;
    const reminders = Object.fromEntries(Object.entries(saved.reminders ?? {}).filter(([, lead]) => LEADS.includes(lead))) as Record<string, ReminderLead>;
    return { roles, joined, reminders,
      people: saved.people && typeof saved.people === 'object' ? saved.people : {}, photos: saved.photos && typeof saved.photos === 'object' ? saved.photos : {} };
  } catch {
    return empty;
  }
}

export function createMembershipStore({ user, api, storage, now = Date.now }: {
  user: string;
  api: Pick<AccountApi, 'halaqaVersions' | 'joinedHalaqa' | 'halaqaPeople' | 'photoLinks'>;
  storage: Pick<CacheStorage, 'getItem' | 'setItem'>;
  now?: () => number;
}) {
  let state: MembershipState = { roles: {}, joined: [], people: {}, photos: {}, reminders: {}, loaded: false, refreshing: false };
  const listeners = new Set<() => void>();
  const publish = (next: Partial<MembershipState>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };
  const remember = () => storage.setItem(membershipKey(user), JSON.stringify({
    roles: state.roles, joined: state.joined, people: state.people, photos: state.photos, reminders: state.reminders,
  })).catch(() => {});
  let reading: Promise<void> | undefined;
  // One refresh at a time; one asked for meanwhile runs after it (it may need what just changed).
  let running: Promise<void> | undefined;
  let queued: Promise<void> | undefined;
  // Halaqat forgotten (left), and when: a refresh begun before doesn't bring them back.
  let forgets = 0;
  const forgotten = new Map<string, number>();

  /** Links to the photos at `paths` that have none, or one about to stop working. */
  async function photosFor(paths: (string | undefined)[]) {
    const wanted = [...new Set(paths.filter((p): p is string => !!p))].filter((p) => !(state.photos[p]?.until - RENEW_MS > now()));
    if (!wanted.length) return;
    try {
      const links = await api.photoLinks(wanted, LINK_SECONDS);
      const until = now() + LINK_SECONDS * 1000;
      publish({ photos: { ...state.photos, ...Object.fromEntries(Object.entries(links).map(([p, url]) => [p, { url, until }])) } });
      await remember();
    } catch {
      // Shown without them (the letter of each name) until the next time.
    }
  }

  const read = () => reading ??= (async () => {
    const saved = decodeSaved(await storage.getItem(membershipKey(user)).catch(() => null));
    publish({ ...saved, loaded: true });
  })();

  const store = {
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    read,

    /**
     * Asks the account which halaqat the user is in, and how each the user is a member of stands
     * (`today`: the phone's date, for this month's points). One at a time.
     */
    refresh(today: string): Promise<void> {
      const start = () => {
        running = refreshOnce(today).finally(() => { running = undefined; });
        return running;
      };
      if (queued) return queued;
      if (!running) return start();
      queued = running.then(() => { queued = undefined; return start(); });
      return queued;
    },

    /** Who is in a halaqa the user supervises, with their photos. */
    async people(halaqa: string) {
      await read();
      const people = (await api.halaqaPeople(halaqa)).map(personFrom);
      publish({ people: { ...state.people, [halaqa]: people } });
      await remember();
      await photosFor(people.map((p) => p.avatar));
      return people;
    },

    /** Forgets a halaqa the user is no longer in (they left it, or were taken out). */
    async forget(halaqa: string) {
      await read();
      forgotten.set(halaqa, ++forgets);
      const { [halaqa]: _role, ...roles } = state.roles;
      const { [halaqa]: _people, ...people } = state.people;
      const { [halaqa]: _reminder, ...reminders } = state.reminders;
      publish({ roles, people, reminders, joined: state.joined.filter((j) => j.halaqa.id !== halaqa) });
      await remember();
    },

    /** The reminder before each session of a halaqa the user is a member of (none: `undefined`). */
    async setReminder(halaqa: string, lead: ReminderLead | undefined) {
      await read();
      const { [halaqa]: _old, ...reminders } = state.reminders;
      publish({ reminders: lead === undefined ? reminders : { ...reminders, [halaqa]: lead } });
      await remember();
    },

  };

  /**
   * Asks the account which halaqat the user is in, and how each the user is a member of stands
   * (`today`: the phone's date, for this month's points).
   */
  async function refreshOnce(today: string) {
    await read();
    const begun = forgets;
    publish({ refreshing: true });
    try {
      const list = await api.halaqaVersions();
      const roles: Record<string, TeachingRole> = {};
      for (const r of list) if (!r.deleted && r.role === 'teacher') roles[r.id] = r.owner === false ? 'teacher' : 'owner';
      const from = monthStart(today);
      const joined: JoinedHalaqa[] = [];
      let problem: MembershipState['problem'];
      for (const r of list.filter((x) => x.role === 'member' && !x.deleted)) {
        try {
          const view = joinedFrom(await api.joinedHalaqa(r.id, from), from);
          if (view) joined.push(view);
        } catch (error) {
          // What the phone has stays (offline, or written by a newer version).
          const kept = state.joined.find((j) => j.halaqa.id === r.id);
          if (kept) joined.push(kept);
          problem = (error as { kind?: string })?.kind === 'network' ? 'network' : 'failed';
        }
      }
      // Left while this was on its way: the account's answer may still have had it.
      const gone = (id: string) => (forgotten.get(id) ?? 0) > begun;
      for (const id of Object.keys(roles)) if (gone(id)) delete roles[id];
      const kept = joined.filter((j) => !gone(j.halaqa.id));
      const people = Object.fromEntries(Object.entries(state.people).filter(([id]) => roles[id] || kept.some((j) => j.halaqa.id === id)));
      // A halaqa the user is no longer a member of takes its reminder with it.
      const reminders = Object.fromEntries(Object.entries(state.reminders).filter(([id]) => kept.some((j) => j.halaqa.id === id)));
      publish({ roles, joined: kept, people, reminders, problem });
      await remember();
      await photosFor(kept.flatMap((j) => [...j.teachers.map((t) => t.avatar), ...j.roster.map((r) => r.avatar)]));
    } catch (error) {
      publish({ problem: (error as { kind?: string })?.kind === 'network' ? 'network' : 'failed' });
    } finally {
      publish({ refreshing: false });
    }
  }
  return store;
}

export type MembershipStore = ReturnType<typeof createMembershipStore>;

/** A photo's link, if it has one that works. */
export const photoOf = (state: Pick<MembershipState, 'photos'>, avatar: string | undefined, now = Date.now()) => {
  const link = avatar ? state.photos[avatar] : undefined;
  return link && link.until > now ? link.url : undefined;
};

/**
 * A recitation's key among those a memorization record has taken in (`fromHalaqat`): its halaqa,
 * its session and its portion (a portion changed afterwards counts anew).
 */
export const recitationKey = (halaqa: string, session: string, { from, to }: Portion) => `${halaqa}|${session}:${from.surah}.${from.ayah}-${to.surah}.${to.ayah}`;

export interface PassedRecitation { riwayah: Riwayah; key: string; portion: Portion }
/**
 * What a member has passed in the halaqat they are in (a new portion heard and not to be repeated)
 * that their memorization record of the halaqa's riwayah hasn't taken in yet (`taken`).
 */
export function passedRecitations(joined: JoinedHalaqa[], taken: (riwayah: Riwayah) => ReadonlySet<string>): PassedRecitation[] {
  return joined.flatMap(({ halaqa, student }) => {
    const had = taken(halaqa.riwayah);
    return halaqa.sessions.flatMap((session) => session.entries.filter((e) => e.student === student).flatMap((entry) => entry.recitations
      .filter((r) => r.kind === 'new' && r.grade !== 'repeat')
      .map((r) => ({ riwayah: halaqa.riwayah, key: recitationKey(halaqa.id, session.id, r.portion), portion: r.portion }))
      // A note too long for the record (ids written elsewhere) is passed over rather than refused with the rest.
      .filter((r) => !had.has(r.key) && r.key.length <= FROM_HALAQAT_KEY)));
  });
}
