import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { contentStorage } from '../storage/content-storage';
import { resolveReaderTheme } from '../theme';
import { createReadingPreferencesStore, type ReadingPreferences } from './reading-preferences';

const PreferencesContext = createContext<{
  preferences: ReadingPreferences;
  update: (changes: Partial<ReadingPreferences>) => void;
} | null>(null);

export function ReadingPreferencesProvider({ children }: PropsWithChildren) {
  // Reading remains available with defaults if storage fails, but nothing is
  // saved until the stored preferences are read (retried in the background).
  const [store] = useState(() => createReadingPreferencesStore(contentStorage));
  useEffect(() => store.start(), [store]);
  const { value: preferences, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return <PreferencesContext.Provider value={{ preferences, update: store.update }}>
    {ready ? children : null}
  </PreferencesContext.Provider>;
}

export function useReadingPreferences() {
  const context = useContext(PreferencesContext);
  const systemTheme = useColorScheme();
  if (!context) throw new Error('ReadingPreferencesProvider is missing');
  return { ...context, ...resolveReaderTheme(context.preferences.appearance, systemTheme) };
}
