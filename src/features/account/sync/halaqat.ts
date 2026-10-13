import { newId, type Entry, type Halaqa, type HalaqaSession, type HalaqatState, type Student } from '@/features/halaqat/model';
import { fingerprint } from './fingerprint';
import type { HalaqaMark, HalaqaPush, HalaqaPushResult, HalaqatSource, Ledger, Mark, PulledHalaqa, Remote } from './types';

/**
 * Halaqat in the account are records: the halaqa (its settings), each participant, and each
 * participant's day (by `date|student`). Each side's record is compared with what was last in
 * step (the marks): a record changed only in the account comes to the phone, one changed on the
 * phone goes up, and one changed on both keeps the phone's. Without marks (a phone that never
 * synced this halaqa with this account), the account's record is taken. A halaqa deleted anywhere
 * is deleted everywhere.
 */

type Data = Record<string, unknown>;
interface EntryRecord { date: string; student: string; session: string; data: Data }
interface Records { meta: Data; students: Map<string, Data>; entries: Map<string, EntryRecord> }

/** A mark that matches no record: the phone's record has to go up. */
const UNSYNCED = '';
export const entryKey = (date: string, student: string) => `${date}|${student}`;

function recordsOf(halaqa: Halaqa): Records {
  const { id: _id, students, sessions, ...meta } = halaqa;
  const entries = new Map<string, EntryRecord>();
  for (const session of sessions) {
    for (const { student, ...data } of session.entries) entries.set(entryKey(session.date, student), { date: session.date, student, session: session.id, data });
  }
  return { meta, students: new Map(students.map(({ id, ...data }) => [id, data])), entries };
}

/** The halaqa from its records, in the phone's order where it had them. */
function halaqaOf(id: string, records: Records, local: Halaqa | undefined, fromAccount: Set<string>): Halaqa {
  const known = local?.students.map((s) => s.id).filter((s) => records.students.has(s)) ?? [];
  const order = [...known, ...[...records.students.keys()].filter((s) => !known.includes(s)).sort()];
  let students: Student[] = order.map((s) => ({ ...records.students.get(s), id: s }) as Student);
  // One participant is the phone's owner: when both sides named one, the phone's stays.
  if (students.filter((s) => s.me).length > 1) students = students.map(({ me, ...s }) => (me && !fromAccount.has(s.id) ? { ...s, me } : s) as Student);
  const present = new Set(order);

  const sessions = new Map<string, HalaqaSession>();
  const placed = new Set<string>();
  for (const session of local?.sessions ?? []) {
    const entries: Entry[] = [];
    for (const entry of session.entries) {
      const key = entryKey(session.date, entry.student), record = records.entries.get(key);
      if (record && present.has(record.student)) { entries.push({ ...record.data, student: record.student } as Entry); placed.add(key); }
    }
    sessions.set(session.date, { id: session.id, date: session.date, entries });
  }
  const ids = new Set([...sessions.values()].map((s) => s.id));
  for (const [key, record] of records.entries) {
    if (placed.has(key) || !present.has(record.student)) continue;
    let session = sessions.get(record.date);
    if (!session) {
      session = { id: ids.has(record.session) ? newId('session') : record.session, date: record.date, entries: [] };
      ids.add(session.id);
      sessions.set(record.date, session);
    }
    session.entries.push({ ...record.data, student: record.student } as Entry);
  }
  return {
    ...records.meta, id, students,
    sessions: [...sessions.values()].filter((s) => s.entries.length).sort((a, b) => a.date.localeCompare(b.date)),
  } as Halaqa;
}

/**
 * What the account changed, applied to the phone's halaqa (`local`, if it has it): records the
 * phone changed since `mark` keep the phone's version and are to go up on the account's revision.
 * Returns the halaqa (none when the account deleted it) and the marks to keep.
 */
export function mergeHalaqa(local: Halaqa | undefined, pulled: PulledHalaqa, mark: HalaqaMark | undefined): { halaqa: Halaqa | undefined; mark: HalaqaMark | undefined } {
  if (pulled.deleted) return { halaqa: undefined, mark: undefined };
  const records: Records = local ? recordsOf(local) : { meta: {}, students: new Map(), entries: new Map() };
  const next: HalaqaMark = { revision: mark?.revision ?? 0, fp: mark?.fp ?? UNSYNCED, version: pulled.version, students: { ...mark?.students }, entries: { ...mark?.entries } };
  const fromAccount = new Set<string>();

  // Each record: the same on both sides, changed only in the account (it comes down), or changed on
  // the phone (it stays, to go up on the account's revision). The mark then holds the account's
  // data, so the phone's differs from it and goes up, until it is the same again.
  const settle = (localData: Data | undefined, data: unknown, revision: number, deleted: boolean, previous: Mark | undefined,
    take: () => void, drop: () => void): Mark | undefined => {
    const fp = fingerprint(data);
    if (localData !== undefined) {
      const localFp = fingerprint(localData);
      if (!deleted && localFp === fp) return { revision, fp };
      if (!previous || localFp === previous.fp) {
        if (previous?.revision === revision) return previous;
        if (deleted) { drop(); return undefined; }
        take();
        return { revision, fp };
      }
      return { revision, fp };
    }
    // Deleted on the phone since the last sync: the deletion goes up, unless the account deleted it too.
    if (previous) return deleted ? undefined : { revision, fp };
    if (deleted) return undefined;
    take();
    return { revision, fp };
  };

  if (local) {
    const meta = settle(records.meta, pulled.data, pulled.revision, false, mark, () => { records.meta = pulled.data as Data; }, () => {});
    next.revision = meta!.revision; next.fp = meta!.fp;
  } else {
    records.meta = pulled.data as Data;
    next.revision = pulled.revision; next.fp = fingerprint(pulled.data);
  }

  for (const s of pulled.students) {
    const settled = settle(records.students.get(s.id), s.data, s.revision, s.deleted, mark?.students[s.id],
      () => { records.students.set(s.id, s.data as Data); fromAccount.add(s.id); },
      () => records.students.delete(s.id));
    if (settled) next.students[s.id] = settled; else delete next.students[s.id];
  }
  for (const e of pulled.entries) {
    const key = entryKey(e.date, e.student);
    const settled = settle(records.entries.get(key)?.data, e.data, e.revision, e.deleted, mark?.entries[key],
      () => records.entries.set(key, { date: e.date, student: e.student, session: e.session, data: e.data as Data }),
      () => records.entries.delete(key));
    if (settled) next.entries[key] = settled; else delete next.entries[key];
  }
  // A participant gone takes their days with them.
  for (const [key, record] of records.entries) if (!records.students.has(record.student)) records.entries.delete(key);
  return { halaqa: halaqaOf(pulled.id, records, local, fromAccount), mark: next };
}

interface Sent { meta?: string; students: Map<string, string | null>; entries: Map<string, string | null> }

/** What the phone changed in a halaqa since `mark` (all of it when the account has none), to go up. */
export function pushFor(local: Halaqa, mark: HalaqaMark | undefined): { push: HalaqaPush; sent: Sent } | null {
  const records = recordsOf(local);
  const push: HalaqaPush = { students: [], entries: [] };
  const sent: Sent = { students: new Map(), entries: new Map() };
  const metaFp = fingerprint(records.meta);
  if (!mark || mark.revision === 0) { push.meta = { base: 0, data: records.meta }; sent.meta = metaFp; }
  else if (metaFp !== mark.fp) { push.meta = { base: mark.revision, data: records.meta }; sent.meta = metaFp; }

  for (const [id, data] of records.students) {
    const fp = fingerprint(data), previous = mark?.students[id];
    if (previous?.fp === fp) continue;
    push.students.push({ id, base: previous?.revision ?? 0, data });
    sent.students.set(id, fp);
  }
  for (const [id, previous] of Object.entries(mark?.students ?? {})) {
    if (records.students.has(id)) continue;
    push.students.push({ id, base: previous.revision, deleted: true });
    sent.students.set(id, null);
  }
  for (const [key, record] of records.entries) {
    const fp = fingerprint(record.data), previous = mark?.entries[key];
    if (previous?.fp === fp) continue;
    push.entries.push({ date: record.date, student: record.student, session: record.session, base: previous?.revision ?? 0, data: record.data });
    sent.entries.set(key, fp);
  }
  for (const [key, previous] of Object.entries(mark?.entries ?? {})) {
    if (records.entries.has(key)) continue;
    const [date, student] = key.split('|');
    push.entries.push({ date, student, base: previous.revision, deleted: true });
    sent.entries.set(key, null);
  }
  return push.meta || push.students.length || push.entries.length ? { push, sent } : null;
}

/** The marks after a push: what was kept in the account is in step; what was refused waits for the next pull. */
export function afterPush(mark: HalaqaMark | undefined, sent: Sent, result: HalaqaPushResult): HalaqaMark {
  const next: HalaqaMark = { revision: mark?.revision ?? 0, fp: mark?.fp ?? UNSYNCED, version: mark?.version ?? 0, students: { ...mark?.students }, entries: { ...mark?.entries } };
  if (sent.meta !== undefined && result.meta !== null) { next.revision = result.meta; next.fp = sent.meta; }
  for (const [id, fp] of sent.students) {
    const revision = result.students[id];
    if (revision === null || revision === undefined) continue;
    if (fp === null) delete next.students[id]; else next.students[id] = { revision, fp };
  }
  for (const [key, fp] of sent.entries) {
    const revision = result.entries[key];
    if (revision === null || revision === undefined) continue;
    if (fp === null) delete next.entries[key]; else next.entries[key] = { revision, fp };
  }
  // Nobody else changed the halaqa in between: the phone is now up to its latest version.
  if (result.before === next.version) next.version = result.after;
  return next;
}

const without = (state: HalaqatState, id: string): HalaqatState => ({ ...state, halaqat: state.halaqat.filter((h) => h.id !== id) });
const withHalaqa = (state: HalaqatState, halaqa: Halaqa): HalaqatState => state.halaqat.some((h) => h.id === halaqa.id)
  ? { ...state, halaqat: state.halaqat.map((h) => h.id === halaqa.id ? halaqa : h) }
  : { ...state, halaqat: [...state.halaqat, halaqa] };

/**
 * Brings the halaqat in step with the account: first what changed there comes down (merged with
 * the phone's own changes), then what changed on the phone goes up. A halaqa that fails (its data
 * doesn't check, or the account refuses it) is left for the next sync; the others go on.
 */
export async function syncHalaqat(remote: Remote, source: HalaqatSource, ledger: Ledger): Promise<{ failed: string[] }> {
  if (!source.read()) return { failed: [] };
  const failed: string[] = [];
  const list = await remote.halaqaVersions();
  const listed = new Map(list.map((h) => [h.id, h]));
  const onPhone = (id: string) => source.read()?.halaqat.find((h) => h.id === id);

  for (const r of list) {
    const mark = ledger.halaqat[r.id];
    try {
      if (r.deleted) {
        if (onPhone(r.id) && !source.transform((state) => without(state, r.id))) continue;
        delete ledger.halaqat[r.id];
        continue;
      }
      if (mark && (mark.version === r.version || !onPhone(r.id))) continue; // up to date, or deleted on the phone (below)
      const pulled = await remote.pullHalaqa(r.id, mark?.version ?? 0);
      if (!pulled) continue;
      let next: HalaqaMark | undefined, skipped = false;
      const changed = source.transform((state) => {
        const local = state.halaqat.find((h) => h.id === r.id);
        // Deleted on the phone while this was downloading: the deletion goes up instead.
        if (!local && ledger.halaqat[r.id]) { skipped = true; return state; }
        const merged = mergeHalaqa(local, pulled, ledger.halaqat[r.id]);
        next = merged.mark;
        return merged.halaqa ? withHalaqa(state, merged.halaqa) : without(state, r.id);
      });
      // Marked in step only once what came down is written on the phone.
      if (!changed || skipped || (source.settled && !await source.settled())) continue;
      if (next) ledger.halaqat[r.id] = next; else delete ledger.halaqat[r.id];
    } catch {
      failed.push(r.id);
    }
  }

  for (const halaqa of source.read()?.halaqat ?? []) {
    const r = listed.get(halaqa.id);
    if (r?.deleted || r?.role === 'member' || failed.includes(halaqa.id)) continue;
    // Kept before but no longer in the account: it goes up again, whole.
    if (!r && ledger.halaqat[halaqa.id]) delete ledger.halaqat[halaqa.id];
    const mark = ledger.halaqat[halaqa.id];
    const outgoing = pushFor(halaqa, mark);
    if (!outgoing) continue;
    try {
      ledger.halaqat[halaqa.id] = afterPush(mark, outgoing.sent, await remote.pushHalaqa(halaqa.id, outgoing.push));
    } catch (error) {
      // The id is another account's (the phone holds data from someone who signed in before): the
      // halaqa takes a new id, and goes up as this account's own at the next sync.
      if (!mark && error instanceof Error && error.message.includes('halaqa_taken')) {
        const id = newId('halaqa');
        try { source.transform((state) => ({ ...state, halaqat: state.halaqat.map((h) => h.id === halaqa.id ? { ...h, id } : h) })); } catch { /* left for the next sync */ }
      }
      failed.push(halaqa.id);
    }
  }

  // Deleted on the phone: deleted in the account too.
  for (const id of Object.keys(ledger.halaqat)) {
    if (onPhone(id)) continue;
    const r = listed.get(id);
    if (!r || r.deleted || r.role === 'member') { delete ledger.halaqat[id]; continue; }
    try {
      const result = await remote.pushHalaqa(id, { meta: { base: r.revision, deleted: true }, students: [], entries: [] });
      if (result.meta !== null) delete ledger.halaqat[id];
    } catch {
      failed.push(id);
    }
  }
  return { failed };
}
