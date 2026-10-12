import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { GoalCardFrame, GoalProgress, useGoalStart } from './goal-card';
import { shortDate } from './presentation';
import { formatList, t } from '@/i18n';
import { quarterAmount, quarterLabel, spanCount } from './memorization';
import type { AyahSpan, MemorizationPlan } from './types';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { HeroPanel, JuzRing, juzShares } from './plan-detail-components';

/**
 * What is memorized, as the mushaf's thirty ajza' round a ring: a juz' fills with gold as it is
 * memorized, the juz' being memorized now is ringed, and the share of the whole Quran is written
 * in the middle. Under it, how many ajza' are whole and where memorizing is now.
 */
export function MemorizationHero({ index, ranges, compact = false }: { index: PlanIndex; ranges: AyahSpan[]; compact?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const quarters = quarterAmount(index, ranges), total = index.quarters.length - 1;
  const done = spanCount(ranges) === index.ayahs.length;
  const percent = done ? 100 : Math.min(99, Math.floor(quarters / total * 100));
  const shares = juzShares(index, ranges);
  const complete = shares.filter(x => x >= 1).length;
  const current = shares.findIndex(x => x < 1);
  const summary = complete === 30 ? t('memorization.juzChart.all') : t('memorization.juzChart.complete', { count: complete });
  return <HeroPanel title={done ? t('memorization.hero.complete') : quarters ? t('memorization.hero.growing') : t('memorization.hero.start')}
    detail={t('memorization.hero.summary', { count: spanCount(ranges), amount: Math.round(quarters) ? t('memorization.hero.approximately', { amount: quarterLabel(Math.round(quarters)) }) : quarterLabel(0) })}
    figure={<JuzRing done={shares} current={current} size={compact ? 212 : 244} percent={percent}
      label={formatList([t('memorization.hero.progressLabel'), t('memorization.percent', { percent }), t('memorization.hero.label'), current >= 0 ? t('memorization.juzChart.labelWithCurrent', { summary, juz: current + 1 }) : summary])}>
      <Text style={{ color: p.foreground, fontSize: compact ? 36 : 42, lineHeight: compact ? 56 : 64, fontFamily: 'ReaderNaskhBold' }}>{t('memorization.percent', { percent })}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('memorization.hero.label')}</Text>
    </JuzRing>}>
    {!compact && <View style={{ alignItems: 'center', gap: 2, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '700' }}>{summary}</Text>
        {complete < 30 && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.juzChart.outOfThirty')}</Text>}
      </View>
      {current >= 0 && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{shares[current] > 0 ? t('memorization.juzChart.currentWithProgress', { juz: current + 1, percent: Math.round(shares[current] * 100) }) : t('memorization.juzChart.current', { juz: current + 1 })}</Text>}
    </View>}
  </HeroPanel>;
}

/** A memorization goal on the list: one bead a juz' memorized whole. */
export function MemorizationGoalCard({ plan, today }: { plan: MemorizationPlan; today: string }) {
  const { index, next, start } = useGoalStart(plan, today);
  const fraction = index ? quarterAmount(index, plan.memorized) / (index.quarters.length - 1) : null;
  const percent = spanCount(plan.memorized) === plan.totalAyahs ? 100 : fraction === null ? null : Math.min(99, Math.floor(fraction * 100));
  const whole = index ? juzShares(index, plan.memorized).filter(x => x >= 1).length : 0;
  const status = plan.status === 'archived' ? t('goals.status.archived') : plan.status === 'paused' ? t('goals.status.paused') : plan.status === 'completed' ? t('memorization.card.completed') : next?.due ? t('memorization.card.due') : t('memorization.card.next', { date: shortDate(next!.date) });
  return <GoalCardFrame id={plan.id} name={plan.name} kind="memorization" summary={t('memorization.card.description', { amount: quarterLabel(plan.goal.weeklyQuarters) })}
    status={status} due={!!next?.due} done={!next?.due && plan.progress.some(log => log.date === today && log.finished)} muted={plan.status !== 'active'} start={start}
    portion={next?.due && index ? ayahRangeLabel(index, next.start, next.end) : undefined}
    progress={<GoalProgress count={30} done={whole} size={7} max={30} label={t('memorization.memorizedAyahs', { count: spanCount(plan.memorized) })} value={percent === null ? undefined : t('memorization.percent', { percent })} />} />;
}
