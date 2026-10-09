import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ReaderSettings } from './reader-settings';
import { ReaderIcon, ScreenHeading } from '../ui/reader-chrome';

export function SettingsScreen() {
  const { preferences, update, palette, dark } = useReadingPreferences();
  const { appearance, mode, fontSize, spacious } = preferences;
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <ScreenHeading title="إعدادات القراءة" subtitle="على مهل، كما تحب. اجعل القراءة أقرب إليك." palette={palette} onBack={() => router.dismissTo('/')} />
      <View style={[styles.section, { backgroundColor: palette.paper, borderColor: palette.border }]}>
        <View style={styles.sectionTitle}><View style={[styles.sectionIcon, { backgroundColor: palette.goldSoft }]}><ReaderIcon name="book" color={palette.ornament} size={20} /></View><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>طريقة القراءة</Text></View>
        <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 23 }}>ألفة المصحف، أو مرونة القراءة آيةً بآية.</Text>
        <View style={styles.row}>
          {([{ value: 'page', label: 'صفحات المصحف', detail: 'كما في المصحف المطبوع' }, { value: 'ayah', label: 'آية بآية', detail: 'نص مرن وتباعد مريح' }] as const).map((option) => {
            const selected = mode === option.value;
            return <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label}
              accessibilityState={{ selected }} onPress={() => update({ mode: option.value })}
              style={({ pressed }) => [styles.choice, { backgroundColor: selected ? palette.accentSoft : palette.paper, borderColor: selected ? palette.accent : palette.border, opacity: pressed ? 0.7 : 1 }]}>
              <View style={styles.choiceHeading}>
                <View style={[styles.miniPage, { backgroundColor: palette.paper, borderColor: palette.border }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
                  <View style={[styles.miniTitle, { backgroundColor: palette.goldSoft }]} />
                  {[0, 1, 2, 3].map((line) => <View key={line} style={{ height: 2, borderRadius: 1, width: option.value === 'ayah' && line % 2 ? '65%' : '100%', backgroundColor: palette.muted, opacity: 0.5, marginTop: option.value === 'ayah' ? 6 : 5 }} />)}
                </View>
                <View style={[styles.check, { borderColor: selected ? palette.accent : palette.border, backgroundColor: selected ? palette.accent : 'transparent' }]}>{selected && <ReaderIcon name="check" size={12} color={palette.paper} />}</View>
              </View>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{option.label}</Text>
              <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 20 }}>{option.detail}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 22 }}>
          {mode === 'page' ? 'حجم النص والتباعد ثابتان للحفاظ على تنسيق المصحف الأصلي.' : 'يمكنك الآن تخصيص حجم النص والتباعد في إعدادات راحة النص.'}
        </Text>
      </View>
      <ReaderSettings palette={palette} fixedPage={mode === 'page'} appearance={appearance} setAppearance={(value) => update({ appearance: value })}
        fontSize={fontSize} setFontSize={(value) => update({ fontSize: value })} spacious={spacious} setSpacious={(value) => update({ spacious: value })} />
      <View style={styles.footer}>
        <View style={styles.saved}><ReaderIcon name="check" color={palette.accent} size={15} /><Text style={{ color: palette.muted, fontSize: 12 }}>تُحفظ تفضيلاتك تلقائيًا</Text></View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>قراني</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>برواية ورش عن نافع</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="المحتوى القرآني من الموسوعة القرآنية" onPress={() => void Linking.openURL('https://quranpedia.net')} style={styles.source}>
          <Text style={{ color: palette.ornament, fontSize: 12, textAlign: 'center' }}>المحتوى من الموسوعة القرآنية ↗</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: 740, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24, gap: 24 },
  section: { gap: 14, padding: 18, borderRadius: 22, borderWidth: 1 }, sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, row: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, padding: 12, borderWidth: 1.5, borderRadius: 16, gap: 6 }, choiceHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 6 },
  miniPage: { width: 54, height: 66, borderWidth: 1, borderRadius: 5, padding: 7 }, miniTitle: { width: '70%', height: 5, alignSelf: 'center', borderRadius: 2, marginBottom: 2 },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { alignItems: 'center', gap: 7 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 6 }, divider: { width: 40, height: 1, marginVertical: 14 }, source: { minHeight: 44, justifyContent: 'center' },
});
