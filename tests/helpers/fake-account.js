import { canonical } from '../../src/features/account/sync/fingerprint';
import { decodeHalaqat } from '../../src/features/halaqat/model';

/**
 * An account in memory that behaves like the database functions in
 * supabase/migrations/*_accounts_and_sync.sql: revisions given by the account, writes on an older
 * revision refused, a version per halaqa counting every change in it, deletions kept as marks.
 * Data comes back with its keys reordered, as jsonb does.
 */
export function createFakeAccount() {
  const documents = new Map();
  const halaqat = new Map();
  // The halaqat are the signed-in user's (`user`); `others` are someone else's, ids taken.
  const others = new Set();
  const copy = (value) => value === undefined ? undefined : JSON.parse(canonical(value));
  const same = (a, b) => canonical(a) === canonical(b);
  let failNext = 0, loseNext = 0;
  const calls = [];
  // `failNext`: the next calls fail before reaching the account; `loseNext`: they reach it but the answer is lost.
  const call = (name, action) => async (...args) => {
    calls.push(name);
    if (failNext > 0) { failNext--; throw Object.assign(new Error('offline'), { kind: 'network' }); }
    const result = action(...args);
    if (loseNext > 0) { loseNext--; throw Object.assign(new Error('lost'), { kind: 'network' }); }
    return copy(result) ?? null;
  };
  const bump = (h) => ++h.version;
  const write = (h, records, key, values, base) => {
    const record = records.get(key);
    if (base === 0) {
      if (record) return null;
      if (values.deleted && !values.data) return null;
      records.set(key, { ...values, data: copy(values.data), deleted: !!values.deleted, revision: 1, version: bump(h) });
      return 1;
    }
    if (!record || record.revision !== base) return null;
    const next = { ...record, ...(values.session ? { session: values.session } : {}), data: values.data === undefined ? record.data : copy(values.data), deleted: !!values.deleted };
    if (same({ ...next, revision: 0, version: 0 }, { ...record, revision: 0, version: 0 })) return record.revision;
    records.set(key, { ...next, revision: record.revision + 1, version: bump(h) });
    return record.revision + 1;
  };

  const remote = {
    documentRevisions: call('documentRevisions', () => [...documents].map(([key, d]) => ({ key, revision: d.revision }))),
    getDocuments: call('getDocuments', (keys) => keys.filter((k) => documents.has(k)).map((key) => ({ key, revision: documents.get(key).revision, data: documents.get(key).data }))),
    putDocument: call('putDocument', (key, data, base) => {
      const d = documents.get(key);
      if (base === 0) { if (d) return null; documents.set(key, { revision: 1, data: copy(data) }); return 1; }
      if (!d || d.revision !== base) return null;
      if (!same(d.data, data)) { d.revision++; d.data = copy(data); }
      return d.revision;
    }),
    halaqaVersions: call('halaqaVersions', () => [...halaqat].filter(([id]) => !others.has(id)).map(([id, h]) => ({ id, revision: h.revision, version: h.version, deleted: h.deleted, role: 'teacher' }))),
    pullHalaqa: call('pullHalaqa', (id, since) => {
      const h = halaqat.get(id);
      if (!h || others.has(id)) return null;
      const changed = (records) => [...records.values()].filter((r) => r.version > since).sort((a, b) => a.version - b.version);
      return {
        id, revision: h.revision, version: h.version, deleted: h.deleted, data: h.data,
        students: changed(h.students).map(({ id: s, revision, deleted, data }) => ({ id: s, revision, deleted, data })),
        entries: changed(h.entries).map(({ date, student, session, revision, deleted, data }) => ({ date, student, session, revision, deleted, data })),
      };
    }),
    pushHalaqa: call('pushHalaqa', (id, push) => {
      if (others.has(id)) {
        if (push.meta?.base === 0) throw Object.assign(new Error('halaqa_taken'), { kind: 'failed' });
        throw Object.assign(new Error('halaqa_not_found'), { kind: 'failed' });
      }
      let h = halaqat.get(id), before, meta = null;
      if (push.meta && push.meta.base === 0) {
        if (h) before = -1;
        else {
          h = { revision: 1, version: 1, deleted: false, data: copy(push.meta.data), students: new Map(), entries: new Map() };
          halaqat.set(id, h);
          meta = 1; before = 0;
        }
      } else {
        if (!h) throw Object.assign(new Error('halaqa_not_found'), { kind: 'failed' });
        before = h.version;
        if (push.meta && h.revision === push.meta.base) {
          if (h.deleted) throw Object.assign(new Error('halaqa_deleted'), { kind: 'failed' });
          const data = push.meta.data === undefined ? h.data : copy(push.meta.data), deleted = !!push.meta.deleted;
          if (!same(data, h.data) || deleted !== h.deleted) { h.revision++; h.data = data; h.deleted = deleted; bump(h); }
          meta = h.revision;
        }
      }
      if (h.deleted && (push.students.length || push.entries.length)) throw Object.assign(new Error('halaqa_deleted'), { kind: 'failed' });
      // As the SQL: a record already there isn't created again (and doesn't count in the version).
      const students = {}, entries = {};
      for (const s of push.students) students[s.id] = write(h, h.students, s.id, { id: s.id, data: s.data, deleted: s.deleted }, s.base);
      for (const e of push.entries) {
        const key = `${e.date}|${e.student}`;
        if (!h.students.has(e.student)) throw Object.assign(new Error('foreign key'), { kind: 'failed' });
        entries[key] = write(h, h.entries, key, { date: e.date, student: e.student, session: e.session, data: e.data, deleted: e.deleted }, e.base);
      }
      return { meta, students, entries, before, after: h.version };
    }),
  };
  return {
    remote, documents, halaqat, calls, others,
    fail(n = 1) { failNext = n; },
    lose(n = 1) { loseNext = n; },
  };
}

/** A synced document kept in memory, checked like the app's stores check theirs. */
export function memoryDocument(key, raw, { policy = 'ask', fallback = '{}', check = JSON.parse } = {}) {
  const listeners = new Set();
  let value = raw;
  return {
    key, policy,
    read: () => value,
    check,
    empty: (r) => canonical(JSON.parse(r)) === canonical(JSON.parse(fallback)),
    async replace(next, expected) { check(next); if (value !== expected) return false; value = JSON.stringify(JSON.parse(next)); return true; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    set(next) { value = next; listeners.forEach((l) => l()); },
    get value() { return value; },
  };
}

/** The halaqat in memory, checked on every change like the halaqat store. */
export function memoryHalaqat(state = { version: 1, halaqat: [] }) {
  let value = state;
  return {
    read: () => value,
    transform(change) { const next = change(value); decodeHalaqat(JSON.stringify(next)); value = next; return true; },
    subscribe: () => () => {},
    set(next) { value = next; },
    get value() { return value; },
  };
}
