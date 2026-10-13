import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { contentStorage } from '../storage/content-storage';
import { resolveReaderTheme } from '../theme';
import { createReadingPreferencesStore, decodeReadingPreferences, defaultReadingPreferences, READING_PREFERENCES_KEY, type ReadingPreferences } from './reading-preferences';
import { registerDocument } from '@/features/account/registry';
import { storeDocument } from '@/features/account/sources';

const PreferencesContext = createContext<{
  preferences: ReadingPreferences;
  update: (changes: Partial<ReadingPreferences>) => void;
} | null>(null);

export function ReadingPreferencesProvider({ children }: PropsWithChildren) {
  // Reading remains available with defaults if storage fails, but nothing is
  // saved until the stored preferences are read (retried in the background).
  const [store] = useState(() => createReadingPreferencesStore(contentStorage));
  useEffect(() => store.start(), [store]);
  // The phone's own settings: they come from the account only to a new phone.
  useEffect(() => registerDocument(storeDocument(store, READING_PREFERENCES_KEY, { decode: decodeReadingPreferences, fallback: defaultReadingPreferences, policy: 'restore' })), [store]);
  const { value: preferences, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <PreferencesContext.Provider value={{ preferences, update: store.update }}>
    {ready ? children : null}
  </PreferencesContext.Provider>;
}

/** The choices that change how the Quran text is laid out, which a reader must lay out again for. */
const TEXT_CHOICES = ['mode', 'textLayout', 'fontSize', 'spacious', 'tajweed', 'warshScript', 'thumunPages'] as const satisfies readonly (keyof ReadingPreferences)[];
/** How long the choices stay unchanged before a covered screen takes them. */
const SETTLE_MS = 700;

const withText = (preferences: ReadingPreferences, text: ReadingPreferences) =>
  TEXT_CHOICES.every((name) => preferences[name] === text[name]) ? preferences
    : { ...preferences, ...Object.fromEntries(TEXT_CHOICES.map((name) => [name, text[name]])) };

/**
 * For a screen that may be covered by another (the reader under the settings): while `held`, the
 * screen keeps the text choices it was showing and takes the new ones once they have stayed
 * unchanged for a moment, or at once when it is no longer held. Trying sizes or letters in the
 * settings then lays out the reader's pages once, not at every step, and the settings stay
 * responsive. The other choices (riwayah, theme, recitation) reach it at once.
 */
export function HoldTextPreferences({ held, children }: PropsWithChildren<{ held: boolean }>) {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('ReadingPreferencesProvider is missing');
  const latest = context.preferences;
  const [text, setText] = useState(latest);
  if (!held && text !== latest) setText(latest);
  useEffect(() => {
    if (!held || text === latest) return;
    const timer = setTimeout(() => setText(latest), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [held, latest, text]);
  const preferences = held ? withText(latest, text) : latest;
  // The same value while only held choices change, so the screen below does not render again.
  const [shown, setShown] = useState(preferences);
  const same = shown === preferences || (Object.keys(preferences) as (keyof ReadingPreferences)[]).every((name) => shown[name] === preferences[name]);
  if (!same) setShown(preferences);
  const current = same ? shown : preferences;
  const update = context.update;
  const value = useMemo(() => ({ preferences: current, update }), [current, update]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useReadingPreferences() {
  const context = useContext(PreferencesContext);
  const systemTheme = useColorScheme();
  if (!context) throw new Error('ReadingPreferencesProvider is missing');
  return { ...context, ...resolveReaderTheme(context.preferences.appearance, systemTheme) };
}
