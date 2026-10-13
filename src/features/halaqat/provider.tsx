import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import { absent, activeStudents, applyHalaqat, decodeHalaqat, defaultHalaqatState, entryOf, HALAQAT_KEY, heard, type HalaqatChange, type HalaqatState } from './model';
import { observeHalaqaNotifications, syncHalaqaReminders } from './notifications';
import { registerHalaqat } from '@/features/account/registry';
import { halaqatSource } from '@/features/account/sources';

interface HalaqatContext {
  state: HalaqatState;
  /** The saved halaqat have been read (or reading them failed). */
  ready: boolean;
  /** Reading or saving failed; changes are kept and saving is retried. */
  error: boolean;
  /** Scheduling the reminders failed. */
  reminderError: boolean;
  change: (change: HalaqatChange) => void;
}

const Context = createContext<HalaqatContext | null>(null);

/** The halaqat, saved on the phone as they change, and the reminders before their sessions. */
export function HalaqatProvider({ children }: PropsWithChildren) {
  const { today } = usePlans();
  const [store] = useState(() => createPersistedStore<HalaqatState, HalaqatChange>({
    storage: contentStorage, key: HALAQAT_KEY, fallback: defaultHalaqatState, decode: decodeHalaqat, apply: applyHalaqat,
  }));
  useEffect(() => store.start(), [store]);
  useEffect(() => registerHalaqat(halaqatSource(store)), [store]);
  const { value: state, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [reminderError, setReminderError] = useState(false);
  // What the reminders depend on: each halaqa's name, days, time and reminder, whether it has
  // participants, and which sessions are already done. Rescheduled when that changes, and each day.
  const schedule = JSON.stringify(state.halaqat.map((h) => {
    const students = activeStudents(h);
    return [h.id, h.name, h.weekdays, h.time, h.reminder, students.length,
      h.sessions.filter((s) => s.date >= today && students.every((p) => heard(entryOf(s, p.id)) || absent(entryOf(s, p.id)))).map((s) => s.date)];
  }));
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void syncHalaqaReminders(state).then(() => { if (active) setReminderError(false); }, () => { if (active) setReminderError(true); });
    return () => { active = false; };
    // `state` is read as it is when what the reminders depend on (`schedule`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, schedule, today]);
  const value = useMemo(() => ({ state, ready, error, reminderError, change: (change: HalaqatChange) => store.update(change) }), [state, ready, error, reminderError, store]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useHalaqat() {
  const value = useContext(Context);
  if (!value) throw new Error('HalaqatProvider is missing');
  return value;
}

export function useHalaqa(id: string | undefined) {
  const { state, ready } = useHalaqat();
  return { halaqa: state.halaqat.find((h) => h.id === id), ready };
}

/** Opens the session a reminder was about. */
export function HalaqaNotificationObserver() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    return observeHalaqaNotifications((halaqa, date) => router.push({ pathname: '/halaqat/session', params: { halaqa, date } }));
  }, [navigation?.key]);
  return null;
}
