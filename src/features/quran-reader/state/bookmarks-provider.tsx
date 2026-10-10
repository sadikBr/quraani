import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { contentStorage } from '../storage/content-storage';
import { createBookmarksStore } from './bookmarks';
import { useReadingPreferences } from './reading-preferences-provider';
const Context = createContext<{ bookmarks: string[]; toggle: (key: string) => void; error: boolean; ready: boolean } | null>(null);
export function BookmarksProvider({ children }: PropsWithChildren) {
  const { preferences: { riwayah } } = useReadingPreferences();
  return <EditionBookmarks key={riwayah} storageKey={`reader:${riwayah}-bookmarks:v1`}>{children}</EditionBookmarks>;
}
function EditionBookmarks({ children, storageKey }: PropsWithChildren<{ storageKey: string }>) {
  // Nothing is written until the saved list has been read (retried on failure);
  // toggles made meanwhile are kept for this session and merged into it.
  const [store] = useState(() => createBookmarksStore(contentStorage, storageKey));
  useEffect(() => store.start(), [store]);
  const { value: bookmarks, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const toggle = (key: string) => store.update({ key, saved: !store.getSnapshot().value.includes(key) });
  return <Context.Provider value={{ bookmarks, ready, error, toggle }}>{children}</Context.Provider>;
}
export function useBookmarks() { const value = useContext(Context); if (!value) throw new Error('BookmarksProvider is missing'); return value; }
