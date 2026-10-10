import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '@/components/ui';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { withAlpha } from '../quran-reader/design';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
import { shortDate } from './presentation';
import { t } from '@/i18n';
import { nextMemorizationPortion, quarterAmount, quarterLabel, spanCount } from './memorization';
import type { AyahSpan, MemorizationPlan } from './types';
import type { PlanIndex } from './engine';
import { usePlanIndex } from './use-plan-index';
import { d } from './plan-detail-components';

export function MemorizationHero({ index, ranges, compact = false }: { index: PlanIndex; ranges: AyahSpan[]; compact?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const quarters = quarterAmount(index, ranges), total = index.quarters.length - 1;
  const done = spanCount(ranges) === index.ayahs.length;
  const percent = done ? 100 : Math.min(99, Math.floor(quarters / total * 100));
  const circumference = 2 * Math.PI * 47;
  return <Card style={d.hero}>
    <View style={[d.row, { gap: 14 }]}>
      <View style={d.grow}><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('memorization.hero.label')}</Text>
        <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', marginVertical: 4 }}>{done ? t('memorization.hero.complete') : quarters ? t('memorization.hero.growing') : t('memorization.hero.start')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('memorization.hero.summary', { ayahs: spanCount(ranges), amount: quarterLabel(Math.round(quarters)) })}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={t('memorization.hero.progressLabel')} accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden><Circle cx={54} cy={54} r={47} fill="none" stroke={withAlpha(p.primary, 0.2)} strokeWidth={8} />
          {quarters > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.primary} strokeWidth={8} strokeLinecap="round" strokeDasharray={[circumference * quarters / total, circumference]} transform="rotate(-90 54 54)" />}</Svg>
        <View style={d.ringText}><Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>{t('memorization.percent', { percent })}</Text></View>
      </View>
    </View>
    {!compact && <JuzChart index={index} ranges={ranges} />}
  </Card>;
}
export function MemorizationGoalCard({ plan, today }: { plan: MemorizationPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const { index } = usePlanIndex(plan.riwayah);
  const next = nextMemorizationPortion(plan, today);
  const fraction = index ? quarterAmount(index, plan.memorized) / (index.quarters.length - 1) : null;
  const status = plan.status === 'archived' ? t('goals.status.archived') : plan.status === 'paused' ? t('goals.status.paused') : plan.status === 'completed' ? t('memorization.card.completed') : next?.due ? t('memorization.card.due') : t('memorization.card.next', { date: shortDate(next!.date) });
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!next?.due}>
    <GoalCardHeading name={plan.name} description={t('memorization.card.description', { amount: quarterLabel(plan.goal.weeklyQuarters) })} icon="book"
      trailing={fraction !== null ? <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600' }}>{t('memorization.percent', { percent: spanCount(plan.memorized) === plan.totalAyahs ? 100 : Math.min(99, Math.floor(fraction * 100)) })}</Text> : undefined} />
    <GoalProgress value={fraction ?? 0} label={t('memorization.memorizedAyahs', { ayahs: spanCount(plan.memorized) })} />
  </GoalCardFrame>;
}

/**
 * The thirty ajza' as one band, read from the right like the mushaf. A
 * memorized juz is solid gold, a juz in progress fills from its right edge,
 * and the juz you are on is pointed out below. One shape, not thirty boxes.
 */
function JuzChart({ index, ranges }: { index: PlanIndex; ranges: AyahSpan[] }) {
  const { palette: p } = useReadingPreferences();
  const juzs = index.juzs.slice(0, -1).map((start, i) => {
    const end = index.juzs[i + 1];
    const memorized = ranges.reduce((n, r) => n + Math.max(0, Math.min(end, r.end) - Math.max(start, r.start)), 0);
    return { number: i + 1, fraction: memorized / (end - start) };
  });
  const complete = juzs.filter(j => j.fraction >= 1).length;
  const current = juzs.find(j => j.fraction < 1);
  const summary = complete === 30 ? t('memorization.juzChart.all') : t('memorization.juzChart.complete', { count: complete });
  return <View style={{ gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16 }}>
    <View style={[d.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{summary}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.juzChart.outOfThirty')}</Text>
    </View>
    <View accessible accessibilityLabel={current ? t('memorization.juzChart.labelWithCurrent', { summary, juz: current.number }) : summary} style={{ flexDirection: 'row', gap: 2, height: 14 }}>
      {juzs.map(j => <View key={j.number} style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 2, backgroundColor: withAlpha(p.primary, 0.15) }}>
        <View style={{ width: `${j.fraction * 100}%`, height: '100%', backgroundColor: p.primary }} />
      </View>)}
    </View>
    <View style={{ flexDirection: 'row', gap: 2 }} aria-hidden>
      {juzs.map(j => <View key={j.number} style={{ flex: 1, alignItems: 'center' }}>
        {current?.number === j.number && <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: p.primary }} />}
      </View>)}
    </View>
    {current && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{current.fraction > 0 ? t('memorization.juzChart.currentWithProgress', { juz: current.number, percent: Math.round(current.fraction * 100) }) : t('memorization.juzChart.current', { juz: current.number })}</Text>}
  </View>;
}
