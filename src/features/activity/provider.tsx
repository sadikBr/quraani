import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import { registerDocument } from '@/features/account/registry';
import { storeDocument } from '@/features/account/sources';
import { ACTIVITY_KEY, activityOf, countedDays, decodeActivity, defaultActivityState, markRead, mergeActivity, READING_SECONDS, streakOf, type ActivityState, type Streak } from './log';

interface ActivityContext {
  days: Record<string, number>; streak: Streak; ready: boolean; today: string;
  /** Today was read in the mushaf (see `useCountsAsReading`). */
  read: () => void;
}
const Context = createContext<ActivityContext | null>(null);
type Change = { fromGoals: Record<string, number>; today: string } | { read: string };

/**
 * The days with something recorded, kept on the phone as the goals change, and the run of days
 * they make. With an account it comes to a phone that has none of its own (`restore`): each phone
 * then keeps its own, taken from the same goals.
 */
export function ActivityProvider({ children }: PropsWithChildren) {
  const { plans, ready: plansReady, today } = usePlans();
  const [store] = useState(() => createPersistedStore<ActivityState, Change>({
    storage: contentStorage, key: ACTIVITY_KEY, fallback: defaultActivityState, decode: decodeActivity,
    apply: (state, change) => 'read' in change ? markRead(state, change.read) : mergeActivity(state, change.fromGoals, change.today),
  }));
  useEffect(() => store.start(), [store]);
  useEffect(() => registerDocument(storeDocument(store, ACTIVITY_KEY, { decode: decodeActivity, fallback: defaultActivityState, policy: 'restore' })), [store]);
  const { value: state, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  // What the goals say now is taken in whenever they change, once both have been read.
  useEffect(() => {
    if (!ready || !plansReady) return;
    const fromGoals = activityOf(plans);
    if (mergeActivity(state, fromGoals, today) !== state) store.update({ fromGoals, today });
  }, [store, state, ready, plans, plansReady, today]);
  const read = useCallback(() => { if (store.getSnapshot().loaded) store.update({ read: today }); }, [store, today]);
  const value = useMemo(() => { const days = countedDays(state); return { days, streak: streakOf(days, today), ready: ready && plansReady, today, read }; }, [state, today, ready, plansReady, read]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useActivity() {
  const value = useContext(Context);
  if (!value) throw new Error('ActivityProvider is missing');
  return value;
}

// The time the mushaf was open today, across its screens (it is one reading).
const tally = { day: '', seconds: 0 };
const TICK = 15;

/**
 * Counts the time the mushaf is shown (`shown`: its screen is the one in front), while the app is
 * in front: a few minutes in a day make it a day read, goal or no goal.
 */
export function useCountsAsReading(shown: boolean) {
  const { today, read, days } = useActivity();
  const counted = !!days[today];
  const done = useRef(false);
  useEffect(() => {
    if (!shown || counted) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active' || done.current) return;
      if (tally.day !== today) { tally.day = today; tally.seconds = 0; }
      tally.seconds += TICK;
      if (tally.seconds >= READING_SECONDS) { done.current = true; read(); }
    }, TICK * 1000);
    return () => clearInterval(timer);
  }, [shown, counted, today, read]);
}
