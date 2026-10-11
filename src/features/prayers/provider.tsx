import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import { applyPrayers, decodePrayers, defaultPrayerState, PRAYERS_KEY, type AlertKind, type PrayerChange, type PrayerState } from './settings';
import { observePrayerNotifications, PrayerAlertError, requestNotifications, requestPrayerAlerts, syncPrayerAlerts } from './notifications';
import { syncTimesNotification } from './times-notification';
import { syncScreenStyle } from './athan-screen';
import type { PrayerId } from './times';

export type AlertIssue = 'permission' | 'unavailable' | 'sync';

interface PrayersContext {
  state: PrayerState;
  ready: boolean;
  /** Saving failed; settings still apply and saving is retried. */
  error: boolean;
  /** Why alerts are not (all) scheduled, if they are not. */
  alertIssue: AlertIssue | null;
  /** Counts the app's returns to the foreground, for checks that may have changed meanwhile. */
  revision: number;
  update: (change: PrayerChange) => void;
  /** Turns alerts on (asking for notifications first) or off. Resolves false when not allowed. */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  /** Sets one prayer's alert; choosing one while alerts are off turns them on. */
  setAlert: (prayer: PrayerId, kind: AlertKind) => Promise<boolean>;
  /** Turns the prayer times notification on (asking for notifications first) or off. Resolves false when not allowed. */
  setTimesNotification: (on: boolean) => Promise<boolean>;
}

const Context = createContext<PrayersContext | null>(null);

export function PrayersProvider({ children }: PropsWithChildren) {
  const { today } = usePlans();
  const [store] = useState(() => createPersistedStore<PrayerState, PrayerChange>({
    storage: contentStorage, key: PRAYERS_KEY, fallback: defaultPrayerState, decode: decodePrayers, apply: applyPrayers,
  }));
  useEffect(() => store.start(), [store]);
  const { value: state, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [alertIssue, setAlertIssue] = useState<AlertIssue | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => { if (next === 'active') setRevision((x) => x + 1); });
    return () => listener.remove();
  }, []);
  // Every change of the settings, each day and each return to the app tops up the schedule.
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void syncPrayerAlerts(state).then(
      () => { if (active) setAlertIssue(null); },
      (e) => { if (active) setAlertIssue(e instanceof PrayerAlertError && e.issue === 'permission' ? 'permission' : 'sync'); });
    return () => { active = false; };
  }, [ready, state, today, revision]);
  // The times notification gets the coming days again on the same occasions, and the athan's screen
  // its look, once changes settle
  // (Android drops a burst of updates, such as a few taps on a minute adjustment).
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { syncTimesNotification(state); syncScreenStyle(state.screen); }, 400);
    return () => clearTimeout(timer);
  }, [ready, state, today, revision]);

  const update = useCallback((change: PrayerChange) => store.update(change), [store]);
  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      try { await requestPrayerAlerts(store.getSnapshot().value.takbir); } catch (e) {
        setAlertIssue(e instanceof PrayerAlertError ? e.issue : 'unavailable');
        return false;
      }
    }
    setAlertIssue(null);
    store.update({ enabled });
    return true;
  }, [store]);
  const setAlert = useCallback(async (prayer: PrayerId, kind: AlertKind) => {
    const current = store.getSnapshot().value;
    if (kind !== 'off' && !current.enabled && !(await setEnabled(true))) return false;
    store.update({ alerts: { ...store.getSnapshot().value.alerts, [prayer]: kind } });
    return true;
  }, [store, setEnabled]);

  const setTimesNotification = useCallback(async (on: boolean) => {
    if (on && !(await requestNotifications())) return false;
    store.update({ timesNotification: on });
    return true;
  }, [store]);

  const value = useMemo(() => ({ state, ready, error, alertIssue, revision, update, setEnabled, setAlert, setTimesNotification }),
    [state, ready, error, alertIssue, revision, update, setEnabled, setAlert, setTimesNotification]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePrayers() {
  const value = useContext(Context);
  if (!value) throw new Error('PrayersProvider is missing');
  return value;
}

/** Opens the prayer times from their notifications once navigation is ready. */
export function PrayerNotificationObserver() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    return observePrayerNotifications(() => router.push('/prayers'));
  }, [navigation?.key]);
  return null;
}

/** The current time, updated every `interval` milliseconds while mounted. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}
