import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { nextPortion, unitLabels } from './engine';
import { dateLabel } from './dates';
import { arabicNumber, shortDate } from './presentation';
import { goalsOverview, type GoalsView } from './overview';
import { MemorizationGoalCard } from './memorization-components';
import { isMemorizationPlan, isRecurringPlan, type ReadingPlan } from './types';
import { RecurringGoalCard } from './recurring-components';
import { GoalCardFrame, GoalCardHeading } from './goal-card';
import { PlanLoading, PlanNotice } from './components';
import { ArchivedGoals } from './archive-components';

export function PlansScreen() {
  const { palette: p } = useReadingPreferences();
  const { plans, ready, today, error, reminderError, retry } = usePlans();
  const [view, setView] = useState<GoalsView>('today');
  const overview = goalsOverview(plans, today);
  const shown = view === 'today' ? overview.due : overview[view];
  const create = () => router.push('/plans/new');
  const canCreate = ready;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى القراءة" onPress={() => router.dismissTo('/')}
        style={({ pressed }) => [s.back, { backgroundColor: pressed ? p.accentSoft : p.paper, borderColor: p.border }]}>
        <ReaderIcon name="back" color={p.text} size={19} /><Text style={{ color: p.text, fontSize: 14 }}>المصحف</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="إنشاء هدف جديد" accessibilityState={{ disabled: !canCreate }} disabled={!canCreate} onPress={create}
        style={({ pressed }) => [s.create, { backgroundColor: p.accent, opacity: !canCreate ? 0.4 : pressed ? 0.8 : 1 }, canCreate && readerElevation(2, p)]}>
        <ReaderIcon name="plus" color={p.paper} size={19} strokeWidth={2.2} />
        <Text style={{ color: p.paper, fontSize: 14, fontWeight: '600' }}>هدف جديد</Text>
      </Pressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View>
        <Text accessibilityRole="header" style={{ fontSize: 31, fontWeight: '700', color: p.text }}>أهدافك القرآنية</Text>
        <Text style={{ fontSize: 14, color: p.muted }}>قراءة وحفظ، ومواعيد تتجدد مع القرآن.</Text>
      </View>
      <PlanNotice message={error} retry={retry} /><PlanNotice message={reminderError} />
      {!ready ? !error && <PlanLoading /> : <>
        {view !== 'archived' && <DailyOverview today={today} due={overview.due.length} completed={overview.completedToday} hasGoals={!!overview.all.length} />}
        <View accessibilityRole="tablist" accessibilityLabel="عرض الأهداف" style={[s.tabs, { backgroundColor: withAlpha(p.text, 0.06) }]}>
          {([{ value: 'today', label: 'اليوم', count: overview.due.length }, { value: 'all', label: 'أهدافي', count: overview.all.length }, { value: 'archived', label: 'الأرشيف', count: overview.archived.length }] as const).map(tab => {
            const selected = view === tab.value;
            return <Pressable key={tab.value} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} aria-selected={selected} onPress={() => setView(tab.value)}
              style={({ pressed }) => [s.tab, selected && [{ backgroundColor: p.paper }, readerElevation(1, p)], { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ color: selected ? p.accent : p.muted, fontSize: 14, fontWeight: selected ? '700' : '400' }}>{tab.label}</Text>
              {tab.count > 0 && <View style={[s.count, { backgroundColor: selected ? p.accent : withAlpha(p.text, 0.1) }]}><Text style={{ fontSize: 11, lineHeight: 18, color: selected ? p.paper : p.muted, textAlign: 'center' }}>{arabicNumber(tab.count)}</Text></View>}
            </Pressable>;
          })}
        </View>
        <View style={{ gap: 14 }}>
          {view === 'archived' && shown.length ? <ArchivedGoals plans={shown} onOpen={id => router.push({ pathname: '/plans/[id]', params: { id } })} />
            : shown.length ? shown.map(plan => <GoalCard key={plan.id} plan={plan} today={today} />)
            : <EmptyGoals view={view} hasGoals={!!overview.all.length} completed={overview.completedToday} onCreate={create} onShowAll={() => setView('all')} />}
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function DailyOverview({ today, due, completed, hasGoals }: { today: string; due: number; completed: number; hasGoals: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[s.hero, { backgroundColor: p.hero }, readerElevation(3, p)]}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={s.motif}>
      <Svg width={200} height={230} viewBox="0 0 200 230" fill="none" stroke={p.onHero} strokeWidth={1} opacity={0.07}>
        <Path d="M10 230V100C10 50 75 50 100 8c25 42 90 42 90 92v130M30 230V108c0-40 50-42 70-76 20 34 70 36 70 76v122M50 230V116c0-30 36-34 50-56 14 22 50 26 50 56v114" />
      </Svg>
    </View>
    <View style={[s.row, { gap: 18 }]}>
      <View style={s.grow}>
        <Text style={{ color: p.heroMuted, fontSize: 12 }}>{dateLabel(today)}</Text>
        <Text style={{ color: p.onHero, fontSize: 24, fontWeight: '600', marginTop: 4 }}>{due ? 'وردك بانتظارك' : completed ? 'خطوة أخرى أنجزتها' : 'وقتٌ للقرآن'}</Text>
        <Text style={{ color: p.heroMuted, fontSize: 13 }}>{due ? 'خطوة صغيرة اليوم، تقرّبك من هدفك.' : hasGoals ? 'رحلتك مستمرة، على مهلٍ وثبات.' : 'اجعل للقرآن نصيبًا من يومك.'}</Text>
      </View>
      <View style={[s.heroIcon, { borderColor: `${p.onHero}33` }]}><ReaderIcon name={completed && !due ? 'check' : 'book'} color={p.onHero} size={32} strokeWidth={1.35} /></View>
    </View>
    {hasGoals && <View style={[s.stats, { borderColor: `${p.onHero}26` }]}>
      <View style={s.stat}><Text style={{ color: p.onHero, fontSize: 25 }}>{arabicNumber(due)}</Text><Text style={{ color: p.heroMuted, fontSize: 12, flexShrink: 1 }}>بانتظارك اليوم</Text></View>
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: `${p.onHero}26` }} />
      <View style={s.stat}><Text style={{ color: p.onHero, fontSize: 25 }}>{arabicNumber(completed)}</Text><Text style={{ color: p.heroMuted, fontSize: 12, flexShrink: 1 }}>أوراد أتممتها اليوم</Text></View>
    </View>}
  </View>;
}

function GoalCard({ plan, today }: { plan: ReadingPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const next = nextPortion(plan, today);
  if (isMemorizationPlan(plan)) return <MemorizationGoalCard plan={plan} today={today} />;
  if (isRecurringPlan(plan)) return <RecurringGoalCard plan={plan} today={today} />;
  const completed = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const progress = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  const percent = progress === 1 ? 100 : Math.floor(progress * 100);
  const status = plan.status === 'paused' ? 'متوقف مؤقتًا' : plan.status === 'archived' ? 'مؤرشف' : plan.status === 'completed' ? plan.repeat ? plan.cycle.completedOn && plan.cycle.completedOn < today ? 'تبدأ الدورة التالية قريبًا' : 'الدورة التالية غدًا' : 'مكتمل' : next && !next.due ? `الورد القادم · ${shortDate(next.date)}` : next && next.date < today ? 'ورد سابق بانتظارك' : 'ورد اليوم';
  const description = plan.goal.type === 'khatma' ? `ختمة · ${arabicNumber(plan.goal.weeks)} أسابيع` : `ورد يومي · ${arabicNumber(plan.goal.amount)} ${unitLabels[plan.unit]}`;
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!next?.due} accessibilityDetail={`، اكتمل ${percent} بالمئة`}>
    <GoalCardHeading name={plan.name} description={description} icon={plan.goal.type === 'khatma' ? 'calendar' : 'book'}
      trailing={<Text style={{ color: p.accent, fontSize: 24, textAlign: 'center' }}>{arabicNumber(percent)}٪</Text>} />
      <View style={{ gap: 8 }}>
        <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0 }]}>
          <Text style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(completed)} من {arabicNumber(plan.cycle.sessions.length)} وردًا</Text>
          <Text style={{ color: p.muted, fontSize: 11 }}>{RIWAYAT[plan.riwayah].label}</Text>
        </View>
        <View style={[s.progress, { backgroundColor: p.border }]}><View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: p.accent }} /></View>
      </View>
  </GoalCardFrame>;
}

function EmptyGoals({ view, hasGoals, completed, onCreate, onShowAll }: { view: GoalsView; hasGoals: boolean; completed: number; onCreate: () => void; onShowAll: () => void }) {
  const { palette: p } = useReadingPreferences();
  const waiting = view === 'today' && hasGoals;
  const title = view === 'archived' ? 'أرشيفك فارغ' : waiting ? completed ? 'أتممت وردك، تقبّل الله منك' : 'لا أوراد مطلوبة الآن' : 'لكل رحلة بداية';
  const description = view === 'archived' ? 'تُحفظ الأهداف هنا لمدة أسبوعين بعد أرشفتها، ثم تُحذف نهائيًا.' : waiting ? 'تجد أهدافك القادمة والموقوفة في «أهدافي».' : 'ختمة، أو حفظ متدرّج، أو سور تختار لها مواعيد تتجدد.';
  return <View style={[s.empty, { borderColor: p.border }]}>
    <View style={[s.emptyIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={view === 'archived' ? 'bookmark' : waiting && completed ? 'check' : 'book'} color={p.accent} size={28} /></View>
    <Text accessibilityRole="header" style={{ color: p.text, fontSize: 21, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: p.muted, fontSize: 14, textAlign: 'center' }}>{description}</Text>
    {view !== 'archived' && <View style={{ alignSelf: 'stretch', marginTop: 8 }}><ReaderButton palette={p} selected={!waiting} onPress={waiting ? onShowAll : onCreate}>{waiting ? 'عرض أهدافي' : 'إنشاء أول هدف'}</ReaderButton></View>}
  </View>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  back: { flexDirection: 'row', gap: 6, minHeight: 44, alignItems: 'center', paddingStart: 12, paddingEnd: 16, borderRadius: readerShape.pill, borderWidth: StyleSheet.hairlineWidth * 2 },
  create: { flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 16, alignItems: 'center', borderRadius: readerShape.pill },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingTop: 6, paddingBottom: 40, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  hero: { borderRadius: readerShape.hero, padding: 22, gap: 16, overflow: 'hidden' },
  heroIcon: { width: 58, height: 66, borderWidth: 1, borderTopLeftRadius: 29, borderTopRightRadius: 29, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: 'center', justifyContent: 'center' },
  motif: { position: 'absolute', left: -80, top: -25 },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 16 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: readerShape.control + 2 },
  tab: { flex: 1, flexDirection: 'row', gap: 7, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 6, borderRadius: readerShape.control - 2 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, justifyContent: 'center' },
  progress: { height: 5, borderRadius: 3, overflow: 'hidden' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: readerShape.card, padding: 28, gap: 8, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
