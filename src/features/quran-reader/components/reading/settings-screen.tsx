import { useRef, useState } from 'react';
import { RIWAYAT } from '../../riwayat';
import { router } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { Tabs } from '@/components/ui';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ReaderSettings } from './reader-settings';
import { IconButton, ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { WarshTajweedLegend } from './warsh-tajweed-legend';
import { ReadingLayoutPreview, SettingsCard, SettingsCardHeading, SettingsSelection, SettingsToggle } from './settings-ui';
import { readerLayout, readerShape } from '../../design';
import { RecitationSettings } from '@/features/recitation/recitation-settings';
import { t } from '@/i18n';

type SettingsTab = 'reading' | 'recitation' | 'appearance';
const tabs: { value: SettingsTab; label: string; icon: ReaderIconName }[] = [
  { value: 'reading', get label() { return t('settings.tabs.reading'); }, icon: 'book' },
  { value: 'recitation', get label() { return t('settings.tabs.recitation'); }, icon: 'headphones' },
  { value: 'appearance', get label() { return t('settings.tabs.appearance'); }, icon: 'sun' },
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
        <IconButton name="back" label={t('common.backToReading')} palette={palette} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 20, fontWeight: '600', flex: 1 }}>{t('common.settings')}</Text>
        <QuranniLogo size={30} color={palette.ornament} />
      </View>
      <Tabs palette={palette} label={t('settings.tabs.label')} value={tab} options={tabs}
        onChange={value => { if (tab !== value) { setTab(value); scroll.current?.scrollTo({ y: 0, animated: false }); } }} />
    </View>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 24, fontWeight: '600' }}>{t(`settings.intro.${tab}.title`)}</Text>
        <Text style={{ color: palette.mutedForeground, fontSize: 15 }}>{t(`settings.intro.${tab}.detail`)}</Text>
      </View>
      {tab === 'reading' && <>
        <SettingsCard palette={palette}>
          <SettingsCardHeading title={t('settings.riwayah.title')} icon="book" palette={palette} />
          <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.riwayah.title')} style={styles.row}>
            {([{ value: 'warsh', name: t('common.riwayah.warsh.name'), from: t('settings.riwayah.from.warsh') }, { value: 'hafs', name: t('common.riwayah.hafs.name'), from: t('settings.riwayah.from.hafs') }] as const).map(item => {
              const selected = riwayah === item.value;
              return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={t(`common.riwayah.${item.value}.label`)} accessibilityState={{ checked: selected }} aria-checked={selected}
                onPress={() => update({ riwayah: item.value })} style={({ pressed }) => [styles.riwayah, { backgroundColor: pressed ? palette.accent : palette.background, borderColor: selected ? palette.primary : palette.input }]}>
                <View style={styles.riwayahTop}><SettingsSelection palette={palette} selected={selected} /></View>
                <Text style={{ color: palette.foreground, fontSize: 22, lineHeight: 36, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: palette.mutedForeground, fontSize: 14, marginTop: -4 }}>{item.from}</Text>
              </Pressable>;
            })}
          </View>
          <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.riwayah.savedSeparately')}</Text>
        </SettingsCard>
        <SettingsCard palette={palette}>
          <SettingsCardHeading title={t('settings.mode.title')} detail={t('settings.mode.detail')} icon="lines" palette={palette} />
          <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.mode.title')} style={styles.row}>
            {([{ value: 'page', label: t('settings.mode.page.label'), detail: t('settings.mode.page.detail') }, { value: 'text', label: t('settings.mode.text.label'), detail: t('settings.mode.text.detail') }] as const).map(item => {
              const selected = mode === item.value;
              return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} aria-checked={selected}
                onPress={() => update({ mode: item.value })} style={({ pressed }) => [styles.layoutChoice, { backgroundColor: pressed ? palette.accent : palette.background, borderColor: selected ? palette.primary : palette.input }]}>
                <ReadingLayoutPreview kind={item.value === 'page' ? 'page' : textLayout} palette={palette} selected={selected} />
                <View style={styles.layoutLabel}><Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600', flex: 1 }}>{item.label}</Text><SettingsSelection palette={palette} selected={selected} /></View>
                <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{item.detail}</Text>
              </Pressable>;
            })}
          </View>
          {mode === 'text' ? <View style={[styles.textLayout, { borderColor: palette.border }]}>
            <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600' }}>{t('settings.textLayout.title')}</Text>
            <Tabs palette={palette} role="radio" label={t('settings.textLayout.label')} value={textLayout} onChange={value => update({ textLayout: value })} options={[{ value: 'ayah', label: t('settings.textLayout.ayah') }, { value: 'flowing', label: t('settings.textLayout.flowing') }] as const} />
            <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{textLayout === 'ayah' ? t('settings.textLayout.ayahDetail') : t('settings.textLayout.flowingDetail')}</Text>
          </View> : <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.mode.pageNote')}</Text>}
        </SettingsCard>
        <SettingsCard palette={palette}>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: tajweed }} aria-checked={tajweed} accessibilityLabel={t('settings.tajweed.title')}
            onPress={() => update({ tajweed: !tajweed })} style={({ pressed }) => [styles.tajweed, { opacity: pressed ? 0.65 : 1 }]}>
            <View style={[styles.colors, { backgroundColor: palette.muted }]}>{['#537fff', '#dd5359', '#50a86b'].map((color, i) => <View key={color} style={{ width: 4, height: 12 + i * 4, backgroundColor: color, borderRadius: 2 }} />)}</View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.foreground, fontSize: 16, fontWeight: '600' }}>{t('settings.tajweed.title')}</Text><Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{tajweed ? t('settings.tajweed.on') : t('settings.tajweed.off')} · {t('settings.tajweed.detail')}</Text></View>
            <SettingsToggle checked={tajweed} palette={palette} />
          </Pressable>
          {riwayah === 'warsh' ? <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.tajweed.warshNote')}</Text>
            : <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.tajweed.hafsNote')}</Text>}
          {riwayah === 'warsh' && tajweed && <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border, paddingTop: 6 }}>
            <WarshTajweedLegend palette={palette} dark={dark} />
            <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.tajweed.stopNote')}</Text>
          </View>}
        </SettingsCard>
      </>}
      {tab === 'recitation' && <RecitationSettings palette={palette} />}
      {tab !== 'recitation' && <ReaderSettings section={tab} palette={palette} fixedPage={mode === 'page'} textLayout={textLayout} appearance={appearance} setAppearance={value => update({ appearance: value })}
        fontSize={fontSize} setFontSize={value => update({ fontSize: value })} spacious={spacious} setSpacious={value => update({ spacious: value })} />}
      <View style={styles.footer}>
        <View style={styles.saved}><ReaderIcon name="done" color={palette.mutedForeground} size={14} /><Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.footer.autoSaved')}</Text></View>
        <View style={[styles.footerRule, { backgroundColor: palette.border }]} />
        <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('common.appName')} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={t('settings.footer.sourceLabel')} onPress={() => void Linking.openURL('https://quranpedia.net')} style={styles.source}>
          <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.footer.source')}</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push('/credits')} style={styles.source}>
          <Text style={{ color: palette.mutedForeground, fontSize: 12, textDecorationLine: 'underline' }}>{t('settings.footer.credits')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) },
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: 'center', justifyContent: 'center' },
  // Outer `control` minus the 4px inset leaves `detail` for the selected tab, so the corners stay concentric.
  tabs: { flexDirection: 'row', padding: 4, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: readerShape.detail, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingBottom: 24, gap: 16 },
  intro: { paddingHorizontal: 4, paddingTop: 2, paddingBottom: 6, gap: 2 }, row: { flexDirection: 'row', gap: 10 },
  // Option tiles: a constant 1.5 border keeps the layout still when the accent colour marks the selection.
  riwayah: { flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: readerShape.lg, paddingHorizontal: 14, paddingVertical: 12 },
  riwayahTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 },
  layoutChoice: { flex: 1, minWidth: 0, padding: 10, borderWidth: 1.5, borderRadius: readerShape.lg, gap: 8 },
  layoutLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  textLayout: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 10 },
  layoutSegments: { flexDirection: 'row', borderRadius: readerShape.control, padding: 4, gap: 4 },
  layoutSegment: { flex: 1, minHeight: 44, padding: 4, borderRadius: readerShape.detail, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  tajweed: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  colors: { width: 40, height: 40, borderRadius: readerShape.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  footer: { alignItems: 'center', paddingTop: 10, gap: 2 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerRule: { width: 36, height: 1, marginVertical: 13 }, source: { minHeight: 44, justifyContent: 'center' },
});
