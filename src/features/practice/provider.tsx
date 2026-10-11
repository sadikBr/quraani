import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import type { AyahSpan } from '@/features/plans/types';
import { usePlans } from '@/features/plans/provider';
import type { Grade, PracticeOptions, PracticePlace } from './engine';
import { applyPractice, decodePractice, defaultPracticeState, PRACTICE_KEY, riwayahPractice, type PracticeChange, type PracticeSettings, type PracticeState } from './progress';

/** A session in progress. It lives only while the app runs; each grade is saved as it is given. */
export interface PracticeSession {
  id: number;
  riwayah: Riwayah;
  options: PracticeOptions;
  places: PracticePlace[];
  grades: (Grade | null)[];
  /** Ayahs in the edition the places were chosen in. */
  total: number;
}

interface PracticeContext {
  state: PracticeState;
  ready: boolean;
  /** Saving failed; practice goes on and saving is retried. */
  error: boolean;
  today: string;
  session: PracticeSession | null;
  setSettings: (settings: PracticeSettings) => void;
  setCustom: (riwayah: Riwayah, ranges: AyahSpan[], total: number) => void;
  /** `counted` is false for a retry of the same session's places: it keeps the session number. */
  begin: (riwayah: Riwayah, options: PracticeOptions, places: PracticePlace[], total: number, counted?: boolean) => void;
  grade: (position: number, grade: Grade) => void;
}

const Context = createContext<PracticeContext | null>(null);
let sessions = 0;

export function PracticeProvider({ children }: PropsWithChildren) {
  const { today } = usePlans();
  const [store] = useState(() => createPersistedStore<PracticeState, PracticeChange>({
    storage: contentStorage, key: PRACTICE_KEY, fallback: defaultPracticeState, decode: decodePractice, apply: applyPractice,
  }));
  useEffect(() => store.start(), [store]);
  const { value: state, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const setSettings = useCallback((settings: PracticeSettings) => store.update({ type: 'settings', settings }), [store]);
  const setCustom = useCallback((riwayah: Riwayah, ranges: AyahSpan[], total: number) => store.update({ type: 'custom', riwayah, ranges, total }), [store]);
  const begin = useCallback((riwayah: Riwayah, options: PracticeOptions, places: PracticePlace[], total: number, counted = true) => {
    if (counted) store.update({ type: 'begin', riwayah });
    setSession({ id: ++sessions, riwayah, options, places, grades: places.map(() => null), total });
  }, [store]);
  const grade = useCallback((position: number, value: Grade) => {
    const place = session?.places[position];
    if (!session || !place) return;
    const previous = session.grades[position];
    if (previous === value) return;
    store.update({ type: 'grade', riwayah: session.riwayah, key: place.key, grade: value, previous, date: today });
    setSession({ ...session, grades: session.grades.map((g, i) => i === position ? value : g) });
  }, [store, today, session]);
  const value = useMemo(() => ({ state, ready, error, today, session, setSettings, setCustom, begin, grade }),
    [state, ready, error, today, session, setSettings, setCustom, begin, grade]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePractice() {
  const value = useContext(Context);
  if (!value) throw new Error('PracticeProvider is missing');
  return value;
}

/** The saved record of one riwayah. */
export function useRiwayahPractice(riwayah: Riwayah) {
  const { state } = usePractice();
  return riwayahPractice(state, riwayah);
}
