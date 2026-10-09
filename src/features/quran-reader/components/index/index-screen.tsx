import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useWarshFont } from '../../hooks/use-warsh-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { SURAH_NAME_FONT_FAMILY } from '../../config';
import { readerIndexItems, type IndexKind, type ReaderIndexItem } from '../../utils/reader-index';
import { ReaderButton } from '../reading/reader-button';
import { QuranSeal, ReaderIcon, ScreenHeading, Segments } from '../ui/reader-chrome';

const tabs = [
  { value: 'surah', label: 'السور' }, { value: 'juz', label: 'الأجزاء' }, { value: 'hizb', label: 'الأحزاب' },
] as const;
export function IndexScreen() {
  const { height } = useWindowDimensions();
  const { content, loading, error, refresh } = useReaderContent();
  const { palette, dark } = useReadingPreferences();
  const font = useWarshFont();
  const [kind, setKind] = useState<IndexKind>('surah');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const items = useMemo(() => content ? readerIndexItems(content.data, kind, query) : [], [content, kind, query]);
  const open = (item: ReaderIndexItem) => router.dismissTo({ pathname: '/', params: {
    surah: String(item.start.surahNumber), ayah: String(item.start.ayahNumber),
  } });
  const back = () => router.dismissTo('/');
  // Web scrolls when filtering resizes the list, so only dismiss on native drags.
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <FlatList data={content ? items : []} keyExtractor={(item) => `${kind}:${item.number}`} style={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
      showsVerticalScrollIndicator={false} initialNumToRender={14} windowSize={7}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<View style={styles.top}>
        <ScreenHeading title="فهرس القرآن" subtitle="من هنا تبدأ رحلتك، آيةً بعد آية." palette={palette} onBack={back} />
        {height >= 700 && <Pressable accessibilityRole="button" accessibilityLabel="متابعة القراءة من آخر موضع" onPress={back}
          style={({ pressed }) => [styles.hero, { backgroundColor: palette.hero, opacity: pressed ? 0.9 : 1 }]}>
          <View style={styles.heroCopy}>
            <Text style={{ color: palette.heroMuted, fontSize: 11 }}>رواية ورش عن نافع</Text>
            <Text style={{ color: palette.onHero, fontSize: 23, lineHeight: 38, fontWeight: '600' }}>وقتٌ للقرآن</Text>
            <View style={styles.resume}><Text style={{ color: palette.onHero, fontSize: 13 }}>متابعة القراءة</Text><ReaderIcon name="chevron" color={palette.onHero} size={16} /></View>
          </View>
          <View style={styles.heroArt}><QuranSeal color="#C7AF77" size={96} /></View>
        </Pressable>}
        <Segments options={tabs} value={kind} onChange={setKind} palette={palette} />
        {kind === 'surah' && <View style={[styles.search, { backgroundColor: palette.paper, borderColor: searchFocused ? palette.accent : palette.border }]}>
          <ReaderIcon name="search" color={searchFocused ? palette.accent : palette.muted} size={20} />
          <TextInput accessibilityLabel="البحث باسم السورة" placeholder="ابحث عن سورة…" value={query}
            onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholderTextColor={palette.muted} autoCorrect={false} returnKeyType="search"
            style={[styles.input, { color: palette.text }]} />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => setQuery('')} style={styles.clear}><ReaderIcon name="close" color={palette.muted} size={18} /></Pressable>}
        </View>}
        {content && <View style={styles.listHeading}>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{kind === 'surah' ? 'سور القرآن الكريم' : kind === 'juz' ? 'أجزاء القرآن الكريم' : 'أحزاب القرآن الكريم'}</Text>
          <Text accessibilityLiveRegion="polite" style={{ color: palette.muted, fontSize: 12 }}>{items.length} {kind === 'surah' ? 'سورة' : kind === 'juz' ? 'جزءًا' : 'حزبًا'}</Text>
        </View>}
      </View>}
      ListEmptyComponent={<View style={styles.status}>
        {!content ? loading ? <><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.muted }}>جارٍ تحميل الفهرس…</Text></> : <>
          <ReaderIcon name="book" color={palette.ornament} size={32} />
          <Text accessibilityRole="alert" style={[styles.statusText, { color: palette.muted }]}>{error ? 'تعذر تحميل الفهرس. تحقق من الاتصال وأعد المحاولة.' : 'الفهرس غير متوفر.'}</Text>
          <ReaderButton palette={palette} onPress={refresh}>إعادة المحاولة</ReaderButton>
        </> : <><ReaderIcon name="search" color={palette.muted} size={30} /><Text style={{ color: palette.text, fontSize: 17, fontWeight: '600' }}>لا توجد نتائج</Text><Text style={[styles.statusText, { color: palette.muted }]}>جرّب اسم سورة آخر أو امسح البحث.</Text><ReaderButton palette={palette} onPress={() => setQuery('')}>مسح البحث</ReaderButton></>}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}، ${item.detail}، الصفحة ${item.pageNumber}`}
        accessibilityHint="افتح المصحف عند بداية الموضع" onPress={() => open(item)}
        style={({ pressed }) => [styles.item, { borderColor: palette.border, backgroundColor: pressed ? palette.accentSoft : palette.paper }]}>
        <View style={[styles.number, { borderColor: palette.border, backgroundColor: palette.background }]}><Text style={{ color: palette.ornament, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{item.number}</Text></View>
        <View style={styles.name}>
          <Text accessibilityLabel={item.title} style={{ color: palette.text, fontSize: kind === 'surah' && font.loaded ? 31 : 19,
            ...(kind === 'surah' && font.loaded ? { fontFamily: SURAH_NAME_FONT_FAMILY, lineHeight: 43 } : {}) }}>
            {kind === 'surah' && font.loaded ? String(item.number).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : item.title}
          </Text>
          <Text style={{ color: palette.muted, fontSize: 12 }}>{item.detail}</Text>
        </View>
        <View style={styles.page}><Text style={{ color: palette.muted, fontSize: 10 }}>صفحة</Text><Text style={{ color: palette.accent, fontSize: 16, fontWeight: '600' }}>{item.pageNumber}</Text></View>
        <ReaderIcon name="chevron" color={palette.muted} size={15} />
      </Pressable>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, top: { paddingTop: 16, paddingBottom: 12, gap: 20 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 22, padding: 22, overflow: 'hidden' },
  heroCopy: { flex: 1, gap: 4 }, heroArt: { marginStart: 10, opacity: 0.85 }, resume: { flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 9 },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: 'ReaderNaskh', fontSize: 16, textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const } }), writingDirection: 'rtl' },
  clear: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  number: { width: 40, height: 44, borderRadius: 13, borderWidth: 1, justifyContent: 'center' }, page: { alignItems: 'center', minWidth: 30, gap: 2 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { flex: 1, width: '100%', maxWidth: 740, alignSelf: 'center' }, listContent: { paddingHorizontal: 22, paddingBottom: 24 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderWidth: 1, borderRadius: 18, minHeight: 88, marginBottom: 8 },
  name: { flex: 1, gap: 2 }, status: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 14 }, statusText: { textAlign: 'center', fontSize: 14, lineHeight: 24 },
});
