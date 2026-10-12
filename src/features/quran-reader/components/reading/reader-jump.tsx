import { useEffect, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button, IconTile } from '@/components/ui';
import type { AyahReference, Surah } from '@/lib/quranpedia/types';
import { fieldElevation, readerElevation, readerShape } from '../../design';
import type { ReaderContent } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { ayahDestination, parseReaderNumber } from '../../utils/navigation';
import { pageDivisions } from '../../utils/page-divisions';
import { normalizeArabicSearch } from '../../utils/search';
import { thumunName } from '../../utils/thumun-pages';
import { eighthInHizb } from '../../utils/warsh-eighths';
import { ReaderIcon } from '../ui/reader-chrome';
import { LibrarySearch } from '../ui/library-chrome';
import { formatList, formatNumber, t } from '@/i18n';

/**
 * Quick navigation, to a page or to an ayah. The surah is chosen from a list of the available
 * surahs (`picking`), shown in place of the form; `onReveal` scrolls the chosen one into view.
 * Paged by thumun, a page is chosen by its hizb and thumun.
 */
export function ReaderJump({ content, currentPage, palette: p, onJump, limited = false, picking, onPickingChange, onReveal }: {
  content: ReaderContent; currentPage: number; palette: ReaderPalette; onJump: (page: number, ayah?: AyahReference) => void; limited?: boolean;
  picking: boolean; onPickingChange: (picking: boolean) => void; onReveal: (y: number) => void;
}) {
  const initialAyah = (content.pages.find(value => value.number === currentPage) ?? content.pages[0]).ayahs[0] ?? content.quran.surahs[0].ayahs[0];
  const [kind, setKind] = useState<'page' | 'ayah'>('page');
  const [page, setPage] = useState(String(currentPage));
  const thumun = content.paging === 'thumun';
  const [hizb, setHizb] = useState(String(eighthInHizb(currentPage).hizb));
  const [eighth, setEighth] = useState(String(eighthInHizb(currentPage).thumun));
  const [surah, setSurah] = useState(String(initialAyah.surahNumber));
  const [ayah, setAyah] = useState(String(initialAyah.ayahNumber));
  const [error, setError] = useState('');
  const firstPage = content.pages[0].number, lastPage = content.pages.at(-1)!.number;
  const firstHizb = eighthInHizb(firstPage).hizb, lastHizb = eighthInHizb(lastPage).hizb;
  const typedEighth = parseReaderNumber(eighth);
  const typedPage = !thumun ? parseReaderNumber(page) : typedEighth >= 1 && typedEighth <= 8 ? (parseReaderNumber(hizb) - 1) * 8 + typedEighth : NaN;
  const pageIndex = content.pages.findIndex(value => value.number === typedPage);
  const selectedSurah = content.quran.surahs.find(value => value.number === parseReaderNumber(surah));
  const targetAyah = ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
  const destinationPage = kind === 'page' ? content.pages[pageIndex] : content.pages.find(value => value.number === targetAyah?.pageNumber);
  const surahNumbers = kind === 'ayah' ? [targetAyah?.surahNumber] : [...new Set(destinationPage?.ayahs.map(value => value.surahNumber) ?? [])];
  const destinationName = formatList(content.quran.surahs.filter(value => surahNumbers.includes(value.number)).map(value => value.name));
  const divisions = destinationPage ? pageDivisions(destinationPage) : undefined;
  const previewDetail = kind === 'ayah' && targetAyah ? thumun ? t('reader.thumun.ayahLocation', { ayah: targetAyah.ayahNumber, position: thumunName(targetAyah.pageNumber) })
    : t('reader.ayah.location', { ayah: targetAyah.ayahNumber, page: targetAyah.pageNumber })
    : [divisions?.juz.length ? t('reader.divisions.juz', { juz: formatList(divisions.juz.map(String)) }) : '',
      thumun && destinationPage ? thumunName(destinationPage.number)
        : divisions?.quarters.length ? t('reader.divisions.hizb', { hizb: formatList([...new Set(divisions.quarters.map(value => value.hizb))].map(String)) }) : ''].filter(Boolean).join(' · ');
  const pageHint = t(limited ? 'reader.jump.sessionPages' : 'reader.jump.range', { first: firstPage, last: lastPage });
  const ayahHint = selectedSurah ? t('reader.jump.range', { first: selectedSurah.ayahs[0].ayahNumber, last: selectedSurah.ayahs.at(-1)!.ayahNumber }) : t('reader.jump.chooseSurahFirst');
  const change = (setter: (value: string) => void) => (value: string) => { setter(value); setError(''); };
  // Back from the list, a screen reader lands on the surah field again.
  const surahField = useRef<View>(null);
  const wasPicking = useRef(picking);
  useEffect(() => {
    if (wasPicking.current && !picking) focusView(surahField.current);
    wasPicking.current = picking;
  }, [picking]);
  const chooseSurah = (number: number) => {
    const chosen = content.quran.surahs.find(value => value.number === number);
    if (!chosen) return;
    Keyboard.dismiss();
    setSurah(String(chosen.number));
    // The ayah number of another surah may not exist here: start from its first ayah.
    setAyah(String(chosen.ayahs[0].ayahNumber));
    setError('');
    onPickingChange(false);
  };
  const submit = () => {
    if (kind === 'page') {
      if (!destinationPage) { setError(thumun ? t('reader.thumun.error', { firstHizb, lastHizb }) : t('reader.jump.pageError', { first: firstPage, last: lastPage })); return; }
      Keyboard.dismiss(); onJump(destinationPage.number);
    } else {
      if (!targetAyah) { setError(limited ? t('reader.jump.sessionAyahError') : t('reader.jump.ayahError')); return; }
      Keyboard.dismiss(); onJump(targetAyah.pageNumber, targetAyah);
    }
  };
  const stepPage = (delta: number) => {
    const next = pageIndex >= 0 ? content.pages[pageIndex + delta] : undefined;
    if (!next) return;
    change(setPage)(String(next.number));
    setHizb(String(eighthInHizb(next.number).hizb)); setEighth(String(eighthInHizb(next.number).thumun));
  };
  if (picking) return <SurahPicker surahs={content.quran.surahs} selected={selectedSurah?.number} limited={limited} palette={p} pageName={thumun ? thumunName : undefined}
    onChoose={chooseSurah} onBack={() => { Keyboard.dismiss(); onPickingChange(false); }} onReveal={onReveal} />;
  const actionLabel = destinationPage ? kind === 'page' ? thumun ? t('reader.thumun.to', { position: thumunName(destinationPage.number) }) : t('reader.jump.toPage', { page: destinationPage.number })
    : t('reader.jump.toAyah', { ayah: targetAyah!.ayahNumber }) : t('reader.jump.toDestination');
  return <View style={s.form}>
    <View accessibilityRole="tablist" accessibilityLabel={t('reader.jump.method')} style={[s.tabs, { borderColor: p.border }]}>
      {([{ value: 'page', label: thumun ? t('reader.thumun.byThumun') : t('reader.jump.byPage'), icon: 'book' }, { value: 'ayah', label: t('reader.jump.byAyah'), icon: 'lines' }] as const).map(option => {
        const selected = kind === option.value;
        return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected }} aria-selected={selected}
          onPress={() => { Keyboard.dismiss(); setKind(option.value); setError(''); }}
          style={({ pressed }) => [s.tab, { borderColor: selected ? p.foreground : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
          <ReaderIcon name={option.icon} size={16} color={selected ? p.foreground : p.mutedForeground} />
          <Text style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 14, fontWeight: '500' }}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    {kind === 'page' ? <View style={s.pagePicker}>
      <PageStep label={thumun ? t('reader.thumun.next') : t('reader.jump.increasePage')} plus disabled={pageIndex < 0 || pageIndex === content.pages.length - 1} palette={p} onPress={() => stepPage(1)} />
      {thumun ? <>
        <NumberField label={t('reader.thumun.hizb')} value={hizb} onChange={change(setHizb)} hint={t('reader.jump.range', { first: firstHizb, last: lastHizb })} palette={p} onSubmit={submit} large />
        <NumberField label={t('reader.thumun.thumun')} value={eighth} onChange={change(setEighth)} hint={t('reader.jump.range', { first: 1, last: 8 })} palette={p} onSubmit={submit} large />
      </> : <NumberField label={t('reader.jump.pageNumber')} value={page} onChange={change(setPage)} hint={pageHint} palette={p} onSubmit={submit} large />}
      <PageStep label={thumun ? t('reader.thumun.previous') : t('reader.jump.decreasePage')} disabled={pageIndex <= 0} palette={p} onPress={() => stepPage(-1)} />
    </View> : <View style={s.ayahFields}>
      <SurahField ref={surahField} surah={selectedSurah} hint={limited ? t('reader.jump.withinSession') : selectedSurah ? t('reader.jump.surahHint', { number: selectedSurah.number }) : ''}
        palette={p} onPress={() => { Keyboard.dismiss(); onPickingChange(true); }} />
      <NumberField label={t('reader.jump.ayahNumber')} value={ayah} onChange={change(setAyah)} hint={ayahHint} palette={p} onSubmit={submit} />
    </View>}
    <View accessibilityLiveRegion="polite" style={[s.preview, { backgroundColor: p.card, borderColor: p.border }]}>
      <IconTile name="book" palette={p} />
      <View style={s.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{limited ? t('reader.jump.destinationSession') : t('reader.jump.destination')}</Text>
        <Text style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{destinationName || t('reader.jump.chooseDestination')}</Text>
        {!!previewDetail && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{previewDetail}</Text>}
      </View>
      {destinationPage && !thumun && <View style={[s.pageBadge, { borderColor: p.border }]}><Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('reader.jump.page')}</Text><Text style={{ color: p.foreground, fontSize: 21, textAlign: 'center' }}>{destinationPage.number}</Text></View>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: p.destructive, fontSize: 13 }}>{error}</Text>}
    <Button palette={p} size="lg" label={actionLabel} onPress={submit} iconEnd="chevron" block>{actionLabel}</Button>
  </View>;
}

function NumberField({ label, value, onChange, hint, palette: p, onSubmit, large = false }: {
  label: string; value: string; onChange: (value: string) => void; hint: string; palette: ReaderPalette; onSubmit: () => void; large?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}>
    <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      keyboardType="number-pad" inputMode="numeric" maxLength={3} selectTextOnFocus selectionColor={p.primary} onSubmitEditing={onSubmit} returnKeyType="go"
      style={[s.input, large && s.largeInput, { color: p.foreground, borderColor: focused ? p.ring : p.input, backgroundColor: p.background }, fieldElevation(focused, p)]} />
    <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{hint}</Text>
  </View>;
}
function focusView(view: View | null) {
  if (!view) return;
  if (Platform.OS === 'web') (view as unknown as HTMLElement).focus?.();
  else AccessibilityInfo.sendAccessibilityEvent(view, 'focus');
}

/** Shows the chosen surah by name; pressing it opens the list of surahs. */
function SurahField({ surah, hint, palette: p, onPress, ref }: { surah?: Surah; hint: string; palette: ReaderPalette; onPress: () => void; ref: Ref<View> }) {
  return <View style={[s.field, s.surahField]}>
    <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{t('reader.jump.surah')}</Text>
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={surah?.name ?? t('reader.jump.chooseSurah')} accessibilityHint={t('reader.jump.changeSurah')} onPress={onPress}
      style={({ pressed }) => [s.select, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background }, readerElevation(1, p)]}>
      <View style={s.selectSide} />
      <Text numberOfLines={1} style={{ flex: 1, color: surah ? p.foreground : p.mutedForeground, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>{surah?.name ?? t('reader.jump.chooseSurah')}</Text>
      <View style={s.selectSide}><ReaderIcon name="chevron-down" size={18} color={p.mutedForeground} /></View>
    </Pressable>
    <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{hint}</Text>
  </View>;
}

/** The available surahs (all, or those of the goal session), searchable by name or number. */
function SurahPicker({ surahs, selected, limited, palette: p, onChoose, onBack, onReveal, pageName = (page) => t('reader.jump.startPage', { page }) }: {
  surahs: Surah[]; selected?: number; limited: boolean; palette: ReaderPalette; onChoose: (number: number) => void; onBack: () => void; onReveal: (y: number) => void;
  /** Where a surah starts: its page, or its thumun. */
  pageName?: (page: number) => string;
}) {
  const [query, setQuery] = useState('');
  const back = useRef<View>(null);
  useEffect(() => { focusView(back.current); }, []);
  // Once both are laid out, the chosen surah is scrolled into view (only when the list first opens).
  const layout = useRef({ list: -1, row: -1, done: false });
  const reveal = () => {
    const l = layout.current;
    if (l.done || l.list < 0 || l.row < 0) return;
    l.done = true;
    onReveal(l.list + l.row);
  };
  const q = normalizeArabicSearch(query);
  const shown = q ? surahs.filter(value => normalizeArabicSearch(value.name).includes(q) || String(value.number) === q || formatNumber(value.number) === query.trim()) : surahs;
  return <View style={s.picker}>
    <View style={s.pickerHeading}>
      <Button ref={back} palette={p} variant="outline" icon="back" label={t('reader.jump.backToForm')} onPress={onBack} />
      <View style={s.grow}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{limited ? t('reader.jump.sessionSurahs') : t('reader.jump.chooseSurah')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('reader.jump.surahCount', { count: surahs.length })}</Text>
      </View>
    </View>
    <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('reader.jump.searchSurah')} placeholder={t('reader.jump.searchPlaceholder')} />
    <View onLayout={(event) => { layout.current.list = event.nativeEvent.layout.y; reveal(); }}
      style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(1, p)]}>
      {shown.length ? shown.map((value, index) => {
        const current = value.number === selected;
        return <Pressable key={value.number} accessibilityRole="button" accessibilityLabel={value.name} accessibilityState={{ selected: current }} aria-selected={current}
          onLayout={current ? (event) => { layout.current.row = event.nativeEvent.layout.y; reveal(); } : undefined} onPress={() => onChoose(value.number)}
          style={({ pressed }) => [s.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: current || pressed ? p.accent : 'transparent' }]}>
          <View style={[s.number, { borderColor: current ? p.primary : p.border, backgroundColor: current ? p.primary : 'transparent' }]}>
            <Text style={{ color: current ? p.primaryForeground : p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{formatNumber(value.number)}</Text>
          </View>
          <View style={s.grow}>
            <Text style={{ color: p.foreground, fontSize: 16, fontWeight: current ? '600' : '400' }}>{value.name}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('reader.jump.ayahs', { count: value.ayahs.length })} · {pageName(value.ayahs[0].pageNumber)}</Text>
          </View>
          {current && <ReaderIcon name="done" size={18} color={p.primary} />}
        </Pressable>;
      }) : <Text style={{ color: p.mutedForeground, fontSize: 14, textAlign: 'center', padding: 20 }}>{t('reader.jump.noSurah')}</Text>}
    </View>
  </View>;
}

function PageStep({ label, onPress, disabled, plus = false, palette: p }: { label: string; onPress: () => void; disabled: boolean; plus?: boolean; palette: ReaderPalette }) {
  return <Button palette={p} variant="outline" size="lg" icon={plus ? 'plus' : 'minus'} label={label} disabled={disabled} onPress={onPress} />;
}
const s = StyleSheet.create({
  form: { gap: 20 }, grow: { flex: 1, minWidth: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingBottom: 6, borderBottomWidth: 2, marginBottom: -1 },
  pagePicker: { flexDirection: 'row', gap: 18, alignItems: 'center', paddingVertical: 2 },
  ayahFields: { flexDirection: 'row', gap: 16 }, field: { flex: 1, minWidth: 0, gap: 6 }, surahField: { flex: 2 },
  select: { minHeight: 64, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectSide: { width: 22, alignItems: 'center' },
  picker: { gap: 14 }, pickerHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingHorizontal: 14 },
  number: { minWidth: 34, height: 34, paddingHorizontal: 4, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 64, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 8, paddingVertical: 4, fontFamily: 'UiNumericSemiBold', fontSize: 30, textAlign: 'center', writingDirection: 'ltr', includeFontPadding: false },
  largeInput: { minHeight: 80, fontSize: 42 },
  step: { width: 44, height: 44, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: readerShape.lg, borderWidth: StyleSheet.hairlineWidth },
  pageBadge: { minWidth: 46, borderStartWidth: StyleSheet.hairlineWidth, paddingStart: 12 },
  submit: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: readerShape.control },
});
