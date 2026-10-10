import { useRef, type PropsWithChildren } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { IconButton, ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerLayout, readerShape } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import type { ReadingPlan, SequentialPlan } from './types';
import type { PlanIndex } from './engine';
import { arabicNumber, shortDate } from './presentation';
const statusLabels = { active: 'قيد القراءة', paused: 'متوقف مؤقتًا', completed: 'مكتمل', archived: 'مؤرشف' };

export function DetailScreen({ plan, onBack, onSettings, children }: PropsWithChildren<{ plan: ReadingPlan; onBack: () => void; onSettings: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <View style={d.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى الأهداف" onPress={onBack}
        style={({ pressed }) => [d.back, { opacity: pressed ? 0.6 : 1 }]}>
        <ReaderIcon name="back" color={palette.text} size={21} />
        <Text style={{ color: palette.text, fontSize: 15 }}>الأهداف</Text>
      </Pressable>
      <IconButton name="settings" label="إعدادات الهدف" palette={palette} onPress={onSettings} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={d.content}>
      <View>
        <View style={d.row}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: plan.status === 'active' ? palette.accent : palette.muted }} />
          <Text style={{ color: palette.muted, fontSize: 12 }}>{plan.status === 'active' && plan.goal.type === 'memorization' ? 'قيد الحفظ' : statusLabels[plan.status]} · رواية {RIWAYAT[plan.riwayah].label}</Text>
        </View>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 31, fontWeight: '700' }}>{plan.name}</Text>
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
  return <View style={[d.hero, { backgroundColor: p.hero }]}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={d.heroPattern}>
      <Svg width="240" height="250" viewBox="0 0 240 250" fill="none" stroke={p.onHero} strokeWidth="1" opacity={0.07}>
        <Path d="M20 250V112C20 55 90 55 120 8c30 47 100 47 100 104v138M40 250V120c0-47 56-49 80-88 24 39 80 41 80 88v130M60 250V128c0-35 42-41 60-68 18 27 60 33 60 68v122" />
      </Svg>
    </View>
    <View style={[d.row, { gap: 16 }]}>
      <View style={d.grow}>
        <Text style={{ fontSize: 12, color: p.heroMuted }}>رحلتك مع القرآن · الدورة {arabicNumber(plan.cycle.number)}</Text>
        <Text style={{ fontSize: 23, fontWeight: '600', color: p.onHero, marginVertical: 4 }}>{fraction === 1 ? 'هنيئًا لك الإتمام' : fraction > 0 ? 'كل وردٍ يقرّبك' : 'بداية خير وبركة'}</Text>
        <Text style={{ fontSize: 13, color: p.heroMuted }}>{arabicNumber(finished)} من {arabicNumber(total)} وردًا مكتملًا</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel="تقدم القراءة" accessibilityValue={{ min: 0, max: 100, now: percent }} style={d.ring}>
        <Svg width={108} height={108} viewBox="0 0 108 108" aria-hidden>
          <Circle cx={54} cy={54} r={47} fill="none" stroke={p.onHero} strokeOpacity={0.14} strokeWidth={4} />
          {fraction > 0 && <Circle cx={54} cy={54} r={47} fill="none" stroke={p.onHero} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={[circumference * fraction, circumference]} transform="rotate(-90 54 54)" />}
        </Svg>
        <View pointerEvents="none" style={d.ringText} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <Text style={{ color: p.onHero, fontSize: 30, lineHeight: 45, textAlign: 'center' }}>{arabicNumber(percent)}٪</Text>
        </View>
      </View>
    </View>
    <View style={[d.heroStats, { borderColor: `${p.onHero}26` }]}>
      <HeroStat label={plan.goal.type === 'khatma' ? 'مدة الهدف' : 'وردك اليومي'} value={plan.goal.type === 'khatma' ? `${arabicNumber(plan.goal.weeks)} أسابيع` : `${arabicNumber(plan.goal.amount)} ${{ pages: 'صفحات', hizbs: 'أحزاب', juzs: 'أجزاء' }[plan.unit]}`} />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: `${p.onHero}26` }} />
      <HeroStat label={plan.cycle.completedOn ? 'تاريخ الإتمام' : plan.goal.type === 'khatma' ? 'موعد الإتمام' : 'الأوراد المتبقية'} value={plan.cycle.completedOn ? shortDate(plan.cycle.completedOn) : plan.goal.type === 'khatma' ? shortDate(plan.cycle.sessions.at(-1)!.date) : `${arabicNumber(total - finished)} وردًا`} />
    </View>
  </View>;
}
function HeroStat({ label, value }: { label: string; value: string }) {
  const { palette } = useReadingPreferences();
  return <View style={d.grow}><Text style={{ color: palette.heroMuted, fontSize: 11 }}>{label}</Text><Text style={{ color: palette.onHero, fontSize: 16, fontWeight: '600' }}>{value}</Text></View>;
}

export function ReadingBounds({ index, start, end }: { index: PlanIndex; start: number; end: number }) {
  const { palette } = useReadingPreferences();
  return <View style={[d.bounds, { backgroundColor: palette.background }]}>
    {[{ label: 'من', ayah: index.ayahs[start] }, { label: 'إلى', ayah: index.ayahs[end - 1] }].map(({ label, ayah }, i) => <View key={label} style={[d.grow, { paddingStart: i ? 14 : 0, borderStartWidth: i ? 1 : 0, borderColor: palette.border }]}>
      <Text style={{ color: palette.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>{index.surahNames[ayah.surahNumber]}</Text>
      <Text style={{ color: palette.muted, fontSize: 12 }}>الآية {arabicNumber(ayah.ayahNumber)}</Text>
    </View>)}
  </View>;
}

export function DetailAction({ label, onPress, icon, primary = false, disabled = false, destructive = false }: { label: string; onPress: () => void; icon?: ReaderIconName; primary?: boolean; disabled?: boolean; destructive?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const color = destructive ? p.warning : primary ? p.paper : p.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [d.action, { backgroundColor: primary ? p.accent : pressed ? p.accentSoft : 'transparent', opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    {icon && <ReaderIcon name={icon} color={color} size={21} />}
    <Text style={{ color, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'center' }}>{label}</Text>
    {primary && <View style={{ marginStart: 'auto' }}><ReaderIcon name="chevron" color={color} size={20} /></View>}
  </Pressable>;
}

export function PlanSettingsSheet({ onClose, children }: PropsWithChildren<{ onClose: () => void }>) {
  const { palette } = useReadingPreferences();
  const close = useRef<View>(null);
  return <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'rgba(0, 15, 13, 0.55)' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق إعدادات الهدف" onPress={onClose} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={[d.sheet, { backgroundColor: palette.paper }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[d.row, { padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border }]}>
            <View style={d.grow}><Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '600', color: palette.text }}>إعدادات الهدف</Text></View>
            <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} style={d.close}><ReaderIcon name="close" color={palette.muted} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>{children}</ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

export const d = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingEnd: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingTop: 6, paddingBottom: 40, gap: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  hero: { borderRadius: readerShape.card, padding: 20, gap: 20, overflow: 'hidden' },
  heroPattern: { position: 'absolute', left: -65, top: -40 },
  heroStats: { flexDirection: 'row', gap: 18, paddingTop: 14, borderTopWidth: 1 },
  ring: { width: 108, height: 108, justifyContent: 'center', alignItems: 'center' },
  ringText: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  bounds: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: readerShape.control },
  action: { minHeight: 48, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderRadius: readerShape.control },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '90%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, overflow: 'hidden' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
