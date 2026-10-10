import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerElevation, readerShape } from '../quran-reader/design';
import { GoalCardFrame, GoalCardHeading } from './goal-card';
import { arabicNumber, shortDate } from './presentation';
import { coversSpan, nextMemorizationPortion, quarterAmount, quarterLabel, spanCount } from './memorization';
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
      <View style={d.grow}><Text style={{ color: p.heroMuted, fontSize: 12 }}>محفوظك من القرآن</Text>
        <Text style={{ color: p.onHero, fontSize: 24, fontWeight: '600' }}>{done ? 'هنيئًا لك حفظ القرآن' : quarters ? 'آيةً آية، يزهر الحفظ' : 'رحلة القرآن في صدرك'}</Text>
        <Text style={{ color: p.heroMuted, fontSize: 12 }}>{arabicNumber(spanCount(ranges))} آية محفوظة</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="نسبة الحفظ من القرآن" accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden><Circle cx={54} cy={54} r={47} fill="none" stroke={p.onHero} strokeOpacity={0.14} strokeWidth={7} />
          {quarters > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.ornament} strokeWidth={7} strokeLinecap="round" strokeDasharray={[circumference * quarters / total, circumference]} transform="rotate(-90 54 54)" />}</Svg>
        <View style={d.ringText}><Text style={{ color: p.onHero, fontSize: 28, textAlign: 'center' }}>{arabicNumber(percent)}٪</Text></View>
      </View>
    </View>
    {!compact && <View style={{ gap: 10, borderTopWidth: 1, borderColor: `${p.onHero}26`, paddingTop: 16 }}>
      <Text style={{ color: p.heroMuted, fontSize: 12 }}>ثلاثون جزءًا، ورحلة واحدة</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{index.juzs.slice(0, -1).map((start, i) => {
        const end = index.juzs[i + 1], complete = coversSpan(ranges, { start, end }), partial = ranges.some(r => r.start < end && r.end > start);
        return <View key={start} accessibilityLabel={`الجزء ${i + 1}: ${complete ? 'محفوظ' : partial ? 'محفوظ جزئيًا' : 'لم يُحفظ بعد'}`} style={{ width: '8.5%', minHeight: 27, borderRadius: readerShape.detail, justifyContent: 'center', borderWidth: 1, borderColor: complete || partial ? p.heroMuted : `${p.onHero}20`, backgroundColor: complete ? p.onHero : partial ? `${p.onHero}20` : 'transparent' }}>
          <Text style={{ color: complete ? p.hero : p.heroMuted, fontSize: 10, textAlign: 'center' }}>{arabicNumber(i + 1)}</Text></View>;
      })}</View>
      <Text style={{ color: p.heroMuted, fontSize: 11 }}>يمتلئ كل جزء عندما تتم حفظه. محفوظك باقٍ حتى بعد أرشفة الهدف.</Text>
    </View>}
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
      trailing={fraction !== null ? <Text style={{ color: p.accent, fontSize: 24 }}>{arabicNumber(spanCount(plan.memorized) === plan.totalAyahs ? 100 : Math.min(99, Math.floor(fraction * 100)))}٪</Text> : undefined} />
    <View style={{ gap: 8 }}><Text style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(spanCount(plan.memorized))} آية في محفوظك</Text>
      <View style={{ height: 5, backgroundColor: p.border, borderRadius: 3, overflow: 'hidden' }}><View style={{ height: '100%', width: `${(fraction ?? 0) * 100}%`, backgroundColor: p.accent }} /></View></View>
  </GoalCardFrame>;
}
