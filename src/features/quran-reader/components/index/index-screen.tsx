import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { readerIndexItems, type IndexKind, type ReaderIndexItem } from '../../utils/reader-index';
import { ReaderButton } from '../reading/reader-button';
import { ReaderIcon } from '../ui/reader-chrome';
import { LibraryEmpty, LibraryHeader, LibrarySearch, LibraryTabs, libraryStyles as l, listRowFrame } from '../ui/library-chrome';
import { RIWAYAT } from '../../riwayat';
import { t } from '@/i18n';

const tabs = [{ value: 'surah', get label() { return t('library.index.tabs.surah'); } }, { value: 'juz', get label() { return t('library.index.tabs.juz'); } }, { value: 'hizb', get label() { return t('library.index.tabs.hizb'); } }] as const;
export function IndexScreen() {
  const { content, loading, error, refresh } = useReaderContent();
  const { palette: p, dark, preferences } = useReadingPreferences();
  const font = useQuranFont();
  const list = useRef<FlatList<ReaderIndexItem>>(null);
  const [kind, setKind] = useState<IndexKind>('surah'), [query, setQuery] = useState('');
  const items = useMemo(() => content ? readerIndexItems(content.data, kind, query) : [], [content, kind, query]);
  const open = (item: ReaderIndexItem) => router.dismissTo({ pathname: '/', params: { surah: String(item.start.surahNumber), ayah: String(item.start.ayahNumber) } });
  const changeQuery = (value: string) => { setQuery(value); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const placeholder = t(`library.index.search.placeholder.${kind}`);
  return <SafeAreaView style={[l.root, { backgroundColor: p.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <LibraryHeader title={t('library.index.title')} subtitle={t('common.riwayahOf', { riwayah: RIWAYAT[preferences.riwayah].label })} icon="index" palette={p} onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />
    <View style={l.filters}>
      <LibrarySearch value={query} onChange={changeQuery} label={t('library.index.search.label')} placeholder={placeholder} palette={p} />
      <LibraryTabs options={tabs} value={kind} onChange={value => { setKind(value); changeQuery(''); }} label={t('library.index.tabs.label')} palette={p} />
    </View>
    <FlatList ref={list} data={content ? items : []} keyExtractor={item => `${kind}:${item.number}`} style={l.list} contentContainerStyle={l.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'} showsVerticalScrollIndicator={false} initialNumToRender={12} windowSize={7}
      ListHeaderComponent={content ? <View style={l.results}><Text style={{ color: p.foreground, fontSize: 13, fontWeight: '600' }}>{query.trim() ? t('library.searchResults') : t('library.index.prompt')}</Text><Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`library.index.count.${kind}`, { count: items.length })}</Text></View> : null}
      ListEmptyComponent={!content ? loading ? <View style={l.status}><ActivityIndicator accessibilityLabel={t('library.index.loading')} color={p.primary} /></View> : <LibraryEmpty title={t('library.index.error.title')} description={error ? t('common.checkConnection') : t('library.index.error.unavailable')} icon="book" palette={p}><ReaderButton palette={p} onPress={refresh}>{t('common.retry')}</ReaderButton></LibraryEmpty>
        : <LibraryEmpty title={t('library.index.empty.title')} description={t('library.index.empty.description')} icon="search" palette={p}><ReaderButton palette={p} onPress={() => changeQuery('')}>{t('common.clearSearch')}</ReaderButton></LibraryEmpty>}
      renderItem={({ item, index }) => <Pressable accessibilityRole="button" accessibilityLabel={t('library.index.item.label', { title: item.title, detail: item.detail, page: item.pageNumber })} accessibilityHint={t('library.index.item.hint')} onPress={() => open(item)}
        style={({ pressed }) => [s.item, listRowFrame(index, items.length), { borderColor: p.border, backgroundColor: pressed ? p.accent : p.card }]}>
        <Text style={[s.number, { color: p.mutedForeground }]}>{item.number}</Text>
        <View style={s.name}>
          <Text accessibilityLabel={item.title} style={{ color: kind === 'surah' ? p.ornament : p.foreground, fontSize: 19, fontWeight: kind === 'surah' ? '400' : '600', ...(kind === 'surah' && font.loaded ? calligraphyStyle(34) : {}) }}>{kind === 'surah' && font.loaded ? surahNameGlyph(item.number) : item.title}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{item.detail}</Text>
        </View>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('library.index.item.page', { page: item.pageNumber })}</Text>
        <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </Pressable>} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, minHeight: 72 },
  number: { width: 28, fontSize: 13, textAlign: 'center' },
  name: { flex: 1, minWidth: 0, gap: 2 },
});
