import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { contentStorage } from '../storage/content-storage';
import { resolveReaderTheme } from '../theme';
import { decodeReadingPreferences, defaultReadingPreferences, type ReadingPreferences } from './reading-preferences';

const STORAGE_KEY = 'reader:preferences:v1';
const PreferencesContext = createContext<{
  preferences: ReadingPreferences;
  update: (changes: Partial<ReadingPreferences>) => void;
} | null>(null);

export function ReadingPreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState(defaultReadingPreferences);
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    contentStorage.getItem(STORAGE_KEY).then((value) => {
      if (active) setPreferences(decodeReadingPreferences(value));
    }).catch(() => { /* Reading remains available when storage is unavailable. */ })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (ready) {
      // Serialize writes so rapid taps cannot save an older preference last.
      writes.current = writes.current.then(() => contentStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)))
        .catch(() => { /* Keep preferences for this session if persistence fails. */ });
    }
  }, [preferences, ready]);
  return <PreferencesContext.Provider value={{ preferences, update: (changes) => setPreferences((value) => ({ ...value, ...changes })) }}>
    {ready ? children : null}
  </PreferencesContext.Provider>;
}

export function useReadingPreferences() {
  const context = useContext(PreferencesContext);
  const systemTheme = useColorScheme();
  if (!context) throw new Error('ReadingPreferencesProvider is missing');
  return { ...context, ...resolveReaderTheme(context.preferences.appearance, systemTheme) };
}
