import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View, Text as QuranText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { createQuranSearch, normalizeArabicSearch, type QuranSearchResult } from '../../utils/search';
import { ayahKey } from '../../utils/references';
import { ReaderIcon, ScreenHeading } from '../ui/reader-chrome';
import { ReaderButton } from '../reading/reader-button';
import { readerLayout, readerShape } from '../../design';

export function SearchScreen({ saved = false }: { saved?: boolean }) {
  const { palette } = useReadingPreferences();
  const { content, error, refresh } = useReaderContent();
  const { bookmarks, ready, error: storageError } = useBookmarks();
  const font = useQuranFont();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [debounced, setDebounced] = useState('');
  const [limit, setLimit] = useState(50);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 180); return () => clearTimeout(timer); }, [query]);
  const search = useMemo(() => content ? createQuranSearch(content.data.quran) : null, [content]);
  const matches = useMemo(() => {
    if (!content || !search) return { items: [] as QuranSearchResult[], total: 0 };
    if (saved) {
      const items = content.data.quran.surahs.flatMap((surah) => surah.ayahs.filter((ayah) => bookmarks.includes(ayahKey(ayah))).map((ayah) => ({ reference: ayah, pageNumber: ayah.pageNumber, text: ayah.text, surahName: surah.name })));
      return { items, total: items.length };
    }
    const first = search(debounced, { limit: 50 });
    const items = [...first.items];
    for (let offset = 50; offset < Math.min(limit, first.total); offset += 100) items.push(...search(debounced, { offset, limit: Math.min(100, limit - offset) }).items);
    return { items, total: first.total };
  }, [content, search, saved, bookmarks, debounced, limit]);
  const hint = saved ? 'لم تحفظ علامات بعد. اختر آية في المصحف ثم احفظها.' : normalizeArabicSearch(debounced).length < 2 ? 'اكتب حرفين على الأقل للبحث في نص القرآن.' : 'لا توجد نتائج. جرّب كلمات أخرى أو احذف بعض الكلمات.';
  const hasSearch = normalizeArabicSearch(debounced).length >= 2;
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <FlatList data={font.loaded ? matches.items : []} keyExtractor={(item) => ayahKey(item.reference)} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={7}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.header}>
        <ScreenHeading title={saved ? 'العلامات المحفوظة' : 'البحث في القرآن'} subtitle={saved ? 'عُد إلى الآيات التي اخترتها.' : 'ابحث في الرواية المختارة، مع التشكيل أو بدونه.'} palette={palette} onBack={() => router.dismissTo('/')} />
        {!saved && <View style={[styles.search, { backgroundColor: palette.paper, borderColor: searchFocused ? palette.accent : palette.border }]}>
          <ReaderIcon name="search" color={searchFocused ? palette.accent : palette.muted} size={20} />
          <TextInput accessibilityLabel="البحث في نص القرآن" placeholder="ابحث عن كلمة أو عبارة" placeholderTextColor={palette.muted} value={query}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            onChangeText={(text) => { setQuery(text); setLimit(50); }} autoCorrect={false} returnKeyType="search" style={[styles.input, { color: palette.text }]} />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => { setQuery(''); setLimit(50); }} style={styles.clear}>
            <ReaderIcon name="close" color={palette.muted} size={18} />
          </Pressable>}
        </View>}
        {(saved || hasSearch) && <View style={[styles.resultsHeading, { borderColor: palette.border }]}>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{saved ? 'آيات محفوظة' : 'نتائج البحث'}</Text>
          <Text accessibilityLiveRegion="polite" style={{ color: palette.muted, fontSize: 12 }}>{matches.total} {saved ? 'علامة' : 'نتيجة'}</Text>
        </View>}
        {storageError && saved && <Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر الوصول إلى العلامات المحفوظة على الجهاز.</Text>}
        {content?.stale && <Text style={{ color: palette.muted, fontSize: 12 }}>تستخدم نسخة المصحف المحفوظة على الجهاز.</Text>}
      </View>}
      ListEmptyComponent={error && !content || font.error ? <View style={styles.empty}><Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر تحميل المصحف أو الخط.</Text><ReaderButton palette={palette} onPress={refresh}>إعادة المحاولة</ReaderButton></View> : !content || !font.loaded || saved && !ready ? <ActivityIndicator accessibilityLabel="جارٍ تجهيز النتائج" color={palette.accent} /> : <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: palette.paper, borderColor: palette.border }]}><ReaderIcon name={saved ? 'bookmark' : 'search'} color={palette.ornament} size={26} /></View>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }}>{saved ? 'احتفظ بآياتك المفضّلة' : hasSearch ? 'لم نعثر على نتائج' : 'ابدأ بكلمة من الآية'}</Text>
        <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{hint}</Text>
        {saved && <ReaderButton palette={palette} onPress={() => router.dismissTo('/')}>العودة إلى المصحف</ReaderButton>}
      </View>}
      onEndReachedThreshold={0.5} onEndReached={() => { if (!saved && limit < matches.total) setLimit((v) => Math.min(v + 50, matches.total)); }}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.surahName}، الآية ${item.reference.ayahNumber}، صفحة ${item.pageNumber}. ${item.text}`} accessibilityHint="فتح الآية وتحديدها في المصحف" onPress={() => router.dismissTo({ pathname: '/', params: { surah: String(item.reference.surahNumber), ayah: String(item.reference.ayahNumber) } })}
        style={({ pressed }) => [styles.result, { backgroundColor: pressed ? palette.accentSoft : palette.paper, borderColor: palette.border }]}>
        <View style={styles.row}><Text style={{ color: palette.accent, fontSize: 14, fontWeight: '600', flex: 1 }}>{item.surahName} · الآية {item.reference.ayahNumber}</Text><Text style={{ color: palette.muted, fontSize: 11 }}>صفحة {item.pageNumber}</Text></View>
        <QuranText numberOfLines={3} style={{ color: palette.text, fontFamily: font.fontFamily, fontSize: 24, lineHeight: 44, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'auto' : 'right' }}>{item.text}</QuranText>
      </Pressable>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: readerLayout.gutter, paddingTop: 12, paddingBottom: 32 },
  header: { gap: 22, marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: readerShape.control },
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: 'ReaderNaskh', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const }, web: { outlineWidth: 0 } }) },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 12, gap: 12 },
  result: { minHeight: 80, padding: 16, marginBottom: 10, borderRadius: readerShape.card, borderWidth: 1, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { paddingHorizontal: 20, paddingVertical: 44, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 56, height: 56, borderWidth: 1, borderRadius: readerShape.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
