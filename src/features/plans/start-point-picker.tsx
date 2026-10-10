import { SurahName } from '../quran-reader/components/ui/surah-name';
import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerLayout, readerShape } from '../quran-reader/design';
import type { PlanIndex } from './engine';
import { sheet } from './components';
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
          style={({ pressed }) => [s.mode, { borderColor: selected ? p.primary : p.input, backgroundColor: selected ? p.primary : pressed ? p.accent : p.background }, !selected && readerElevation(1, p)]}>
          <ReaderIcon name={mode.icon} size={16} color={selected ? p.primaryForeground : p.foreground} />
          <Text style={{ color: selected ? p.primaryForeground : p.foreground, fontSize: 14, fontWeight: '500' }}>{mode.label}</Text>
        </Pressable>;
      })}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`تغيير ${names[value.kind]}: ${ayah ? `${index.surahNames[ayah.surahNumber]}، الصفحة ${ayah.pageNumber}، الآية ${ayah.ayahNumber}` : 'اختر موضع البداية'}`}
      onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={({ pressed }) => [s.preview, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>تبدأ رحلتك من هنا</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{names[value.kind]} {arabicNumber(value.number)}</Text>
      </View>
      <View style={{ gap: 2, paddingVertical: 6 }}>
        {ayah ? <SurahName number={ayah.surahNumber} name={index.surahNames[ayah.surahNumber]} size={40} color={p.ornament} /> : <Text style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>اختر بداية القراءة</Text>}
        {ayah && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>الآية {arabicNumber(ayah.ayahNumber)} · صفحة {arabicNumber(ayah.pageNumber)}</Text>}
      </View>
      <View style={[s.row, { justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 12 }]}>
        <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>اختيار {names[value.kind]}</Text><ReaderIcon name="chevron" size={16} color={p.mutedForeground} />
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="استخدام موضع القراءة المحفوظ" onPress={onCurrentPosition}
      style={({ pressed }) => [s.saved, { opacity: pressed ? 0.6 : 1 }]}>
      <ReaderIcon name="bookmark" size={16} color={p.primary} /><Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>أو تابع من موضعك المحفوظ</Text>
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
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق اختيار البداية" onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.sheet, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[sheet.grabber, { backgroundColor: p.border }]} />
          <View style={s.sheetHeader}>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>اختر {names[value.kind]}</Text>
                <Text style={{ color: p.mutedForeground, fontSize: 13 }}>بداية تناسب رحلتك مع القرآن</Text></View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} hitSlop={4} style={({ pressed }) => [sheet.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}><ReaderIcon name="close" color={p.mutedForeground} size={18} /></Pressable>
            </View>
            <View style={[s.search, { backgroundColor: p.background, borderColor: searchFocused ? p.ring : p.input }, readerElevation(1, p)]}>
              <ReaderIcon name="search" color={p.mutedForeground} size={18} />
              <TextInput accessibilityLabel={`البحث عن ${names[value.kind]}`} placeholder={value.kind === 'surah' ? 'اسم السورة أو رقمها' : `رقم ${names[value.kind]} أو اسم السورة`} placeholderTextColor={p.mutedForeground}
                value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} autoCorrect={false} returnKeyType="search"
                style={[s.input, { color: p.foreground }]} />
              {!!query && <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => setQuery('')} style={s.clear}><ReaderIcon name="close" color={p.mutedForeground} size={18} /></Pressable>}
            </View>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{query ? `${arabicNumber(filtered.length)} نتيجة` : `${arabicNumber(choices.length)} ${value.kind === 'surah' ? 'سورة' : value.kind === 'hizb' ? 'حزبًا' : 'صفحة'} · اختر موضع البداية`}</Text>
          </View>
          <FlatList data={filtered} keyExtractor={choice => String(choice.number)} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            initialNumToRender={12} maxToRenderPerBatch={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, fontSize: 15, paddingVertical: 32, textAlign: 'center' }}>لا توجد نتائج. جرّب رقمًا آخر أو اسم السورة.</Text>}
            renderItem={({ item, index: position }) => {
              const ayah = index.ayahs[item.position], selected = item.number === value.number;
              const first = position === 0, last = position === filtered.length - 1;
              const title = value.kind === 'surah' ? index.surahNames[ayah.surahNumber] : `${names[value.kind]} ${arabicNumber(item.number)}`;
              const detail = value.kind === 'surah' ? `صفحة ${arabicNumber(ayah.pageNumber)}` : `${index.surahNames[ayah.surahNumber]} · الآية ${arabicNumber(ayah.ayahNumber)}`;
              return <Pressable accessibilityRole="button" accessibilityLabel={`${title}، ${detail}`} accessibilityState={{ selected }} onPress={() => select(item.number)}
                style={({ pressed }) => [sheet.row, { borderColor: p.border, backgroundColor: selected || pressed ? p.accent : p.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 28 }}>{arabicNumber(item.number)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: selected ? '600' : '400' }}>{title}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{detail}</Text></View>
                <ReaderIcon name={selected ? 'check' : 'chevron'} color={selected ? p.primary : p.mutedForeground} size={18} />
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
  mode: { flex: 1, minWidth: 0, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: readerShape.control, paddingVertical: 6 },
  preview: { borderWidth: 1, borderRadius: readerShape.control, padding: 16, gap: 6 },
  saved: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, height: '88%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  sheetHeader: { padding: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, minHeight: 42, fontFamily: 'UiSans', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ web: { outlineWidth: 0 } }) },
  clear: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
