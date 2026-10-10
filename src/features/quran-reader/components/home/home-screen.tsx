import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../../design';
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
import { arabicNumber, shortDate } from '@/features/plans/presentation';

interface Area { href: Href; icon: ReaderIconName; label: string; detail: string }
/** Everything beyond the reader. A new area (dashboard, halaqat, groups…) is one more entry. */
const areas: Area[] = [
  { href: '/plans', icon: 'calendar', label: 'الأهداف', detail: 'ختمة، ورد، حفظ، وقراءات متكررة' },
  { href: '/quran-index', icon: 'index', label: 'الفهرس', detail: 'السور والأجزاء والأحزاب' },
  { href: '/bookmarks', icon: 'bookmark', label: 'العلامات', detail: 'آيات حفظتها للرجوع إليها' },
  { href: '/search', icon: 'search', label: 'البحث', detail: 'بكلمة أو بموضع آية' },
  { href: '/settings', icon: 'settings', label: 'الإعدادات', detail: 'الرواية والمظهر والخط' },
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
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 22, fontWeight: '700' }}>قرآني</Text><Text style={{ color: p.muted, fontSize: 12 }}>{shortDate(today)} · رواية {RIWAYAT[riwayah].label}</Text></View>
      <IconButton name="close" label="العودة إلى القراءة" palette={p} onPress={() => router.dismissTo('/')} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {/* Continue reading: the hero. */}
      <Pressable accessibilityRole="button" accessibilityLabel={surahName ? `متابعة القراءة في ${surahName}، صفحة ${page?.number ?? ''}` : 'فتح المصحف'} onPress={() => router.dismissTo('/')}
        style={({ pressed }) => [s.hero, { backgroundColor: p.hero, opacity: pressed ? 0.9 : 1 }, readerElevation(3, p)]}>
        <Text style={{ color: p.heroMuted, fontSize: 13 }}>{ready && page ? 'تابع من حيث توقفت' : 'افتح المصحف'}</Text>
        {surahNumber ? <SurahName number={surahNumber} name={surahName} size={56} color={p.ornament} /> : <View style={{ height: 76 }} />}
        <View style={s.heroRow}>
          <Text style={{ color: p.onHero, fontSize: 15 }}>{page ? `صفحة ${arabicNumber(page.number)}` : ''}{divisions.juz.length ? ` · الجزء ${arabicNumber(divisions.juz[0])}` : ''}{hizb ? ` · الحزب ${arabicNumber(hizb)}` : ''}</Text>
          <Text style={{ color: p.heroMuted, fontSize: 13 }}>{arabicNumber(Math.round(progress * 100))}٪ من المصحف</Text>
        </View>
        <View style={[s.track, { backgroundColor: withAlpha(p.onHero, 0.18) }]}><View style={{ width: `${Math.max(1, progress * 100)}%`, height: '100%', backgroundColor: p.ornament }} /></View>
        <View style={[s.heroButton, { backgroundColor: p.onHero }]}><ReaderIcon name="book" color={p.hero} size={20} /><Text style={{ color: p.hero, fontSize: 15, fontWeight: '600' }}>متابعة القراءة</Text></View>
      </Pressable>

      {/* Today. */}
      <View style={s.section}>
        <View style={s.sectionHead}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 19, fontWeight: '600', flex: 1 }}>وردك اليوم</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="كل الأهداف" onPress={() => router.push('/plans')} style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>كل الأهداف</Text><ReaderIcon name="chevron" color={p.accent} size={16} /></Pressable></View>
        {!plansReady ? null : !overview.all.length
          ? <Pressable accessibilityRole="button" accessibilityLabel="إنشاء هدف" onPress={() => router.push('/plans/new')} style={({ pressed }) => [s.empty, { borderColor: p.border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ color: p.text, fontSize: 15 }}>لا أهداف بعد. ختمة، أو حفظ، أو سورة تعود إليها كل أسبوع.</Text>
            <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>أنشئ هدفك الأول</Text>
          </Pressable>
          : overview.due.length
            ? <View style={[s.list, { borderColor: p.border, backgroundColor: p.paper }]}>{overview.due.map((plan, i) => <DuePortion key={plan.id} plan={plan} today={today} first={!i} />)}</View>
            : <View style={[s.empty, { borderColor: p.border }]}>
              <Text style={{ color: p.text, fontSize: 15 }}>{overview.completedToday ? 'أتممت ورد اليوم، تقبّل الله منك.' : 'لا موعد اليوم.'}</Text>
              {upcoming && <Text style={{ color: p.muted, fontSize: 13 }}>الموعد القادم: {upcoming.plan.name} · {shortDate(upcoming.next!.date)}</Text>}
            </View>}
      </View>

      {/* Everything else. */}
      <View style={s.section}>
        <Text accessibilityRole="header" style={{ color: p.text, fontSize: 19, fontWeight: '600' }}>استكشف</Text>
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.paper }]}>{areas.map((area, i) => <Pressable key={area.label} accessibilityRole="link" accessibilityLabel={area.label} onPress={() => router.push(area.href)}
          style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
          <View style={[s.rowIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={area.icon} color={p.accent} size={21} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>{area.label}</Text>
            <Text style={{ color: p.muted, fontSize: 12 }}>{area.detail}</Text>
          </View>
          <ReaderIcon name="chevron" color={p.muted} size={18} />
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
  const kind = isMemorizationPlan(plan) ? 'حفظ' : isRevisionPlan(plan) ? 'مراجعة' : isRecurringPlan(plan) ? 'قراءة متكررة' : plan.goal.type === 'khatma' ? 'ختمة' : 'ورد يومي';
  const start = () => {
    if (!index) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  return <View style={[s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.muted, fontSize: 12 }}>{kind}{next.date < today ? ' · ورد سابق' : ''}</Text>
      <Text numberOfLines={1} style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>{plan.name}</Text>
      <Text numberOfLines={1} style={{ color: p.muted, fontSize: 13 }}>{index ? describePortion(plan, index, next.start, next.end) : ''}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`ابدأ ${plan.name}`} disabled={!index} onPress={start}
      style={({ pressed }) => [s.start, { backgroundColor: p.accent, opacity: !index ? 0.4 : pressed ? 0.8 : 1 }]}>
      <Text style={{ color: p.paper, fontSize: 14, fontWeight: '600' }}>ابدأ</Text>
    </Pressable>
  </View>;
}

function describePortion(plan: ReadingPlan, index: PlanIndex, start: number, end: number) {
  if (!isSequentialPlan(plan)) return ayahRangeLabel(index, start, end);
  return `${rangeLabel(index, start, end)} · ${ayahRangeLabel(index, start, end)}`;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingTop: 10, paddingBottom: 40, gap: 26 },
  hero: { borderRadius: readerShape.hero, padding: 22, gap: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 4, flexDirection: 'row' },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: readerShape.control, marginTop: 12 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  list: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  start: { minHeight: 42, paddingHorizontal: 18, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 16, gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.card },
  rowIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
