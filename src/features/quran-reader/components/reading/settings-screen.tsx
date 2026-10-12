import { useId, useState } from 'react';
import { RIWAYAT, type Riwayah } from '../../riwayat';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { SwitchMark } from '@/components/ui';
import { SwipePages, useSwipeTabs } from '@/components/swipe-tabs';
import { ArchTile, archPath, artColors, Pattern, type Motif } from '@/components/craft/art';
import { BrushStroke, Rule } from '@/components/craft/marks';
import { page, PageHeader, Row, RowGroup, Section } from '@/components/craft/page';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import type { ReaderPalette } from '../../theme';
import type { ReaderMode } from '../../types/reader';
import { ReaderThemePicker } from './reader-theme-picker';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranTextSettings } from './quran-text-settings';
import { ModeDrawing } from './settings-ui';
import { isDarkColor, mixColor, readerLayout, readerShape, withAlpha } from '../../design';
import { RecitationSettings } from '@/features/recitation/recitation-settings';
import { PrayerSettings } from '@/features/prayers/prayer-settings';
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
 * The settings, a tab per subject. The page's title in Naskh with the way back to the mushaf,
 * then the tabs written as words, the chosen one underlined with the gold brush (as on the home
 * screen). A swipe moves between the tabs like the home screen's (the next tab lies to the left);
 * each tab keeps its own scroll.
 */
export function SettingsScreen() {
  const { palette: p, dark } = useReadingPreferences();
  // `/settings?tab=prayers` opens a tab (the prayer times page links to its settings).
  const params = useLocalSearchParams<{ tab?: string }>();
  const [initial] = useState<SettingsTab>(() => isTab(params.tab) ? params.tab : 'reading');
  const { tab, open, pages } = useSwipeTabs(TAB_IDS, initial);
  // The swipe's gesture needs a gesture root; the app's stack screens have none of their own.
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={[s.root, { backgroundColor: p.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <PageHeader back={{ label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.canGoBack() ? router.back() : router.replace('/') }}
      title={t('common.settings')} palette={p} />
    <View style={[s.tabBar, { borderColor: p.border }]}>
      {/* Laid out evenly across the page; a large text size lets the row scroll instead of clipping. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={t('settings.tabs.label')}
        style={s.tabScroll} contentContainerStyle={s.tabs}>
        {tabs.map(({ value, label, icon }) => {
          const active = value === tab;
          return <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} aria-selected={active} onPress={() => open(value)}
            style={({ pressed }) => [s.tab, { opacity: pressed && !active ? 0.6 : 1 }]}>
            <View style={s.tabLabel}>
              <ReaderIcon name={icon} color={active ? p.ornament : p.mutedForeground} size={16} />
              <Text numberOfLines={1} style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 17, lineHeight: 30, fontFamily: active ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{label}</Text>
            </View>
            <BrushStroke on={active} width={56} color={p.ornament} />
          </Pressable>;
        })}
      </ScrollView>
    </View>
    <SwipePages pages={pages} render={(id) => <SettingsPage tab={id} />} />
  </SafeAreaView></GestureHandlerRootView>;
}

/**
 * One tab's settings, with the app's colophon below. Each tab opens with its introduction, but for
 * the reading tab, whose sections say what they are: the riwayah, the reading mode, then how the
 * Quran text looks.
 */
function SettingsPage({ tab }: { tab: SettingsTab }) {
  const { preferences, update, palette: p } = useReadingPreferences();
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { paddingTop: 20 }]}>
    {tab !== 'reading' && <View style={s.intro}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold' }}>{t(`settings.intro.${tab}.title`)}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t(`settings.intro.${tab}.detail`)}</Text>
    </View>}
    {tab === 'reading' && <ReadingSettings />}
    {tab === 'recitation' && <RecitationSettings palette={p} />}
    {tab === 'prayers' && <PrayerSettings />}
    {tab === 'appearance' && <ReaderThemePicker appearance={preferences.appearance} onChange={value => update({ appearance: value })} palette={p} />}
    <Colophon palette={p} />
  </ScrollView>;
}

/** The width of the reading tab's pairs of choices: two arches side by side, never wider than a hand's span. */
function useChoiceWidth() {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, readerLayout.maxWidth) - 32;
  return Math.min(196, Math.floor((inner - 12) / 2));
}

/** The reading tab: the riwayah, the reading mode, then how the Quran text looks. */
function ReadingSettings() {
  const { preferences, update, palette: p } = useReadingPreferences();
  const { mode, textLayout, riwayah } = preferences;
  const width = useChoiceWidth();
  return <>
    <Section title={t('settings.riwayah.title')} palette={p}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.riwayah.title')} style={s.pair}>
        {(['warsh', 'hafs'] as const).map((id) => <RiwayahArch key={id} id={id} width={width} selected={riwayah === id} palette={p} onPress={() => update({ riwayah: id })} />)}
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('settings.riwayah.savedSeparately')}</Text>
    </Section>
    <Section title={t('settings.mode.title')} palette={p}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.mode.title')} style={[s.pair, { width: width * 2 + 12, alignSelf: 'center' }]}>
        {(['page', 'text'] as const).map((value) => <ModeTile key={value} mode={value} kind={value === 'page' ? 'page' : textLayout} selected={mode === value} palette={p}
          onPress={() => update({ mode: value })} />)}
      </View>
      {riwayah === 'warsh' && mode === 'text' && <RowGroup palette={p}>
        <Row title={t('settings.mode.thumun.label')} detail={t('settings.mode.thumun.detail', { count: 480 })} label={t('settings.mode.thumun.label')} hint={t('settings.mode.thumun.detail', { count: 480 })}
          role="switch" selected={preferences.thumunPages} onPress={() => update({ thumunPages: !preferences.thumunPages })}
          trailing={<SwitchMark checked={preferences.thumunPages} palette={p} />} palette={p} />
      </RowGroup>}
    </Section>
    <Section title={t('settings.groups.text.title')} palette={p}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, marginTop: -4 }}>
        {riwayah === 'warsh' && mode === 'page' ? `${t('settings.groups.text.detail')} ${t('settings.groups.text.pagesStay')}` : t('settings.groups.text.detail')}
      </Text>
      <QuranTextSettings palette={p} />
    </Section>
  </>;
}

/** Each riwayah's pattern: the zellige of the Maghrib for Warsh, the mashrabiya of the East for Hafs. */
const riwayahMotifs: Record<Riwayah, Motif> = { warsh: 'khatam', hafs: 'lattice' };

/**
 * A riwayah, as a niche holding the choice: the one read is lit (a deep arched tile, a check in its
 * medallion), the other waits, drawn in gold line with its medallion empty.
 */
function RiwayahArch({ id, width: w, selected, palette: p, onPress }: { id: Riwayah; width: number; selected: boolean; palette: ReaderPalette; onPress: () => void }) {
  const h = Math.round(w * 1.1), rise = Math.round(w * 0.5);
  const focus = Math.round(rise * 0.7 + 6), medallion = Math.round(w * 0.15);
  const colors = artColors(p);
  return <Pressable accessibilityRole="radio" accessibilityLabel={t(`common.riwayah.${id}.label`)} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [{ width: w, height: h, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    {selected ? <ArchTile w={w} h={h} rise={rise} motif={riwayahMotifs[id]} palette={p} focus={focus} medallion={medallion} faded={0.56} />
      : <OpenArch w={w} h={h} rise={rise} motif={riwayahMotifs[id]} focus={focus} medallion={medallion} palette={p} />}
    {selected && <View style={[s.figure, { top: focus - medallion, height: medallion * 2 }]}><ReaderIcon name="check" color={colors.ink} size={Math.round(medallion * 0.95)} /></View>}
    <View style={[StyleSheet.absoluteFill, s.archBody]}>
      <Text style={{ color: selected ? colors.ink : p.mutedForeground, fontSize: 26, lineHeight: 42, fontFamily: selected ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold', textAlign: 'center' }}>{t(`common.riwayah.${id}.name`)}</Text>
      <Text style={{ color: selected ? colors.soft : p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{t(`settings.riwayah.from.${id}`)}</Text>
    </View>
  </Pressable>;
}

/** The arch not chosen: the same arch as `ArchTile`, in gold line on the page, its pattern faint at the top and its medallion empty. */
function OpenArch({ w, h, rise, motif, focus, medallion, palette: p }: { w: number; h: number; rise: number; motif: Motif; focus: number; medallion: number; palette: ReaderPalette }) {
  const id = useId().replace(/[^\w-]/g, '');
  const outline = archPath(w - 2, h - 2, rise, 1, 1);
  // Quieter on a dark page, where the lit tile itself is only a little lighter than the page.
  const dark = isDarkColor(p.background);
  return <Svg width={w} height={h} aria-hidden>
    <Defs>
      <ClipPath id={`open${id}`}><Path d={outline} /></ClipPath>
      <LinearGradient id={`openFade${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={p.background} stopOpacity={0} />
        <Stop offset="0.62" stopColor={p.background} stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <G clipPath={`url(#open${id})`}>
      <Rect x={0} y={0} width={w} height={h} fill={p.background} />
      <Pattern motif={motif} w={w} h={h} rise={rise} color={withAlpha(p.ornament, dark ? 0.1 : 0.2)} focus={focus} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#openFade${id})`} />
    </G>
    <Path d={outline} fill={withAlpha(p.ornament, 0.04)} stroke={withAlpha(p.ornament, dark ? 0.42 : 0.55)} strokeWidth={1.2} />
    <Path d={archPath(w - 12, h - 12, rise - 5, 6, 6, 11)} stroke={withAlpha(p.ornament, 0.25)} strokeWidth={0.8} fill="none" />
    <Circle cx={w / 2} cy={focus} r={medallion} fill={p.background} stroke={withAlpha(p.ornament, 0.5)} strokeWidth={1} />
    <Circle cx={w / 2} cy={focus} r={medallion - 5} fill="none" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />
  </Svg>;
}

/** A way of reading: its drawing, its name and what it gives; the chosen one washed in gold, as the choices on the tasmee' board. */
function ModeTile({ mode, kind, selected, palette: p, onPress }: { mode: ReaderMode; kind: 'page' | 'ayah' | 'flowing'; selected: boolean; palette: ReaderPalette; onPress: () => void }) {
  const label = t(`settings.mode.${mode}.label`), detail = t(`settings.mode.${mode}.detail`);
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [s.mode, {
      backgroundColor: selected ? mixColor(p.card, p.ornament, 0.1) : pressed ? p.accent : p.card,
      borderColor: selected ? withAlpha(p.ornament, 0.65) : p.border,
    }]}>
    <ModeDrawing kind={kind} palette={p} active={selected} />
    <View style={{ gap: 1 }}>
      <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontWeight: selected ? '700' : '600', textAlign: 'center' }}>{label}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{detail}</Text>
    </View>
  </Pressable>;
}

/** The foot of every tab, as a book's colophon: that the choices keep themselves, the app and its riwayah, and the sources. */
function Colophon({ palette: p }: { palette: ReaderPalette }) {
  const { preferences: { riwayah } } = useReadingPreferences();
  return <View style={s.colophon}>
    <View style={s.saved}><ReaderIcon name="done" color={p.mutedForeground} size={14} /><Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.footer.autoSaved')}</Text></View>
    <Rule palette={p} style={{ width: 132, marginVertical: 12 }} />
    <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('common.appName')} · {t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
    <Pressable accessibilityRole="link" onPress={() => router.push('/credits')} style={s.source}>
      <Text style={{ color: p.mutedForeground, fontSize: 12, textDecorationLine: 'underline' }}>{t('settings.footer.credits')}</Text>
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabScroll: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexGrow: 0 },
  tabs: { flexGrow: 1, paddingHorizontal: 8 },
  tab: { flexGrow: 1, alignItems: 'center', paddingTop: 2, paddingHorizontal: 6, minHeight: 44 },
  tabLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  intro: { gap: 2, marginBottom: -6 },
  pair: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  archBody: { justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 14 },
  mode: { flex: 1, minWidth: 0, gap: 8, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 10, borderWidth: 1.5, borderRadius: readerShape.card },
  colophon: { alignItems: 'center', paddingTop: 6, gap: 2 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  source: { minHeight: 44, justifyContent: 'center' },
});
