import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { contentStorage } from '../quran-reader/storage/content-storage';
import { loadReaderContent } from '../quran-reader/services/reader-service';
import { createPlansRepository } from './repository';
import { buildPlanIndex, rollCompletedCycle } from './engine';
import { localDate } from './dates';
import { observePlanNotifications, syncPlanReminders } from './notifications';
import { isSequentialPlan, type MemorizationRecord, type ReadingPlan } from './types';
import { reminderFailureMessage } from './reminder-errors';
import { currentGoal } from './goal-limit';
import { maintainArchives } from './archive';

interface PlansContextValue {
  plans: ReadingPlan[]; memorization: MemorizationRecord[]; ready: boolean; error: string; reminderError: string; today: string;
  commit: (change: (plans: ReadingPlan[]) => ReadingPlan[]) => Promise<void>;
  retry: () => void;
}
const Context = createContext<PlansContextValue | null>(null);
export function PlansProvider({ children }: PropsWithChildren) {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [memorization, setMemorization] = useState<MemorizationRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [archiveError, setArchiveError] = useState('');
  const [today, setToday] = useState(localDate);
  const [revision, setRevision] = useState(0);
  const [clockRevision, setClockRevision] = useState(0);
  const clockKey = useRef(`${localDate()}:${new Date().getTimezoneOffset()}`);
  const repository = useRef(createPlansRepository(contentStorage));
  useEffect(() => {
    let active = true;
    void repository.current.load().then(value => { if (active) { setPlans(value); setMemorization(repository.current.memorization()); setReady(true); setError(''); } })
      .catch(() => { if (active) setError('تعذر تحميل الأهداف المحفوظة. بياناتك لم تُستبدل. أعد المحاولة.'); });
    return () => { active = false; };
  }, [revision]);
  const commit = useCallback(async (change: (plans: ReadingPlan[]) => ReadingPlan[]) => {
    const value = await repository.current.update(change);
    setPlans(value);
    setMemorization(repository.current.memorization());
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void commit(items => maintainArchives(items, today))
      .then(() => { if (active) setArchiveError(''); })
      .catch(() => { if (active) setArchiveError('تعذر تنظيف الأرشيف. بياناتك محفوظة؛ أعد المحاولة.'); });
    return () => { active = false; };
  }, [ready, today, clockRevision, commit]);
  useEffect(() => {
    const refresh = (force = false) => {
      const date = localDate(), key = `${date}:${new Date().getTimezoneOffset()}`;
      setToday(date);
      if (force || key !== clockKey.current) { clockKey.current = key; setClockRevision(x => x + 1); }
    };
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(true); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void syncPlanReminders(plans).then(() => { if (active) setReminderError(''); })
      .catch(e => { if (active) setReminderError(reminderFailureMessage(e)); });
    return () => { active = false; };
  }, [plans, ready, clockRevision]);
  useEffect(() => {
    if (!ready) return;
    for (const plan of plans) if (isSequentialPlan(plan) && plan.status === 'completed' && plan.repeat && plan.cycle.completedOn && plan.cycle.completedOn < today) {
      void loadReaderContent(undefined, plan.riwayah).then(content => {
        const index = buildPlanIndex(content.data);
        return commit(items => items.map(p => p.id === plan.id && isSequentialPlan(p) && p.status === 'completed' && p.repeat
          ? currentGoal(items, p.id) ? { ...p, repeat: false } : rollCompletedCycle(p, index, today)
          : p));
      }).catch(() => { setError('تعذر بدء دورة جديدة. أعد فتح الهدف بعد تحميل مصحفه.'); });
    }
  }, [plans, ready, today, commit]);
  return <Context.Provider value={{ plans, memorization, ready, error: error || archiveError, reminderError, today, commit, retry: () => { setRevision(x => x + 1); setClockRevision(x => x + 1); } }}>{children}</Context.Provider>;
}
export function usePlans() {
  const value = useContext(Context);
  if (!value) throw new Error('PlansProvider is missing');
  return value;
}
export function PlanNotificationObserver() {
  const navigation = useRootNavigationState();
  const { ready } = usePlans();
  useEffect(() => {
    if (!ready || !navigation?.key) return;
    return observePlanNotifications(id => router.push({ pathname: '/plans/[id]', params: { id } }));
  }, [ready, navigation?.key]);
  return null;
}
