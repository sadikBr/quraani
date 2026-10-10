import { useState, type PropsWithChildren } from 'react';
import { Alert, Button, Card, Progress, SwitchMark } from '@/components/ui';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { IconButton } from '../quran-reader/components/ui/reader-chrome';

export function PlanScreen({ title, subtitle, onBack, children }: PropsWithChildren<{ title: string; subtitle?: string; onBack: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <View style={styles.header}>
      <IconButton name="back" label="رجوع" palette={palette} onPress={onBack} />
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: palette.foreground }}>{title}</Text>
        {!!subtitle && <Text style={{ color: palette.mutedForeground, fontSize: 14 }}>{subtitle}</Text>}</View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{children}</ScrollView>
  </SafeAreaView>;
}
/** A design-system Card. `prominent` marks the one card a screen is about (the next portion) with a stronger border. */
export function PlanCard({ children, prominent = false }: PropsWithChildren<{ prominent?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <Card style={[styles.card, prominent && { borderColor: palette.ring, borderWidth: 1 }]}>{children}</Card>;
}
export function Copy({ children, muted = false, title = false }: PropsWithChildren<{ muted?: boolean; title?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <Text style={{ color: muted ? palette.mutedForeground : palette.foreground, fontSize: title ? 16 : muted ? 14 : 15, fontWeight: title ? '600' : '400', lineHeight: title ? 26 : muted ? 22 : 24 }}>{children}</Text>;
}
/** A destructive Alert, so warnings read as a message rather than stray text. */
export function PlanNotice({ message, retry }: { message?: string; retry?: () => void }) {
  return message ? <Alert variant="destructive" action={retry && <Button variant="outline" size="sm" icon="restore" onPress={retry} style={{ alignSelf: 'flex-start' }}>إعادة المحاولة</Button>}>{message}</Alert> : null;
}
/** Field: label, then an Input (`input` border, `radius-md`, shadow-xs; focus → `ring`). */
export function PlanField({ label, value, onChange, numeric = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; placeholder?: string }) {
  const { palette } = useReadingPreferences();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}><Text style={{ color: palette.foreground, fontSize: 14, fontWeight: '500' }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.mutedForeground}
    keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={numeric ? 10 : 80} autoCorrect={false} selectionColor={palette.primary} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[styles.input, { color: palette.foreground, backgroundColor: palette.background, borderColor: focused ? palette.ring : palette.input }, focused ? { boxShadow: `0 0 0 3px ${withAlpha(palette.ring, 0.5)}` } as object : readerElevation(1, palette), numeric && { writingDirection: 'ltr', textAlign: 'center' }]} /></View>;
}
/** A settings row with a Switch: the thumb sits at the reading start (right) when off. */
export function PlanSwitch({ label, detail, checked, onChange, disabled = false }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { palette } = useReadingPreferences();
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ checked, disabled }} aria-checked={checked} disabled={disabled} onPress={() => onChange(!checked)}
    style={({ pressed }) => [styles.switch, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <View style={{ flex: 1, gap: 2 }}><Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '500' }}>{label}</Text>{detail && <Text style={{ color: palette.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}</View>
    <SwitchMark checked={checked} />
  </Pressable>;
}
export function PlanLoading() { const { palette } = useReadingPreferences(); return <ActivityIndicator accessibilityLabel="جارٍ تحميل الهدف" color={palette.mutedForeground} style={{ marginVertical: 24 }} />; }
export function ProgressBar({ value }: { value: number }) {
  return <Progress value={value} />;
}
export const planStyles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, column: { flex: 1, minWidth: 0 }, section: { gap: 12 }, actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } });
const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingBottom: 40, gap: 24 },
  card: { padding: 16, gap: 16 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12, fontSize: 16, fontFamily: 'UiSans', writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingVertical: 6 },
});
/** Selection-sheet chrome. Rows draw their own edges so a virtualised list
 * still reads as one bordered group with hairline separators. */
export const sheet = StyleSheet.create({
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  rowFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  check: { width: 20, height: 20, borderRadius: readerShape.detail, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
