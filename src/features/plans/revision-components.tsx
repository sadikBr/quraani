import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '@/components/ui';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { withAlpha } from '../quran-reader/design';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
import { arabicNumber, shortDate } from './presentation';
import { mergeSpans, quarterLabel, spanCount } from './memorization';
import { normalizeRevision, revisionDay, revisionPassLength, revisionPassProgress } from './revision';
import type { PlanIndex } from './engine';
import { d } from './plan-detail-components';
import type { RevisionPlan } from './types';

export function revisionDaysLabel(count: number) {
  if (count === 1) return 'يوم واحد';
  if (count === 2) return 'يومان';
  if (count >= 3 && count <= 10) return `${arabicNumber(count)} أيام`;
  return `${arabicNumber(count)} يومًا`;
}
export function dailyAmountLabel(quarters: number) { return `${quarterLabel(quarters)} في كل يوم مراجعة`; }

/**
 * The pass as a ring and the memorized ajza' as one band, read from the right
 * like the mushaf: gold is what this pass has revised, the pale fill is what is
 * memorized and still ahead.
 */
export function RevisionHero({ plan, index, compact = false }: { plan: RevisionPlan; index: PlanIndex; compact?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const progress = useMemo(() => revisionPassProgress(plan), [plan]), days = useMemo(() => revisionPassLength(plan), [plan]);
  const percent = Math.min(progress >= 1 ? 100 : 99, Math.floor(progress * 100));
  const circumference = 2 * Math.PI * 47;
  const empty = !plan.memorized.length;
  return <Card style={d.hero}>
    <View style={[d.row, { gap: 14 }]}>
      <View style={d.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{empty ? 'مراجعة المحفوظ' : `الدورة ${ordinalLabel(plan.pass)} على محفوظك`}</Text>
        <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', marginVertical: 4 }}>{empty ? 'حدد محفوظك لتبدأ' : progress === 0 ? 'دورة جديدة تبدأ' : 'تثبيتٌ يومًا بعد يوم'}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{empty ? 'المراجعة تدور على ما تحفظه' : `${arabicNumber(spanCount(plan.memorized))} آية · دورة كاملة في ${revisionDaysLabel(days)}`}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="ما روجع من الدورة الحالية" accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden><Circle cx={54} cy={54} r={47} fill="none" stroke={withAlpha(p.primary, 0.2)} strokeWidth={8} />
          {progress > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.primary} strokeWidth={8} strokeLinecap="round" strokeDasharray={[circumference * progress, circumference]} transform="rotate(-90 54 54)" />}</Svg>
        <View style={d.ringText}><Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>{arabicNumber(percent)}٪</Text></View>
      </View>
    </View>
    {!compact && !empty && <PassBand plan={plan} index={index} />}
  </Card>;
}

function ordinalLabel(n: number) {
  return ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'][n - 1] ?? arabicNumber(n);
}

function PassBand({ plan, index }: { plan: RevisionPlan; index: PlanIndex }) {
  const { palette: p } = useReadingPreferences();
  const cursor = normalizeRevision(plan).cursor, memorized = mergeSpans(plan.memorized);
  const overlap = (start: number, end: number, from: number, to: number) => memorized.reduce((n, r) => n + Math.max(0, Math.min(end, r.end, to) - Math.max(start, r.start, from)), 0);
  const juzs = index.juzs.slice(0, -1).map((start, i) => {
    const end = index.juzs[i + 1], size = end - start;
    return { number: i + 1, revised: overlap(start, end, 0, cursor) / size, ahead: overlap(start, end, cursor, Infinity) / size };
  });
  const current = juzs.find(j => j.ahead > 0);
  const count = juzs.filter(j => j.revised + j.ahead > 0).length;
  return <View style={{ gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16 }}>
    <View style={[d.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{count === 1 ? 'محفوظك في جزء واحد' : count === 2 ? 'محفوظك في جزأين' : `محفوظك في ${arabicNumber(count)} ${count <= 10 ? 'أجزاء' : 'جزءًا'}`}</Text>
      {current && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>تراجع الآن في الجزء {arabicNumber(current.number)}</Text>}
    </View>
    <View accessible accessibilityLabel={`ما روجع وما ينتظر في ${arabicNumber(count)} أجزاء`} style={{ flexDirection: 'row', gap: 2, height: 14 }}>
      {juzs.map(j => <View key={j.number} style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 2, backgroundColor: withAlpha(p.primary, 0.12) }}>
        <View style={{ width: `${j.revised * 100}%`, height: '100%', backgroundColor: p.primary }} />
        <View style={{ width: `${j.ahead * 100}%`, height: '100%', backgroundColor: withAlpha(p.primary, 0.4) }} />
      </View>)}
    </View>
    <View style={[d.row, { gap: 16, flexWrap: 'wrap' }]}>
      <Legend color={p.primary} label="روجع في هذه الدورة" />
      <Legend color={withAlpha(p.primary, 0.4)} label="محفوظ ينتظر دوره" />
    </View>
  </View>;
}
function Legend({ color, label }: { color: string; label: string }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[d.row, { gap: 6 }]}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} /><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{label}</Text></View>;
}

export function RevisionGoalCard({ plan, today }: { plan: RevisionPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const day = revisionDay(plan, today);
  const doneToday = plan.log.some(log => log.date === today);
  const progress = revisionPassProgress(plan);
  const status = plan.status === 'archived' ? 'مؤرشف' : plan.status === 'paused' ? 'متوقف مؤقتًا' : !plan.memorized.length ? 'حدد محفوظك لتبدأ المراجعة'
    : day?.due ? 'مراجعة اليوم بانتظارك' : doneToday ? 'أتممت مراجعة اليوم' : day ? `المراجعة القادمة · ${shortDate(day.date)}` : '';
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!day?.due}>
    <GoalCardHeading name={plan.name} description={`مراجعة · ${quarterLabel(plan.goal.dailyQuarters)} في الجلسة`} icon="loop"
      trailing={plan.memorized.length ? <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600' }}>{arabicNumber(Math.floor(progress * 100))}٪</Text> : undefined} />
    <GoalProgress value={progress} label={`الدورة ${arabicNumber(plan.pass)} · ${plan.log.length ? `${revisionDaysLabel(plan.log.length)} من المراجعة` : 'لم تبدأ بعد'}`} trailing={plan.memorized.length ? `${arabicNumber(spanCount(plan.memorized))} آية` : undefined} />
  </GoalCardFrame>;
}
