import { useState } from 'react';
import { RIWAYAT } from '../../riwayat';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { Tabs } from '@/components/ui';
import { SwipePages, useSwipeTabs } from '@/components/swipe-tabs';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ReaderThemePicker } from './reader-theme-picker';
import { IconButton, ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';
import { QuranTextSettings } from './quran-text-settings';
import { ReadingLayoutPreview, SettingsCard, SettingsCardHeading, SettingsGroupHeading, SettingsSelection } from './settings-ui';
import { readerLayout, readerShape } from '../../design';
import { RecitationSettings } from '@/features/recitation/recitation-settings';
import { PrayerSettings } from '@/features/prayers/prayer-settings';
import { PlanSwitch } from '@/features/plans/components';
import { t } from '@/i18n';

type SettingsTab = 'reading' | 'recitation' | 'appearance' | 'prayers';
const tabs: { value: SettingsTab; label: string; icon: ReaderIconName }[] = [
  { value: 'reading', get label() { return t('settings.tabs.reading'); }, icon: 'book' },
  { value: 'recitation', get label() { return t('settings.tabs.recitation'); }, icon: 'headphones' },
  { value: 'appearance', get label() { return t('settings.tabs.appearance'); }, icon: 'sun' },
  { value: 'prayers', get label() { return t('settings.tabs.prayers'); }, icon: 'mosque' },
];
const TAB_IDS = tabs.map(tab => tab.value);
const isTab = (value: unknown): value is SettingsTab => tabs.some(tab => tab.value === value);

/**
 * The settings, a tab per subject. A swipe moves between the tabs like the home screen's (the next
 * tab lies to the left); each tab keeps its own scroll.
 */
export function SettingsScreen() {
  const { palette, dark } = useReadingPreferences();
  // `/settings?tab=prayers` opens a tab (the prayer times page links to its settings).
  const params = useLocalSearchParams<{ tab?: string }>();
  const [initial] = useState<SettingsTab>(() => isTab(params.tab) ? params.tab : 'reading');
  const { tab, open, pages } = useSwipeTabs(TAB_IDS, initial);
  // The swipe's gesture needs a gesture root; the app's stack screens have none of their own.
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <View style={[styles.header, { borderColor: palette.border }]}>
      <View style={styles.navigation}>
        <IconButton name="back" label={t('common.backToReading')} palette={palette} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 20, fontWeight: '600', flex: 1 }}>{t('common.settings')}</Text>
        <QuranniLogo size={30} color={palette.ornament} />
      </View>
      <Tabs palette={palette} label={t('settings.tabs.label')} value={tab} options={tabs} onChange={open} />
    </View>
    <SwipePages pages={pages} render={(id) => <SettingsPage tab={id} />} />
  </SafeAreaView></GestureHandlerRootView>;
}

/**
 * One tab's settings, with the app's footer below. Each tab opens with its introduction, but for
 * the reading tab, whose two groups have headings of their own: the mushaf (riwayah and reading
 * mode), then how the Quran text looks, under one live preview.
 */
function SettingsPage({ tab }: { tab: SettingsTab }) {
  const { preferences, update, palette } = useReadingPreferences();
  const { appearance, mode, textLayout, riwayah } = preferences;
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    {tab !== 'reading' && <View style={styles.intro}>
      <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 24, fontWeight: '600' }}>{t(`settings.intro.${tab}.title`)}</Text>
      <Text style={{ color: palette.mutedForeground, fontSize: 15 }}>{t(`settings.intro.${tab}.detail`)}</Text>
    </View>}
    {tab === 'reading' && <>
      <SettingsGroupHeading title={t('settings.groups.mushaf')} palette={palette} />
      <SettingsCard palette={palette}>
        <SettingsCardHeading title={t('settings.riwayah.title')} icon="book" palette={palette} />
        <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.riwayah.title')} style={styles.row}>
          {([{ value: 'warsh', name: t('common.riwayah.warsh.name'), from: t('settings.riwayah.from.warsh') }, { value: 'hafs', name: t('common.riwayah.hafs.name'), from: t('settings.riwayah.from.hafs') }] as const).map(item => {
            const selected = riwayah === item.value;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={t(`common.riwayah.${item.value}.label`)} accessibilityState={{ checked: selected }} aria-checked={selected}
              onPress={() => update({ riwayah: item.value })} style={({ pressed }) => [styles.riwayah, { backgroundColor: pressed ? palette.accent : palette.background, borderColor: selected ? palette.primary : palette.input }]}>
              <View style={styles.choiceTop}><SettingsSelection palette={palette} selected={selected} /></View>
              <Text style={{ color: palette.foreground, fontSize: 22, lineHeight: 36, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: palette.mutedForeground, fontSize: 14, marginTop: -4 }}>{item.from}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.riwayah.savedSeparately')}</Text>
      </SettingsCard>
      <SettingsCard palette={palette}>
        <SettingsCardHeading title={t('settings.mode.title')} icon="lines" palette={palette} />
        <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.mode.title')} style={styles.row}>
          {([{ value: 'page', label: t('settings.mode.page.label'), detail: t('settings.mode.page.detail') }, { value: 'text', label: t('settings.mode.text.label'), detail: t('settings.mode.text.detail') }] as const).map(item => {
            const selected = mode === item.value;
            return <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: selected }} aria-checked={selected}
              onPress={() => update({ mode: item.value })} style={({ pressed }) => [styles.layoutChoice, { backgroundColor: pressed ? palette.accent : palette.background, borderColor: selected ? palette.primary : palette.input }]}>
              <View style={styles.choiceTop}><SettingsSelection palette={palette} selected={selected} /></View>
              <ReadingLayoutPreview kind={item.value === 'page' ? 'page' : textLayout} palette={palette} selected={selected} />
              <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600', marginTop: 4 }}>{item.label}</Text>
              <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{item.detail}</Text>
            </Pressable>;
          })}
        </View>
        {riwayah === 'warsh' && mode === 'text' && <PlanSwitch label={t('settings.mode.thumun.label')} detail={t('settings.mode.thumun.detail', { count: 480 })}
          checked={preferences.thumunPages} onChange={(on) => update({ thumunPages: on })} />}
      </SettingsCard>
      <SettingsGroupHeading title={t('settings.groups.text.title')} palette={palette}
        detail={riwayah === 'warsh' && mode === 'page' ? `${t('settings.groups.text.detail')} ${t('settings.groups.text.pagesStay')}` : t('settings.groups.text.detail')} />
      <QuranTextSettings palette={palette} />
    </>}
    {tab === 'recitation' && <RecitationSettings palette={palette} />}
    {tab === 'prayers' && <PrayerSettings />}
    {tab === 'appearance' && <ReaderThemePicker appearance={appearance} onChange={value => update({ appearance: value })} palette={palette} />}
    <View style={styles.footer}>
      <View style={styles.saved}><ReaderIcon name="done" color={palette.mutedForeground} size={14} /><Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.footer.autoSaved')}</Text></View>
      <View style={[styles.footerRule, { backgroundColor: palette.border }]} />
      <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('common.appName')} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/credits')} style={styles.source}>
        <Text style={{ color: palette.mutedForeground, fontSize: 12, textDecorationLine: 'underline' }}>{t('settings.footer.credits')}</Text>
      </Pressable>
    </View>
  </ScrollView>;
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
  choiceTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 },
  layoutChoice: { flex: 1, minWidth: 0, padding: 10, borderWidth: 1.5, borderRadius: readerShape.lg, gap: 6 },
  footer: { alignItems: 'center', paddingTop: 10, gap: 2 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerRule: { width: 36, height: 1, marginVertical: 13 }, source: { minHeight: 44, justifyContent: 'center' },
});
