import { useRef, useState } from 'react';
import { RIWAYAT } from '../../riwayat';
import { router } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ReaderSettings } from './reader-settings';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { WarshTajweedLegend } from './warsh-tajweed-legend';
import { ReadingLayoutPreview, SettingsCard, SettingsCardHeading, SettingsSelection, SettingsToggle } from './settings-ui';

type SettingsTab = 'reading' | 'appearance';
const tabs: { value: SettingsTab; label: string; icon: ReaderIconName }[] = [
  { value: 'reading', label: 'القراءة', icon: 'book' },
  { value: 'appearance', label: 'المظهر', icon: 'sun' },
];

export function SettingsScreen() {
  const { preferences, update, palette, dark } = useReadingPreferences();
  const { appearance, mode, textLayout, fontSize, spacious, riwayah, tajweed } = preferences;
  const [tab, setTab] = useState<SettingsTab>('reading');
  const scroll = useRef<ScrollView>(null);
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <View style={[styles.header, { borderColor: palette.border }]}>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى القراءة" onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={({ pressed }) => [styles.back, { backgroundColor: palette.paper, borderColor: palette.border, opacity: pressed ? 0.6 : 1 }]}>
          <ReaderIcon name="back" color={palette.text} size={23} />
        </Pressable>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 21, fontWeight: '700', flex: 1 }}>الإعدادات</Text>
        <QuranniLogo size={32} color={palette.ornament} />
      </View>
      <View accessibilityRole="tablist" accessibilityLabel="أقسام الإعدادات" style={[styles.tabs, { backgroundColor: palette.paper, borderColor: palette.border }]}>
        {tabs.map(item => <Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.value }} aria-selected={tab === item.value}
          onPress={() => { if (tab !== item.value) { setTab(item.value); scroll.current?.scrollTo({ y: 0, animated: false }); } }}
          style={({ pressed }) => [styles.tab, { backgroundColor: tab === item.value ? palette.accentSoft : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
          <ReaderIcon name={item.icon} color={tab === item.value ? palette.accent : palette.muted} size={19} />
          <Text style={{ color: tab === item.value ? palette.accent : palette.muted, fontSize: 14, fontWeight: tab === item.value ? '700' : '400' }}>{item.label}</Text>
        </Pressable>)}
      </View>
    </View>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 29, fontWeight: '700' }}>{tab === 'reading' ? 'قراءتك، كما تحب' : 'ألوان تريح عينك'}</Text>
        <Text style={{ color: palette.muted, fontSize: 13 }}>{tab === 'reading' ? 'روايتك المفضّلة، والطريقة الأقرب إليك.' : 'اختر طابعًا يرافقك في كل صفحة.'}</Text>
      </View>
      {tab === 'reading' && <>
        <SettingsCard palette={palette}>
          <SettingsCardHeading title="رواية القرآن" icon="book" palette={palette} />
          <View accessibilityRole="radiogroup" accessibilityLabel="رواية القرآن" style={styles.row}>
            {([{ value: 'warsh', name: 'ورش', from: 'عن نافع' }, { value: 'hafs', name: 'حفص', from: 'عن عاصم' }] as const).map(item => {
              const selected = riwayah === item.value;
              return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={`${item.name} ${item.from}`} accessibilityState={{ checked: selected }} aria-checked={selected}
                onPress={() => update({ riwayah: item.value })} style={({ pressed }) => [styles.riwayah, { backgroundColor: selected ? palette.accentSoft : palette.background, borderColor: selected ? palette.accent : palette.border, opacity: pressed ? 0.7 : 1 }]}>
                <View style={styles.riwayahTop}><SettingsSelection palette={palette} selected={selected} /><Text style={{ color: selected ? palette.accent : palette.muted, fontSize: 10 }}>{selected ? 'روايتك الحالية' : 'رواية'}</Text></View>
                <Text style={{ color: palette.text, fontSize: 30, lineHeight: 46, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginTop: -4 }}>{item.from}</Text>
              </Pressable>;
            })}
          </View>
          <Text style={{ color: palette.muted, fontSize: 11 }}>موضع القراءة والعلامات محفوظة لكل رواية.</Text>
        </SettingsCard>
        <SettingsCard palette={palette}>
          <SettingsCardHeading title="طريقة القراءة" detail="اختر كيف تظهر لك صفحات القرآن." icon="lines" palette={palette} />
          <View accessibilityRole="radiogroup" accessibilityLabel="طريقة القراءة" style={styles.row}>
            {([{ value: 'page', label: 'صفحات المصحف', detail: 'التنسيق الأصلي' }, { value: 'text', label: 'النص القرآني', detail: 'مرن وقابل للتكبير' }] as const).map(item => {
              const selected = mode === item.value;
              return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} aria-checked={selected}
                onPress={() => update({ mode: item.value })} style={({ pressed }) => [styles.layoutChoice, { backgroundColor: selected ? palette.accentSoft : palette.paper, borderColor: selected ? palette.accent : palette.border, opacity: pressed ? 0.7 : 1 }]}>
                <ReadingLayoutPreview kind={item.value === 'page' ? 'page' : textLayout} palette={palette} selected={selected} />
                <View style={styles.layoutLabel}><Text style={{ color: palette.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{item.label}</Text><SettingsSelection palette={palette} selected={selected} /></View>
                <Text style={{ color: palette.muted, fontSize: 10 }}>{item.detail}</Text>
              </Pressable>;
            })}
          </View>
          {mode === 'text' ? <View style={[styles.textLayout, { borderColor: palette.border }]}>
            <Text style={{ color: palette.muted, fontSize: 12 }}>تنسيق الآيات</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="تنسيق النص القرآني" style={[styles.layoutSegments, { backgroundColor: palette.background }]}>
              {([{ value: 'ayah', label: 'آيات منفصلة' }, { value: 'flowing', label: 'نص متصل' }] as const).map(item => <Pressable key={item.value}
                accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: textLayout === item.value }} aria-checked={textLayout === item.value} onPress={() => update({ textLayout: item.value })}
                style={({ pressed }) => [styles.layoutSegment, { backgroundColor: textLayout === item.value ? palette.accentSoft : 'transparent', opacity: pressed ? 0.6 : 1 }]}>
                <Text style={{ color: textLayout === item.value ? palette.accent : palette.muted, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
              </Pressable>)}
            </View>
            <Text style={{ color: palette.muted, fontSize: 11 }}>{textLayout === 'ayah' ? 'كل آية في سطر مستقل.' : 'آيات متتابعة، بسطور تتكيّف مع شاشتك.'}</Text>
          </View> : <Text style={{ color: palette.muted, fontSize: 11 }}>يحافظ على حجم الخط وتباعد المصحف المطبوع.</Text>}
        </SettingsCard>
        <SettingsCard palette={palette}>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: tajweed }} aria-checked={tajweed} accessibilityLabel="ألوان التجويد"
            onPress={() => update({ tajweed: !tajweed })} style={({ pressed }) => [styles.tajweed, { opacity: pressed ? 0.65 : 1 }]}>
            <View style={[styles.colors, { backgroundColor: palette.accentSoft }]}>{['#537fff', '#dd5359', '#50a86b'].map((color, i) => <View key={color} style={{ width: 4, height: 12 + i * 4, backgroundColor: color, borderRadius: 2 }} />)}</View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>ألوان التجويد</Text><Text style={{ color: palette.muted, fontSize: 11 }}>{tajweed ? 'مفعّلة' : 'غير مفعّلة'} · تمييز أحكام التلاوة</Text></View>
            <SettingsToggle checked={tajweed} palette={palette} />
          </Pressable>
          {riwayah === 'warsh' ? <Text style={{ color: palette.muted, fontSize: 11 }}>ورش من طريق الأزرق. تظهر الألوان في النص القرآني، وتبقى صفحات المصحف المطبوع كما هي.</Text>
            : <Text style={{ color: palette.muted, fontSize: 11 }}>ألوان مصحف التجويد في الموسوعة القرآنية، في الصفحات والنص.</Text>}
          {riwayah === 'warsh' && tajweed && <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border, paddingTop: 6 }}>
            <WarshTajweedLegend palette={palette} dark={dark} />
            <Text style={{ color: palette.muted, fontSize: 10 }}>تُعرض الأحكام على أساس الوقف عند نهاية كل آية.</Text>
          </View>}
        </SettingsCard>
      </>}
      <ReaderSettings section={tab} palette={palette} fixedPage={mode === 'page'} textLayout={textLayout} appearance={appearance} setAppearance={value => update({ appearance: value })}
        fontSize={fontSize} setFontSize={value => update({ fontSize: value })} spacious={spacious} setSpacious={value => update({ spacious: value })} />
      <View style={styles.footer}>
        <View style={styles.saved}><ReaderIcon name="check" color={palette.accent} size={14} /><Text style={{ color: palette.muted, fontSize: 11 }}>تُحفظ اختياراتك تلقائيًا</Text></View>
        <View style={[styles.footerRule, { backgroundColor: palette.border }]} />
        <Text style={{ color: palette.muted, fontSize: 11 }}>قرآني · رواية {RIWAYAT[riwayah].label}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="المحتوى القرآني من الموسوعة القرآنية" onPress={() => void Linking.openURL('https://quranpedia.net')} style={styles.source}>
          <Text style={{ color: palette.muted, fontSize: 11 }}>المحتوى من الموسوعة القرآنية ↗</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) },
  header: { width: '100%', maxWidth: 740, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 1, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  content: { width: '100%', maxWidth: 740, alignSelf: 'center', padding: 18, paddingBottom: 24, gap: 16 },
  intro: { paddingHorizontal: 4, paddingTop: 2, paddingBottom: 6 }, row: { flexDirection: 'row', gap: 10 },
  riwayah: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  riwayahTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 },
  layoutChoice: { flex: 1, minWidth: 0, padding: 9, borderWidth: 1, borderRadius: 14, gap: 7 },
  layoutLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  textLayout: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 10 },
  layoutSegments: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  layoutSegment: { flex: 1, minHeight: 44, padding: 4, borderRadius: 9, justifyContent: 'center' },
  tajweed: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  colors: { width: 38, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  footer: { alignItems: 'center', paddingTop: 10, gap: 2 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerRule: { width: 36, height: 1, marginVertical: 13 }, source: { minHeight: 44, justifyContent: 'center' },
});
