import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useActivity } from '@/features/activity/provider';
import { addDays } from '@/features/plans/dates';
import { nextPortion, type PlanIndex } from '@/features/plans/engine';
import { goalsOverview } from '@/features/plans/overview';
import { shortDate } from '@/features/plans/presentation';
import { usePlans } from '@/features/plans/provider';
import type { ReadingPlan } from '@/features/plans/types';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { athanModule, setWirdWidget, type WirdWidgetContent } from '@/features/prayers/athan-native';
import { describePortion } from '@/features/quran-reader/components/home/home-screen';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';

type Words = WirdWidgetContent['today'];

/**
 * What the wird widget says on a day, from the goals as they stand: the first portion due (or
 * left over from before), else the goal that comes next. `index` reads portions of its riwayah;
 * a goal of the other one is named without its portion.
 */
export function wirdWords(plans: ReadingPlan[], day: string, index: PlanIndex | undefined, riwayah: string): { words: Words; plan?: ReadingPlan } | null {
  const overview = goalsOverview(plans, day);
  if (!overview.all.length) return null;
  const portion = (plan: ReadingPlan, start: number, end: number) => index && plan.riwayah === riwayah ? describePortion(plan, index, start, end) : '';
  const due = overview.due[0];
  if (due) {
    const next = nextPortion(due, day)!;
    const text = portion(due, next.start, next.end);
    return { plan: due, words: { heading: next.date < day ? t('prayers.widget.wirdWidget.overdue') : t('prayers.widget.wirdWidget.due'), title: text || due.name, detail: text ? due.name : '' } };
  }
  const upcoming = overview.all.map((plan) => ({ plan, next: nextPortion(plan, day) })).filter((x) => x.next)
    .sort((a, b) => a.next!.date.localeCompare(b.next!.date))[0];
  return { plan: upcoming?.plan, words: { heading: t('prayers.widget.wirdWidget.due'), title: t('prayers.widget.wirdWidget.free'),
    detail: upcoming ? t('prayers.widget.wirdWidget.next', { name: upcoming.plan.name, date: shortDate(upcoming.next!.date) }) : '' } };
}

/**
 * Keeps the wird widget's words current (Android app): today's, and those of the days after for
 * as long as the app is not opened again. Nothing without the module.
 */
export function WirdWidgetObserver() {
  const { plans, ready, today } = usePlans();
  const { streak, ready: activityReady } = useActivity();
  const { preferences } = useReadingPreferences();
  // Portions are read in the riwayah of the goal due first.
  const riwayah = (ready && goalsOverview(plans, today).due[0]?.riwayah) || preferences.riwayah;
  const { index } = usePlanIndex(riwayah);
  useEffect(() => {
    if (!athanModule || !ready || !activityReady) return;
    const timer = setTimeout(() => {
      const now = wirdWords(plans, today, index, riwayah);
      if (!now) { setWirdWidget(null); return; }
      const overview = goalsOverview(plans, today);
      const tomorrow = addDays(today, 1);
      const later = wirdWords(plans, tomorrow, index, riwayah) ?? now;
      // Everything due today is read: said so today, with what comes next under it.
      const done = !overview.due.length && overview.completedToday > 0;
      setWirdWidget({
        day: today,
        today: done ? { heading: t('prayers.widget.wirdWidget.done'), title: t('prayers.widget.wirdWidget.doneTitle'), detail: now.words.detail } : now.words,
        later: later.words,
        streak: streak.current ? t('activity.run', { count: streak.current }) : '',
        // The run stands through tomorrow once today is in it, and through today otherwise.
        streakUntil: streak.today ? tomorrow : today,
        url: Linking.createURL(now.plan ? `plans/${now.plan.id}` : 'plans'),
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [plans, ready, today, index, riwayah, streak, activityReady]);
  return null;
}
