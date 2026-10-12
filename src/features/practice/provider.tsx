import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { usePlans } from '@/features/plans/provider';
import { tally, type Grade, type PracticeOptions, type PracticePlace } from './engine';
import { applyPractice, decodePractice, defaultPracticeState, PRACTICE_KEY, riwayahPractice, type PracticeChange, type PracticePick, type PracticeSettings, type PracticeState } from './progress';

/** A session in progress. It lives only while the app runs; each grade is saved as it is given. */
export interface PracticeSession {
  id: number;
  riwayah: Riwayah;
  options: PracticeOptions;
  places: PracticePlace[];
  grades: (Grade | null)[];
  /** Surah questions: the surah chosen (its number), once answered. */
  answers: (number | null)[];
  /** Ayahs in the edition the places were chosen in. */
  total: number;
  /** An exam: mixed questions, no help while reciting, and a score at the end. */
  exam: boolean;
  /** The exam's result was saved (once, when it is finished). */
  recorded: boolean;
  /** Listening to someone else: the text is shown to follow, and nothing is recorded. */
  helper: boolean;
}

export interface SessionKind {
  /** False for a retry of the same session's places: it keeps the session number. */
  counted?: boolean;
  exam?: boolean;
  helper?: boolean;
}

interface PracticeContext {
  state: PracticeState;
  ready: boolean;
  /** Saving failed; practice goes on and saving is retried. */
  error: boolean;
  today: string;
  session: PracticeSession | null;
  setSettings: (settings: PracticeSettings) => void;
  /** Saves a selection under its id, in an edition of `total` ayahs. */
  savePick: (riwayah: Riwayah, pick: PracticePick, total: number) => void;
  deletePick: (riwayah: Riwayah, id: string) => void;
  begin: (riwayah: Riwayah, options: PracticeOptions, places: PracticePlace[], total: number, kind?: SessionKind) => void;
  grade: (position: number, grade: Grade) => void;
  /** A surah question is answered: graded at once, right or wrong. */
  answer: (position: number, surah: number) => void;
  /** The exam is finished: its result is saved, once. */
  finishExam: () => void;
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
  const savePick = useCallback((riwayah: Riwayah, pick: PracticePick, total: number) => store.update({ type: 'pick', riwayah, pick, total }), [store]);
  const deletePick = useCallback((riwayah: Riwayah, id: string) => store.update({ type: 'unpick', riwayah, id }), [store]);
  const begin = useCallback((riwayah: Riwayah, options: PracticeOptions, places: PracticePlace[], total: number, { counted = true, exam = false, helper = false }: SessionKind = {}) => {
    // Listening to someone else is not one's own session.
    if (counted && !helper) store.update({ type: 'begin', riwayah });
    setSession({ id: ++sessions, riwayah, options, places, grades: places.map(() => null), answers: places.map(() => null), total, exam, recorded: false, helper });
  }, [store]);
  const grade = useCallback((position: number, value: Grade) => {
    const place = session?.places[position];
    // A finished exam's grades stand, as its saved result does.
    if (!session || !place || place.kind === 'surah' || (session.exam && session.recorded)) return;
    const previous = session.grades[position];
    if (previous === value) return;
    if (!session.helper) store.update({ type: 'grade', riwayah: session.riwayah, key: place.key, grade: value, previous, date: today });
    setSession({ ...session, grades: session.grades.map((g, i) => i === position ? value : g) });
  }, [store, today, session]);
  const answer = useCallback((position: number, surah: number) => {
    const place = session?.places[position];
    // One answer per question: the first choice counts.
    if (!session || !place || place.kind !== 'surah' || session.answers[position] !== null) return;
    // The key names the ayah's own surah («2:255»).
    const value: Grade = surah === Number(place.key.split(':')[0]) ? 'good' : 'wrong';
    // Knowing an ayah's surah does not clear a recitation missed there: that stays to review.
    const saved = riwayahPractice(state, session.riwayah).places[place.key];
    if (!session.helper && (value === 'wrong' || !saved || saved.last === 'good')) store.update({ type: 'grade', riwayah: session.riwayah, key: place.key, grade: value, previous: null, date: today });
    setSession({ ...session, grades: session.grades.map((g, i) => i === position ? value : g), answers: session.answers.map((a, i) => i === position ? surah : a) });
  }, [store, today, session, state]);
  const finishExam = useCallback(() => {
    if (!session?.exam || session.recorded || session.grades.some((g) => g === null)) return;
    const counts = tally(session.grades);
    // Someone else's exam is not one's own result: it is only closed.
    if (!session.helper) store.update({ type: 'exam', riwayah: session.riwayah, result: { date: today, total: session.places.length, good: counts.good, hesitant: counts.hesitant, wrong: counts.wrong } });
    setSession({ ...session, recorded: true });
  }, [store, today, session]);
  const value = useMemo(() => ({ state, ready, error, today, session, setSettings, savePick, deletePick, begin, grade, answer, finishExam }),
    [state, ready, error, today, session, setSettings, savePick, deletePick, begin, grade, answer, finishExam]);
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
