import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerElevation, withAlpha } from '../quran-reader/design';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
import { arabicNumber, shortDate } from './presentation';
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
  return <View style={[d.hero, { backgroundColor: p.hero }, readerElevation(3, p)]}>
    <View pointerEvents="none" aria-hidden style={d.heroPattern}><Svg width={230} height={250} viewBox="0 0 240 250" fill="none" stroke={p.onHero} opacity={0.07}><Path d="M20 250V112C20 55 90 55 120 8c30 47 100 47 100 104v138M40 250V120c0-47 56-49 80-88 24 39 80 41 80 88v130" /></Svg></View>
    <View style={[d.row, { gap: 14 }]}>
      <View style={d.grow}><Text style={{ color: p.heroMuted, fontSize: 13 }}>محفوظك من القرآن</Text>
        <Text style={{ color: p.onHero, fontSize: 22, fontWeight: '600', marginVertical: 4 }}>{done ? 'هنيئًا لك حفظ القرآن' : quarters ? 'آيةً آية، يزهر الحفظ' : 'رحلة القرآن في صدرك'}</Text>
        <Text style={{ color: p.heroMuted, fontSize: 13 }}>{arabicNumber(spanCount(ranges))} آية · {quarterLabel(Math.round(quarters))} تقريبًا</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="نسبة الحفظ من القرآن" accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden><Circle cx={54} cy={54} r={47} fill="none" stroke={p.onHero} strokeOpacity={0.14} strokeWidth={7} />
          {quarters > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.ornament} strokeWidth={7} strokeLinecap="round" strokeDasharray={[circumference * quarters / total, circumference]} transform="rotate(-90 54 54)" />}</Svg>
        <View style={d.ringText}><Text style={{ color: p.onHero, fontSize: 28, textAlign: 'center' }}>{arabicNumber(percent)}٪</Text></View>
      </View>
    </View>
    {!compact && <JuzChart index={index} ranges={ranges} />}
  </View>;
}
export function MemorizationGoalCard({ plan, today }: { plan: MemorizationPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const { index } = usePlanIndex(plan.riwayah);
  const next = nextMemorizationPortion(plan, today);
  const fraction = index ? quarterAmount(index, plan.memorized) / (index.quarters.length - 1) : null;
  const status = plan.status === 'archived' ? 'مؤرشف' : plan.status === 'paused' ? 'متوقف مؤقتًا' : plan.status === 'completed' ? 'أتممت حفظ القرآن' : next?.due ? 'موعد حفظك اليوم' : `الحفظ القادم · ${shortDate(next!.date)}`;
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!next?.due}>
    <GoalCardHeading name={plan.name} description={`حفظ القرآن · ${quarterLabel(plan.goal.weeklyQuarters)} أسبوعيًا`} icon="book"
      trailing={fraction !== null ? <Text style={{ color: p.text, fontSize: 22, fontWeight: '600', lineHeight: 28 }}>{arabicNumber(spanCount(plan.memorized) === plan.totalAyahs ? 100 : Math.min(99, Math.floor(fraction * 100)))}٪</Text> : undefined} />
    <GoalProgress value={fraction ?? 0} label={`${arabicNumber(spanCount(plan.memorized))} آية في محفوظك`} />
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
  const summary = complete === 0 ? 'لم يكتمل جزء بعد' : complete === 1 ? 'جزء واحد مكتمل' : complete === 2 ? 'جزءان مكتملان' : complete <= 10 ? `${arabicNumber(complete)} أجزاء مكتملة` : complete === 30 ? 'ثلاثون جزءًا، هنيئًا لك' : `${arabicNumber(complete)} جزءًا مكتملًا`;
  return <View style={{ gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(p.onHero, 0.2), paddingTop: 16 }}>
    <View style={[d.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: p.onHero, fontSize: 15, fontWeight: '600' }}>{summary}</Text>
      <Text style={{ color: p.heroMuted, fontSize: 12 }}>من ثلاثين</Text>
    </View>
    <View accessible accessibilityLabel={`${summary}${current ? `، الجزء الحالي ${arabicNumber(current.number)}` : ''}`} style={{ flexDirection: 'row', gap: 2, height: 14 }}>
      {juzs.map(j => <View key={j.number} style={{ flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 2, backgroundColor: withAlpha(p.onHero, 0.16) }}>
        <View style={{ width: `${j.fraction * 100}%`, height: '100%', backgroundColor: p.ornament }} />
      </View>)}
    </View>
    <View style={{ flexDirection: 'row', gap: 2 }} aria-hidden>
      {juzs.map(j => <View key={j.number} style={{ flex: 1, alignItems: 'center' }}>
        {current?.number === j.number && <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: p.ornament }} />}
      </View>)}
    </View>
    {current && <Text style={{ color: p.heroMuted, fontSize: 12, textAlign: 'center' }}>تحفظ الآن في الجزء {arabicNumber(current.number)}{current.fraction > 0 ? ` · اكتمل منه ${arabicNumber(Math.round(current.fraction * 100))}٪` : ''}</Text>}
  </View>;
}
