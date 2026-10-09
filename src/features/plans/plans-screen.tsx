import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { nextPortion, unitLabels } from './engine';
import { dateLabel } from './dates';
import { arabicNumber, shortDate } from './presentation';
import { goalsOverview, type GoalsView } from './overview';
import type { ReadingPlan } from './types';
import { PlanLoading, PlanNotice } from './components';
import { currentGoal } from './goal-limit';
import { ArchivedGoals } from './archive-components';

export function PlansScreen() {
  const { palette: p } = useReadingPreferences();
  const { plans, ready, today, error, reminderError, retry } = usePlans();
  const [view, setView] = useState<GoalsView>('today');
  const overview = goalsOverview(plans, today);
  const shown = view === 'today' ? overview.due : overview[view];
  const create = () => router.push('/plans/new');
  const canCreate = ready && !currentGoal(plans);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى القراءة" onPress={() => router.dismissTo('/')}
        style={({ pressed }) => [s.back, { opacity: pressed ? 0.6 : 1 }]}>
        <ReaderIcon name="back" color={p.text} size={21} /><Text style={{ color: p.text, fontSize: 15 }}>المصحف</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={canCreate ? 'إنشاء هدف جديد' : 'إنشاء هدف جديد، متاح بعد إتمام هدفك الحالي أو أرشفته'} accessibilityState={{ disabled: !canCreate }} disabled={!canCreate} onPress={create}
        style={({ pressed }) => [s.create, { backgroundColor: p.accentSoft, opacity: !canCreate ? 0.4 : pressed ? 0.7 : 1 }]}>
        <View style={{ transform: [{ rotate: '45deg' }] }}><ReaderIcon name="close" color={p.accent} size={20} strokeWidth={2} /></View>
        <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>هدف جديد</Text>
      </Pressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View>
        <Text accessibilityRole="header" style={{ fontSize: 31, fontWeight: '700', color: p.text }}>أهدافك القرآنية</Text>
        <Text style={{ fontSize: 14, color: p.muted }}>وردٌ تحافظ عليه، وختمةٌ تسعى إليها.</Text>
      </View>
      <PlanNotice message={error} retry={retry} /><PlanNotice message={reminderError} />
      {!ready ? !error && <PlanLoading /> : <>
        {view !== 'archived' && <DailyOverview today={today} due={overview.due.length} completed={overview.completedToday} hasGoals={!!overview.all.length} />}
        <View accessibilityRole="tablist" accessibilityLabel="عرض الأهداف" style={[s.tabs, { borderColor: p.border }]}>
          {([{ value: 'today', label: 'اليوم', count: overview.due.length }, { value: 'all', label: 'أهدافي', count: overview.all.length }, { value: 'archived', label: 'الأرشيف', count: overview.archived.length }] as const).map(tab => {
            const selected = view === tab.value;
            return <Pressable key={tab.value} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} aria-selected={selected} onPress={() => setView(tab.value)}
              style={({ pressed }) => [s.tab, { borderColor: selected ? p.accent : 'transparent', backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
              <Text style={{ color: selected ? p.accent : p.muted, fontSize: 14, fontWeight: selected ? '700' : '400' }}>{tab.label}</Text>
              {tab.count > 0 && <Text style={{ fontSize: 11, color: selected ? p.accent : p.muted }}>{arabicNumber(tab.count)}</Text>}
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
  return <View style={[s.hero, { backgroundColor: p.hero }]}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={s.motif}>
      <Svg width={200} height={230} viewBox="0 0 200 230" fill="none" stroke={p.onHero} strokeWidth={1} opacity={0.07}>
        <Path d="M10 230V100C10 50 75 50 100 8c25 42 90 42 90 92v130M30 230V108c0-40 50-42 70-76 20 34 70 36 70 76v122M50 230V116c0-30 36-34 50-56 14 22 50 26 50 56v114" />
      </Svg>
    </View>
    <View style={[s.row, { gap: 18 }]}>
      <View style={s.grow}>
        <Text style={{ color: p.heroMuted, fontSize: 12 }}>{dateLabel(today)}</Text>
        <Text style={{ color: p.onHero, fontSize: 24, fontWeight: '600', marginTop: 4 }}>{due ? 'وردك بانتظارك' : completed ? 'قرأت اليوم، فهنيئًا لك' : 'وقتٌ للقرآن'}</Text>
        <Text style={{ color: p.heroMuted, fontSize: 13 }}>{due ? 'خطوة صغيرة اليوم، تقرّبك من هدفك.' : hasGoals ? 'رحلتك مستمرة، على مهلٍ وثبات.' : 'اجعل للقرآن نصيبًا من يومك.'}</Text>
      </View>
      <View style={[s.heroIcon, { borderColor: `${p.onHero}33` }]}><ReaderIcon name={completed && !due ? 'check' : 'book'} color={p.onHero} size={32} strokeWidth={1.35} /></View>
    </View>
    {hasGoals && <View style={[s.stats, { borderColor: `${p.onHero}26` }]}>
      <View style={s.stat}><Text style={{ color: p.onHero, fontSize: 25 }}>{arabicNumber(due)}</Text><Text style={{ color: p.heroMuted, fontSize: 12, flexShrink: 1 }}>بانتظار القراءة</Text></View>
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: `${p.onHero}26` }} />
      <View style={s.stat}><Text style={{ color: p.onHero, fontSize: 25 }}>{arabicNumber(completed)}</Text><Text style={{ color: p.heroMuted, fontSize: 12, flexShrink: 1 }}>أوراد أتممتها اليوم</Text></View>
    </View>}
  </View>;
}

function GoalCard({ plan, today }: { plan: ReadingPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const next = nextPortion(plan, today);
  const completed = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const progress = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  const percent = progress === 1 ? 100 : Math.floor(progress * 100);
  const status = plan.status === 'paused' ? 'متوقف مؤقتًا' : plan.status === 'archived' ? 'مؤرشف' : plan.status === 'completed' ? plan.repeat ? 'الدورة التالية غدًا' : 'مكتمل' : next && !next.due ? `الورد القادم · ${shortDate(next.date)}` : next && next.date < today ? 'ورد سابق بانتظارك' : 'ورد اليوم';
  const description = plan.goal.type === 'khatma' ? `ختمة · ${arabicNumber(plan.goal.weeks)} أسابيع` : `ورد يومي · ${arabicNumber(plan.goal.amount)} ${unitLabels[plan.unit]}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`فتح هدف ${plan.name}، ${status}، اكتمل ${percent} بالمئة`}
    onPress={() => router.push({ pathname: '/plans/[id]', params: { id: plan.id } })}
    style={({ pressed }) => [s.card, { backgroundColor: p.paper, borderColor: pressed ? p.accent : p.border, opacity: pressed ? 0.8 : 1 }]}>
    <View style={s.cardContent}>
      <View style={[s.row, { gap: 12 }]}>
        <View style={[s.goalIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={plan.goal.type === 'khatma' ? 'calendar' : 'book'} color={p.accent} size={24} /></View>
        <View style={s.grow}>
          <Text style={{ color: p.text, fontSize: 22, fontWeight: '600' }}>{plan.name}</Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>{description}</Text>
        </View>
        <View><Text style={{ color: p.accent, fontSize: 24, textAlign: 'center' }}>{arabicNumber(percent)}٪</Text></View>
      </View>
      <View style={{ gap: 8 }}>
        <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 0 }]}>
          <Text style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(completed)} من {arabicNumber(plan.cycle.sessions.length)} وردًا</Text>
          <Text style={{ color: p.muted, fontSize: 11 }}>{RIWAYAT[plan.riwayah].label}</Text>
        </View>
        <View style={[s.progress, { backgroundColor: p.border }]}><View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: p.accent }} /></View>
      </View>
    </View>
    <View style={[s.cardFooter, { backgroundColor: next?.due ? p.accentSoft : 'transparent', borderColor: p.border }]}>
      <View style={[s.row, s.grow]}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: next?.due ? p.accent : p.muted }} />
        <Text style={{ color: next?.due ? p.accent : p.muted, fontSize: 12, flexShrink: 1 }}>{status}</Text>
      </View>
      <View style={s.row}><Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>{next?.due ? 'متابعة' : 'التفاصيل'}</Text><ReaderIcon name="chevron" color={p.accent} size={17} /></View>
    </View>
  </Pressable>;
}

function EmptyGoals({ view, hasGoals, completed, onCreate, onShowAll }: { view: GoalsView; hasGoals: boolean; completed: number; onCreate: () => void; onShowAll: () => void }) {
  const { palette: p } = useReadingPreferences();
  const waiting = view === 'today' && hasGoals;
  const title = view === 'archived' ? 'أرشيفك فارغ' : waiting ? completed ? 'أتممت وردك، تقبّل الله منك' : 'لا أوراد مطلوبة الآن' : 'لكل رحلة بداية';
  const description = view === 'archived' ? 'تُحفظ الأهداف هنا لمدة أسبوعين بعد أرشفتها، ثم تُحذف نهائيًا.' : waiting ? 'تجد أهدافك القادمة والموقوفة في «أهدافي».' : 'ختمة في مدة تختارها، أو ورد يومي تواصل به القراءة من حيث توقفت.';
  return <View style={[s.empty, { borderColor: p.border }]}>
    <View style={[s.emptyIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={view === 'archived' ? 'bookmark' : waiting && completed ? 'check' : 'book'} color={p.accent} size={28} /></View>
    <Text accessibilityRole="header" style={{ color: p.text, fontSize: 21, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: p.muted, fontSize: 14, textAlign: 'center' }}>{description}</Text>
    {view !== 'archived' && <View style={{ alignSelf: 'stretch', marginTop: 8 }}><ReaderButton palette={p} selected={!waiting} onPress={waiting ? onShowAll : onCreate}>{waiting ? 'عرض أهدافي' : 'إنشاء أول هدف'}</ReaderButton></View>}
  </View>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  back: { flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'center', paddingEnd: 8 },
  create: { flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', borderRadius: readerShape.control },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingTop: 6, paddingBottom: 40, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  hero: { borderRadius: readerShape.card, padding: 20, gap: 16, overflow: 'hidden' },
  heroIcon: { width: 58, height: 66, borderWidth: 1, borderTopLeftRadius: 29, borderTopRightRadius: 29, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: 'center', justifyContent: 'center' },
  motif: { position: 'absolute', left: -80, top: -25 },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 16 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', gap: 7, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 3, marginBottom: -1 },
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  cardContent: { padding: 18, gap: 18 },
  goalIcon: { width: 42, height: 48, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  progress: { height: 5, borderRadius: 3, overflow: 'hidden' },
  cardFooter: { paddingHorizontal: 18, paddingVertical: 10, minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.card, padding: 24, gap: 8, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: readerShape.card, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
