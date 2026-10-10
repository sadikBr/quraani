import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { IconButton, ReaderIcon } from '../quran-reader/components/ui/reader-chrome';

export function PlanScreen({ title, subtitle, onBack, children }: PropsWithChildren<{ title: string; subtitle?: string; onBack: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <View style={styles.header}>
      <IconButton name="back" label="رجوع" palette={palette} onPress={onBack} />
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '700', color: palette.text }}>{title}</Text>
        {!!subtitle && <Text style={{ color: palette.muted, fontSize: 13 }}>{subtitle}</Text>}</View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{children}</ScrollView>
  </SafeAreaView>;
}
export function PlanCard({ children }: PropsWithChildren) {
  const { palette } = useReadingPreferences();
  return <View style={[styles.card, { backgroundColor: palette.paper, borderColor: withAlpha(palette.border, 0.7) }, readerElevation(1, palette)]}>{children}</View>;
}
export function Copy({ children, muted = false, title = false }: PropsWithChildren<{ muted?: boolean; title?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <Text style={{ color: muted ? palette.muted : palette.text, fontSize: title ? 19 : 14, fontWeight: title ? '600' : '400', lineHeight: title ? 32 : 25 }}>{children}</Text>;
}
/** A tinted callout, so warnings read as a message rather than stray text. */
export function PlanNotice({ message, retry }: { message?: string; retry?: () => void }) {
  const { palette } = useReadingPreferences();
  return message ? <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: withAlpha(palette.warning, 0.1), borderColor: withAlpha(palette.warning, 0.25) }]}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={[styles.noticeDot, { backgroundColor: palette.warning }]} />
      <Text accessibilityRole="alert" style={{ color: palette.warning, fontSize: 13, lineHeight: 24, flex: 1 }}>{message}</Text>
    </View>
    {retry && <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [styles.retry, { borderColor: withAlpha(palette.warning, 0.35), opacity: pressed ? 0.6 : 1 }]}>
      <ReaderIcon name="restore" color={palette.warning} size={16} /><Text style={{ color: palette.warning, fontSize: 13, fontWeight: '600' }}>إعادة المحاولة</Text></Pressable>}
  </View> : null;
}
export function PlanField({ label, value, onChange, numeric = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; placeholder?: string }) {
  const { palette } = useReadingPreferences();
  return <View style={{ gap: 8 }}><Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={withAlpha(palette.muted, 0.7)}
    keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={numeric ? 10 : 80} autoCorrect={false} selectionColor={palette.accent}
    style={[styles.input, { color: palette.text, backgroundColor: palette.paper, borderColor: palette.border }, numeric && { writingDirection: 'ltr', textAlign: 'center' }]} /></View>;
}
/** A real on/off switch: the thumb sits at the reading start (right) when off. */
export function PlanSwitch({ label, detail, checked, onChange, disabled = false }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { palette } = useReadingPreferences();
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={() => onChange(!checked)}
    style={({ pressed }) => [styles.switch, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.text, fontSize: 15 }}>{label}</Text>{detail && <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 21 }}>{detail}</Text>}</View>
    <View style={[styles.track, { backgroundColor: checked ? palette.accent : withAlpha(palette.text, 0.14), ...Platform.select({ native: { direction: 'ltr' as const } }) }]}
      {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
      <View style={[styles.thumb, { backgroundColor: checked ? palette.paper : '#FFFFFF', alignSelf: checked ? 'flex-start' : 'flex-end' }, readerElevation(1)]}>
        {checked && <ReaderIcon name="check" color={palette.accent} size={14} strokeWidth={2.4} />}
      </View>
    </View>
  </Pressable>;
}
export function PlanLoading() { const { palette } = useReadingPreferences(); return <ActivityIndicator accessibilityLabel="جارٍ تحميل الهدف" color={palette.accent} style={{ marginVertical: 24 }} />; }
export function ProgressBar({ value }: { value: number }) {
  const { palette } = useReadingPreferences();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: withAlpha(palette.accent, 0.14), overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: palette.accent }} />
  </View>;
}
export const planStyles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, column: { flex: 1, minWidth: 0 }, section: { gap: 12 }, actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } });
const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 18 },
  card: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.card, padding: 20, gap: 14 },
  notice: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  noticeDot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  retry: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: readerShape.pill, borderWidth: 1 },
  input: { minHeight: 52, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control, paddingHorizontal: 14, fontSize: 16, fontFamily: 'ReaderNaskh', writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingVertical: 6 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  thumb: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
