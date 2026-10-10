import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { createQuranSearch, normalizeArabicSearch, type QuranSearchResult } from '../../utils/search';
import { filterSavedAyahs, savedAyahs, type SavedAyahOrder } from '../../utils/saved-ayahs';
import { ayahKey } from '../../utils/references';
import { RIWAYAT } from '../../riwayat';
import { ReaderIcon } from '../ui/reader-chrome';
import { LibraryEmpty, LibraryHeader, LibrarySearch, LibraryTabs, libraryStyles as l } from '../ui/library-chrome';
import { ReaderButton } from '../reading/reader-button';
import { readerElevation, readerShape } from '../../design';
import { AyahResultCard } from './ayah-result-card';
import { t } from '@/i18n';

// eslint-disable-next-line no-restricted-syntax -- Quran words used as search queries
const examples = ['الرحمن الرحيم', 'الحمد لله', 'السماوات', 'المؤمنين'];
const orders = [{ value: 'quran', get label() { return t('library.bookmarks.order.quran'); } }, { value: 'recent', get label() { return t('library.bookmarks.order.recent'); } }] as const;
export function SearchScreen({ saved = false }: { saved?: boolean }) {
  const { palette: p, dark, preferences } = useReadingPreferences();
  const { content, error, refresh } = useReaderContent();
  const { bookmarks, toggle, ready, error: storageError } = useBookmarks();
  const font = useQuranFont();
  const list = useRef<FlatList<QuranSearchResult>>(null);
  const [query, setQuery] = useState(''), [debounced, setDebounced] = useState('');
  const [order, setOrder] = useState<SavedAyahOrder>('quran');
  const [removed, setRemoved] = useState<QuranSearchResult>();
  const [limit, setLimit] = useState(50);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 180); return () => clearTimeout(timer); }, [query]);
  const search = useMemo(() => content && !saved ? createQuranSearch(content.data.quran) : null, [content, saved]);
  const savedItems = useMemo(() => content && saved ? savedAyahs(content.data.quran, bookmarks) : [], [content, saved, bookmarks]);
  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const matches = useMemo(() => {
    if (saved) { const items = filterSavedAyahs(savedItems, debounced, order); return { items, total: items.length }; }
    if (!search) return { items: [] as QuranSearchResult[], total: 0 };
    const first = search(debounced, { limit: 50 });
    const items = [...first.items];
    for (let offset = 50; offset < Math.min(limit, first.total); offset += 100) items.push(...search(debounced, { offset, limit: Math.min(100, limit - offset) }).items);
    return { items, total: first.total };
  }, [search, saved, savedItems, debounced, order, limit]);
  const hasSearch = normalizeArabicSearch(debounced).length >= 2;
  const filtering = !!normalizeArabicSearch(debounced), searching = query !== debounced;
  const available = !!content && font.loaded && (!saved || ready);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const changeQuery = (value: string) => { setQuery(value); setLimit(50); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const open = (item: QuranSearchResult) => router.dismissTo({ pathname: '/', params: { surah: String(item.reference.surahNumber), ayah: String(item.reference.ayahNumber) } });
  const save = (item: QuranSearchResult) => {
    const key = ayahKey(item.reference);
    setRemoved(saved && bookmarkSet.has(key) ? item : undefined); toggle(key);
  };
  const undo = () => { if (removed && !bookmarkSet.has(ayahKey(removed.reference))) toggle(ayahKey(removed.reference)); setRemoved(undefined); };
  return <SafeAreaView style={[l.root, { backgroundColor: p.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <LibraryHeader title={saved ? t('library.bookmarks.title') : t('library.search.title')} subtitle={t('common.riwayahOf', { riwayah: RIWAYAT[preferences.riwayah].label })} icon={saved ? 'bookmark' : 'search'} palette={p} onBack={back} />
    {(!saved || savedItems.length > 0 || !!query) && <View style={l.filters}>
      <LibrarySearch value={query} onChange={changeQuery} label={saved ? t('library.bookmarks.search.label') : t('library.search.label')} placeholder={saved ? t('library.bookmarks.search.placeholder') : t('library.search.placeholder')} palette={p} />
      {saved ? <LibraryTabs options={orders} value={order} onChange={value => { setOrder(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} label={t('library.bookmarks.order.label')} palette={p} />
        : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('library.search.tip')}</Text>}
    </View>}
    {removed && <View style={l.filters}><View style={[s.undo, { backgroundColor: p.card, borderColor: p.border }, readerElevation(3, p)]}><Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 13, flex: 1 }}>{t('library.bookmarks.removed')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('library.bookmarks.undoLabel')} onPress={undo} style={s.undoAction}><Text style={{ color: p.primary, fontSize: 13, fontWeight: '600' }}>{t('library.bookmarks.undo')}</Text><ReaderIcon name="restore" color={p.primary} size={18} /></Pressable></View></View>}
    <FlatList ref={list} data={available ? matches.items : []} keyExtractor={item => ayahKey(item.reference)} style={l.list} contentContainerStyle={l.content}
      initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View>
        {storageError && <Text accessibilityRole="alert" style={{ color: p.destructive, fontSize: 13, marginBottom: 12 }}>{t('library.bookmarks.storageError')}</Text>}
        {content?.stale && <Text style={{ color: p.mutedForeground, fontSize: 12, marginBottom: 10 }}>{t('library.stale')}</Text>}
        {available && saved && savedItems.length > 0 && !filtering && <View style={[s.summary, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('library.bookmarks.summary.title')}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('library.bookmarks.summary.counts', { bookmarks: savedItems.length, surahs: new Set(savedItems.map(item => item.reference.surahNumber)).size })}</Text></View><ReaderIcon name="bookmark" color={p.primary} size={26} />
        </View>}
        {available && (saved && savedItems.length > 0 || hasSearch) && <View style={l.results}>
          <Text style={{ color: p.foreground, fontSize: 13, fontWeight: '600' }}>{saved ? filtering ? t('library.bookmarks.results.filtered') : order === 'recent' ? t('library.bookmarks.results.recent') : t('library.bookmarks.results.quran') : t('library.searchResults')}</Text>
          {searching ? <ActivityIndicator accessibilityLabel={t('library.search.searching')} size="small" color={p.primary} /> : <Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13 }}>{saved ? t('library.bookmarks.count', { n: matches.total }) : t('library.search.count', { n: matches.total })}</Text>}
        </View>}
      </View>}
      ListEmptyComponent={error && !content || font.error ? <LibraryEmpty title={t('library.loadError')} description={t('common.checkConnection')} icon="book" palette={p}><ReaderButton palette={p} onPress={refresh}>{t('common.retry')}</ReaderButton></LibraryEmpty>
        : !available ? <View style={l.status}><ActivityIndicator accessibilityLabel={t('library.preparing')} color={p.primary} /></View>
        : <LibraryEmpty title={saved ? filtering ? t('library.bookmarks.empty.noMatchTitle') : t('library.bookmarks.empty.title') : hasSearch ? t('library.search.empty.noMatchTitle') : t('library.search.empty.title')}
          description={saved ? filtering ? t('library.bookmarks.empty.noMatchDescription') : t('library.bookmarks.empty.description') : hasSearch ? t('library.search.empty.noMatchDescription') : t('library.search.empty.description')} icon={saved ? 'bookmark' : 'search'} palette={p}>
          {saved ? <View style={{ alignSelf: 'stretch', marginTop: 12 }}><ReaderButton palette={p} selected={!filtering} onPress={filtering ? () => changeQuery('') : () => router.push('/search')}>{filtering ? t('library.bookmarks.empty.showAll') : t('library.bookmarks.empty.findAyah')}</ReaderButton></View>
            : hasSearch ? <ReaderButton palette={p} onPress={() => changeQuery('')}>{t('common.clearSearch')}</ReaderButton>
            : <View style={s.suggestions}>{examples.map(example => <Pressable key={example} accessibilityRole="button" accessibilityLabel={t('library.search.suggestion', { query: example })} onPress={() => changeQuery(example)} hitSlop={4} style={({ pressed }) => [s.suggestion, { backgroundColor: pressed ? p.accent : p.background, borderColor: p.input }, readerElevation(1, p)]}><ReaderIcon name="search" color={p.mutedForeground} size={16} /><Text style={{ color: p.foreground, fontSize: 14 }}>{example}</Text></Pressable>)}</View>}
        </LibraryEmpty>}
      ListFooterComponent={available && !saved && matches.items.length > 0 && matches.items.length < matches.total ? <View style={s.more}><ReaderButton palette={p} onPress={() => setLimit(value => Math.min(value + 50, matches.total))}>{t('library.search.showMore')}</ReaderButton></View> : null}
      onEndReachedThreshold={0.5} onEndReached={() => { if (!saved && !searching && limit < matches.total) setLimit(value => Math.min(value + 50, matches.total)); }}
      renderItem={({ item, index }) => <AyahResultCard item={item} index={index} count={matches.items.length} palette={p} fontFamily={font.fontFamily} bookmarked={bookmarkSet.has(ayahKey(item.reference))} saved={saved} canSave={ready} onOpen={() => open(item)} onSave={() => save(item)} />} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 14 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderRadius: readerShape.control },
  summary: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, marginBottom: 16 },
  more: { paddingTop: 16 },
  undo: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: readerShape.lg, borderWidth: StyleSheet.hairlineWidth },
  undoAction: { flexDirection: 'row', gap: 6, minHeight: 44, alignItems: 'center', paddingHorizontal: 4 },
});
