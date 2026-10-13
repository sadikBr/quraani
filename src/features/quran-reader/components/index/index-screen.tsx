import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { archPath } from '@/components/craft/art';
import { Lozenge } from '@/components/craft/lawh';
import { Beads, Medallion } from '@/components/craft/marks';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { contentStorage } from '../../storage/content-storage';
import type { ReaderContent } from '../../types/reader';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { readerIndexItems, type IndexKind, type ReaderIndexItem, type RevelationFilter } from '../../utils/reader-index';
import { restoreReadingPosition } from '../../utils/navigation';
import { pageStartAyah } from '../../utils/thumun-pages';
import { readerLayout, withAlpha } from '../../design';
import type { ReaderPalette } from '../../theme';
import { ReaderButton } from '../reading/reader-button';
import { Leader, LibraryEmpty, LibraryHeader, LibrarySearch, WordTabs, libraryStyles as l } from '../ui/library-chrome';
import { RIWAYAT, readingPositionKey } from '../../riwayat';
import { formatList, t } from '@/i18n';

const tabs = [{ value: 'surah', get label() { return t('library.index.tabs.surah'); } }, { value: 'juz', get label() { return t('library.index.tabs.juz'); } }, { value: 'hizb', get label() { return t('library.index.tabs.hizb'); } }] as const;
/** The juz' are laid out three to a row, as niches in a wall. */
const COLUMNS = 3, GAP = 10;

/** Where the reader last was: its surah, juz', hizb and quarter of the hizb (null until known). */
interface ReadingPlace { surah: number; juz: number | null; hizb: number | null; quarter: number | null }

/** Reads the saved reading position of this edition, to mark where the reader is in the index. */
function useReadingPlace(content: ReaderContent | undefined) {
  const [place, setPlace] = useState<{ id: number; place: ReadingPlace } | null>(null);
  useEffect(() => {
    if (!content) return;
    let active = true;
    const id = content.quran.id;
    contentStorage.getItem(readingPositionKey(id)).catch(() => null).then((raw) => {
      if (!active || !raw) return;
      try { if (JSON.parse(raw)?.mushafId !== id) return; } catch { return; }
      const position = restoreReadingPosition(raw, content, (paging, page) => pageStartAyah(content, paging, page));
      const reference = position.ayah ?? content.pages.find((page) => page.number === position.pageNumber)?.ayahs[0];
      const ayah = reference && content.quran.surahs.find((surah) => surah.number === reference.surahNumber)?.ayahs.find((a) => a.ayahNumber === reference.ayahNumber);
      if (!ayah) return;
      const quarter = ayah.hizbQuarter;
      setPlace({ id, place: { surah: ayah.surahNumber, juz: ayah.juzNumber, hizb: quarter === null ? null : Math.ceil(quarter / 4), quarter: quarter === null ? null : (quarter - 1) % 4 + 1 } });
    });
    return () => { active = false; };
  }, [content]);
  return content && place?.id === content.quran.id ? place.place : null;
}

export function IndexScreen() {
  const { content, loading, error, refresh } = useReaderContent();
  const { palette: p, dark, preferences } = useReadingPreferences();
  const font = useQuranFont();
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<ReaderIndexItem>>(null);
  const [kind, setKind] = useState<IndexKind>('surah'), [query, setQuery] = useState('');
  const [revelation, setRevelation] = useState<RevelationFilter>('all');
  const items = useMemo(() => content ? readerIndexItems(content.data, kind, query, revelation) : [], [content, kind, query, revelation]);
  const place = useReadingPlace(content?.data);
  const current = !place ? null : kind === 'surah' ? place.surah : kind === 'juz' ? place.juz : place.hizb;
  const open = (item: ReaderIndexItem) => router.dismissTo({ pathname: '/', params: { surah: String(item.start.surahNumber), ayah: String(item.start.ayahNumber) } });
  const changeQuery = (value: string) => { setQuery(value); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const changeRevelation = (value: RevelationFilter) => { setRevelation(value); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const placeholder = t(`library.index.search.placeholder.${kind}`);
  const grid = kind === 'juz';
  const tile = Math.floor((Math.min(width, readerLayout.maxWidth) - readerLayout.gutter * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const calligraphy = font.loaded;
  return <SafeAreaView style={[l.root, { backgroundColor: p.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <LibraryHeader title={t('library.index.title')} subtitle={t('common.riwayahOf', { riwayah: RIWAYAT[preferences.riwayah].label })} icon="index" palette={p} />
    <View style={l.filters}>
      <WordTabs options={tabs} value={kind} onChange={value => { setKind(value); changeQuery(''); }} label={t('library.index.tabs.label')} palette={p} />
      <LibrarySearch value={query} onChange={changeQuery} label={t('library.index.search.label')} placeholder={placeholder} palette={p} />
    </View>
    {/* A grid and a list are two lists: the key gives each its own. */}
    <FlatList key={grid ? 'grid' : 'list'} ref={list} data={content ? items : []} keyExtractor={item => `${kind}:${item.number}`} style={l.list}
      contentContainerStyle={[l.content, { paddingTop: 10 }]} numColumns={grid ? COLUMNS : 1} columnWrapperStyle={grid ? s.columns : undefined}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'} showsVerticalScrollIndicator={false} initialNumToRender={grid ? 15 : 12} windowSize={7}
      ItemSeparatorComponent={grid ? undefined : Separator}
      ListHeaderComponent={content ? <View style={[l.results, { marginBottom: grid ? 14 : 4 }, kind === 'surah' && { alignItems: 'center', marginBottom: 8 }]}>
        {kind === 'surah' ? <RevelationChoice value={revelation} onChange={changeRevelation} palette={p} />
          : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{query.trim() ? t('library.searchResults') : t('library.index.prompt')}</Text>}
        <Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`library.index.count.${kind}`, { count: items.length })}</Text>
      </View> : null}
      ListEmptyComponent={!content ? loading ? <View style={l.status}><ActivityIndicator accessibilityLabel={t('library.index.loading')} color={p.primary} /></View> : <LibraryEmpty title={t('library.index.error.title')} description={error ? t('common.checkConnection') : t('library.index.error.unavailable')} icon="book" palette={p}><ReaderButton palette={p} onPress={refresh}>{t('common.retry')}</ReaderButton></LibraryEmpty>
        : <LibraryEmpty title={t('library.index.empty.title')} description={t('library.index.empty.description')} icon="search" palette={p}><ReaderButton palette={p} onPress={() => changeQuery('')}>{t('common.clearSearch')}</ReaderButton></LibraryEmpty>}
      renderItem={({ item }) => kind === 'juz' ? <JuzTile item={item} width={tile} current={item.number === current} calligraphy={calligraphy} palette={p} onOpen={open} />
        : <IndexRow item={item} kind={kind} current={item.number === current} quarter={kind === 'hizb' && item.number === current ? place?.quarter ?? null : null} calligraphy={calligraphy} palette={p} onOpen={open} />} />
  </SafeAreaView>;
}

const revelations = ['all', 'meccan', 'medinan'] as const satisfies readonly RevelationFilter[];

/**
 * Which surahs the index lists: all, the Meccan or the Medinan ones, as three words; the chosen
 * one on a wash of gold, ringed in gold.
 */
function RevelationChoice({ value, onChange, palette: p }: { value: RevelationFilter; onChange: (value: RevelationFilter) => void; palette: ReaderPalette }) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('library.index.revelation.label')} style={s.choices}>
    {revelations.map((option) => {
      const on = option === value, label = t(`library.index.revelation.${option}`);
      return <Pressable key={option} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} aria-checked={on} onPress={() => onChange(option)} hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [s.choice, { borderColor: on ? withAlpha(p.ornament, 0.8) : p.border, backgroundColor: on ? withAlpha(p.ornament, 0.14) : pressed ? p.accent : 'transparent' }]}>
        <Text numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 13, lineHeight: 20, fontWeight: on ? '600' : '500' }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

function Separator() {
  const { palette: p } = useReadingPreferences();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginStart: 56 }} />;
}

/** What a row says to a screen reader: the item, and that the reader is there. */
function itemLabel(item: ReaderIndexItem, current: boolean) {
  const label = t('library.index.item.label', { title: item.title, detail: item.detail, page: item.pageNumber });
  return current ? formatList([label, t('library.index.current')]) : label;
}

/**
 * A surah or a hizb, as in the index at the end of a printed mushaf: its number on the
 * eight-pointed star, its name (a surah's in the calligraphy of its title) and, after a dotted
 * leader, its page; under the name its size or where it starts. The one being read is filled.
 */
const IndexRow = memo(function IndexRow({ item, kind, current, quarter, calligraphy, palette: p, onOpen }: {
  item: ReaderIndexItem; kind: IndexKind; current: boolean; quarter: number | null; calligraphy: boolean; palette: ReaderPalette; onOpen: (item: ReaderIndexItem) => void;
}) {
  const surah = kind === 'surah';
  return <Pressable accessibilityRole="button" accessibilityLabel={itemLabel(item, current)} accessibilityHint={t('library.index.item.hint')} onPress={() => onOpen(item)}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? p.accent : current ? withAlpha(p.ornament, 0.08) : 'transparent' }]}>
    <Medallion value={item.number} size={42} palette={p} current={current} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={s.line}>
        {surah && calligraphy
          ? <Text accessibilityLabel={item.title} numberOfLines={1} style={[calligraphyStyle(34), { color: p.ornament, lineHeight: 42 }]}>{surahNameGlyph(item.number)}</Text>
          : <Text numberOfLines={1} style={{ flexShrink: 1, color: p.foreground, fontSize: 17, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{item.title}</Text>}
        <Leader palette={p} />
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('library.index.item.page', { page: item.pageNumber })}</Text>
      </View>
      <View style={s.detail}>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{item.detail}</Text>
        {current && <Here palette={p} />}
        {quarter !== null && <View style={{ width: 52 }}><Beads count={4} done={quarter} palette={p} size={7} label={t('reader.divisions.quarter', { hizb: item.number, rub: quarter })} /></View>}
      </View>
    </View>
  </Pressable>;
});

/** The mark of the place being read: a gold lozenge and its words. */
function Here({ palette: p }: { palette: ReaderPalette }) {
  return <View style={s.here}>
    <Lozenge size={8} fill={p.ornament} />
    <Text numberOfLines={1} style={{ color: p.ornament, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t('library.index.current')}</Text>
  </View>;
}

/**
 * A juz' as a niche in a wall of thirty: its number on the star in the arch, then the surah it
 * opens in, in calligraphy, the ayah it starts at and its page. The one being read is lit.
 */
const JuzTile = memo(function JuzTile({ item, width, current, calligraphy, palette: p, onOpen }: {
  item: ReaderIndexItem; width: number; current: boolean; calligraphy: boolean; palette: ReaderPalette; onOpen: (item: ReaderIndexItem) => void;
}) {
  const rise = Math.round(width * 0.46), height = rise + 92;
  const surah = item.start.surahNumber;
  return <Pressable accessibilityRole="button" accessibilityLabel={itemLabel(item, current)} accessibilityHint={t('library.index.item.hint')} onPress={() => onOpen(item)}
    style={({ pressed }) => [{ width, height, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
    {({ pressed }) => <>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} aria-hidden>
        <Path d={archPath(width - 2, height - 2, rise, 1, 1, 12)} fill={current ? withAlpha(p.ornament, 0.14) : pressed ? p.accent : withAlpha(p.ornament, 0.04)}
          stroke={withAlpha(p.ornament, current ? 0.95 : 0.55)} strokeWidth={current ? 1.4 : 1.1} />
        <Path d={archPath(width - 12, height - 12, rise - 5, 6, 6, 8)} fill="none" stroke={withAlpha(p.ornament, current ? 0.45 : 0.25)} strokeWidth={0.8} />
      </Svg>
      <View style={[s.niche, { paddingTop: Math.round(rise * 0.3) }]}>
        <Medallion value={item.number} size={40} palette={p} current={current} />
        {calligraphy
          ? <Text numberOfLines={1} style={[calligraphyStyle(26), { color: p.ornament, lineHeight: 34, marginTop: 2 }]}>{surahNameGlyph(surah)}</Text>
          : <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 13, lineHeight: 32, fontWeight: '600', marginTop: 4 }}>{item.detail}</Text>}
        <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 11, lineHeight: 16 }}>{t('library.index.item.ayah', { ayah: item.start.ayahNumber })}</Text>
        <Text numberOfLines={1} style={{ color: current ? p.ornament : p.mutedForeground, fontSize: 11, lineHeight: 16, fontWeight: current ? '600' : '400' }}>
          {current ? t('library.index.current') : t('library.index.item.page', { page: item.pageNumber })}
        </Text>
      </View>
    </>}
  </Pressable>;
});

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 4, minHeight: 72, borderRadius: 12 },
  line: { flexDirection: 'row', alignItems: 'center' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -2 },
  here: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  choices: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  choice: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  columns: { gap: GAP, marginBottom: GAP },
  niche: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
});
