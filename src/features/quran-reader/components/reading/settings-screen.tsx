import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ReaderSettings } from './reader-settings';
import { ReaderIcon, ScreenHeading, SectionHeading, Segments } from '../ui/reader-chrome';
import { readerLayout, readerShape } from '../../design';

export function SettingsScreen() {
  const { preferences, update, palette, dark } = useReadingPreferences();
  const { appearance, mode, textLayout, fontSize, spacious } = preferences;
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <ScreenHeading title="إعدادات القراءة" subtitle="مساحتك للقراءة، بالألوان والطريقة التي تحبها." palette={palette} onBack={() => router.dismissTo('/')} />
      <View style={[styles.section, { borderColor: palette.border }]}>
        <SectionHeading title="طريقة القراءة" description="صفحات المصحف الأصلية أو نص قرآني بتنسيق مرن." icon="book" palette={palette} />
        <View style={styles.row}>
          {([{ value: 'page', label: 'صفحات المصحف', detail: 'كما في المصحف المطبوع' }, { value: 'text', label: 'النص القرآني', detail: 'آيات منفصلة أو نص متصل' }] as const).map((option) => {
            const selected = mode === option.value;
            return <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label}
              accessibilityState={{ selected }} aria-pressed={selected} onPress={() => update({ mode: option.value })}
              style={({ pressed }) => [styles.choice, { backgroundColor: selected ? palette.accentSoft : palette.paper, borderColor: selected ? palette.accent : palette.border, opacity: pressed ? 0.7 : 1 }]}>
              <View style={styles.choiceHeading}>
                <ReaderIcon name={option.value === 'page' ? 'book' : 'lines'} color={selected ? palette.accent : palette.muted} size={22} />
                <View style={[styles.check, { borderColor: selected ? palette.accent : palette.border, backgroundColor: selected ? palette.accent : 'transparent' }]}>{selected && <ReaderIcon name="check" size={12} color={palette.paper} />}</View>
              </View>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{option.label}</Text>
              <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 20 }}>{option.detail}</Text>
            </Pressable>;
          })}
        </View>
        {mode === 'text' && <View style={styles.textLayout}>
          <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>تنسيق النص القرآني</Text>
          <Segments palette={palette} options={[{ value: 'ayah', label: 'آيات منفصلة' }, { value: 'flowing', label: 'نص متصل' }]}
            value={textLayout} onChange={(value) => update({ textLayout: value })} />
          <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 22 }}>
            {textLayout === 'ayah' ? 'تبدأ كل آية في سطر مستقل، مع مساحة مريحة بين الآيات.' : 'تتتابع الآيات كما في المصحف، وتلتف السطور حسب حجم الخط وعرض الشاشة.'}
          </Text>
        </View>}
        <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 22 }}>
          {mode === 'page' ? 'حجم النص والتباعد ثابتان للحفاظ على تنسيق المصحف الأصلي.' : 'يمكنك الآن تخصيص حجم النص والتباعد في إعدادات راحة النص.'}
        </Text>
      </View>
      <ReaderSettings palette={palette} fixedPage={mode === 'page'} appearance={appearance} setAppearance={(value) => update({ appearance: value })}
        fontSize={fontSize} setFontSize={(value) => update({ fontSize: value })} spacious={spacious} setSpacious={(value) => update({ spacious: value })} />
      <View style={[styles.footer, { borderColor: palette.border }]}>
        <View style={styles.saved}><ReaderIcon name="check" color={palette.accent} size={15} /><Text style={{ color: palette.muted, fontSize: 12 }}>تُحفظ تفضيلاتك تلقائيًا</Text></View>
        <View style={styles.saved}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>قراني</Text><Text style={{ color: palette.muted, fontSize: 12 }}>· برواية ورش عن نافع</Text></View>
        <Pressable accessibilityRole="link" accessibilityLabel="المحتوى القرآني من الموسوعة القرآنية" onPress={() => void Linking.openURL('https://quranpedia.net')} style={styles.source}>
          <Text style={{ color: palette.ornament, fontSize: 12, textAlign: 'center' }}>المحتوى من الموسوعة القرآنية ↗</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: readerLayout.gutter, paddingTop: 12, paddingBottom: 28, gap: readerLayout.sectionGap },
  section: { gap: 16, paddingTop: 20, borderTopWidth: 1 }, row: { flexDirection: 'row', gap: 12 },
  textLayout: { gap: 10 },
  choice: { flex: 1, padding: 14, borderWidth: 1, borderRadius: readerShape.card, gap: 4 }, choiceHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 6 },
  check: { width: 18, height: 18, borderRadius: readerShape.detail, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 24 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 6 }, source: { minHeight: 44, justifyContent: 'center' },
});
