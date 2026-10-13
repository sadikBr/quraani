import { createContext, Fragment, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { registerDocument } from '@/features/account/registry';
import { storeDocument, strictBookmarks } from '@/features/account/sources';
import { contentStorage } from '../storage/content-storage';
import { RIWAYAT, type Riwayah } from '../riwayat';
import { createBookmarksStore } from './bookmarks';
import { useReadingPreferences } from './reading-preferences-provider';
const Context = createContext<{ bookmarks: string[]; toggle: (key: string) => void; error: boolean; ready: boolean } | null>(null);
const RIWAYAT_KEYS = Object.keys(RIWAYAT) as Riwayah[];
const bookmarksKey = (riwayah: Riwayah) => `reader:${riwayah}-bookmarks:v1`;
export function BookmarksProvider({ children }: PropsWithChildren) {
  const { preferences: { riwayah } } = useReadingPreferences();
  // Each riwayah's marks, kept for the whole session (both sync with the account, whichever is
  // read). Nothing is written until the saved list has been read (retried on failure); toggles
  // made meanwhile are kept for this session and merged into it.
  const [stores] = useState(() => Object.fromEntries(RIWAYAT_KEYS.map((r) => [r, createBookmarksStore(contentStorage, bookmarksKey(r))])) as Record<Riwayah, ReturnType<typeof createBookmarksStore>>);
  useEffect(() => {
    const stops = RIWAYAT_KEYS.flatMap((r) => [stores[r].start(), registerDocument(storeDocument(stores[r], bookmarksKey(r), { decode: strictBookmarks, fallback: [] }))]);
    return () => stops.forEach((stop) => stop());
  }, [stores]);
  const store = stores[riwayah];
  const { value: bookmarks, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const toggle = (key: string) => store.update({ key, saved: !store.getSnapshot().value.includes(key) });
  // What is below starts afresh with each riwayah, as it always has.
  return <Context.Provider value={{ bookmarks, ready, error, toggle }}><Fragment key={riwayah}>{children}</Fragment></Context.Provider>;
}
export function useBookmarks() { const value = useContext(Context); if (!value) throw new Error('BookmarksProvider is missing'); return value; }
