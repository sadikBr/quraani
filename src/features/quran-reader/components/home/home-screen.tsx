import { IconTile, Progress } from '@/components/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerLayout, readerShape } from '../../design';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useReadingPosition } from '../../hooks/use-reading-position';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { RIWAYAT } from '../../riwayat';
import { pageDivisions } from '../../utils/page-divisions';
import { IconButton, ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { SurahName } from '../ui/surah-name';
import { usePlans } from '@/features/plans/provider';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { ayahRangeLabel, nextPortion, rangeLabel, type PlanIndex } from '@/features/plans/engine';
import { goalsOverview } from '@/features/plans/overview';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, isSequentialPlan, type ReadingPlan } from '@/features/plans/types';
import { shortDate } from '@/features/plans/presentation';
import { CollectionRow, MisbahaRow } from '@/features/adhkar/adhkar-screen';
import { t } from '@/i18n';

interface Area { href: Href; icon: ReaderIconName; text: 'plans' | 'adhkar' | 'practice' | 'index' | 'bookmarks' | 'search' | 'settings' }
/** Everything beyond the reader. A new area (dashboard, halaqat, groups…) is one more entry. */
const areas: Area[] = [
  { href: '/plans', icon: 'calendar', text: 'plans' },
  { href: '/adhkar', icon: 'moon-star', text: 'adhkar' },
  { href: '/practice', icon: 'practice', text: 'practice' },
  { href: '/quran-index', icon: 'index', text: 'index' },
  { href: '/bookmarks', icon: 'bookmark', text: 'bookmarks' },
  { href: '/search', icon: 'search', text: 'search' },
  { href: '/settings', icon: 'settings', text: 'settings' },
];

/**
 * The app's front door, opened from the reader's menu button. It leads with
 * the one thing most people came for (continuing where they stopped), then
 * what is due today, then every other area as a grid that grows with the app.
 */
export function HomeScreen() {
  const { palette: p, preferences: { riwayah } } = useReadingPreferences();
  const { content } = useReaderContent();
  const { position, ready } = useReadingPosition(content?.data);
  const { plans, ready: plansReady, today } = usePlans();
  const overview = goalsOverview(plans, today);
  const page = ready ? content?.data.pages.find((value) => value.number === position.pageNumber) : undefined;
  const surahNumber = position.ayah?.surahNumber ?? page?.ayahs[0]?.surahNumber;
  const surahName = content?.data.quran.surahs.find((s) => s.number === surahNumber)?.name ?? '';
  const divisions = page ? pageDivisions(page) : { juz: [], quarters: [] };
  const hizb = [...new Set(divisions.quarters.map((q) => q.hizb))][0];
  const totalPages = content?.data.pages.length ?? 604;
  const progress = page ? page.number / totalPages : 0;
  const upcoming = overview.all.map((plan) => ({ plan, next: nextPortion(plan, today) })).filter((x) => x.next && !x.next.due)
    .sort((a, b) => a.next!.date.localeCompare(b.next!.date))[0];
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <QuranniLogo color={p.ornament} size={30} />
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 20, fontWeight: '600' }}>{t('common.appName')}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(today)} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text></View>
      <IconButton name="close" label={t('common.backToReading')} palette={p} onPress={() => router.dismissTo('/')} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {/* Continue reading: the hero. */}
      <Pressable accessibilityRole="button" accessibilityLabel={surahName ? t('home.hero.continueIn', { surah: surahName, page: page?.number ?? '' }) : t('home.hero.openMushaf')} onPress={() => router.dismissTo('/')}
        style={({ pressed }) => [s.hero, { backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(2, p)]}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{ready && page ? t('home.hero.resume') : t('home.hero.open')}</Text>
        {surahNumber ? <SurahName number={surahNumber} name={surahName} size={56} color={p.ornament} /> : <View style={{ height: 76 }} />}
        <View style={s.heroRow}>
          <Text style={{ color: p.foreground, fontSize: 15 }}>{page ? t('home.hero.page', { page: page.number }) : ''}{divisions.juz.length ? ` · ${t('home.hero.juz', { juz: divisions.juz[0] })}` : ''}{hizb ? ` · ${t('home.hero.hizb', { hizb })}` : ''}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('home.hero.progress', { percent: Math.round(progress * 100) })}</Text>
        </View>
        <View style={{ marginTop: 6 }}><Progress value={Math.max(0.01, progress)} /></View>
        <View style={[s.heroButton, { backgroundColor: p.primary }]}><ReaderIcon name="book" color={p.primaryForeground} size={16} /><Text style={{ color: p.primaryForeground, fontSize: 14, fontWeight: '500' }}>{t('home.hero.continue')}</Text></View>
      </Pressable>

      {/* Today. */}
      <View style={s.section}>
        <View style={s.sectionHead}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600', flex: 1 }}>{t('home.today.title')}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel={t('home.today.allGoals')} onPress={() => router.push('/plans')} style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('home.today.allGoals')}</Text><ReaderIcon name="chevron" color={p.primary} size={16} /></Pressable></View>
        {!plansReady ? null : !overview.all.length
          ? <Pressable accessibilityRole="button" accessibilityLabel={t('home.today.createGoal')} onPress={() => router.push('/plans/new')} style={({ pressed }) => [s.empty, { borderColor: p.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: p.foreground, fontSize: 15 }}>{t('home.today.emptyTitle')}</Text>
            <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('home.today.emptyAction')}</Text>
          </Pressable>
          : overview.due.length
            ? <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>{overview.due.map((plan, i) => <DuePortion key={plan.id} plan={plan} today={today} first={!i} />)}</View>
            : <View style={[s.empty, { borderColor: p.border }]}>
              <Text style={{ color: p.foreground, fontSize: 15 }}>{overview.completedToday ? t('home.today.completed') : t('home.today.nothingDue')}</Text>
              {upcoming && <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('home.today.upcoming', { name: upcoming.plan.name, date: shortDate(upcoming.next!.date) })}</Text>}
            </View>}
      </View>

      {/* Morning and evening adhkar. */}
      <View style={s.section}>
        <View style={s.sectionHead}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600', flex: 1 }}>{t('adhkar.home.title')}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.home.all')} onPress={() => router.push('/adhkar')} style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('adhkar.home.all')}</Text><ReaderIcon name="chevron" color={p.primary} size={16} /></Pressable></View>
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
          <CollectionRow id="morning" first />
          <CollectionRow id="evening" first={false} />
          <MisbahaRow first={false} />
        </View>
      </View>

      {/* Everything else. */}
      <View style={s.section}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('home.explore')}</Text>
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>{areas.map((area, i) => <Pressable key={area.text} accessibilityRole="link" accessibilityLabel={t(`home.areas.${area.text}.label`)} onPress={() => router.push(area.href)}
          style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
          <IconTile name={area.icon} palette={p} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t(`home.areas.${area.text}.label`)}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t(`home.areas.${area.text}.detail`)}</Text>
          </View>
          <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
        </Pressable>)}</View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function DuePortion({ plan, today, first }: { plan: ReadingPlan; today: string; first: boolean }) {
  const { palette: p, update } = useReadingPreferences();
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
  return <View style={[s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{kind}{next.date < today ? ` · ${t('home.today.overdue')}` : ''}</Text>
      <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{plan.name}</Text>
      <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{index ? describePortion(plan, index, next.start, next.end) : ''}</Text>
    </View>
    <Pressable accessibilityRole="button" hitSlop={6} accessibilityLabel={t('home.today.startGoal', { name: plan.name })} disabled={!index} onPress={start}
      style={({ pressed }) => [s.start, { backgroundColor: p.primary, opacity: !index ? 0.4 : pressed ? 0.8 : 1 }]}>
      <Text style={{ color: p.primaryForeground, fontSize: 14, fontWeight: '500' }}>{t('home.today.start')}</Text>
    </Pressable>
  </View>;
}

function describePortion(plan: ReadingPlan, index: PlanIndex, start: number, end: number) {
  if (!isSequentialPlan(plan)) return ayahRangeLabel(index, start, end);
  return `${rangeLabel(index, start, end)} · ${ayahRangeLabel(index, start, end)}`;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 10, paddingBottom: 40, gap: 24 },
  hero: { borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4, flexDirection: 'row' },
  heroButton: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: readerShape.control, marginTop: 14 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 },
  start: { minHeight: 36, paddingHorizontal: 14, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 16, gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg },
  rowIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
