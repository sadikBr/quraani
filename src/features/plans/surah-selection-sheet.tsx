import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '../quran-reader/components/ui/library-chrome';
import { CheckMark } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape } from '../quran-reader/design';
import { startChoices, filterStartChoices } from './start-point';
import type { PlanIndex } from './engine';
import { formatNumber, t } from '@/i18n';
import { sheet } from './components';

export function SurahSelectionSheet({ index, selected, onSave, onClose }: { index: PlanIndex; selected: number[]; onSave: (surahs: number[]) => void; onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const [draft, setDraft] = useState(selected), [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const choices = useMemo(() => startChoices(index, 'surah'), [index]);
  const filtered = useMemo(() => filterStartChoices(choices, index, query), [choices, index, query]);
  const swipe = useSwipeToClose(onClose);
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={onClose} style={[{ height: '92%', width: '100%', maxWidth: readerLayout.maxWidth, backgroundColor: p.background, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[sheet.grabber, { backgroundColor: p.border }]} />
          <View onLayout={swipe.onHeaderLayout} style={{ padding: 16, paddingTop: 8, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('plans.surahSheet.title')}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('plans.surahSheet.subtitle')}</Text></View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('plans.surahSheet.close')} onPress={onClose} hitSlop={4} style={({ pressed }) => [sheet.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}><ReaderIcon name="close" color={p.mutedForeground} size={18} /></Pressable>
            </View>
            <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('plans.surahSheet.searchLabel')} placeholder={t('plans.surahSheet.searchPlaceholder')} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={item => String(item.number)} extraData={draft} keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('plans.surahSheet.empty')}</Text>}
            renderItem={({ item, index: position }) => {
              const checked = draft.includes(item.number);
              const first = position === 0, last = position === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={index.surahNames[item.number]} accessibilityState={{ checked }} aria-checked={checked}
                onPress={() => setDraft(items => checked ? items.filter(n => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => [sheet.row, { gap: 14, borderColor: p.border, backgroundColor: checked || pressed ? p.accent : p.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 28 }}>{formatNumber(item.number)}</Text><Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '600' : '400', flex: 1 }}>{index.surahNames[item.number]}</Text>
                <CheckMark checked={checked} />
              </Pressable>;
            }} /></GestureDetector>
          <View style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }}><ReaderButton palette={p} selected disabled={!draft.length} onPress={() => onSave([...draft].sort((a, b) => a - b))}>{t('plans.surahSheet.confirm', { selected: draft.length })}</ReaderButton></View>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}
