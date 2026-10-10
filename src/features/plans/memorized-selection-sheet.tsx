import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerLayout, readerShape } from '../quran-reader/design';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { LibrarySearch, LibraryTabs } from '../quran-reader/components/ui/library-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { coversSpan, mergeSpans, spanCount, subtractSpans } from './memorization';
import type { AyahSpan } from './types';
import { PlanField, PlanNotice } from './components';
import { arabicNumber } from './presentation';

type SelectionTab = 'surahs' | 'juzs' | 'hizbs' | 'quarters' | 'ayahs';
export function MemorizedSelectionSheet({ index, selected, onSave, onClose, busy = false, error }: {
  index: PlanIndex; selected: AyahSpan[]; onSave: (ranges: AyahSpan[]) => void; onClose: () => void; busy?: boolean; error?: string;
}) {
  const { palette: p } = useReadingPreferences();
  const [draft, setDraft] = useState(selected), [tab, setTab] = useState<SelectionTab>('surahs'), [query, setQuery] = useState('');
  const [fromSurah, setFromSurah] = useState('1'), [fromAyah, setFromAyah] = useState('1');
  const [toSurah, setToSurah] = useState('1'), [toAyah, setToAyah] = useState('7');
  const close = useRef<View>(null), list = useRef<FlatList>(null);
  const options = useMemo(() => {
    if (tab === 'ayahs') return [];
    if (tab === 'surahs') return Object.entries(index.surahNames).map(([number, label]) => ({ number: Number(number), label,
      start: index.ayahs.findIndex(a => a.surahNumber === Number(number)), end: index.ayahs.findLastIndex(a => a.surahNumber === Number(number)) + 1 }));
    const bounds = tab === 'juzs' ? index.juzs : tab === 'hizbs' ? index.hizbs : index.quarters;
    return bounds.slice(0, -1).map((start, i) => ({ number: i + 1, start, end: bounds[i + 1],
      label: tab === 'juzs' ? `الجزء ${arabicNumber(i + 1)}` : tab === 'hizbs' ? `الحزب ${arabicNumber(i + 1)}` : `الحزب ${arabicNumber(Math.floor(i / 4) + 1)} · الربع ${arabicNumber(i % 4 + 1)}` }));
  }, [index, tab]);
  const filtered = useMemo(() => {
    const needle = normalizeArabicSearch(query);
    return options.filter(o => !needle || normalizeArabicSearch(`${o.label} ${o.number} ${ayahRangeLabel(index, o.start, o.end)}`).includes(needle));
  }, [options, query, index]);
  const number = (s: string) => Number(normalizeArabicSearch(s));
  const customStart = index.ayahs.findIndex(a => a.surahNumber === number(fromSurah) && a.ayahNumber === number(fromAyah));
  const customEnd = index.ayahs.findIndex(a => a.surahNumber === number(toSurah) && a.ayahNumber === number(toAyah)) + 1;
  const validRange = customStart >= 0 && customEnd > customStart;
  const customRange = { start: customStart, end: customEnd };
  const toggle = ({ start, end }: AyahSpan) => setDraft(items => coversSpan(items, { start, end }) ? subtractSpans(items, [{ start, end }]) : mergeSpans([...items, { start, end }]));
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'rgba(0,15,13,0.6)' }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={() => { if (!busy) onClose(); }} style={{ height: '94%', width: '100%', maxWidth: readerLayout.maxWidth, backgroundColor: p.paper, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet }} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={{ padding: 20, paddingBottom: 10, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 25, fontWeight: '600' }}>ما استقرّ في صدرك</Text><Text style={{ color: p.muted, fontSize: 12 }}>حدّد ما تحفظه، لنبني رحلتك مما تبقّى.</Text></View><Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق اختيار المحفوظ" disabled={busy} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ReaderIcon name="close" color={p.text} /></Pressable></View>
            <LibraryTabs palette={p} label="اختيار المحفوظ حسب" value={tab} onChange={value => { setTab(value as SelectionTab); setQuery(''); list.current?.scrollToOffset({ offset: 0, animated: false }); }} options={[{ value: 'surahs', label: 'سور' }, { value: 'juzs', label: 'أجزاء' }, { value: 'hizbs', label: 'أحزاب' }, { value: 'quarters', label: 'أرباع' }, { value: 'ayahs', label: 'آيات' }]} />
            {tab !== 'ayahs' && <LibrarySearch palette={p} value={query} onChange={setQuery} placeholder="ابحث بالاسم أو الرقم" label="البحث في مقاطع الحفظ" />}
          </View>
          <FlatList ref={list} data={filtered} keyExtractor={item => String(item.number)} extraData={draft} keyboardShouldPersistTaps="handled" initialNumToRender={10} windowSize={5} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 8 }}
            ListHeaderComponent={tab === 'ayahs' ? <View style={{ gap: 14, paddingTop: 12 }}>
              <Text style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>مقطع محدد بالآيات</Text>
              <Text style={{ color: p.muted, fontSize: 12 }}>أدخل رقم السورة والآية عند بداية المقطع ونهايته.</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><PlanField label="من السورة" value={fromSurah} onChange={setFromSurah} numeric /></View><View style={{ flex: 1 }}><PlanField label="من الآية" value={fromAyah} onChange={setFromAyah} numeric /></View></View>
              <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><PlanField label="إلى السورة" value={toSurah} onChange={setToSurah} numeric /></View><View style={{ flex: 1 }}><PlanField label="إلى الآية" value={toAyah} onChange={setToAyah} numeric /></View></View>
              <View style={{ padding: 14, backgroundColor: p.background, borderRadius: readerShape.control }}><Text style={{ color: validRange ? p.accent : p.warning, fontSize: 14 }}>{validRange ? ayahRangeLabel(index, customStart, customEnd) : 'تحقق من أرقام السور والآيات وترتيب المقطع.'}</Text></View>
              <ReaderButton palette={p} disabled={!validRange || busy} onPress={() => toggle(customRange)}>{validRange && coversSpan(draft, customRange) ? 'إزالة المقطع من المحفوظ' : 'إضافة المقطع إلى المحفوظ'}</ReaderButton>
              <Text style={{ color: p.muted, fontSize: 12 }}>يمكن إضافة عدة مقاطع. الاختيارات المتداخلة تُحتسب مرة واحدة.</Text>
            </View> : null}
            ListEmptyComponent={tab !== 'ayahs' ? <Text style={{ color: p.muted, padding: 20, textAlign: 'center' }}>لا توجد نتائج.</Text> : null}
            renderItem={({ item }) => {
              const checked = coversSpan(draft, item), partial = !checked && draft.some(r => r.start < item.end && r.end > item.start);
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: partial ? 'mixed' : checked }} aria-checked={partial ? 'mixed' : checked} disabled={busy} onPress={() => toggle(item)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 70, borderRadius: readerShape.control, borderWidth: 1, borderColor: checked ? p.accent : p.border, backgroundColor: checked || pressed ? p.accentSoft : p.paper })}>
                <View style={{ flex: 1 }}><Text style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>{item.label}</Text><Text style={{ color: p.muted, fontSize: 11 }}>{tab === 'surahs' ? `${arabicNumber(item.end - item.start)} آية${partial ? ' · محفوظة جزئيًا' : ''}` : ayahRangeLabel(index, item.start, item.end)}</Text></View>
                <View style={{ width: 24, height: 24, borderRadius: readerShape.detail, borderWidth: 1, borderColor: checked || partial ? p.accent : p.border, backgroundColor: checked ? p.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{checked ? <ReaderIcon name="check" color={p.paper} size={16} /> : partial ? <View style={{ width: 10, height: 2, backgroundColor: p.accent }} /> : null}</View>
              </Pressable>;
            }} />
          <View style={{ padding: 20, gap: 8, borderTopWidth: 1, borderColor: p.border }}>
            <PlanNotice message={error} /><Text accessibilityLiveRegion="polite" style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(spanCount(draft))} آية محفوظة · تُستبعد من جدول الحفظ</Text>
            <ReaderButton palette={p} selected disabled={busy} onPress={() => onSave(draft)}>{busy ? 'جارٍ حفظ التغييرات…' : 'اعتماد المحفوظ'}</ReaderButton>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
