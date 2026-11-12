import { StreakCard } from '@/features/activity/streak-card';
import { RamadanCard } from '@/features/ramadan/ramadan-card';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Embedded } from '@/components/embedded';
import { HorizontalControl, SwipePages, useSwipeTabs } from '@/components/swipe-tabs';
import { ArchTile, artColors, type Motif } from '@/components/craft/art';
import { Beads, BrushStroke } from '@/components/craft/marks';
import { page, Section } from '@/components/craft/page';
import { readerLayout, readerShape } from '../../design';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { useQuranFont } from '../../hooks/use-quran-font';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { RIWAYAT } from '../../riwayat';
import { IconButton, ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { usePlans } from '@/features/plans/provider';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { ayahRangeLabel, nextPortion, rangeLabel, type PlanIndex } from '@/features/plans/engine';
import { goalsOverview } from '@/features/plans/overview';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, isSequentialPlan, type ReadingPlan } from '@/features/plans/types';
import { shortDate } from '@/features/plans/presentation';
import { PlansScreen } from '@/features/plans/plans-screen';
import { AdhkarScreen, adhkarNow, collectionMotifs } from '@/features/adhkar/adhkar-screen';
import { collectionIcons, collections, type CollectionId } from '@/features/adhkar/content';
import { collectionProgress } from '@/features/adhkar/progress';
import { useAdhkar } from '@/features/adhkar/provider';
import { PrayerHomeCard } from '@/features/prayers/home-card';
import { PrayersScreen } from '@/features/prayers/prayers-screen';
import { usePrayers, useNow } from '@/features/prayers/provider';
import { prayerWindow } from '@/features/prayers/times';
import { PracticeScreen } from '@/features/practice/practice-screen';
import { HalaqatScreen } from '@/features/halaqat/halaqat-screen';
import { useHalaqat, useMembership } from '@/features/halaqat/provider';
import { absent, activeStudents, entryOf, heard, nextMeeting, sessionOn, type Halaqa } from '@/features/halaqat/model';
import { useAccount } from '@/features/account/provider';
import { t } from '@/i18n';

/** The home screen's sections, each a whole page; a new major feature is one more tab. */
const TABS = ['today', 'prayers', 'goals', 'adhkar', 'practice', 'halaqat'] as const;
type Tab = typeof TABS[number];

/**
 * The app's front door, opened from the reader's menu button (going back returns to the reader;
 * the top bar holds the settings).
 * Tabs keep it tidy as the app grows: «اليوم» gathers what matters now (the prayer times, what is
 * due today), and each other tab is a whole section, shown in place. A swipe moves between tabs
 * like the mushaf's pages: the next tab lies to the left, as in the tab bar.
 */
export function HomeScreen() {
  const { palette: p, preferences: { riwayah } } = useReadingPreferences();
  const { today } = usePlans();
  const { tab, open, pages } = useSwipeTabs(TABS, 'today');
  // The pager's gesture needs a gesture root; the app's stack screens have none of their own.
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <QuranniLogo color={p.ornament} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, lineHeight: 38, fontFamily: 'ReaderNaskhBold' }}>{t('common.appName')}</Text>
        <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(today)} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
      </View>
      <AccountButton />
      <IconButton name="settings" label={t('common.settings')} palette={p} onPress={() => router.push('/settings')} />
    </View>
    <View style={[s.tabBar, { borderColor: p.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={s.tabs}>
        {TABS.map((id) => {
          const active = id === tab;
          return <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active }} aria-selected={active} onPress={() => open(id)}
            style={({ pressed }) => [s.tab, { opacity: pressed && !active ? 0.6 : 1 }]}>
            <Text style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 17, lineHeight: 30, fontFamily: active ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{t(`home.tabs.${id}`)}</Text>
            <BrushStroke on={active} width={44} color={p.ornament} />
          </Pressable>;
        })}
      </ScrollView>
    </View>
    <SwipePages pages={pages} render={(id) => id === 'today' ? <TodayTab onTab={open} /> : <Embedded>
      {id === 'prayers' ? <PrayersScreen /> : id === 'goals' ? <PlansScreen /> : id === 'adhkar' ? <AdhkarScreen /> : id === 'halaqat' ? <HalaqatScreen /> : <PracticeScreen />}
    </Embedded>} />
  </SafeAreaView></GestureHandlerRootView>;
}

/** The account, with a gold dot when something there waits for the user (a choice between copies). */
function AccountButton() {
  const { palette: p } = useReadingPreferences();
  const { sync } = useAccount();
  const waiting = sync.conflicts.length > 0;
  return <View>
    <IconButton name="user" label={waiting ? t('account.needsYou') : t('account.open')} palette={p} onPress={() => router.push('/account')} />
    {waiting && <View pointerEvents="none" style={[s.dot, { backgroundColor: p.ornament, borderColor: p.background }]} />}
  </View>;
}

/**
 * What matters now: the prayer times, seen through an arched window, then what is due today as
 * arched tiles to swipe. The reader's tools (index, bookmarks, search) are in its own toolbar.
 */
function TodayTab({ onTab }: { onTab: (tab: Tab) => void }) {
  const { palette: p } = useReadingPreferences();
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { paddingTop: 18 }]}>
    <PrayerHomeCard onOpen={() => onTab('prayers')} />
    <RamadanCard />
    <Section title={t('home.now.title')} palette={p}>
      <NowTiles onTab={onTab} />
    </Section>
    <StreakCard />
  </ScrollView>;
}

/**
 * A swipeable row of arched tiles: the adhkar for now, and each goal due today (or an
 * invitation). The misbaha is in the adhkar tab.
 * A swipe that starts on the row scrolls the row, not the tabs.
 */
function NowTiles({ onTab }: { onTab: (tab: Tab) => void }) {
  const { width } = useWindowDimensions();
  const { plans, ready, today } = usePlans();
  const { state: prayers } = usePrayers();
  const now = useNow(60_000);
  const overview = goalsOverview(plans, today);
  // The halaqat that meet today, or whose session has begun (signed out, the halaqat wait).
  const { signedIn } = useMembership();
  const halaqat = useHalaqat().state.halaqat.filter((h) => signedIn && activeStudents(h).length && (sessionOn(h, today) || nextMeeting(h, today) === today));
  const tile = Math.round(Math.min(188, Math.min(width, readerLayout.maxWidth) * 0.47));
  const current = prayers.location ? prayerWindow(prayers.location, now, prayers).current?.prayer : undefined;
  // With nothing due today, the goal that comes next.
  const upcoming = overview.all.map((plan) => ({ plan, next: nextPortion(plan, today) })).filter((x) => x.next && !x.next.due)
    .sort((a, b) => a.next!.date.localeCompare(b.next!.date))[0];
  const later = upcoming ? t('home.today.upcoming', { name: upcoming.plan.name, date: shortDate(upcoming.next!.date) }) : t('home.now.goalsLater');
  return <HorizontalControl><ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={tile + 12} decelerationRate="fast"
    style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
    <AdhkarTile id={adhkarNow(current, now.getHours())} width={tile} />
    {halaqat.map((halaqa) => <HalaqaTile key={halaqa.id} halaqa={halaqa} today={today} width={tile} />)}
    {ready && overview.due.map((plan) => <GoalTile key={plan.id} plan={plan} today={today} width={tile} />)}
    {ready && !overview.due.length && <NoGoalTile width={tile} hasGoals={!!overview.all.length} completed={overview.completedToday > 0} later={later} onTab={onTab} />}
  </ScrollView></HorizontalControl>;
}

/** What an arched tile holds in its arch: an icon on a medallion, or a surah's name in calligraphy in its frame. */
type Figure = { icon: ReaderIconName } | { surah: number };

/**
 * An arched tile, as the suggestions of the tasmee': a pattern for its kind, a figure in the
 * arch, then its title, a line or two, and at its foot what to do (or how far along it is).
 */
function NowTile({ width, motif, figure, title, detail, footer, label, onPress }: {
  width: number; motif: Motif; figure: Figure; title: string; detail: string; footer: ReactNode; label: string; onPress: () => void;
}) {
  const { palette: p } = useReadingPreferences();
  const { loaded: calligraphy } = useQuranFont();
  const height = Math.round(width * 1.46), rise = Math.round(width * 0.5);
  const colors = artColors(p);
  const focus = Math.round(rise * 0.74 + 8), medallion = Math.round(width * 0.19);
  const surah = 'surah' in figure && calligraphy ? figure.surah : null;
  const frame = { width: Math.round(width * 0.8), height: 46 };
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [{ width, height, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    <ArchTile w={width} h={height} rise={rise} motif={motif} palette={p} focus={focus} medallion={'icon' in figure ? medallion : undefined} cartouche={surah ? frame : undefined} />
    {'icon' in figure && <View style={[s.figure, { top: focus - medallion, height: medallion * 2 }]}><ReaderIcon name={figure.icon} color={p.ornament} size={Math.round(medallion * 0.95)} /></View>}
    {surah !== null && <View style={[s.figure, { top: focus - frame.height / 2, height: frame.height }]}>
      <Text style={[calligraphyStyle(Math.round(frame.height * 0.78)), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(surah)}</Text>
    </View>}
    <View style={[StyleSheet.absoluteFill, s.tileBody]}>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: colors.soft, fontSize: 12, lineHeight: 18 }}>{detail}</Text>
        <View style={{ marginTop: 10 }}>{footer}</View>
      </View>
    </View>
  </Pressable>;
}

/** The foot of a tile: what a tap does, in a pill. */
function Pill({ text, icon = 'play' }: { text: string; icon?: ReaderIconName }) {
  const { palette: p } = useReadingPreferences();
  const colors = artColors(p);
  return <View style={[s.pill, { borderColor: colors.edge }]}>
    <ReaderIcon name={icon} color={colors.ink} size={13} />
    <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{text}</Text>
  </View>;
}

/** The foot of a tile already done: a check, and what was done. */
function Done({ text }: { text: string }) {
  const { palette: p } = useReadingPreferences();
  const colors = artColors(p);
  return <View style={s.done}>
    <ReaderIcon name="done" color={p.ornament} size={16} />
    <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.ink, fontSize: 13, fontWeight: '600' }}>{text}</Text>
  </View>;
}

function AdhkarTile({ id, width }: { id: CollectionId; width: number }) {
  const { palette: p } = useReadingPreferences();
  const { state, today } = useAdhkar();
  const colors = artColors(p);
  const progress = collectionProgress(state, id, today);
  const title = t(`adhkar.collections.${id}.title`);
  const status = progress.complete ? t('adhkar.completed') : progress.started ? t('adhkar.progress', { done: progress.done, total: progress.total }) : t('adhkar.size', { count: collections[id].length });
  const footer = progress.complete ? <Done text={t('adhkar.completed')} />
    : progress.started ? <View style={{ gap: 6 }}>
      <Beads count={progress.total} done={progress.done} palette={p} size={7} tone={p.ornament} />
      <Text style={{ color: colors.soft, fontSize: 12 }}>{status}</Text>
    </View>
    : <Pill text={t('home.now.begin')} />;
  return <NowTile width={width} motif={collectionMotifs[id]} figure={{ icon: collectionIcons[id] }} title={title}
    detail={progress.started || progress.complete ? t(`adhkar.collections.${id}.detail`) : `${t(`adhkar.collections.${id}.detail`)} · ${status}`}
    footer={footer} label={t('adhkar.openLabel', { title, state: progress.complete ? t('adhkar.completed') : progress.started ? status : t('adhkar.notStarted') })}
    onPress={() => router.push({ pathname: '/adhkar/[id]', params: { id } })} />;
}

const goalMotifs = { memorization: 'lattice', revision: 'arches', recurring: 'ripple', khatma: 'khatam', wird: 'rosette' } as const;

function GoalTile({ plan, today, width }: { plan: ReadingPlan; today: string; width: number }) {
  const { update, palette: p } = useReadingPreferences();
  const { index } = usePlanIndex(plan.riwayah);
  const next = nextPortion(plan, today);
  if (!next) return null;
  const type = isMemorizationPlan(plan) ? 'memorization' : isRevisionPlan(plan) ? 'revision' : isRecurringPlan(plan) ? 'recurring' : plan.goal.type === 'khatma' ? 'khatma' : 'wird';
  const kind = t(`goals.types.${type}`);
  const start = () => {
    if (!index) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const surah = index?.ayahs[next.start]?.surahNumber;
  const portion = index ? describePortion(plan, index, next.start, next.end) : '';
  return <NowTile width={width} motif={goalMotifs[type]} figure={surah ? { surah } : { icon: 'calendar' }} title={plan.name}
    detail={[next.date < today ? `${kind} · ${t('home.today.overdue')}` : kind, portion].filter(Boolean).join('\n')}
    footer={index ? <Pill text={t('home.today.start')} /> : <ActivityIndicator size="small" color={artColors(p).ink} />}
    label={t('home.today.startGoal', { name: plan.name })} onPress={start} />;
}

/** A halaqa meeting today: its students as beads, those heard filled, and the way into the session. */
function HalaqaTile({ halaqa, today, width }: { halaqa: Halaqa; today: string; width: number }) {
  const { palette: p } = useReadingPreferences();
  const colors = artColors(p);
  const students = activeStudents(halaqa);
  const session = sessionOn(halaqa, today);
  const done = students.filter((s) => heard(entryOf(session, s.id))).length;
  const finished = !!session && students.every((s) => heard(entryOf(session, s.id)) || absent(entryOf(session, s.id)));
  const progress = t('halaqat.detail.heardOf', { done, total: students.length });
  const footer = finished ? <Done text={progress} />
    : session ? <View style={{ gap: 6 }}>
      <Beads count={students.length} done={done} palette={p} size={7} tone={p.ornament} />
      <Text style={{ color: colors.soft, fontSize: 12 }}>{progress}</Text>
    </View>
    : <Pill text={t('home.now.halaqaStart')} icon="users" />;
  return <NowTile width={width} motif="circle" figure={{ icon: 'users' }} title={halaqa.name}
    detail={`${t('halaqat.detail.todaySession')} · ${t('halaqat.studentCount', { count: students.length })}`} footer={footer}
    label={t('home.now.halaqaLabel', { name: halaqa.name, state: session ? progress : t('home.now.halaqaNotStarted') })}
    onPress={() => router.push({ pathname: '/halaqat/session', params: { halaqa: halaqa.id, date: today } })} />;
}

function NoGoalTile({ width, hasGoals, completed, later, onTab }: { width: number; hasGoals: boolean; completed: boolean; later: string; onTab: (tab: Tab) => void }) {
  if (!hasGoals) {
    return <NowTile width={width} motif="rosette" figure={{ icon: 'plus' }} title={t('home.now.noGoals')} detail={t('home.today.emptyTitle')}
      footer={<Pill text={t('home.today.emptyAction')} icon="plus" />} label={t('home.today.createGoal')} onPress={() => router.push('/plans/new')} />;
  }
  return <NowTile width={width} motif="khatam" figure={{ icon: completed ? 'done' : 'calendar' }} title={completed ? t('home.now.goalsDone') : t('home.today.nothingDue')}
    detail={completed ? t('home.today.completed') : later} footer={<Pill text={t('home.today.allGoals')} icon="calendar" />}
    label={t('home.today.allGoals')} onPress={() => onTab('goals')} />;
}

function describePortion(plan: ReadingPlan, index: PlanIndex, start: number, end: number) {
  if (!isSequentialPlan(plan)) return ayahRangeLabel(index, start, end);
  return `${rangeLabel(index, start, end)} · ${ayahRangeLabel(index, start, end)}`;
}

const s = StyleSheet.create({
  dot: { position: 'absolute', top: 2, end: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabs: { paddingHorizontal: 16, gap: 24 },
  tab: { paddingTop: 6, alignItems: 'center', minHeight: 44 },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  tileBody: { paddingHorizontal: 14, paddingBottom: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, height: 30, borderRadius: readerShape.pill, borderWidth: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30 },
});
