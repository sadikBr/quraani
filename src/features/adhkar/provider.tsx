import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import type { CollectionId } from './content';
import { ADHKAR_KEY, applyAdhkar, collectionProgress, decodeAdhkar, defaultAdhkarState, type AdhkarChange, type AdhkarState, type ReminderKind, type ReminderSetting } from './progress';
import { observeAdhkarNotifications, syncAdhkarReminders } from './notifications';

interface AdhkarContext {
  state: AdhkarState;
  /** Today's local date; counts from another day no longer apply. */
  today: string;
  ready: boolean;
  /** Saving failed; counting goes on and saving is retried. */
  error: boolean;
  reminderError: boolean;
  step: (collection: CollectionId, key: string, delta: 1 | -1) => void;
  reset: (collection: CollectionId) => void;
  setReminder: (kind: ReminderKind, value: ReminderSetting) => void;
  /** Counts one on the misbaha. */
  tasbih: () => void;
  /** Sets the misbaha's count: 0 restarts it. */
  setMisbaha: (count: number) => void;
  /** Sets the dhikr text's size (a step of `TEXT_SCALES`). */
  setTextSize: (step: number) => void;
}

const Context = createContext<AdhkarContext | null>(null);

export function AdhkarProvider({ children }: PropsWithChildren) {
  const { today } = usePlans();
  const [store] = useState(() => createPersistedStore<AdhkarState, AdhkarChange>({
    storage: contentStorage, key: ADHKAR_KEY, fallback: defaultAdhkarState, decode: decodeAdhkar, apply: applyAdhkar,
  }));
  useEffect(() => store.start(), [store]);
  const { value: state, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [reminderError, setReminderError] = useState(false);
  // Reschedule when reminders change, when a morning or evening is completed, and each new day.
  const morningDone = collectionProgress(state, 'morning', today).complete;
  const eveningDone = collectionProgress(state, 'evening', today).complete;
  const { morning, evening } = state.reminders;
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void syncAdhkarReminders(state).then(() => { if (active) setReminderError(false); }, () => { if (active) setReminderError(true); });
    return () => { active = false; };
    // `state` is read for the counts behind morningDone/eveningDone; other count changes need no new schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, today, morningDone, eveningDone, morning, evening]);
  const step = useCallback((collection: CollectionId, key: string, delta: 1 | -1) => store.update({ type: 'step', day: today, collection, key, delta }), [store, today]);
  const reset = useCallback((collection: CollectionId) => store.update({ type: 'reset', day: today, collection }), [store, today]);
  const setReminder = useCallback((kind: ReminderKind, value: ReminderSetting) => store.update({ type: 'reminder', kind, value }), [store]);
  const tasbih = useCallback(() => store.update({ type: 'tasbih' }), [store]);
  const setMisbaha = useCallback((count: number) => store.update({ type: 'misbaha', count }), [store]);
  const setTextSize = useCallback((step: number) => store.update({ type: 'textSize', step }), [store]);
  const value = useMemo(() => ({ state, today, ready, error, reminderError, step, reset, setReminder, tasbih, setMisbaha, setTextSize }),
    [state, today, ready, error, reminderError, step, reset, setReminder, tasbih, setMisbaha, setTextSize]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdhkar() {
  const value = useContext(Context);
  if (!value) throw new Error('AdhkarProvider is missing');
  return value;
}

/** Opens the adhkar a reminder was about once navigation is ready. */
export function AdhkarNotificationObserver() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    return observeAdhkarNotifications((id) => router.push({ pathname: '/adhkar/[id]', params: { id } }));
  }, [navigation?.key]);
  return null;
}
