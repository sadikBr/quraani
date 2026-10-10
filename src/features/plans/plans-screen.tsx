import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { Button, Card, Empty, IconTile, Separator, Tabs } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { nextPortion, unitAmount } from './engine';
import { dateLabel } from './dates';
import { shortDate } from './presentation';
import { formatNumber, t } from '@/i18n';
import { goalsOverview, type GoalsView } from './overview';
import { MemorizationGoalCard } from './memorization-components';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, type ReadingPlan } from './types';
import { RevisionGoalCard } from './revision-components';
import { RecurringGoalCard } from './recurring-components';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
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
      <Button variant="outline" icon="back" label={t('common.backToReading')} onPress={() => router.dismissTo('/')}>{t('plans.list.mushaf')}</Button>
      <Button icon="plus" label={t('plans.list.createLabel')} disabled={!canCreate} onPress={create}>{t('goals.newGoal')}</Button>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('plans.list.title')}</Text>
        <Text style={{ fontSize: 15, color: p.mutedForeground }}>{t('plans.list.subtitle')}</Text>
      </View>
      <PlanNotice message={error} retry={retry} /><PlanNotice message={reminderError} />
      {!ready ? !error && <PlanLoading /> : <>
        {view !== 'archived' && <DailyOverview today={today} due={overview.due.length} completed={overview.completedToday} hasGoals={!!overview.all.length} />}
        <Tabs label={t('plans.list.tabs.label')} value={view} onChange={setView}
          options={([{ value: 'today', label: t('common.today'), count: overview.due.length }, { value: 'all', label: t('plans.list.tabs.mine'), count: overview.all.length }, { value: 'archived', label: t('plans.list.tabs.archive'), count: overview.archived.length }] as const).map(tab => ({
            value: tab.value, label: tab.label,
            badge: tab.count > 0 ? <View style={[s.count, { backgroundColor: view === tab.value ? p.primary : p.background, borderColor: p.border }]}><Text style={{ fontSize: 11, lineHeight: 16, color: view === tab.value ? p.primaryForeground : p.mutedForeground, textAlign: 'center' }}>{formatNumber(tab.count)}</Text></View> : undefined,
          }))} />
        <View style={{ gap: 16 }}>
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
  return <Card style={s.hero}>
    <View style={[s.row, { gap: 16, alignItems: 'flex-start' }]}>
      <View style={s.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{dateLabel(today)}</Text>
        <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', marginTop: 2 }}>{due ? t('plans.list.overview.dueTitle') : completed ? t('plans.list.overview.completedTitle') : t('plans.list.overview.idleTitle')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{due ? t('plans.list.overview.dueDetail') : hasGoals ? t('plans.list.overview.ongoingDetail') : t('plans.list.overview.emptyDetail')}</Text>
      </View>
      <IconTile name={completed && !due ? 'check' : 'book'} />
    </View>
    {hasGoals && <View style={[s.stats, { borderColor: p.border }]}>
      <View style={s.stat}><Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{formatNumber(due)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{t('plans.list.overview.due')}</Text></View>
      <Separator vertical />
      <View style={s.stat}><Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{formatNumber(completed)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{t('plans.list.overview.completed', { count: completed })}</Text></View>
    </View>}
  </Card>;
}

function GoalCard({ plan, today }: { plan: ReadingPlan; today: string }) {
  const { palette: p } = useReadingPreferences();
  const next = nextPortion(plan, today);
  if (isMemorizationPlan(plan)) return <MemorizationGoalCard plan={plan} today={today} />;
  if (isRecurringPlan(plan)) return <RecurringGoalCard plan={plan} today={today} />;
  if (isRevisionPlan(plan)) return <RevisionGoalCard plan={plan} today={today} />;
  const completed = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const progress = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  const percent = progress === 1 ? 100 : Math.floor(progress * 100);
  const status = plan.status === 'paused' ? t('goals.status.paused') : plan.status === 'archived' ? t('goals.status.archived') : plan.status === 'completed' ? plan.repeat ? plan.cycle.completedOn && plan.cycle.completedOn < today ? t('plans.card.status.nextCycleSoon') : t('plans.card.status.nextCycleTomorrow') : t('goals.status.completed') : next && !next.due ? t('plans.card.status.next', { date: shortDate(next.date) }) : next && next.date < today ? t('plans.card.status.overdue') : t('plans.card.status.today');
  const description = plan.goal.type === 'khatma' ? t('plans.summary.khatma', { count: plan.goal.weeks }) : t('plans.summary.wird', { amount: unitAmount(plan.unit, plan.goal.amount) });
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!next?.due} accessibilityDetail={t('plans.card.percentDetail', { percent })}>
    <GoalCardHeading name={plan.name} description={description} icon={plan.goal.type === 'khatma' ? 'calendar' : 'book'}
      trailing={<Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600' }}>{t('plans.percent', { percent })}</Text>} />
    <GoalProgress value={progress} label={t('plans.progress.ofTotal', { completed, count: plan.cycle.sessions.length })} trailing={RIWAYAT[plan.riwayah].label} />
  </GoalCardFrame>;
}

function EmptyGoals({ view, hasGoals, completed, onCreate, onShowAll }: { view: GoalsView; hasGoals: boolean; completed: number; onCreate: () => void; onShowAll: () => void }) {
  const { palette: p } = useReadingPreferences();
  const waiting = view === 'today' && hasGoals;
  const title = view === 'archived' ? t('plans.list.empty.archiveTitle') : waiting ? completed ? t('plans.list.empty.completedTitle') : t('plans.list.empty.nothingDueTitle') : t('plans.list.empty.startTitle');
  const description = view === 'archived' ? t('plans.list.empty.archiveDetail') : waiting ? t('plans.list.empty.waitingDetail') : t('plans.list.empty.startDetail');
  return <Empty icon={view === 'archived' ? 'archive' : waiting && completed ? 'check' : 'book'} title={title} description={description}>
    {view !== 'archived' && <ReaderButton palette={p} selected={!waiting} onPress={waiting ? onShowAll : onCreate}>{waiting ? t('plans.list.empty.showMine') : t('plans.list.empty.createFirst')}</ReaderButton>}
  </Empty>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  hero: { padding: 16, gap: 16 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 16 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: readerShape.pill, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
