import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { LibrarySearch } from '../quran-reader/components/ui/library-chrome';
import { CheckMark } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { startChoices, filterStartChoices } from './start-point';
import type { PlanIndex } from './engine';
import { t } from '@/i18n';
import { sheet } from './components';

/** Choosing the surahs of a recurring reading: each surah's number in a star, its name, a check. */
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
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={onClose} style={[s.sheet, { backgroundColor: p.background, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View onLayout={swipe.onHeaderLayout} style={sheet.header}>
            <SheetGrabber palette={p} />
            <SheetTitle title={t('plans.surahSheet.title')} subtitle={t('plans.surahSheet.subtitle')} palette={p} onClose={onClose} closeLabel={t('plans.surahSheet.close')} closeRef={close} />
            <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('plans.surahSheet.searchLabel')} placeholder={t('plans.surahSheet.searchPlaceholder')} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={item => String(item.number)} extraData={draft} keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('plans.surahSheet.empty')}</Text>}
            renderItem={({ item, index: position }) => {
              const checked = draft.includes(item.number);
              const first = position === 0, last = position === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={index.surahNames[item.number]} accessibilityState={{ checked }} aria-checked={checked}
                onPress={() => setDraft(items => checked ? items.filter(n => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => [sheet.row, { borderColor: p.border, backgroundColor: pressed ? p.accent : checked ? withAlpha(p.ornament, 0.08) : p.card, borderTopWidth: first ? StyleSheet.hairlineWidth : 0, borderBottomWidth: StyleSheet.hairlineWidth }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Medallion value={item.number} size={38} palette={p} current={checked} />
                <Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '700' : '500', flex: 1 }}>{index.surahNames[item.number]}</Text>
                <CheckMark checked={checked} palette={p} />
              </Pressable>;
            }} /></GestureDetector>
          <View style={[sheet.footer, { borderColor: p.border }]}><ReaderButton palette={p} selected disabled={!draft.length} onPress={() => onSave([...draft].sort((a, b) => a - b))}>{t('plans.surahSheet.confirm', { selected: draft.length })}</ReaderButton></View>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

const s = StyleSheet.create({
  sheet: { height: '92%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
});
