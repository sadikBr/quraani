import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '../quran-reader/components/ui/library-chrome';
import { CheckMark } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape } from '../quran-reader/design';
import { startChoices, filterStartChoices } from './start-point';
import type { PlanIndex } from './engine';
import { arabicNumber } from './presentation';
import { sheet } from './components';

export function SurahSelectionSheet({ index, selected, onSave, onClose }: { index: PlanIndex; selected: number[]; onSave: (surahs: number[]) => void; onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const [draft, setDraft] = useState(selected), [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const choices = useMemo(() => startChoices(index, 'surah'), [index]);
  const filtered = useMemo(() => filterStartChoices(choices, index, query), [choices, index, query]);
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={{ height: '92%', width: '100%', maxWidth: readerLayout.maxWidth, backgroundColor: p.background, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: p.border }} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[sheet.grabber, { backgroundColor: p.border }]} />
          <View style={{ padding: 16, paddingTop: 8, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>سور ترافقك</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>اختر سورة أو أكثر، بترتيب المصحف.</Text></View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق اختيار السور" onPress={onClose} hitSlop={4} style={({ pressed }) => [sheet.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}><ReaderIcon name="close" color={p.mutedForeground} size={18} /></Pressable>
            </View>
            <LibrarySearch palette={p} value={query} onChange={setQuery} label="البحث عن سورة" placeholder="اسم السورة أو رقمها" />
          </View>
          <FlatList data={filtered} keyExtractor={item => String(item.number)} extraData={draft} keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>لا توجد سورة بهذا الاسم أو الرقم.</Text>}
            renderItem={({ item, index: position }) => {
              const checked = draft.includes(item.number);
              const first = position === 0, last = position === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={index.surahNames[item.number]} accessibilityState={{ checked }} aria-checked={checked}
                onPress={() => setDraft(items => checked ? items.filter(n => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => [sheet.row, { gap: 14, borderColor: p.border, backgroundColor: checked || pressed ? p.accent : p.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 28 }}>{arabicNumber(item.number)}</Text><Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '600' : '400', flex: 1 }}>{index.surahNames[item.number]}</Text>
                <CheckMark checked={checked} />
              </Pressable>;
            }} />
          <View style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }}><ReaderButton palette={p} selected disabled={!draft.length} onPress={() => onSave([...draft].sort((a, b) => a - b))}>{`اعتماد الاختيار · ${arabicNumber(draft.length)}`}</ReaderButton></View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
