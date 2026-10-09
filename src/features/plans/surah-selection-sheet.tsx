import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape } from '../quran-reader/design';
import { startChoices, filterStartChoices } from './start-point';
import type { PlanIndex } from './engine';
import { arabicNumber } from './presentation';

export function SurahSelectionSheet({ index, selected, onSave, onClose }: { index: PlanIndex; selected: number[]; onSave: (surahs: number[]) => void; onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const [draft, setDraft] = useState(selected), [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const choices = useMemo(() => startChoices(index, 'surah'), [index]);
  const filtered = useMemo(() => filterStartChoices(choices, index, query), [choices, index, query]);
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'rgba(0,15,13,0.6)' }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} style={{ height: '92%', width: '100%', maxWidth: readerLayout.maxWidth, backgroundColor: p.paper, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet }} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={{ padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 25, fontWeight: '600' }}>سور ترافقك</Text><Text style={{ color: p.muted, fontSize: 12 }}>اختر سورة أو أكثر، بترتيب المصحف.</Text></View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق اختيار السور" onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ReaderIcon name="close" color={p.text} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: readerShape.control, backgroundColor: p.background, borderWidth: 1, borderColor: p.border }}><ReaderIcon name="search" color={p.muted} size={20} />
              <TextInput accessibilityLabel="البحث عن سورة" placeholder="اسم السورة أو رقمها" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} autoCorrect={false}
                style={{ flex: 1, minWidth: 0, minHeight: 48, color: p.text, fontFamily: 'ReaderNaskh', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' }} />
            </View>
          </View>
          <FlatList data={filtered} keyExtractor={item => String(item.number)} keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 8 }}
            ListEmptyComponent={<Text style={{ color: p.muted, textAlign: 'center', padding: 20 }}>لا توجد سورة بهذا الاسم أو الرقم.</Text>}
            renderItem={({ item }) => {
              const checked = draft.includes(item.number);
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={index.surahNames[item.number]} accessibilityState={{ checked }} aria-checked={checked}
                onPress={() => setDraft(items => checked ? items.filter(n => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 68, borderRadius: readerShape.control, borderWidth: 1, borderColor: checked ? p.accent : p.border, backgroundColor: checked || pressed ? p.accentSoft : p.paper })}>
                <Text style={{ color: p.muted, fontSize: 14, minWidth: 28 }}>{arabicNumber(item.number)}</Text><Text style={{ color: p.text, fontSize: 19, flex: 1 }}>{index.surahNames[item.number]}</Text>
                <View style={{ width: 24, height: 24, borderRadius: readerShape.control, borderWidth: 1, borderColor: checked ? p.accent : p.border, backgroundColor: checked ? p.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{checked && <ReaderIcon name="check" color={p.paper} size={16} />}</View>
              </Pressable>;
            }} />
          <View style={{ padding: 20, borderTopWidth: 1, borderColor: p.border }}><ReaderButton palette={p} selected disabled={!draft.length} onPress={() => onSave([...draft].sort((a, b) => a - b))}>{`اعتماد الاختيار · ${arabicNumber(draft.length)}`}</ReaderButton></View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
