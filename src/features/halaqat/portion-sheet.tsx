import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch, LibraryTabs } from '@/features/quran-reader/components/ui/library-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { sheet } from '@/features/plans/components';
import type { PlanIndex } from '@/features/plans/engine';
import { formatNumber, t } from '@/i18n';
import { ordinal, portionOf, samePortion, spanOf, surahPortion, validPortion, type AyahRef, type Portion, type QuranShape } from './model';
import { portionDetail, portionLabel } from './shared';

type Unit = 'surahs' | 'hizbs' | 'quarters';

/**
 * Choosing a portion: its first and last ayah, each moved a step at a time or typed, or a whole
 * surah, hizb or quarter from the list; what is chosen is said in words at the foot.
 */
export function PortionSheet({ index, shape, value, fallbackSurah = 114, title, subtitle, onSave, onClose }: {
  index: PlanIndex; shape: QuranShape; value: Portion | undefined;
  /** The surah offered first when there is no portion yet. */
  fallbackSurah?: number;
  title: string; subtitle?: string; onSave: (portion: Portion) => void; onClose: () => void;
}) {
  const { palette: p } = useReadingPreferences();
  const [draft, setDraft] = useState<Portion>(() => validPortion(shape, value) ? value : surahPortion(shape, fallbackSurah));
  const [unit, setUnit] = useState<Unit>('surahs'), [query, setQuery] = useState('');
  const close = useRef<View>(null), list = useRef<FlatList>(null);
  const swipe = useSwipeToClose(onClose);
  const options = useMemo(() => {
    if (unit === 'surahs') return shape.counts.map((count, i) => ({ number: i + 1, label: index.surahNames[i + 1] ?? '', portion: surahPortion(shape, i + 1), detail: t('halaqat.ayahCount', { count }) }));
    const bounds = unit === 'hizbs' ? index.hizbs : index.quarters;
    return bounds.slice(0, -1).map((start, i) => {
      const portion = portionOf(shape, { start, end: bounds[i + 1] });
      return { number: i + 1, portion, detail: portionLabel(index, shape, portion),
        label: unit === 'hizbs' ? t('halaqat.portion.hizb', { hizb: i + 1 }) : t('halaqat.portion.quarter', { hizb: Math.floor(i / 4) + 1, quarter: (i % 4) + 1 }) };
    });
  }, [unit, index, shape]);
  const filtered = useMemo(() => {
    const needle = normalizeArabicSearch(query).replace(/[٠-٩]/g, (n) => String(n.charCodeAt(0) - 1632));
    if (!needle) return options;
    return options.filter((o) => /^\d+$/.test(needle) ? o.number === Number(needle) : normalizeArabicSearch(`${o.label} ${o.detail}`).includes(needle));
  }, [options, query]);
  // Moving one end never leaves the other on the wrong side of it.
  // Another surah for a portion within one surah moves the whole portion there.
  const setFrom = (from: AyahRef) => setDraft((d) => (from.surah !== d.from.surah && d.from.surah === d.to.surah) || ordinal(shape, from) > ordinal(shape, d.to)
    ? { from, to: { surah: from.surah, ayah: shape.counts[from.surah - 1] } } : { ...d, from });
  const setTo = (to: AyahRef) => setDraft((d) => ordinal(shape, to) >= ordinal(shape, d.from) ? { ...d, to } : { from: { surah: to.surah, ayah: 1 }, to });
  const valid = validPortion(shape, draft);
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={onClose}
          style={[s.sheet, { backgroundColor: p.background, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View onLayout={swipe.onHeaderLayout} style={sheet.header}>
            <SheetGrabber palette={p} />
            <SheetTitle title={title} subtitle={subtitle} palette={p} onClose={onClose} closeLabel={t('halaqat.portionSheet.close')} closeRef={close} />
            <View style={[s.ends, { backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.4) }]}>
              <End edge="from" value={draft.from} shape={shape} index={index} onChange={setFrom} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
              <End edge="to" value={draft.to} shape={shape} index={index} onChange={setTo} />
            </View>
            <LibraryTabs palette={p} label={t('halaqat.portionSheet.unitsLabel')} value={unit} onChange={(value) => { setUnit(value as Unit); setQuery(''); list.current?.scrollToOffset({ offset: 0, animated: false }); }}
              options={[{ value: 'surahs', label: t('halaqat.portionSheet.units.surahs') }, { value: 'hizbs', label: t('halaqat.portionSheet.units.hizbs') }, { value: 'quarters', label: t('halaqat.portionSheet.units.quarters') }]} />
            <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('halaqat.portionSheet.searchLabel')} placeholder={t('halaqat.portionSheet.searchPlaceholder')} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} ref={list} data={filtered} keyExtractor={(item) => `${unit}:${item.number}`} extraData={draft}
            keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={5} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('halaqat.portionSheet.empty')}</Text>}
            renderItem={({ item, index: position }) => {
              const chosen = samePortion(item.portion, draft);
              const inside = !chosen && spanOf(shape, item.portion).start < spanOf(shape, draft).end && spanOf(shape, item.portion).end > spanOf(shape, draft).start;
              const first = position === 0, last = position === filtered.length - 1;
              return <Pressable accessibilityRole="radio" accessibilityLabel={item.label} accessibilityHint={item.detail} accessibilityState={{ checked: chosen }} aria-checked={chosen}
                onPress={() => setDraft(item.portion)}
                style={({ pressed }) => [sheet.row, { borderColor: p.border, backgroundColor: pressed ? p.accent : chosen ? withAlpha(p.ornament, 0.1) : inside ? withAlpha(p.ornament, 0.04) : p.card,
                  borderTopWidth: first ? StyleSheet.hairlineWidth : 0, borderBottomWidth: StyleSheet.hairlineWidth }, first && sheet.rowFirst, last && sheet.rowLast]}>
                <Medallion value={item.number} size={36} palette={p} current={chosen} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, fontWeight: chosen ? '700' : '500' }}>{item.label}</Text>
                  <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12 }}>{item.detail}</Text>
                </View>
                {chosen && <ReaderIcon name="check" color={p.primary} size={18} />}
              </Pressable>;
            }} /></GestureDetector>
          <View style={[sheet.footer, { borderColor: p.border }]}>
            <View accessibilityLiveRegion="polite" style={{ gap: 2 }}>
              <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{valid ? portionLabel(index, shape, draft) : t('halaqat.portionSheet.invalid')}</Text>
              {valid && <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{portionDetail(index, shape, draft)}</Text>}
            </View>
            <ReaderButton palette={p} selected disabled={!valid} onPress={() => onSave(draft)}>{t('halaqat.portionSheet.confirm')}</ReaderButton>
          </View>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

/**
 * One end of the portion: its surah and its ayah, each a step back or on, or typed. Another surah
 * starts at its first ayah, or ends at its last.
 */
function End({ edge, value, shape, index, onChange }: { edge: 'from' | 'to'; value: AyahRef; shape: QuranShape; index: PlanIndex; onChange: (ref: AyahRef) => void }) {
  const { palette: p } = useReadingPreferences();
  const count = shape.counts[value.surah - 1];
  const label = edge === 'from' ? t('halaqat.portionSheet.from') : t('halaqat.portionSheet.to');
  return <View style={s.end}>
    <Text style={{ width: 28, color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    <Stepper value={value.surah} min={1} max={shape.counts.length} label={t('halaqat.portionSheet.surahLabel', { end: label })} caption={index.surahNames[value.surah] ?? ''}
      onChange={(surah) => onChange({ surah, ayah: edge === 'from' ? 1 : shape.counts[surah - 1] })} wide />
    <Stepper value={value.ayah} min={1} max={count} label={t('halaqat.portionSheet.ayahLabel', { end: label })} caption={t('halaqat.portionSheet.ayahCaption')}
      onChange={(ayah) => onChange({ surah: value.surah, ayah })} />
  </View>;
}

/** A number a step down or up, or typed, within its bounds; what it stands for under it. */
function Stepper({ value, min, max, label, caption, onChange, wide = false }: {
  value: number; min: number; max: number; label: string; caption: string; onChange: (value: number) => void; wide?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    const n = Number(normalizeArabicSearch(raw).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)));
    if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
    setText(null);
  };
  const step = (delta: number) => { const n = value + delta; if (n >= min && n <= max) onChange(n); };
  return <View style={[{ alignItems: 'center', gap: 2, minWidth: 0 }, wide && { flex: 1 }]}>
    <View style={s.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('halaqat.portionSheet.decrease', { what: label })} disabled={value <= min} onPress={() => step(-1)} hitSlop={4}
        style={({ pressed }) => [s.step, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: value <= min ? 0.4 : 1 }]}>
        <ReaderIcon name="minus" color={p.foreground} size={14} />
      </Pressable>
      <TextInput accessibilityLabel={label} value={text ?? formatNumber(value)} onChangeText={setText} onBlur={() => text !== null && commit(text)} onSubmitEditing={(e) => commit(e.nativeEvent.text)}
        keyboardType="number-pad" selectTextOnFocus maxLength={3} selectionColor={p.primary}
        style={[s.number, wide && { width: 52 }, { color: p.foreground, borderColor: p.input, backgroundColor: p.background }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('halaqat.portionSheet.increase', { what: label })} disabled={value >= max} onPress={() => step(1)} hitSlop={4}
        style={({ pressed }) => [s.step, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: value >= max ? 0.4 : 1 }]}>
        <ReaderIcon name="plus" color={p.foreground} size={14} />
      </Pressable>
    </View>
    <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 11 }}>{caption}</Text>
  </View>;
}

const s = StyleSheet.create({
  sheet: { height: '94%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  ends: { borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 12, paddingVertical: 4 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 30, height: 34, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  number: { width: 46, height: 34, borderRadius: readerShape.control, borderWidth: 1, textAlign: 'center', fontSize: 15, paddingVertical: 0, paddingHorizontal: 2 },
});
