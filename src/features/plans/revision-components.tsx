import { useMemo } from 'react';
import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { GoalCardFrame, GoalProgress, useGoalStart } from './goal-card';
import { shortDate } from './presentation';
import { formatList, formatNumber, t } from '@/i18n';
import { mergeSpans, quarterLabel, spanCount } from './memorization';
import { normalizeRevision, revisionDay, revisionPassLength, revisionPassProgress } from './revision';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { HeroPanel, JuzRing, RingKey, juzShares } from './plan-detail-components';
import type { RevisionPlan } from './types';

export function revisionDaysLabel(count: number) { return t('revision.days', { count }); }
export function dailyAmountLabel(quarters: number) { return t('revision.dailyAmount', { amount: quarterLabel(quarters) }); }

/**
 * The pass round the ring of the thirty ajza': a juz' fills with gold as this pass revises it,
 * what is memorized and still ahead is outlined in gold, and the juz' being revised is ringed.
 */
export function RevisionHero({ plan, index, compact = false }: { plan: RevisionPlan; index: PlanIndex; compact?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const progress = useMemo(() => revisionPassProgress(plan), [plan]), days = useMemo(() => revisionPassLength(plan), [plan]);
  const percent = Math.min(progress >= 1 ? 100 : 99, Math.floor(progress * 100));
  const empty = !plan.memorized.length;
  const cursor = normalizeRevision(plan).cursor, memorized = mergeSpans(plan.memorized);
  const held = juzShares(index, memorized);
  const revised = juzShares(index, memorized.flatMap(r => r.start >= cursor ? [] : [{ start: r.start, end: Math.min(r.end, cursor) }]));
  const current = held.findIndex((x, i) => x - revised[i] > 0.0001);
  const count = held.filter(x => x > 0).length;
  const pass = empty ? t('revision.title') : t('revision.hero.pass', { ordinal: ordinalLabel(plan.pass) });
  return <HeroPanel title={empty ? t('revision.hero.emptyTitle') : progress === 0 ? t('revision.hero.newPass') : t('revision.hero.steady')}
    detail={empty ? t('revision.hero.emptyDetail') : `${t('revision.ayahCount', { count: spanCount(plan.memorized) })} · ${t('revision.hero.passLength', { days: revisionDaysLabel(days) })}`}
    figure={<JuzRing done={revised} held={held} current={current} size={compact ? 212 : 244} percent={percent}
      label={formatList([t('revision.hero.progressLabel'), t('revision.percent', { percent }), pass, ...(empty ? [] : [t('revision.band.label', { count })])])}>
      <Text style={{ color: p.foreground, fontSize: compact ? 36 : 42, lineHeight: compact ? 56 : 64, fontFamily: 'ReaderNaskhBold' }}>{t('revision.percent', { percent })}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{pass}</Text>
    </JuzRing>}>
    {!compact && !empty && <View style={{ alignItems: 'center', gap: 8, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '700' }}>{t('revision.band.juzCount', { count })}</Text>
        {current >= 0 && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.band.current', { juz: current + 1 })}</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <RingKey filled label={t('revision.band.revised')} />
        <RingKey filled={false} label={t('revision.band.ahead')} />
      </View>
    </View>}
  </HeroPanel>;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'] as const;
function ordinalLabel(n: number) {
  const ordinal = ORDINALS[n - 1];
  return ordinal ? t(`revision.hero.ordinal.${ordinal}`) : formatNumber(n);
}

/** A revision goal on the list: one bead a day of the pass. */
export function RevisionGoalCard({ plan, today }: { plan: RevisionPlan; today: string }) {
  const { index, next, start } = useGoalStart(plan, today);
  const day = revisionDay(plan, today);
  const doneToday = plan.log.some(log => log.date === today);
  const progress = revisionPassProgress(plan);
  const days = revisionPassLength(plan);
  const passDays = plan.log.filter(log => log.pass === plan.pass).length;
  const status = plan.status === 'archived' ? t('goals.status.archived') : plan.status === 'paused' ? t('goals.status.paused') : !plan.memorized.length ? t('revision.card.chooseToStart')
    : day?.due ? t('revision.card.due') : doneToday ? t('revision.card.doneToday') : day ? t('revision.card.next', { date: shortDate(day.date) }) : '';
  return <GoalCardFrame id={plan.id} name={plan.name} kind="revision" summary={`${t('goals.types.revision')} · ${t('revision.perSession', { amount: quarterLabel(plan.goal.dailyQuarters) })}`}
    status={status} due={!!day?.due} done={doneToday && !day?.due} muted={plan.status !== 'active'} start={start}
    portion={day?.due && next && index ? ayahRangeLabel(index, next.start, day.spans.at(-1)!.end) : undefined}
    progress={plan.memorized.length ? <GoalProgress count={Math.max(1, days)} done={Math.min(passDays, days)}
      label={`${t('revision.passNumber', { pass: plan.pass })} · ${plan.log.length ? t('revision.card.daysRevised', { count: plan.log.length }) : t('revision.card.notStarted')}`}
      value={t('revision.percent', { percent: Math.floor(progress * 100) })} /> : undefined} />;
}
