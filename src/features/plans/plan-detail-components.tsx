import { useRef, type PropsWithChildren, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { khatam } from '@/components/craft/art';
import { Cartouche, Medallion } from '@/components/craft/marks';
import { PageBar, PageTitle, SheetGrabber, SheetTitle, page } from '@/components/craft/page';
import { ArchPanel } from '@/components/craft/panels';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { IconButton, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { Button } from '@/components/ui';
import { RIWAYAT } from '../quran-reader/riwayat';
import type { AyahSpan, ReadingPlan, SequentialPlan } from './types';
import type { PlanIndex } from './engine';
import { shortDate } from './presentation';
import { formatDate, formatList, t } from '@/i18n';

function statusLabel(plan: ReadingPlan) {
  if (plan.status !== 'active') return t(`goals.status.${plan.status}`);
  return plan.goal.type === 'memorization' ? t('plans.detail.status.memorizing') : plan.goal.type === 'revision' ? t('plans.detail.status.reviewing') : t('plans.detail.status.reading');
}

/**
 * A goal's page: the way back to the goals and its settings, its name in Naskh with what it is
 * doing (reading, memorizing, paused…) and its riwayah, then the goal itself.
 */
export function DetailScreen({ plan, onBack, onSettings, children }: PropsWithChildren<{ plan: ReadingPlan; onBack: () => void; onSettings: () => void }>) {
  const { palette: p } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar palette={p} back={{ label: t('goals.backToGoals'), onPress: onBack }}
      actions={<IconButton name="settings" label={t('plans.detail.settings')} palette={p} onPress={onSettings} />} />
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[page.content, { gap: 22 }]}>
      <PageTitle title={plan.name} palette={p}>
        <View style={[d.row, { gap: 8, marginTop: 2 }]}>
          <View style={[d.state, { backgroundColor: withAlpha(plan.status === 'active' ? p.ornament : p.mutedForeground, 0.12) }]}>
            <View style={[d.dot, { backgroundColor: plan.status === 'active' ? p.ornament : p.mutedForeground }]} />
            <Text style={{ color: p.foreground, fontSize: 12, fontWeight: '600' }}>{statusLabel(plan)}</Text>
          </View>
          <Text numberOfLines={1} style={{ flexShrink: 1, color: p.mutedForeground, fontSize: 13 }}>{t('common.riwayahOf', { riwayah: RIWAYAT[plan.riwayah].label })}</Text>
        </View>
      </PageTitle>
      {children}
    </ScrollView>
  </SafeAreaView>;
}

/** How much of each of the thirty ajza' a set of ayahs covers (0 to 1). */
export function juzShares(index: PlanIndex, spans: AyahSpan[]) {
  return index.juzs.slice(0, -1).map((start, i) => {
    const end = index.juzs[i + 1];
    return spans.reduce((n, r) => n + Math.max(0, Math.min(end, r.end) - Math.max(start, r.start)), 0) / (end - start);
  });
}

/**
 * The mushaf as a ring of thirty stars, one a juz', read from the top and onwards to the left as
 * the pages turn. A star fills with gold as its juz' is done (`done`, 0 to 1); `held` (0 to 1)
 * draws a juz' that is the goal's to go through, outlined in gold while it waits (what is
 * memorized and not yet revised); the juz' one is in is ringed. What the ring stands for is
 * written in its middle (`children`); `label` says it all aloud, and with `percent` (what the
 * middle shows) the ring is read as a progress bar.
 */
export function JuzRing({ done, held, current, size = 244, label, percent, children }: { done: number[]; held?: number[]; current?: number; size?: number; label: string; percent?: number; children?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  const c = size / 2, radius = c - 13, a = size > 220 ? 5.2 : 4.4;
  const star = (i: number) => { const angle = -Math.PI / 2 - (i * 2 * Math.PI) / 30; return { x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) }; };
  return <View accessible accessibilityRole={percent === undefined ? 'image' : 'progressbar'} accessibilityLabel={label}
    accessibilityValue={percent === undefined ? undefined : { min: 0, max: 100, now: percent }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Circle cx={c} cy={c} r={radius} fill="none" stroke={withAlpha(p.ornament, 0.3)} strokeWidth={1} />
      <Circle cx={c} cy={c} r={radius - 19} fill="none" stroke={withAlpha(p.ornament, 0.18)} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
      {Array.from({ length: 30 }, (_, i) => {
        const { x, y } = star(i), share = Math.min(1, done[i] ?? 0), mine = held ? Math.min(1, held[i] ?? 0) : 1;
        const full = share >= 0.999;
        // A juz' begun is washed with gold as far as it is done; one not the goal's stays a faint outline.
        const fill = full ? p.ornament : share > 0 ? withAlpha(p.ornament, 0.2 + 0.55 * share) : mine > 0 && held ? withAlpha(p.ornament, 0.12) : p.card;
        const stroke = mine > 0 ? withAlpha(p.ornament, full || held ? 0.95 : 0.6) : withAlpha(p.mutedForeground, 0.35);
        // A juz' that is not the goal's is drawn smaller, so the ring shows at a glance what the goal goes through.
        return <Path key={i} d={khatam(x, y, mine > 0 ? a : a * 0.62)} fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />;
      })}
      {current !== undefined && current >= 0 && <Circle cx={star(current).x} cy={star(current).y} r={a * 2.2} fill="none" stroke={p.primary} strokeWidth={1.6} />}
    </Svg>
    <View style={{ alignItems: 'center', maxWidth: size - 70 }}>{children}</View>
  </View>;
}

/** A small star in the legend of a ring. */
export function RingKey({ filled, label }: { filled: boolean; label: string }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[d.row, { gap: 6 }]}>
    <Svg width={14} height={14} aria-hidden><Path d={khatam(7, 7, 4)} fill={filled ? p.ornament : withAlpha(p.ornament, 0.12)} stroke={p.ornament} strokeWidth={1} strokeLinejoin="round" /></Svg>
    <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
  </View>;
}

/**
 * A goal's progress seen through an arched window: the ring (`figure`), then a word for where
 * the goal stands, a line under it, and its figures (`stats`) at the foot.
 */
export function HeroPanel({ figure, title, detail, stats, children }: { figure: ReactNode; title: string; detail?: string; stats?: ReactNode; children?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <ArchPanel palette={p} rise={46} contentStyle={d.hero}>
    {figure}
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold', textAlign: 'center', marginTop: 6 }}>{title}</Text>
    {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{detail}</Text>}
    {children}
    {stats && <View style={[d.heroStats, { borderColor: withAlpha(p.ornament, 0.3) }]}>{stats}</View>}
  </ArchPanel>;
}

/** One of a hero's figures: what it is, then its value. */
export function HeroStat({ label, value, divided = false }: { label: string; value: string; divided?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[d.grow, { alignItems: 'center', gap: 2 }, divided && { borderStartWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(p.ornament, 0.3) }]}>
    <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
    <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{value}</Text>
  </View>;
}

/** A khatma's or a daily wird's progress: the round's ajza' on the ring, read so far filled. */
export function ProgressHero({ plan, index }: { plan: SequentialPlan; index?: PlanIndex }) {
  const { palette: p } = useReadingPreferences();
  const finished = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const total = plan.cycle.sessions.length;
  const fraction = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  // Do not show 100% before the final ayah is actually completed.
  const percent = fraction === 1 ? 100 : Math.floor(fraction * 100);
  const read = index ? juzShares(index, [{ start: plan.cycle.start, end: plan.cycle.cursor }]) : [];
  const round = index ? juzShares(index, [{ start: plan.cycle.start, end: plan.totalAyahs }]) : undefined;
  const current = index && plan.cycle.cursor < plan.totalAyahs ? index.juzs.findIndex((start, i) => start <= plan.cycle.cursor && plan.cycle.cursor < index.juzs[i + 1]) : undefined;
  return <HeroPanel title={fraction === 1 ? t('plans.detail.hero.finished') : fraction > 0 ? t('plans.detail.hero.started') : t('plans.detail.hero.notStarted')}
    detail={t('plans.progress.completedOfTotal', { completed: finished, count: total })}
    figure={<JuzRing done={read} held={round?.some(x => x < 1) ? round : undefined} current={current} percent={percent}
      label={formatList([t('plans.detail.hero.progressLabel'), t('plans.percent', { percent }), t('plans.detail.hero.cycle', { cycle: plan.cycle.number })])}>
      <Text style={{ color: p.foreground, fontSize: 42, lineHeight: 64, fontFamily: 'ReaderNaskhBold' }}>{t('plans.percent', { percent })}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('plans.detail.hero.cycle', { cycle: plan.cycle.number })}</Text>
    </JuzRing>}
    stats={<>
      <HeroStat label={plan.goal.type === 'khatma' ? t('plans.detail.hero.duration') : t('plans.detail.hero.dailyWird')} value={plan.goal.type === 'khatma' ? t('plans.units.weeks', { count: plan.goal.weeks }) : t(`plans.units.${plan.unit}`, { count: plan.goal.amount })} />
      <HeroStat divided label={plan.cycle.completedOn ? t('plans.detail.hero.completedOn') : plan.goal.type === 'khatma' ? t('plans.detail.hero.completionDate') : t('plans.detail.hero.remainingLabel')} value={plan.cycle.completedOn ? shortDate(plan.cycle.completedOn) : plan.goal.type === 'khatma' ? shortDate(plan.cycle.sessions.at(-1)!.date) : t('plans.detail.hero.remaining', { count: total - finished })} />
    </>} />;
}

/**
 * Where a portion begins and ends: each surah's name in calligraphy in its title frame, as the
 * mushaf heads its surahs, and the ayah under it.
 */
export function ReadingBounds({ index, start, end }: { index: PlanIndex; start: number; end: number }) {
  const { palette: p } = useReadingPreferences();
  return <View style={d.bounds}>
    {[{ id: 'from', label: t('plans.portion.from'), ayah: index.ayahs[start] }, { id: 'to', label: t('plans.portion.to'), ayah: index.ayahs[end - 1] }].map(({ id, label, ayah }) => <View key={id} style={[d.grow, { alignItems: 'center', gap: 4 }]}>
      <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Cartouche width={136} height={46} palette={p} filled>
        <SurahName number={ayah.surahNumber} name={index.surahNames[ayah.surahNumber]} size={28} color={p.ornament} align="center" />
      </Cartouche>
      <Text style={{ color: p.foreground, fontSize: 13, fontWeight: '600' }}>{t('plans.portion.ayah', { ayah: ayah.ayahNumber })}</Text>
    </View>)}
  </View>;
}

/**
 * The surahs of a recurring reading, each name in calligraphy in its title frame; past two, their
 * names written plainly.
 */
export function SurahFrames({ index, surahs, width = 210 }: { index: PlanIndex; surahs: number[]; width?: number }) {
  const { palette: p } = useReadingPreferences();
  if (surahs.length > 2) return <Text style={{ color: p.foreground, fontSize: 20, lineHeight: 34, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{formatList(surahs.map(n => index.surahNames[n]))}</Text>;
  return <View style={{ alignItems: 'center', gap: 8 }}>
    {surahs.map(n => <Cartouche key={n} width={width} height={56} palette={p} filled>
      <SurahName number={n} name={index.surahNames[n]} size={36} color={p.ornament} align="center" />
    </Cartouche>)}
  </View>;
}

/** A portion's day, as a seal: the weekday, the day of the month in a star (filled when it is today), the month. */
export function DateSeal({ date, due }: { date: string; due: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <View accessible accessibilityLabel={due ? t('common.today') : formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} style={{ alignItems: 'center', minWidth: 64 }}>
    <Text style={{ color: due ? p.foreground : p.mutedForeground, fontSize: 12, fontWeight: due ? '700' : '400' }}>{due ? t('common.today') : formatDate(date, { weekday: 'long' })}</Text>
    <Medallion value={Number(date.slice(8))} size={54} palette={p} current={due} />
    <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{formatDate(date, { month: 'long' })}</Text>
  </View>;
}

/** A portion's figures in a row: ayahs, words, pages. */
export function PortionStats({ items }: { items: { id: string; label: string; value: string }[] }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[d.row, { gap: 0, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
    {items.map((stat, i) => <View key={stat.id} style={[d.grow, { alignItems: 'center', borderStartWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
      <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{stat.label}</Text>
      <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{stat.value}</Text>
    </View>)}
  </View>;
}

/** The heading of the card that holds what is due: what it is, in gold when it is due. */
export function PortionHeading({ title, due, aside }: { title: string; due: boolean; aside?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[d.row, { gap: 8 }]}>
    {due && <View style={[d.dot, { backgroundColor: p.ornament }]} />}
    <Text accessibilityRole="header" style={{ flex: 1, color: due ? p.foreground : p.mutedForeground, fontSize: 15, fontWeight: '700' }}>{title}</Text>
    {aside}
  </View>;
}

/** Primary actions are the `default` Button; the rest are `ghost` (destructive ones in `destructive` text). */
export function DetailAction({ label, onPress, icon, primary = false, disabled = false, destructive = false }: { label: string; onPress: () => void; icon?: ReaderIconName; primary?: boolean; disabled?: boolean; destructive?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <Button variant={primary ? 'default' : 'ghost'} size={primary ? 'lg' : 'default'} icon={icon} disabled={disabled} onPress={onPress} block tone={destructive ? p.destructive : undefined}>{label}</Button>;
}

/** A goal's settings, in a sheet: its title in Naskh and the way to close it, then the settings. */
export function PlanSettingsSheet({ onClose, children }: PropsWithChildren<{ onClose: () => void }>) {
  const { palette } = useReadingPreferences();
  const close = useRef<View>(null);
  const swipe = useSwipeToClose(onClose);
  return <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: palette.overlay }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('plans.detail.closeSettings')} onPress={onClose} />
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} onLayout={swipe.onSheetLayout} style={[d.sheet, { backgroundColor: palette.background, borderColor: palette.border }, readerElevation(4, palette), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View onLayout={swipe.onHeaderLayout} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <SheetGrabber palette={palette} />
            <View style={{ paddingTop: 8 }}><SheetTitle title={t('plans.detail.settings')} palette={palette} onClose={onClose} closeLabel={t('common.close')} closeRef={close} /></View>
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><ScrollView {...swipe.scrollProps} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 10, gap: 18 }}>{children}</ScrollView></GestureDetector>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

export const d = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: readerShape.pill },
  dot: { width: 7, height: 7, borderRadius: 4 },
  hero: { alignItems: 'center', gap: 2, paddingTop: 52, paddingHorizontal: 18, paddingBottom: 18 },
  heroStats: { flexDirection: 'row', alignSelf: 'stretch', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  bounds: { flexDirection: 'row', gap: 10 },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '90%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
});
