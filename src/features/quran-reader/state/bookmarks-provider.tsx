import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { contentStorage } from '../storage/content-storage';
import { decodeBookmarks } from '../utils/ayah-actions';
import { useReadingPreferences } from './reading-preferences-provider';
const Context = createContext<{ bookmarks: string[]; toggle: (key: string) => void; error: boolean; ready: boolean } | null>(null);
export function BookmarksProvider({ children }: PropsWithChildren) {
  const { preferences: { riwayah } } = useReadingPreferences();
  return <EditionBookmarks key={riwayah} storageKey={`reader:${riwayah}-bookmarks:v1`}>{children}</EditionBookmarks>;
}
function EditionBookmarks({ children, storageKey: KEY }: PropsWithChildren<{ storageKey: string }>) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => { let active = true; void contentStorage.getItem(KEY).then((raw) => { if (active) setBookmarks(decodeBookmarks(raw)); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, [KEY]);
  useEffect(() => { if (ready && dirty) writes.current = writes.current.then(() => contentStorage.setItem(KEY, JSON.stringify(bookmarks))).then(() => setError(false)).catch(() => setError(true)); }, [bookmarks, ready, dirty, KEY]);
  return <Context.Provider value={{ bookmarks, ready, error, toggle: (key) => { if (ready) { setDirty(true); setBookmarks((old) => old.includes(key) ? old.filter((v) => v !== key) : [...old, key]); } } }}>{children}</Context.Provider>;
}
export function useBookmarks() { const value = useContext(Context); if (!value) throw new Error('BookmarksProvider is missing'); return value; }
