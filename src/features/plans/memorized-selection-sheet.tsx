import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { LibrarySearch, LibraryTabs } from '../quran-reader/components/ui/library-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { coversSpan, mergeSpans, spanCount, subtractSpans } from './memorization';
import type { AyahSpan } from './types';
import { PlanField, PlanNotice, sheet } from './components';
import { ConfirmDialog } from '@/features/halaqat/confirm-dialog';
import { t } from '@/i18n';

type SelectionTab = 'surahs' | 'juzs' | 'hizbs' | 'quarters' | 'ayahs';
/** The sheet's own words: choosing what is memorized, one's own or a student's. */
const sheetTexts = {
  memorized: {
    title: () => t('memorization.selection.title'), subtitle: () => t('memorization.selection.subtitle'), close: () => t('memorization.selection.close'),
    tabsLabel: () => t('memorization.selection.tabsLabel'), add: () => t('memorization.selection.custom.add'), remove: () => t('memorization.selection.custom.remove'),
    partial: (count: number) => t('memorization.selection.partial', { count }), total: (count: number) => t('memorization.selection.total', { count }),
    confirm: () => t('memorization.selection.confirm'),
  },
  /** A halaqa's student: what they had memorized when they joined. */
  student: {
    title: () => t('halaqat.known.title'), subtitle: () => t('halaqat.known.subtitle'), close: () => t('halaqat.known.close'),
    tabsLabel: () => t('halaqat.known.tabsLabel'), add: () => t('halaqat.known.add'), remove: () => t('halaqat.known.remove'),
    partial: (count: number) => t('halaqat.known.partial', { count }), total: (count: number) => t('halaqat.known.total', { count }),
    confirm: () => t('halaqat.known.confirm'),
  },
};

/** `confirmRemoval`: the sheet edits a kept record, so taking ayahs out of it is asked about first. */
export function MemorizedSelectionSheet({ index, selected, onSave, onClose, busy = false, error, purpose = 'memorized', confirmRemoval = false }: {
  index: PlanIndex; selected: AyahSpan[]; onSave: (ranges: AyahSpan[]) => void; onClose: () => void; busy?: boolean; error?: string; purpose?: keyof typeof sheetTexts; confirmRemoval?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  const texts = sheetTexts[purpose];
  const [draft, setDraft] = useState(selected), [tab, setTab] = useState<SelectionTab>('surahs'), [query, setQuery] = useState('');
  const [fromSurah, setFromSurah] = useState('1'), [fromAyah, setFromAyah] = useState('1');
  const [toSurah, setToSurah] = useState('1'), [toAyah, setToAyah] = useState('7');
  const close = useRef<View>(null), list = useRef<FlatList>(null);
  /** How many ayahs of the record the draft leaves out, while the user is asked about it. */
  const [removing, setRemoving] = useState(0);
  const save = () => {
    const removed = confirmRemoval ? spanCount(subtractSpans(mergeSpans(selected), mergeSpans(draft))) : 0;
    if (removed) setRemoving(removed); else onSave(draft);
  };
  const options = useMemo(() => {
    if (tab === 'ayahs') return [];
    if (tab === 'surahs') return Object.entries(index.surahNames).map(([number, label]) => ({ number: Number(number), label,
      start: index.ayahs.findIndex(a => a.surahNumber === Number(number)), end: index.ayahs.findLastIndex(a => a.surahNumber === Number(number)) + 1 }));
    const bounds = tab === 'juzs' ? index.juzs : tab === 'hizbs' ? index.hizbs : index.quarters;
    return bounds.slice(0, -1).map((start, i) => ({ number: i + 1, start, end: bounds[i + 1],
      label: tab === 'juzs' ? t('memorization.selection.juz', { juz: i + 1 }) : tab === 'hizbs' ? t('memorization.selection.hizb', { hizb: i + 1 }) : t('memorization.selection.quarter', { hizb: Math.floor(i / 4) + 1, quarter: i % 4 + 1 }) }));
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
  const swipe = useSwipeToClose(onClose, { enabled: !busy });
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={() => { if (!busy) onClose(); }} style={[s.sheet, { backgroundColor: p.background, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View onLayout={swipe.onHeaderLayout} style={sheet.header}>
            <SheetGrabber palette={p} />
            {/* The close button stays while the choice is saved, marked disabled. */}
            <SheetTitle title={texts.title()} subtitle={texts.subtitle()} palette={p} actions={<Pressable ref={close} accessibilityRole="button" accessibilityLabel={texts.close()} accessibilityState={{ disabled: busy }} disabled={busy} onPress={onClose} hitSlop={4}
              style={({ pressed }) => [s.close, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background, opacity: busy ? 0.5 : 1 }]}><ReaderIcon name="close" color={p.foreground} size={18} /></Pressable>} />
            <LibraryTabs palette={p} label={texts.tabsLabel()} value={tab} onChange={value => { setTab(value as SelectionTab); setQuery(''); list.current?.scrollToOffset({ offset: 0, animated: false }); }} options={[{ value: 'surahs', label: t('memorization.selection.tabs.surahs') }, { value: 'juzs', label: t('memorization.selection.tabs.juzs') }, { value: 'hizbs', label: t('memorization.selection.tabs.hizbs') }, { value: 'quarters', label: t('memorization.selection.tabs.quarters') }, { value: 'ayahs', label: t('memorization.selection.tabs.ayahs') }]} />
            {tab !== 'ayahs' && <LibrarySearch palette={p} value={query} onChange={setQuery} placeholder={t('memorization.selection.searchPlaceholder')} label={t('memorization.selection.searchLabel')} />}
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} ref={list} data={filtered} keyExtractor={item => String(item.number)} extraData={draft} keyboardShouldPersistTaps="handled" initialNumToRender={10} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListHeaderComponent={tab === 'ayahs' ? <View style={{ gap: 14, paddingTop: 4, paddingBottom: 8 }}>
              <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{t('memorization.selection.custom.title')}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, marginTop: -8 }}>{t('memorization.selection.custom.hint')}</Text>
              <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
                <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><PlanField label={t('memorization.selection.custom.fromSurah')} value={fromSurah} onChange={setFromSurah} numeric /></View><View style={{ flex: 1 }}><PlanField label={t('memorization.selection.custom.fromAyah')} value={fromAyah} onChange={setFromAyah} numeric /></View></View>
                <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><PlanField label={t('memorization.selection.custom.toSurah')} value={toSurah} onChange={setToSurah} numeric /></View><View style={{ flex: 1 }}><PlanField label={t('memorization.selection.custom.toAyah')} value={toAyah} onChange={setToAyah} numeric /></View></View>
                <View style={{ paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }}><Text style={{ color: validRange ? p.foreground : p.destructive, fontSize: 15, fontWeight: validRange ? '600' : '400' }}>{validRange ? ayahRangeLabel(index, customStart, customEnd) : t('memorization.selection.custom.invalid')}</Text></View>
                <ReaderButton palette={p} disabled={!validRange || busy} onPress={() => toggle(customRange)}>{validRange && coversSpan(draft, customRange) ? texts.remove() : texts.add()}</ReaderButton>
              </View>
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('memorization.selection.custom.note')}</Text>
            </View> : null}
            ListEmptyComponent={tab !== 'ayahs' ? <Text style={{ color: p.mutedForeground, padding: 16, textAlign: 'center' }}>{t('memorization.selection.noResults')}</Text> : null}
            renderItem={({ item, index: position }) => {
              const checked = coversSpan(draft, item), partial = !checked && draft.some(r => r.start < item.end && r.end > item.start);
              const first = position === 0, last = position === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.label} accessibilityState={{ checked: partial ? 'mixed' : checked }} aria-checked={partial ? 'mixed' : checked} disabled={busy} onPress={() => toggle(item)}
                style={({ pressed }) => [sheet.row, { borderColor: p.border, backgroundColor: pressed ? p.accent : checked ? withAlpha(p.ornament, 0.08) : p.card, borderTopWidth: first ? StyleSheet.hairlineWidth : 0, borderBottomWidth: StyleSheet.hairlineWidth }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Medallion value={item.number} size={38} palette={p} current={checked} />
                <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '700' : '500' }}>{item.label}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{tab === 'surahs' ? partial ? texts.partial(item.end - item.start) : t('memorization.ayahCount', { count: item.end - item.start }) : ayahRangeLabel(index, item.start, item.end)}</Text></View>
                <View style={[s.check, { borderColor: checked || partial ? p.primary : p.input, backgroundColor: checked ? p.primary : p.background }]}>{checked ? <ReaderIcon name="check" color={p.primaryForeground} size={14} /> : partial ? <View style={{ width: 10, height: 2, backgroundColor: p.primary }} /> : null}</View>
              </Pressable>;
            }} /></GestureDetector>
          <View style={[sheet.footer, { borderColor: p.border }]}>
            <PlanNotice message={error} /><Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13 }}>{texts.total(spanCount(draft))}</Text>
            <ReaderButton palette={p} selected disabled={busy} onPress={save}>{busy ? t('memorization.selection.saving') : texts.confirm()}</ReaderButton>
          </View>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    {removing > 0 && <ConfirmDialog icon="check" title={t('memorization.selection.removal.title')} body={t('memorization.selection.removal.body', { count: removing })}
      confirm={t('memorization.selection.removal.confirm')} onClose={() => setRemoving(0)} onConfirm={() => { setRemoving(0); onSave(draft); }} />}
    </GestureHandlerRootView>
  </Modal>;
}

const s = StyleSheet.create({
  sheet: { height: '94%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 14 },
  check: { width: 20, height: 20, borderRadius: readerShape.detail, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  close: { width: 40, height: 40, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
