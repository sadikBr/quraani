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

const tabs = [{ value: 'surah', label: 'السور' }, { value: 'juz', label: 'الأجزاء' }, { value: 'hizb', label: 'الأحزاب' }] as const;
export function IndexScreen() {
  const { content, loading, error, refresh } = useReaderContent();
  const { palette: p, dark, preferences } = useReadingPreferences();
  const font = useQuranFont();
  const list = useRef<FlatList<ReaderIndexItem>>(null);
  const [kind, setKind] = useState<IndexKind>('surah'), [query, setQuery] = useState('');
  const items = useMemo(() => content ? readerIndexItems(content.data, kind, query) : [], [content, kind, query]);
  const open = (item: ReaderIndexItem) => router.dismissTo({ pathname: '/', params: { surah: String(item.start.surahNumber), ayah: String(item.start.ayahNumber) } });
  const changeQuery = (value: string) => { setQuery(value); list.current?.scrollToOffset({ offset: 0, animated: false }); };
  const placeholder = kind === 'surah' ? 'اسم السورة أو رقمها' : kind === 'juz' ? 'رقم الجزء أو سورة بدايته' : 'رقم الحزب أو سورة بدايته';
  return <SafeAreaView style={[l.root, { backgroundColor: p.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <LibraryHeader title="فهرس القرآن" subtitle={`رواية ${RIWAYAT[preferences.riwayah].label}`} icon="index" palette={p} onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />
    <View style={l.filters}>
      <LibrarySearch value={query} onChange={changeQuery} label="البحث في الفهرس" placeholder={placeholder} palette={p} />
      <LibraryTabs options={tabs} value={kind} onChange={value => { setKind(value); changeQuery(''); }} label="أقسام الفهرس" palette={p} />
    </View>
    <FlatList ref={list} data={content ? items : []} keyExtractor={item => `${kind}:${item.number}`} style={l.list} contentContainerStyle={l.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'} showsVerticalScrollIndicator={false} initialNumToRender={12} windowSize={7}
      ListHeaderComponent={content ? <View style={l.results}><Text style={{ color: p.text, fontSize: 13, fontWeight: '600' }}>{query.trim() ? 'نتائج البحث' : 'اختر موضعًا وابدأ القراءة'}</Text><Text accessibilityLiveRegion="polite" style={{ color: p.muted, fontSize: 13 }}>{items.length} {kind === 'surah' ? 'سورة' : kind === 'juz' ? 'جزءًا' : 'حزبًا'}</Text></View> : null}
      ListEmptyComponent={!content ? loading ? <View style={l.status}><ActivityIndicator accessibilityLabel="جارٍ تحميل الفهرس" color={p.accent} /></View> : <LibraryEmpty title="تعذر فتح الفهرس" description={error ? 'تحقق من الاتصال، ثم أعد المحاولة.' : 'الفهرس غير متوفر الآن.'} icon="book" palette={p}><ReaderButton palette={p} onPress={refresh}>إعادة المحاولة</ReaderButton></LibraryEmpty>
        : <LibraryEmpty title="لا توجد نتائج" description="جرّب اسمًا أو رقمًا آخر، أو امسح البحث لعرض الفهرس كاملًا." icon="search" palette={p}><ReaderButton palette={p} onPress={() => changeQuery('')}>مسح البحث</ReaderButton></LibraryEmpty>}
      renderItem={({ item, index }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}، ${item.detail}، الصفحة ${item.pageNumber}`} accessibilityHint="افتح المصحف عند بداية الموضع" onPress={() => open(item)}
        style={({ pressed }) => [s.item, listRowFrame(index, items.length), { borderColor: p.border, backgroundColor: pressed ? p.accentSoft : p.paper }]}>
        <Text style={[s.number, { color: p.muted }]}>{item.number}</Text>
        <View style={s.name}>
          <Text accessibilityLabel={item.title} style={{ color: kind === 'surah' ? p.ornament : p.text, fontSize: 19, fontWeight: kind === 'surah' ? '400' : '600', ...(kind === 'surah' && font.loaded ? calligraphyStyle(34) : {}) }}>{kind === 'surah' && font.loaded ? surahNameGlyph(item.number) : item.title}</Text>
          <Text style={{ color: p.muted, fontSize: 13 }}>{item.detail}</Text>
        </View>
        <Text style={{ color: p.muted, fontSize: 13 }}>صفحة {item.pageNumber}</Text>
        <ReaderIcon name="chevron" color={p.muted} size={16} />
      </Pressable>} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, minHeight: 72 },
  number: { width: 28, fontSize: 13, textAlign: 'center' },
  name: { flex: 1, minWidth: 0, gap: 2 },
});
