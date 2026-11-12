import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import { registerDocument } from '@/features/account/registry';
import { storeDocument } from '@/features/account/sources';
import { ACTIVITY_KEY, activityOf, decodeActivity, defaultActivityState, mergeActivity, streakOf, type ActivityState, type Streak } from './log';

interface ActivityContext { days: Record<string, number>; streak: Streak; ready: boolean; today: string }
const Context = createContext<ActivityContext | null>(null);
interface Merge { fromGoals: Record<string, number>; today: string }

/**
 * The days with something recorded, kept on the phone as the goals change, and the run of days
 * they make. With an account it comes to a phone that has none of its own (`restore`): each phone
 * then keeps its own, taken from the same goals.
 */
export function ActivityProvider({ children }: PropsWithChildren) {
  const { plans, ready: plansReady, today } = usePlans();
  const [store] = useState(() => createPersistedStore<ActivityState, Merge>({
    storage: contentStorage, key: ACTIVITY_KEY, fallback: defaultActivityState, decode: decodeActivity,
    apply: (state, change) => mergeActivity(state, change.fromGoals, change.today),
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
  const value = useMemo(() => ({ days: state.days, streak: streakOf(state.days, today), ready: ready && plansReady, today }), [state, today, ready, plansReady]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useActivity() {
  const value = useContext(Context);
  if (!value) throw new Error('ActivityProvider is missing');
  return value;
}
