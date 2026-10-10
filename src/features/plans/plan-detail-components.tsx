import { useRef, type PropsWithChildren } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { IconButton, ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { SurahName } from '../quran-reader/components/ui/surah-name';

import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { Badge, Button, Card, Separator } from '@/components/ui';
import { RIWAYAT } from '../quran-reader/riwayat';
import type { ReadingPlan, SequentialPlan } from './types';
import type { PlanIndex } from './engine';
import { shortDate } from './presentation';
import { t } from '@/i18n';
function statusLabel(plan: ReadingPlan) {
  if (plan.status !== 'active') return t(`goals.status.${plan.status}`);
  return plan.goal.type === 'memorization' ? t('plans.detail.status.memorizing') : plan.goal.type === 'revision' ? t('plans.detail.status.reviewing') : t('plans.detail.status.reading');
}

export function DetailScreen({ plan, onBack, onSettings, children }: PropsWithChildren<{ plan: ReadingPlan; onBack: () => void; onSettings: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <View style={d.navigation}>
      <Button variant="outline" icon="back" label={t('goals.backToGoals')} onPress={onBack}>{t('goals.goals')}</Button>
      <IconButton name="settings" label={t('plans.detail.settings')} palette={palette} onPress={onSettings} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={d.content}>
      <View style={{ gap: 8 }}>
        <View style={[d.row, { gap: 6, flexWrap: 'wrap' }]}>
          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>{statusLabel(plan)}</Badge>
          <Badge variant="outline">{t('common.riwayahOf', { riwayah: RIWAYAT[plan.riwayah].label })}</Badge>
        </View>
        <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 24, fontWeight: '600', lineHeight: 36 }}>{plan.name}</Text>
      </View>
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function ProgressHero({ plan }: { plan: SequentialPlan }) {
  const { palette: p } = useReadingPreferences();
  const finished = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const total = plan.cycle.sessions.length;
  const fraction = Math.max(0, Math.min(1, (plan.cycle.cursor - plan.cycle.start) / Math.max(1, plan.totalAyahs - plan.cycle.start)));
  // Do not show 100% before the final ayah is actually completed.
  const percent = fraction === 1 ? 100 : Math.floor(fraction * 100);
  const circumference = 2 * Math.PI * 47;
  return <Card style={d.hero}>
    <View style={[d.row, { gap: 16 }]}>
      <View style={d.grow}>
        <Text style={{ fontSize: 14, color: p.mutedForeground }}>{t('plans.detail.hero.cycle', { cycle: plan.cycle.number })}</Text>
        <Text style={{ fontSize: 20, fontWeight: '600', color: p.foreground, marginVertical: 4 }}>{fraction === 1 ? t('plans.detail.hero.finished') : fraction > 0 ? t('plans.detail.hero.started') : t('plans.detail.hero.notStarted')}</Text>
        <Text style={{ fontSize: 14, color: p.mutedForeground }}>{t('plans.progress.completedOfTotal', { completed: finished, count: total })}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={t('plans.detail.hero.progressLabel')} accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden>
          <Circle cx={54} cy={54} r={47} fill="none" stroke={withAlpha(p.primary, 0.2)} strokeWidth={8} />
          {fraction > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.primary} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={[circumference * fraction, circumference]} transform="rotate(-90 54 54)" />}
        </Svg>
        <View pointerEvents="none" style={d.ringText} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>{t('plans.percent', { percent })}</Text>
        </View>
      </View>
    </View>
    <View style={[d.heroStats, { borderColor: p.border }]}>
      <HeroStat label={plan.goal.type === 'khatma' ? t('plans.detail.hero.duration') : t('plans.detail.hero.dailyWird')} value={plan.goal.type === 'khatma' ? t('plans.units.weeks', { count: plan.goal.weeks }) : t(`plans.units.${plan.unit}`, { count: plan.goal.amount })} />
      <Separator vertical />
      <HeroStat label={plan.cycle.completedOn ? t('plans.detail.hero.completedOn') : plan.goal.type === 'khatma' ? t('plans.detail.hero.completionDate') : t('plans.detail.hero.remainingLabel')} value={plan.cycle.completedOn ? shortDate(plan.cycle.completedOn) : plan.goal.type === 'khatma' ? shortDate(plan.cycle.sessions.at(-1)!.date) : t('plans.detail.hero.remaining', { count: total - finished })} />
    </View>
  </Card>;
}
function HeroStat({ label, value }: { label: string; value: string }) {
  const { palette } = useReadingPreferences();
  return <View style={d.grow}><Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{label}</Text><Text style={{ color: palette.foreground, fontSize: 16, fontWeight: '600' }}>{value}</Text></View>;
}

export function ReadingBounds({ index, start, end }: { index: PlanIndex; start: number; end: number }) {
  const { palette } = useReadingPreferences();
  return <View style={[d.bounds, { borderColor: palette.border }]}>
    {[{ id: 'from', label: t('plans.portion.from'), ayah: index.ayahs[start] }, { id: 'to', label: t('plans.portion.to'), ayah: index.ayahs[end - 1] }].map(({ id, label, ayah }, i) => <View key={id} style={[d.grow, { paddingStart: i ? 14 : 0, borderStartWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: palette.border }]}>
      <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{label}</Text>
      <SurahName number={ayah.surahNumber} name={index.surahNames[ayah.surahNumber]} size={30} color={palette.ornament} />
      <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('plans.portion.ayah', { ayah: ayah.ayahNumber })}</Text>
    </View>)}
  </View>;
}

/**
 * The portion as a reader would say it: the surah in calligraphy, then the
 * ayah numbers. A portion that crosses a surah shows both ends.
 */
export function PortionHeadline({ index, start, end }: { index: PlanIndex; start: number; end: number }) {
  const { palette: p } = useReadingPreferences();
  const a = index.ayahs[start], b = index.ayahs[end - 1];
  if (!a || !b) return null;
  const count = end - start;
  const amount = `${t('plans.portion.ayahCount', { count })} · ${a.pageNumber === b.pageNumber ? t('plans.portion.page', { page: a.pageNumber }) : t('plans.portion.pages', { first: a.pageNumber, last: b.pageNumber })}`;
  if (a.surahNumber === b.surahNumber) return <View style={{ gap: 2 }}>
    <SurahName number={a.surahNumber} name={index.surahNames[a.surahNumber]} size={52} color={p.ornament} />
    <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{count === 1 ? t('plans.portion.ayah', { ayah: a.ayahNumber }) : t('plans.portion.ayahs', { first: a.ayahNumber, last: b.ayahNumber })}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{amount}</Text>
  </View>;
  return <View style={{ gap: 2 }}>
    <View style={[d.row, { gap: 12, alignItems: 'flex-end' }]}>
      {[{ id: 'from', label: t('plans.portion.from'), ayah: a }, { id: 'to', label: t('plans.portion.to'), ayah: b }].map(({ id, label, ayah }) => <View key={id} style={d.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
        <SurahName number={ayah.surahNumber} name={index.surahNames[ayah.surahNumber]} size={34} color={p.ornament} />
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('plans.portion.ayah', { ayah: ayah.ayahNumber })}</Text>
      </View>)}
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{amount}</Text>
  </View>;
}

/** Primary actions are the `default` Button; the rest are `ghost` (destructive ones in `destructive` text). */
export function DetailAction({ label, onPress, icon, primary = false, disabled = false, destructive = false }: { label: string; onPress: () => void; icon?: ReaderIconName; primary?: boolean; disabled?: boolean; destructive?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <Button variant={primary ? 'default' : 'ghost'} size={primary ? 'lg' : 'default'} icon={icon} disabled={disabled} onPress={onPress} block tone={destructive ? p.destructive : undefined}>{label}</Button>;
}

export function PlanSettingsSheet({ onClose, children }: PropsWithChildren<{ onClose: () => void }>) {
  const { palette } = useReadingPreferences();
  const close = useRef<View>(null);
  return <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: palette.overlay }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('plans.detail.closeSettings')} onPress={onClose} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={[d.sheet, { backgroundColor: palette.background, borderColor: palette.border }, readerElevation(4, palette)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[d.grabber, { backgroundColor: palette.border }]} />
          <View style={[d.row, { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border }]}>
            <View style={d.grow}><Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600', color: palette.foreground }}>{t('plans.detail.settings')}</Text></View>
            <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={4} style={({ pressed }) => [d.close, { backgroundColor: pressed ? palette.accent : 'transparent' }]}><ReaderIcon name="close" color={palette.mutedForeground} size={18} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 20 }}>{children}</ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

export const d = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingStart: 12, paddingEnd: 16, borderRadius: readerShape.control, borderWidth: 1 },
  statusChip: { alignSelf: 'flex-start', minHeight: 26, paddingHorizontal: 12, paddingVertical: 4, borderRadius: readerShape.pill, gap: 7 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 10, paddingBottom: 40, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  hero: { padding: 16, gap: 20, overflow: 'hidden' },
  heroPattern: { position: 'absolute', left: -65, top: -40 },
  heroStats: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  ring: { width: 108, height: 108, justifyContent: 'center', alignItems: 'center' },
  ringText: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  bounds: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  action: { minHeight: 52, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderRadius: readerShape.control },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '90%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
