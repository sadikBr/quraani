import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useEmbedded } from '@/components/embedded';
import { ArchPanel } from '@/components/craft/panels';
import { Medallion } from '@/components/craft/marks';
import { AddRow, PageBar, PageTitle, page } from '@/components/craft/page';
import { Button, Empty, Tabs } from '@/components/ui';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerShape, withAlpha } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { rangeLabel, unitAmount } from './engine';
import { dateLabel } from './dates';
import { shortDate } from './presentation';
import { formatNumber, t } from '@/i18n';
import { goalsOverview, type GoalsView } from './overview';
import { MemorizationGoalCard } from './memorization-components';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, type ReadingPlan, type SequentialPlan } from './types';
import { RevisionGoalCard } from './revision-components';
import { RecurringGoalCard } from './recurring-components';
import { GoalCardFrame, GoalProgress, useGoalStart } from './goal-card';
import { PlanLoading, PlanNotice } from './components';
import { ArchivedGoals } from './archive-components';

/**
 * The goals: the day seen through an arched window (what waits today, what is done, each portion
 * a bead on a hanging thread), then the goals themselves, today's or all of them, or the archive.
 * Shown alone, or in the home screen's «الأهداف» tab without its own bar and title.
 */
export function PlansScreen() {
  const { palette: p } = useReadingPreferences();
  const { plans, ready, today, error, reminderError, retry } = usePlans();
  const [view, setView] = useState<GoalsView>('today');
  const overview = goalsOverview(plans, today);
  const shown = view === 'today' ? overview.due : overview[view];
  const create = () => router.push('/plans/new');
  const canCreate = ready;
  const embedded = useEmbedded();
  const Frame = embedded ? View : SafeAreaView;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar palette={p} back={{ label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.dismissTo('/') }}
      actions={<Button icon="plus" palette={p} label={t('plans.list.createLabel')} disabled={!canCreate} onPress={create}>{t('goals.newGoal')}</Button>} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }, embedded && { paddingTop: 18 }]}>
      {!embedded && <PageTitle title={t('plans.list.title')} subtitle={t('plans.list.subtitle')} palette={p} />}
      <PlanNotice message={error} retry={retry} /><PlanNotice message={reminderError} />
      {!ready ? !error && <PlanLoading /> : <>
        {view !== 'archived' && <DailyOverview today={today} due={overview.due.length} completed={overview.completedToday} hasGoals={!!overview.all.length} />}
        <Tabs label={t('plans.list.tabs.label')} value={view} onChange={setView} palette={p}
          options={([{ value: 'today', label: t('common.today'), count: overview.due.length }, { value: 'all', label: t('plans.list.tabs.mine'), count: overview.all.length }, { value: 'archived', label: t('plans.list.tabs.archive'), count: overview.archived.length }] as const).map(tab => ({
            value: tab.value, label: tab.label,
            badge: tab.count > 0 ? <View style={[s.count, { backgroundColor: view === tab.value ? withAlpha(p.ornament, 0.16) : 'transparent', borderColor: withAlpha(p.ornament, view === tab.value ? 0 : 0.4) }]}>
              <Text style={{ fontSize: 11, lineHeight: 16, color: view === tab.value ? p.foreground : p.mutedForeground, fontWeight: '600', textAlign: 'center' }}>{formatNumber(tab.count)}</Text>
            </View> : undefined,
          }))} />
        <View style={{ gap: 12 }}>
          {view === 'archived' && shown.length ? <ArchivedGoals plans={shown} onOpen={id => router.push({ pathname: '/plans/[id]', params: { id } })} />
            : shown.length ? shown.map(plan => <GoalCard key={plan.id} plan={plan} today={today} />)
            : <EmptyGoals view={view} hasGoals={!!overview.all.length} completed={overview.completedToday} onCreate={create} onShowAll={() => setView('all')} />}
          {/* The way to a new goal: always at the foot when shown in the home tab (which has no bar), and after the goals otherwise;
              the empty list without goals offers its own. */}
          {(embedded ? view === 'archived' || !!overview.all.length : view !== 'archived' && !!shown.length) && <AddRow title={t('goals.newGoal')} detail={t('plans.list.subtitle')} disabled={!canCreate} onPress={create} palette={p} />}
        </View>
      </>}
    </ScrollView>
  </Frame>;
}

/**
 * The day, seen through an arched window: the date, a word for how the day stands, today's
 * portions as beads on a thread held at both ends (those done filled with gold), and how many wait
 * and how many are done, each count held in a star.
 */
function DailyOverview({ today, due, completed, hasGoals }: { today: string; due: number; completed: number; hasGoals: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <ArchPanel palette={p} rise={42} contentStyle={s.hero}>
    <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{dateLabel(today)}</Text>
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 27, lineHeight: 44, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>
      {due ? t('plans.list.overview.dueTitle') : completed ? t('plans.list.overview.completedTitle') : t('plans.list.overview.idleTitle')}
    </Text>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{due ? t('plans.list.overview.dueDetail') : hasGoals ? t('plans.list.overview.ongoingDetail') : t('plans.list.overview.emptyDetail')}</Text>
    {hasGoals && <>
      {due + completed > 0 && <DayThread due={due} completed={completed} />}
      <View style={[s.stats, { borderColor: withAlpha(p.ornament, 0.3) }]}>
        <Stat value={due} label={t('plans.list.overview.due')} />
        <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: withAlpha(p.ornament, 0.3) }} />
        <Stat value={completed} filled={completed > 0} label={t('plans.list.overview.completed', { count: completed })} />
      </View>
    </>}
  </ArchPanel>;
}

function Stat({ value, label, filled = false }: { value: number; label: string; filled?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <View accessible accessibilityLabel={`${formatNumber(value)} ${label}`} style={s.stat}>
    <Medallion value={value} size={42} palette={p} current={filled} />
    <Text numberOfLines={2} style={{ flexShrink: 1, color: p.mutedForeground, fontSize: 13, lineHeight: 19 }}>{label}</Text>
  </View>;
}

/**
 * Today's portions as beads on a thread that hangs between two points, as a misbaha held by its
 * ends: read from the right, the portions done first, filled with gold.
 */
function DayThread({ due, completed }: { due: number; completed: number }) {
  const { palette: p } = useReadingPreferences();
  const [width, setWidth] = useState(0);
  const n = Math.min(due + completed, 15), done = Math.round(completed / (due + completed) * n);
  const size = n > 8 ? 12 : 16, top = 6, sag = 26, height = top + sag + size + 4;
  const x0 = width * 0.86, x2 = width * 0.14, mid = width / 2;
  // A quadratic curve whose control point lies twice the sag below the ends.
  const at = (u: number) => ({ x: (1 - u) ** 2 * x0 + 2 * (1 - u) * u * mid + u * u * x2, y: (1 - u) ** 2 * top + 2 * (1 - u) * u * (top + sag * 2) + u * u * top });
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', height, marginTop: 8 }} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {width > 0 && <Svg width={width} height={height}>
      <Path d={`M ${x0} ${top} Q ${mid} ${top + sag * 2} ${x2} ${top}`} stroke={withAlpha(p.ornament, 0.5)} strokeWidth={1.2} fill="none" />
      <Circle cx={x0} cy={top} r={2.5} fill={withAlpha(p.ornament, 0.7)} />
      <Circle cx={x2} cy={top} r={2.5} fill={withAlpha(p.ornament, 0.7)} />
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = at((i + 1) / (n + 1)), on = i < done;
        return <Circle key={i} cx={x} cy={y} r={size / 2 - 0.8} fill={on ? p.ornament : p.card} stroke={p.ornament} strokeWidth={1.4} />;
      })}
    </Svg>}
  </View>;
}

function GoalCard({ plan, today }: { plan: ReadingPlan; today: string }) {
  if (isMemorizationPlan(plan)) return <MemorizationGoalCard plan={plan} today={today} />;
  if (isRecurringPlan(plan)) return <RecurringGoalCard plan={plan} today={today} />;
  if (isRevisionPlan(plan)) return <RevisionGoalCard plan={plan} today={today} />;
  return <ReadingGoalCard plan={plan} today={today} />;
}

/** A khatma or a daily wird: one bead a portion of the round (shares of it past two dozen). */
function ReadingGoalCard({ plan, today }: { plan: SequentialPlan; today: string }) {
  const { index, next, start } = useGoalStart(plan, today);
  const completed = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const progress = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  const percent = progress === 1 ? 100 : Math.floor(progress * 100);
  const status = plan.status === 'paused' ? t('goals.status.paused') : plan.status === 'archived' ? t('goals.status.archived') : plan.status === 'completed' ? plan.repeat ? plan.cycle.completedOn && plan.cycle.completedOn < today ? t('plans.card.status.nextCycleSoon') : t('plans.card.status.nextCycleTomorrow') : t('goals.status.completed') : next && !next.due ? t('plans.card.status.next', { date: shortDate(next.date) }) : next && next.date < today ? t('plans.card.status.overdue') : t('plans.card.status.today');
  const description = plan.goal.type === 'khatma' ? t('plans.summary.khatma', { count: plan.goal.weeks }) : t('plans.summary.wird', { amount: unitAmount(plan.unit, plan.goal.amount) });
  return <GoalCardFrame id={plan.id} name={plan.name} kind={plan.goal.type} summary={`${description} · ${RIWAYAT[plan.riwayah].label}`} status={status} due={!!next?.due}
    done={!next?.due && plan.cycle.progress.some(log => log.date === today)} muted={plan.status !== 'active'} portion={next?.due && index ? rangeLabel(index, next.start, next.end) : undefined} start={start}
    accessibilityDetail={t('plans.card.percentDetail', { percent })}
    progress={<GoalProgress count={plan.cycle.sessions.length} done={completed} label={t('plans.progress.ofTotal', { completed, count: plan.cycle.sessions.length })} value={t('plans.percent', { percent })} />} />;
}

function EmptyGoals({ view, hasGoals, completed, onCreate, onShowAll }: { view: GoalsView; hasGoals: boolean; completed: number; onCreate: () => void; onShowAll: () => void }) {
  const { palette: p } = useReadingPreferences();
  const waiting = view === 'today' && hasGoals;
  const title = view === 'archived' ? t('plans.list.empty.archiveTitle') : waiting ? completed ? t('plans.list.empty.completedTitle') : t('plans.list.empty.nothingDueTitle') : t('plans.list.empty.startTitle');
  const description = view === 'archived' ? t('plans.list.empty.archiveDetail') : waiting ? t('plans.list.empty.waitingDetail') : t('plans.list.empty.startDetail');
  return <Empty icon={view === 'archived' ? 'archive' : waiting && completed ? 'check' : 'book'} motif={view === 'archived' ? 'arches' : waiting ? 'ripple' : 'khatam'} title={title} description={description} palette={p}>
    {view !== 'archived' && <ReaderButton palette={p} selected={!waiting} onPress={waiting ? onShowAll : onCreate}>{waiting ? t('plans.list.empty.showMine') : t('plans.list.empty.createFirst')}</ReaderButton>}
  </Empty>;
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 2, paddingTop: 54, paddingHorizontal: 18, paddingBottom: 18 },
  stats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 14, marginTop: 10, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: readerShape.pill, justifyContent: 'center', borderWidth: 1 },
});
