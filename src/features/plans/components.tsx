import { useState, type PropsWithChildren } from 'react';
import { Alert, Button, Progress, SwitchMark } from '@/components/ui';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Row, page } from '@/components/craft/page';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { fieldElevation, readerShape, withAlpha } from '../quran-reader/design';
import type { ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { t } from '@/i18n';
import { rtlInput } from '@/lib/ui-text-alignment';

/** A goals page with a plain title: the way back (an arrow), the title in Naskh, then its content. */
export function PlanScreen({ title, subtitle, onBack, children }: PropsWithChildren<{ title: string; subtitle?: string; onBack: () => void }>) {
  const { palette } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <PageBar title={title} palette={palette} back={{ label: t('plans.back'), onPress: onBack }} />
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      <PageTitle subtitle={subtitle} palette={palette} />
      {children}
    </ScrollView>
  </SafeAreaView>;
}
/** A card of the goal's page. `prominent` marks the one card a screen is about (what is due) with a line of gold. */
export function PlanCard({ children, prominent = false }: PropsWithChildren<{ prominent?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: prominent ? withAlpha(palette.ornament, 0.55) : palette.border }]}>{children}</View>;
}
export function Copy({ children, muted = false, title = false }: PropsWithChildren<{ muted?: boolean; title?: boolean }>) {
  const { palette } = useReadingPreferences();
  return <Text style={{ color: muted ? palette.mutedForeground : palette.foreground, fontSize: title ? 16 : muted ? 13 : 15, fontWeight: title ? '600' : '400', lineHeight: title ? 26 : muted ? 21 : 24 }}>{children}</Text>;
}
/** A destructive Alert, so warnings read as a message rather than stray text. */
export function PlanNotice({ message, retry }: { message?: string; retry?: () => void }) {
  return message ? <Alert variant="destructive" action={retry && <Button variant="outline" size="sm" icon="restore" onPress={retry} style={{ alignSelf: 'flex-start' }}>{t('common.retry')}</Button>}>{message}</Alert> : null;
}
/** Field: label, then an Input (`input` border, `radius-md`, shadow-xs; focus → `ring`). */
export function PlanField({ label, value, onChange, numeric = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean; placeholder?: string }) {
  const { palette } = useReadingPreferences();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}><Text style={{ color: palette.foreground, fontSize: 14, fontWeight: '600' }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.mutedForeground}
    keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={numeric ? 10 : 80} autoCorrect={false} selectionColor={palette.primary} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[styles.input, { color: palette.foreground, backgroundColor: palette.background, borderColor: focused ? palette.ring : palette.input }, fieldElevation(focused, palette), numeric && { writingDirection: 'ltr', textAlign: 'center' }]} /></View>;
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
/** A switch as a row on a card of rows (`RowGroup`): an icon on gold, the setting and its line, the switch at the end. */
export function SwitchRow({ label, detail, checked, onChange, disabled = false, icon }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; icon?: ReaderIconName }) {
  const { palette } = useReadingPreferences();
  return <Row title={label} detail={detail} icon={icon} role="switch" selected={checked} disabled={disabled} palette={palette} label={label} hint={detail}
    onPress={() => onChange(!checked)} trailing={<SwitchMark checked={checked} palette={palette} />} />;
}
export function PlanLoading() { const { palette } = useReadingPreferences(); return <ActivityIndicator accessibilityLabel={t('plans.loading')} color={palette.mutedForeground} style={{ marginVertical: 24 }} />; }
export function ProgressBar({ value }: { value: number }) {
  return <Progress value={value} />;
}
export const planStyles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, column: { flex: 1, minWidth: 0 }, section: { gap: 12 }, actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' } });
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 16, gap: 16 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12, fontSize: 16, fontFamily: 'UiSans', ...rtlInput },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingVertical: 6 },
});
/**
 * Selection-sheet chrome. Rows draw their own edges so a virtualised list still reads as one card
 * of rows, a hairline between them, as `RowGroup` draws them.
 */
export const sheet = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  rowFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
