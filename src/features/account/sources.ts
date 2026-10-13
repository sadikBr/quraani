import type { PersistedStore } from '@/features/quran-reader/state/persisted-store';
import { decodeHalaqat, type HalaqatState } from '@/features/halaqat/model';
import { decodeMemorization, decodePlans, type createPlansRepository } from '@/features/plans/repository';
import { decodeBookmarks } from '@/features/quran-reader/utils/ayah-actions';
import { canonical } from './sync/fingerprint';
import type { DocumentSource, HalaqatSource } from './sync/types';

/** The serialized value of a store, made once per value. */
function serializer<T>() {
  let last: { value: T; raw: string } | undefined;
  return (value: T) => {
    if (last?.value !== value) last = { value, raw: JSON.stringify(value) };
    return last.raw;
  };
}

/**
 * Whether `read` keeps all of `saved`: every value it had, in its place (it may add defaults). A
 * decoder that drops what it doesn't know is right for the phone's own storage, but reading a
 * copy written by a newer version of the app that way would lose part of it.
 */
export function keepsAll(read: unknown, saved: unknown): boolean {
  if (saved === null || typeof saved !== 'object') return read === saved;
  // An empty list or record holds nothing to lose.
  if (read === undefined && Object.keys(saved).length === 0) return true;
  if (Array.isArray(saved)) return Array.isArray(read) && read.length === saved.length && saved.every((item, i) => keepsAll(read[i], item));
  if (!read || typeof read !== 'object' || Array.isArray(read)) return false;
  return Object.entries(saved as Record<string, unknown>).every(([key, value]) => keepsAll((read as Record<string, unknown>)[key], value));
}

/** A store's data, synced whole; the account's copy is read with the store's own decoder, and must read whole. */
export function storeDocument<T, C>(store: PersistedStore<T, C>, key: string, { decode, fallback, policy = 'ask' }: {
  decode: (raw: string | null) => T; fallback: T; policy?: DocumentSource['policy'];
}): DocumentSource {
  const serialize = serializer<T>();
  const empty = canonical(fallback);
  const check = (raw: string) => {
    const value = decode(raw);
    if (!keepsAll(value, JSON.parse(raw))) throw new Error(`${key}: written by a newer version`);
    return value;
  };
  return {
    key, policy,
    read() { const snapshot = store.getSnapshot(); return snapshot.loaded ? serialize(snapshot.value) : undefined; },
    check,
    empty(raw) { try { return canonical(decode(raw)) === empty; } catch { return false; } },
    async replace(raw, expected) {
      const value = check(raw);
      // Marked in step only once written on the phone.
      return store.transform((current) => serialize(current) === expected ? value : undefined) && await store.settled();
    },
    subscribe: store.subscribe,
  };
}

/**
 * Bookmarks as the account keeps them: the reader's own decoder drops what it can't read, which is
 * right for the phone's storage but would turn a copy it can't read into an empty list.
 */
export function strictBookmarks(raw: string | null): string[] {
  const value = JSON.parse(raw ?? '[]');
  const list = decodeBookmarks(raw);
  if (!Array.isArray(value) || list.length !== value.length) throw new Error('Unreadable bookmarks');
  return list;
}

/** Goals and the memorization record: one document, as the phone keeps them. */
export function plansDocument(repository: ReturnType<typeof createPlansRepository>): DocumentSource {
  return {
    key: 'plans:v1', policy: 'ask',
    read: () => repository.raw(),
    check(raw) { decodePlans(raw); decodeMemorization(raw); },
    empty(raw) {
      try { return !decodePlans(raw).length && decodeMemorization(raw).every((r) => !r.ranges.length); } catch { return false; }
    },
    replace: (raw, expected) => repository.replace(raw, expected),
    subscribe: (listener) => repository.subscribe(listener),
  };
}

/** The halaqat store, changed only with results that check as its own saved data does. */
export function halaqatSource(store: PersistedStore<HalaqatState, unknown>): HalaqatSource {
  return {
    read() { const snapshot = store.getSnapshot(); return snapshot.loaded ? snapshot.value : undefined; },
    transform(change) {
      if (!store.getSnapshot().loaded) return false;
      let same = false;
      const changed = store.transform((current) => {
        const next = change(current);
        if (next === current) { same = true; return undefined; }
        decodeHalaqat(JSON.stringify(next));
        return next;
      });
      return changed || same;
    },
    settled: store.settled,
    subscribe: store.subscribe,
  };
}
