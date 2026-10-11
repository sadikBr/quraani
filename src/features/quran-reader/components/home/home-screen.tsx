import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router, type Href } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Embedded } from '@/components/embedded';
import { HorizontalControl, SwipePages, useSwipeTabs } from '@/components/swipe-tabs';
import { IconTile, Progress } from '@/components/ui';
import { readerElevation, readerLayout, readerShape } from '../../design';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { RIWAYAT } from '../../riwayat';
import { IconButton, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { usePlans } from '@/features/plans/provider';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { ayahRangeLabel, nextPortion, rangeLabel, type PlanIndex } from '@/features/plans/engine';
import { goalsOverview } from '@/features/plans/overview';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, isSequentialPlan, type ReadingPlan } from '@/features/plans/types';
import { shortDate } from '@/features/plans/presentation';
import { PlansScreen } from '@/features/plans/plans-screen';
import { AdhkarScreen } from '@/features/adhkar/adhkar-screen';
import { collectionIcons, collections, type CollectionId } from '@/features/adhkar/content';
import { collectionProgress } from '@/features/adhkar/progress';
import { useAdhkar } from '@/features/adhkar/provider';
import { PrayerHomeCard } from '@/features/prayers/home-card';
import { PrayersScreen } from '@/features/prayers/prayers-screen';
import { usePrayers, useNow } from '@/features/prayers/provider';
import { prayerWindow } from '@/features/prayers/times';
import { PracticeScreen } from '@/features/practice/practice-screen';
import { t } from '@/i18n';

/** The home screen's sections, each a whole page; a new major feature is one more tab. */
const TABS = ['today', 'prayers', 'goals', 'adhkar', 'practice'] as const;
type Tab = typeof TABS[number];

/** The reader's own tools, a row on the «اليوم» tab; a new small tool is one more entry. */
const TOOLS: { href: Href; icon: ReaderIconName; text: 'index' | 'bookmarks' | 'search' | 'settings' }[] = [
  { href: '/quran-index', icon: 'index', text: 'index' },
  { href: '/bookmarks', icon: 'bookmark', text: 'bookmarks' },
  { href: '/search', icon: 'search', text: 'search' },
  { href: '/settings', icon: 'settings', text: 'settings' },
];

/**
 * The app's front door, opened from the reader's menu button (going back returns to the reader).
 * Tabs keep it tidy as the app grows: «اليوم» gathers what matters now (the prayer times, what is
 * due today, the reader's tools), and each other tab is a whole section, shown in place. A swipe
 * moves between tabs like the mushaf's pages: the next tab lies to the left, as in the tab bar.
 */
export function HomeScreen() {
  const { palette: p, preferences: { riwayah } } = useReadingPreferences();
  const { today } = usePlans();
  const { tab, open, pages } = useSwipeTabs(TABS, 'today');
  // The pager's gesture needs a gesture root; the app's stack screens have none of their own.
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <QuranniLogo color={p.ornament} size={30} />
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 20, fontWeight: '600' }}>{t('common.appName')}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(today)} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text></View>
      <IconButton name="close" label={t('common.backToReading')} palette={p} onPress={() => router.dismissTo('/')} />
    </View>
    <View style={[s.tabBar, { borderColor: p.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={s.tabs}>
        {TABS.map((id) => {
          const active = id === tab;
          return <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active }} aria-selected={active} onPress={() => open(id)} style={s.tab}>
            <Text style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 15, fontWeight: active ? '600' : '500' }}>{t(`home.tabs.${id}`)}</Text>
            <View style={[s.underline, { backgroundColor: active ? p.primary : 'transparent' }]} />
          </Pressable>;
        })}
      </ScrollView>
    </View>
    <SwipePages pages={pages} render={(id) => id === 'today' ? <TodayTab onTab={open} /> : <Embedded>
      {id === 'prayers' ? <PrayersScreen /> : id === 'goals' ? <PlansScreen /> : id === 'adhkar' ? <AdhkarScreen /> : <PracticeScreen />}
    </Embedded>} />
  </SafeAreaView></GestureHandlerRootView>;
}

/** What matters now: the prayer times, then what is due today as cards to swipe, then the reader's tools. */
function TodayTab({ onTab }: { onTab: (tab: Tab) => void }) {
  const { palette: p } = useReadingPreferences();
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <PrayerHomeCard onOpen={() => onTab('prayers')} />
    <View style={s.section}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('home.now.title')}</Text>
      <NowCards onTab={onTab} />
    </View>
    <View style={s.section}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('home.tools')}</Text>
      <View style={s.tools}>
        {TOOLS.map((tool) => <Pressable key={tool.text} accessibilityRole="link" accessibilityLabel={t(`home.areas.${tool.text}.label`)} onPress={() => router.push(tool.href)}
          style={({ pressed }) => [s.tool, { backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(1, p)]}>
          <IconTile name={tool.icon} palette={p} />
          <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 13, fontWeight: '500' }}>{t(`home.areas.${tool.text}.label`)}</Text>
        </Pressable>)}
      </View>
    </View>
  </ScrollView>;
}

/** The adhkar of this part of the day: the morning's until Dhuhr, after the prayer until Asr, the evening's until Isha, then sleep. */
function adhkarNow(prayer: string | undefined, hour: number): CollectionId {
  if (prayer) {
    if (prayer === 'fajr' || prayer === 'sunrise') return 'morning';
    if (prayer === 'dhuhr') return 'afterPrayer';
    if (prayer === 'asr' || prayer === 'maghrib') return 'evening';
    return 'sleep';
  }
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'afterPrayer';
  if (hour >= 15 && hour < 20) return 'evening';
  return 'sleep';
}

/**
 * A swipeable row: the adhkar for now, each goal due today (or an invitation), and the misbaha.
 * A swipe that starts on the row scrolls the row, not the tabs.
 */
function NowCards({ onTab }: { onTab: (tab: Tab) => void }) {
  const { width } = useWindowDimensions();
  const { plans, ready, today } = usePlans();
  const { state: prayers } = usePrayers();
  const now = useNow(60_000);
  const overview = goalsOverview(plans, today);
  const card = Math.round(Math.min(280, Math.min(width, readerLayout.maxWidth) * 0.72));
  const current = prayers.location ? prayerWindow(prayers.location, now, prayers).current?.prayer : undefined;
  // With nothing due today, the goal that comes next.
  const upcoming = overview.all.map((plan) => ({ plan, next: nextPortion(plan, today) })).filter((x) => x.next && !x.next.due)
    .sort((a, b) => a.next!.date.localeCompare(b.next!.date))[0];
  const later = upcoming ? t('home.today.upcoming', { name: upcoming.plan.name, date: shortDate(upcoming.next!.date) }) : t('home.now.goalsLater');
  return <HorizontalControl><ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={card + 12} decelerationRate="fast"
    style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
    <AdhkarCard id={adhkarNow(current, now.getHours())} width={card} />
    {ready && overview.due.map((plan) => <GoalCard key={plan.id} plan={plan} today={today} width={card} />)}
    {ready && !overview.due.length && <NoGoalCard width={card} hasGoals={!!overview.all.length} completed={overview.completedToday > 0} later={later} onTab={onTab} />}
    <MisbahaCard width={card} />
  </ScrollView></HorizontalControl>;
}

/** The common frame of a card in the row: an icon and its kind, a title and a line, then what to do. */
function NowCard({ width, icon, kind, title, detail, onPress, label, done, children }: {
  width: number; icon: ReaderIconName; kind: string; title: string; detail: string; onPress: () => void; label: string; done?: boolean; children?: ReactNode;
}) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.card, { width, backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(2, p)]}>
    <View style={s.cardHead}>
      <IconTile name={icon} palette={p} tone={done ? p.primary : undefined} />
      <Text numberOfLines={1} style={{ flex: 1, color: done ? p.primary : p.mutedForeground, fontSize: 13 }}>{kind}</Text>
    </View>
    <View style={{ gap: 2, flex: 1 }}>
      <Text numberOfLines={2} style={{ color: p.foreground, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{title}</Text>
      <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>
    </View>
    {children}
  </Pressable>;
}

function Action({ text }: { text: string }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[s.action, { backgroundColor: p.primary }]}><Text style={{ color: p.primaryForeground, fontSize: 14, fontWeight: '500' }}>{text}</Text></View>;
}

function AdhkarCard({ id, width }: { id: CollectionId; width: number }) {
  const { palette: p } = useReadingPreferences();
  const { state, today } = useAdhkar();
  const progress = collectionProgress(state, id, today);
  const title = t(`adhkar.collections.${id}.title`);
  const status = progress.complete ? t('adhkar.completed') : progress.started ? t('adhkar.progress', { done: progress.done, total: progress.total }) : t('adhkar.size', { count: collections[id].length });
  return <NowCard width={width} icon={collectionIcons[id]} kind={t('home.now.adhkar')} title={title} detail={progress.started || progress.complete ? status : `${t(`adhkar.collections.${id}.detail`)} · ${status}`}
    done={progress.complete} label={t('adhkar.openLabel', { title, state: progress.complete ? t('adhkar.completed') : progress.started ? status : t('adhkar.notStarted') })}
    onPress={() => router.push({ pathname: '/adhkar/[id]', params: { id } })}>
    {progress.started && !progress.complete ? <Progress value={progress.done / progress.total} palette={p} height={4} />
      : !progress.complete && <Action text={t('home.now.begin')} />}
  </NowCard>;
}

function GoalCard({ plan, today, width }: { plan: ReadingPlan; today: string; width: number }) {
  const { update } = useReadingPreferences();
  const { index } = usePlanIndex(plan.riwayah);
  const next = nextPortion(plan, today);
  if (!next) return null;
  const kind = t(`goals.types.${isMemorizationPlan(plan) ? 'memorization' : isRevisionPlan(plan) ? 'revision' : isRecurringPlan(plan) ? 'recurring' : plan.goal.type === 'khatma' ? 'khatma' : 'wird'}`);
  const start = () => {
    if (!index) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  return <NowCard width={width} icon="calendar" kind={next.date < today ? `${kind} · ${t('home.today.overdue')}` : kind} title={plan.name}
    detail={index ? describePortion(plan, index, next.start, next.end) : ''} label={t('home.today.startGoal', { name: plan.name })} onPress={start}>
    <Action text={t('home.today.start')} />
  </NowCard>;
}

function NoGoalCard({ width, hasGoals, completed, later, onTab }: { width: number; hasGoals: boolean; completed: boolean; later: string; onTab: (tab: Tab) => void }) {
  if (!hasGoals) {
    return <NowCard width={width} icon="calendar" kind={t('home.tabs.goals')} title={t('home.now.noGoals')} detail={t('home.today.emptyTitle')}
      label={t('home.today.createGoal')} onPress={() => router.push('/plans/new')}>
      <Action text={t('home.today.emptyAction')} />
    </NowCard>;
  }
  return <NowCard width={width} icon="calendar" kind={t('home.tabs.goals')} title={completed ? t('home.now.goalsDone') : t('home.today.nothingDue')}
    detail={completed ? t('home.today.completed') : later} done={completed} label={t('home.today.allGoals')} onPress={() => onTab('goals')} />;
}

function MisbahaCard({ width }: { width: number }) {
  const { state } = useAdhkar();
  const title = t('adhkar.misbaha.title');
  const detail = state.misbaha ? t('adhkar.misbaha.count', { count: state.misbaha }) : t('adhkar.misbaha.empty');
  return <NowCard width={width} icon="beads" kind={t('home.now.dhikr')} title={title} detail={detail} label={t('adhkar.openLabel', { title, state: detail })} onPress={() => router.push('/misbaha')} />;
}

function describePortion(plan: ReadingPlan, index: PlanIndex, start: number, end: number) {
  if (!isSequentialPlan(plan)) return ayahRangeLabel(index, start, end);
  return `${rangeLabel(index, start, end)} · ${ayahRangeLabel(index, start, end)}`;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabs: { paddingHorizontal: 16, gap: 22 },
  tab: { paddingTop: 12, alignItems: 'center', gap: 9, minHeight: 44 },
  underline: { height: 3, borderRadius: 2, alignSelf: 'stretch', minWidth: 24 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingBottom: 40, gap: 24 },
  section: { gap: 12 },
  card: { borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12, minHeight: 184 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  action: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 16, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  tools: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth },
});
