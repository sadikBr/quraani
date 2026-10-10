import type { CacheStorage } from '@/lib/quranpedia/cache';
import { decodeBookmarks } from '../utils/ayah-actions';
import { createPersistedStore } from './persisted-store';

/** An explicit intent, so applying it to a later-read list cannot flip the user's choice. */
export interface BookmarkChange { key: string; saved: boolean }

export function applyBookmarkChange(list: string[], { key, saved }: BookmarkChange): string[] {
  if (saved) return list.includes(key) ? list : [...list, key];
  return list.includes(key) ? list.filter((value) => value !== key) : list;
}

export function createBookmarksStore(storage: CacheStorage, key: string) {
  return createPersistedStore<string[], BookmarkChange>({ storage, key, fallback: [], decode: decodeBookmarks, apply: applyBookmarkChange });
}
