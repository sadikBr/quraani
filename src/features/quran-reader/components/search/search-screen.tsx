import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, View, Text as QuranText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useWarshFont } from '../../hooks/use-warsh-font';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { createQuranSearch, normalizeArabicSearch, type QuranSearchResult } from '../../utils/search';
import { ayahKey } from '../../utils/references';
import { ScreenHeading } from '../ui/reader-chrome';
import { ReaderButton } from '../reading/reader-button';

export function SearchScreen({ saved = false }: { saved?: boolean }) {
  const { palette } = useReadingPreferences();
  const { content, error, refresh } = useReaderContent();
  const { bookmarks, ready, error: storageError } = useBookmarks();
  const font = useWarshFont();
  const [query, setQuery] = useState('');
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
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <FlatList data={font.loaded ? matches.items : []} keyExtractor={(item) => ayahKey(item.reference)} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={7}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={{ gap: 18, marginBottom: 18 }}>
        <ScreenHeading title={saved ? 'العلامات المحفوظة' : 'البحث في القرآن'} subtitle={saved ? 'عُد إلى الآيات التي اخترتها.' : 'ابحث في مصحف ورش، مع التشكيل أو بدونه.'} palette={palette} onBack={() => router.dismissTo('/')} />
        {!saved && <View style={{ gap: 8 }}><TextInput accessibilityLabel="البحث في نص القرآن" placeholder="ابحث عن كلمة أو عبارة" placeholderTextColor={palette.muted} value={query} onChangeText={(text) => { setQuery(text); setLimit(50); }} autoCorrect={false} returnKeyType="search" style={[styles.input, { color: palette.text, backgroundColor: palette.paper, borderColor: palette.border }]} />{!!query && <ReaderButton palette={palette} onPress={() => { setQuery(''); setLimit(50); }}>مسح البحث</ReaderButton>}</View>}
        <Text accessibilityLiveRegion="polite" style={{ color: palette.muted, fontSize: 12 }}>{matches.total} {saved ? 'علامة' : 'نتيجة'}</Text>
        {storageError && saved && <Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر الوصول إلى العلامات المحفوظة على الجهاز.</Text>}
        {content?.stale && <Text style={{ color: palette.muted, fontSize: 12 }}>تستخدم نسخة المصحف المحفوظة على الجهاز.</Text>}
      </View>}
      ListEmptyComponent={error && !content || font.error ? <View style={styles.empty}><Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر تحميل المصحف أو الخط.</Text><ReaderButton palette={palette} onPress={refresh}>إعادة المحاولة</ReaderButton></View> : !content || !font.loaded || saved && !ready ? <ActivityIndicator accessibilityLabel="جارٍ تجهيز النتائج" color={palette.accent} /> : <Text style={[styles.empty, { color: palette.muted, lineHeight: 24 }]}>{hint}</Text>}
      onEndReachedThreshold={0.5} onEndReached={() => { if (!saved && limit < matches.total) setLimit((v) => Math.min(v + 50, matches.total)); }}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.surahName}، الآية ${item.reference.ayahNumber}، صفحة ${item.pageNumber}. ${item.text}`} accessibilityHint="فتح الآية وتحديدها في المصحف" onPress={() => router.dismissTo({ pathname: '/', params: { surah: String(item.reference.surahNumber), ayah: String(item.reference.ayahNumber) } })}
        style={({ pressed }) => [styles.result, { backgroundColor: pressed ? palette.accentSoft : palette.paper, borderColor: palette.border }]}>
        <View style={styles.row}><Text style={{ color: palette.accent, fontSize: 14, fontWeight: '600', flex: 1 }}>{item.surahName} · الآية {item.reference.ayahNumber}</Text><Text style={{ color: palette.muted, fontSize: 11 }}>صفحة {item.pageNumber}</Text></View>
        <QuranText numberOfLines={3} style={{ color: palette.text, fontFamily: font.fontFamily, fontSize: 24, lineHeight: 44, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'auto' : 'right' }}>{item.text}</QuranText>
      </Pressable>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { width: '100%', maxWidth: 740, alignSelf: 'center', padding: 20, paddingBottom: 32 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontFamily: 'ReaderNaskh', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const } }) }, result: { minHeight: 80, padding: 16, marginBottom: 12, borderRadius: 18, borderWidth: 1, gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, empty: { padding: 28, textAlign: 'center', gap: 12 } });
