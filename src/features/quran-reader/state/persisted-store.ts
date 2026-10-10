import type { CacheStorage } from '@/lib/quranpedia/cache';

export interface PersistedSnapshot<T> {
  value: T;
  /** The first read finished (successfully or not). */
  ready: boolean;
  /** The saved value has been read; only then is anything written. */
  loaded: boolean;
  /** Reading or saving failed; session changes are kept and retried. */
  error: boolean;
}

interface Options<T, C> {
  storage: CacheStorage;
  key: string;
  fallback: T;
  decode: (raw: string | null) => T;
  apply: (value: T, change: C) => T;
  /** Rewrite the decoded value after loading (e.g. to save migrated preferences). */
  saveOnLoad?: boolean;
  retryDelay?: (attempt: number) => number;
}

/**
 * User data that must never be overwritten by a failed read: changes made
 * before the saved value is known are kept as a log, applied on top of it once
 * a (retried) read succeeds, and only then written.
 */
export function createPersistedStore<T, C>({ storage, key, fallback, decode, apply, saveOnLoad = false,
  retryDelay = (attempt) => Math.min(30_000, 1000 * 2 ** attempt) }: Options<T, C>) {
  let base: T | null = null;
  let changes: C[] = [];
  let ready = false;
  let readError = false;
  let writeError = false;
  let attempts = 0;
  let reading = false;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const current = () => changes.reduce(apply, base ?? fallback);
  let snapshot: PersistedSnapshot<T> = { value: fallback, ready, loaded: false, error: false };
  const publish = () => {
    snapshot = { value: current(), ready, loaded: base !== null, error: readError || writeError };
    listeners.forEach((listener) => listener());
  };
  const save = () => {
    if (base === null) return;
    // Fold the log into the loaded value; writes are serialized so the latest value lands last.
    base = current(); changes = [];
    const raw = JSON.stringify(base);
    writes = writes.then(() => storage.setItem(key, raw)).then(() => { writeError = false; }, () => { writeError = true; })
      .then(() => { if (active) publish(); });
  };
  const read = () => {
    if (reading || base !== null || !active) return;
    reading = true;
    if (timer) { clearTimeout(timer); timer = undefined; }
    void storage.getItem(key).then((raw) => {
      if (!active) return;
      base = decode(raw); readError = false;
      if (saveOnLoad || changes.length) save();
    }, () => {
      if (!active) return;
      readError = true;
      timer = setTimeout(read, retryDelay(attempts++));
    }).finally(() => { reading = false; if (active) { ready = true; publish(); } });
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Starts reading; returns a cleanup that stops retries and late updates. */
    start() {
      active = true; read();
      return () => { active = false; if (timer) { clearTimeout(timer); timer = undefined; } };
    },
    update(change: C) {
      changes.push(change);
      if (base !== null) save();
      else read(); // A change while the read is failing retries it now.
      publish();
    },
  };
}
