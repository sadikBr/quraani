import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerLayout, readerShape } from '../quran-reader/design';
import type { PlanIndex } from './engine';
import type { PlanStart } from './types';
import { arabicNumber } from './presentation';
import { filterStartChoices, resolvePlanStart, startAtPosition, startChoices } from './start-point';

const modes: { kind: PlanStart['kind']; label: string; icon: ReaderIconName }[] = [
  { kind: 'page', label: 'صفحة', icon: 'copy' },
  { kind: 'surah', label: 'سورة', icon: 'book' },
  { kind: 'hizb', label: 'حزب', icon: 'index' },
];
const names = { page: 'الصفحة', surah: 'السورة', hizb: 'الحزب' };

export function StartPointPicker({ index, value, onChange, onCurrentPosition }: {
  index: PlanIndex; value: PlanStart; onChange: (start: PlanStart) => void; onCurrentPosition: () => void;
}) {
  const { palette: p } = useReadingPreferences();
  const [open, setOpen] = useState(false);
  let position: number | undefined;
  try { position = resolvePlanStart(index, value); } catch { /* Keep an invalid choice visible until the user corrects it. */ }
  const ayah = position === undefined ? undefined : index.ayahs[position];
  return <View style={{ gap: 14 }}>
    <View accessibilityRole="radiogroup" accessibilityLabel="اختيار البداية حسب" style={s.modes}>
      {modes.map(mode => {
        const selected = value.kind === mode.kind;
        return <Pressable key={mode.kind} accessibilityRole="radio" accessibilityLabel={`البداية من ${mode.label}`} accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => onChange(startAtPosition(index, mode.kind, position ?? 0))}
          style={({ pressed }) => [s.mode, { borderColor: selected ? p.accent : p.border, backgroundColor: selected ? p.accentSoft : p.paper, opacity: pressed ? 0.65 : 1 }]}>
          <ReaderIcon name={mode.icon} size={19} color={selected ? p.accent : p.muted} />
          <Text style={{ color: selected ? p.accent : p.muted, fontSize: 15, fontWeight: selected ? '600' : '400' }}>{mode.label}</Text>
        </Pressable>;
      })}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`تغيير ${names[value.kind]}: ${ayah ? `${index.surahNames[ayah.surahNumber]}، الصفحة ${ayah.pageNumber}، الآية ${ayah.ayahNumber}` : 'اختر موضع البداية'}`}
      onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={({ pressed }) => [s.preview, { borderColor: pressed ? p.accent : p.border, backgroundColor: p.background }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View style={s.row}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: p.accent }} /><Text style={{ color: p.muted, fontSize: 12 }}>تبدأ رحلتك من هنا</Text></View>
        <Text style={{ color: p.accent, fontSize: 12 }}>{names[value.kind]} {arabicNumber(value.number)}</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 3, paddingVertical: 12 }}>
        <ReaderIcon name="book" color={p.ornament} size={31} strokeWidth={1.3} />
        <Text style={{ color: p.text, fontSize: 28, fontWeight: '600', textAlign: 'center' }}>{ayah ? index.surahNames[ayah.surahNumber] : 'اختر بداية القراءة'}</Text>
        {ayah && <Text style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>الآية {arabicNumber(ayah.ayahNumber)} · صفحة {arabicNumber(ayah.pageNumber)}</Text>}
      </View>
      <View style={[s.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 12 }]}>
        <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>اختيار {names[value.kind]}</Text><ReaderIcon name="chevron" size={18} color={p.accent} />
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="استخدام موضع القراءة المحفوظ" onPress={onCurrentPosition}
      style={({ pressed }) => [s.saved, { opacity: pressed ? 0.6 : 1 }]}>
      <ReaderIcon name="bookmark" size={18} color={p.accent} /><Text style={{ color: p.accent, fontSize: 13 }}>أو تابع من موضعك المحفوظ</Text>
    </Pressable>
    {open && <StartPointSheet index={index} value={value} onClose={() => setOpen(false)} onSelect={start => { onChange(start); setOpen(false); }} />}
  </View>;
}

function StartPointSheet({ index, value, onClose, onSelect }: { index: PlanIndex; value: PlanStart; onClose: () => void; onSelect: (start: PlanStart) => void }) {
  const { palette: p } = useReadingPreferences();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const close = useRef<View>(null);
  const choices = useMemo(() => startChoices(index, value.kind), [index, value.kind]);
  const filtered = useMemo(() => filterStartChoices(choices, index, query), [choices, index, query]);
  const select = (number: number) => { Keyboard.dismiss(); onSelect({ kind: value.kind, number }); };
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'rgba(0, 15, 13, 0.58)' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق اختيار البداية" onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.sheet, { backgroundColor: p.paper }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={s.sheetHeader}>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 24, fontWeight: '600' }}>اختر {names[value.kind]}</Text>
                <Text style={{ color: p.muted, fontSize: 12 }}>بداية تناسب رحلتك مع القرآن</Text></View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} style={[s.close, { backgroundColor: p.background }]}><ReaderIcon name="close" color={p.muted} /></Pressable>
            </View>
            <View style={[s.search, { backgroundColor: p.background, borderColor: searchFocused ? p.accent : p.border }]}>
              <ReaderIcon name="search" color={p.muted} size={20} />
              <TextInput accessibilityLabel={`البحث عن ${names[value.kind]}`} placeholder={value.kind === 'surah' ? 'اسم السورة أو رقمها' : `رقم ${names[value.kind]} أو اسم السورة`} placeholderTextColor={p.muted}
                value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} autoCorrect={false} returnKeyType="search"
                style={[s.input, { color: p.text }]} />
              {!!query && <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => setQuery('')} style={s.clear}><ReaderIcon name="close" color={p.muted} size={18} /></Pressable>}
            </View>
            <Text style={{ color: p.muted, fontSize: 11 }}>{query ? `${arabicNumber(filtered.length)} نتيجة` : `${arabicNumber(choices.length)} ${value.kind === 'surah' ? 'سورة' : value.kind === 'hizb' ? 'حزبًا' : 'صفحة'} · اختر موضع البداية`}</Text>
          </View>
          <FlatList data={filtered} keyExtractor={choice => String(choice.number)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 8 }}
            ListEmptyComponent={<Text style={{ color: p.muted, fontSize: 16, paddingVertical: 32, textAlign: 'center' }}>لا توجد نتائج. جرّب رقمًا آخر أو اسم السورة.</Text>}
            renderItem={({ item }) => {
              const ayah = index.ayahs[item.position], selected = item.number === value.number;
              const title = value.kind === 'surah' ? index.surahNames[ayah.surahNumber] : `${names[value.kind]} ${arabicNumber(item.number)}`;
              const detail = value.kind === 'surah' ? `صفحة ${arabicNumber(ayah.pageNumber)}` : `${index.surahNames[ayah.surahNumber]} · الآية ${arabicNumber(ayah.ayahNumber)}`;
              return <Pressable accessibilityRole="button" accessibilityLabel={`${title}، ${detail}`} accessibilityState={{ selected }} onPress={() => select(item.number)}
                style={({ pressed }) => [s.choice, { backgroundColor: selected || pressed ? p.accentSoft : p.paper, borderColor: selected ? p.accent : p.border }]}>
                <View style={[s.number, { backgroundColor: p.background }]}><Text style={{ color: p.accent, fontSize: 16, textAlign: 'center' }}>{arabicNumber(item.number)}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.text, fontSize: 19, fontWeight: '600' }}>{title}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{detail}</Text></View>
                <ReaderIcon name={selected ? 'check' : 'chevron'} color={selected ? p.accent : p.muted} size={19} />
              </Pressable>;
            }} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: readerShape.control, paddingVertical: 8 },
  preview: { borderWidth: 1, borderRadius: readerShape.card, padding: 16, gap: 4 },
  saved: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, height: '88%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, overflow: 'hidden' },
  sheetHeader: { padding: 20, paddingBottom: 12, gap: 12 },
  close: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: 'ReaderNaskh', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ web: { outlineWidth: 0 } }) },
  clear: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  choice: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: readerShape.card },
  number: { width: 42, height: 46, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
