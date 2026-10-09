import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerLayout, readerShape } from '../quran-reader/design';
import { IconButton, ReaderIcon } from '../quran-reader/components/ui/reader-chrome';

export function PlanScreen({ title, subtitle, onBack, children }: PropsWithChildren<{ title: string; subtitle?: string; onBack: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <View style={[styles.header, { borderColor: palette.border }]}>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ fontSize: 25, fontWeight: '700', color: palette.text }}>{title}</Text>
        {!!subtitle && <Text style={{ color: palette.muted, fontSize: 12 }}>{subtitle}</Text>}</View>
      <IconButton name="back" label="رجوع" palette={palette} onPress={onBack} />
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{children}</ScrollView>
  </SafeAreaView>;
}
export function PlanCard({ children }: PropsWithChildren) {
  const { palette } = useReadingPreferences();
  return <View style={[styles.card, { backgroundColor: palette.paper, borderColor: palette.border }]}>{children}</View>;
}
export function Copy({ children, muted = false, title = false }: PropsWithChildren<{ muted?: boolean; title?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <Text style={{ color: muted ? palette.muted : palette.text, fontSize: title ? 19 : 14, fontWeight: title ? '600' : '400', lineHeight: title ? 32 : 25 }}>{children}</Text>;
}
export function PlanNotice({ message, retry }: { message?: string; retry?: () => void }) {
  const { palette } = useReadingPreferences();
  return message ? <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: palette.warning, fontSize: 13, lineHeight: 24 }}>{message}</Text>
    {retry && <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 44, justifyContent: 'center' }}><Copy>إعادة المحاولة</Copy></Pressable>}</View> : null;
}
export function PlanField({ label, value, onChange, numeric = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; placeholder?: string }) {
  const { palette } = useReadingPreferences();
  return <View style={{ gap: 6 }}><Copy>{label}</Copy><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.muted}
    keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={numeric ? 10 : 80} autoCorrect={false}
    style={[styles.input, { color: palette.text, backgroundColor: palette.paper, borderColor: palette.border }, numeric && { writingDirection: 'ltr', textAlign: 'center' }]} /></View>;
}
export function PlanSwitch({ label, detail, checked, onChange, disabled = false }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { palette } = useReadingPreferences();
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={() => onChange(!checked)}
    style={[styles.switch, { opacity: disabled ? 0.55 : 1 }]}>
    <View style={{ flex: 1 }}><Copy>{label}</Copy>{detail && <Copy muted>{detail}</Copy>}</View>
    <View style={{ width: 24, height: 24, borderWidth: 1, borderRadius: 5, borderColor: palette.accent, backgroundColor: checked ? palette.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {checked && <ReaderIcon name="check" color={palette.paper} size={17} />}
    </View>
  </Pressable>;
}
export function PlanLoading() { const { palette } = useReadingPreferences(); return <ActivityIndicator accessibilityLabel="جارٍ تحميل الهدف" color={palette.accent} style={{ marginVertical: 24 }} />; }
export function ProgressBar({ value }: { value: number }) {
  const { palette } = useReadingPreferences();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 6, borderRadius: 3, backgroundColor: palette.border, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: palette.accent }} />
  </View>;
}
export const planStyles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, column: { flex: 1, minWidth: 0 }, section: { gap: 12 }, actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } });
const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', gap: 16, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingBottom: 36, gap: 18 },
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 18, gap: 14 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12, fontSize: 16, fontFamily: 'ReaderNaskh', writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
});
