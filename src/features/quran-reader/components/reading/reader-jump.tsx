import { memo, useEffect, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { khatam } from '@/components/craft/art';
import { Lawh } from '@/components/craft/lawh';
import { BrushStroke, Cartouche, Medallion, Rule } from '@/components/craft/marks';
import type { AyahReference, Surah } from '@/lib/quranpedia/types';
import { mixColor, readerShape, withAlpha } from '../../design';
import { useQuranFont } from '../../hooks/use-quran-font';
import type { ReaderContent } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { ayahDestination, parseReaderNumber } from '../../utils/navigation';
import { pageDivisions } from '../../utils/page-divisions';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { normalizeArabicSearch } from '../../utils/search';
import { thumunName } from '../../utils/thumun-pages';
import { eighthInHizb } from '../../utils/warsh-eighths';
import { ReaderIcon } from '../ui/reader-chrome';
import { LibrarySearch } from '../ui/library-chrome';
import { formatList, formatNumber, t } from '@/i18n';

/** The sheet's widest measure (see the drawer), its gutter, and the board's own. */
const SHEET = 560, GUTTER = 16, BOARD = 16;

/**
 * Quick navigation, to a page or to an ayah, written on the lawh: the two ways at its head as
 * words, the number to go to held in the eight-pointed star (the page, or the hizb and its thumun;
 * the surah in its title's frame and the ayah), and at its foot where that leads. The surah is
 * chosen from a list of the available surahs (`picking`), shown in place of the form; `onReveal`
 * scrolls the chosen one into view. Paged by thumun, a page is chosen by its hizb and thumun.
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
  const { loaded: calligraphy } = useQuranFont();
  const { width: window } = useWindowDimensions();
  // The board's inner width, which the stars and the surah's frame share.
  const inner = Math.min(window, SHEET) - GUTTER * 2 - BOARD * 2;
  const firstPage = content.pages[0].number, lastPage = content.pages.at(-1)!.number;
  const firstHizb = eighthInHizb(firstPage).hizb, lastHizb = eighthInHizb(lastPage).hizb;
  const typedEighth = parseReaderNumber(eighth);
  const typedPage = !thumun ? parseReaderNumber(page) : typedEighth >= 1 && typedEighth <= 8 ? (parseReaderNumber(hizb) - 1) * 8 + typedEighth : NaN;
  const pageIndex = content.pages.findIndex(value => value.number === typedPage);
  const selectedSurah = content.quran.surahs.find(value => value.number === parseReaderNumber(surah));
  const targetAyah = ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
  const destinationPage = kind === 'page' ? content.pages[pageIndex] : content.pages.find(value => value.number === targetAyah?.pageNumber);
  const surahNumbers = kind === 'ayah' ? [targetAyah?.surahNumber] : [...new Set(destinationPage?.ayahs.map(value => value.surahNumber) ?? [])];
  const destinationSurahs = content.quran.surahs.filter(value => surahNumbers.includes(value.number));
  const destinationName = formatList(destinationSurahs.map(value => value.name));
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
  if (picking) return <SurahPicker surahs={content.quran.surahs} selected={selectedSurah?.number} limited={limited} calligraphy={calligraphy} palette={p} pageName={thumun ? thumunName : undefined}
    onChoose={chooseSurah} onBack={() => { Keyboard.dismiss(); onPickingChange(false); }} onReveal={onReveal} />;
  const actionLabel = destinationPage ? kind === 'page' ? thumun ? t('reader.thumun.to', { position: thumunName(destinationPage.number) }) : t('reader.jump.toPage', { page: destinationPage.number })
    : t('reader.jump.toAyah', { ayah: targetAyah!.ayahNumber }) : t('reader.jump.toDestination');
  // The stars take what the steppers leave: one large for a page, two for a hizb and its thumun.
  const pageStar = Math.min(136, inner - 2 * (STEP + 14));
  const thumunStar = Math.min(104, Math.floor((inner - 2 * (STEP + 6) - 8) / 2));
  const ayahStar = Math.min(104, Math.floor(inner * 0.34));
  return <View style={s.form}>
    <Lawh palette={p} contentStyle={s.board}>
      <WordTabs palette={p} label={t('reader.jump.method')} value={kind} onChange={(value) => { Keyboard.dismiss(); setKind(value); setError(''); }}
        options={[{ value: 'page', label: thumun ? t('reader.thumun.byThumun') : t('reader.jump.byPage') }, { value: 'ayah', label: t('reader.jump.byAyah') }]} />
      {kind === 'page' ? <View style={s.pagePicker}>
        <Step label={thumun ? t('reader.thumun.next') : t('reader.jump.increasePage')} plus disabled={pageIndex < 0 || pageIndex === content.pages.length - 1} palette={p} onPress={() => stepPage(1)} />
        {thumun ? <>
          <StarField label={t('reader.thumun.hizb')} value={hizb} onChange={change(setHizb)} hint={t('reader.jump.range', { first: firstHizb, last: lastHizb })} size={thumunStar} palette={p} onSubmit={submit} />
          <StarField label={t('reader.thumun.thumun')} value={eighth} onChange={change(setEighth)} hint={t('reader.jump.range', { first: 1, last: 8 })} size={thumunStar} palette={p} onSubmit={submit} />
        </> : <StarField label={t('reader.jump.pageNumber')} value={page} onChange={change(setPage)} hint={pageHint} size={pageStar} palette={p} onSubmit={submit} />}
        <Step label={thumun ? t('reader.thumun.previous') : t('reader.jump.decreasePage')} disabled={pageIndex <= 0} palette={p} onPress={() => stepPage(-1)} />
      </View> : <View style={s.ayahFields}>
        <SurahField ref={surahField} surah={selectedSurah} width={inner - ayahStar - 14} star={ayahStar} calligraphy={calligraphy}
          hint={limited ? t('reader.jump.withinSession') : selectedSurah ? t('reader.jump.surahHint', { number: selectedSurah.number }) : ''}
          palette={p} onPress={() => { Keyboard.dismiss(); onPickingChange(true); }} />
        <StarField label={t('reader.jump.ayahNumber')} value={ayah} onChange={change(setAyah)} hint={ayahHint} size={ayahStar} palette={p} onSubmit={submit} />
      </View>}
      <Rule palette={p} style={{ marginTop: 2 }} />
      <Destination caption={limited ? t('reader.jump.destinationSession') : t('reader.jump.destination')} surahs={destinationSurahs} name={destinationName}
        detail={previewDetail} calligraphy={calligraphy} width={inner} palette={p} />
    </Lawh>
    {!!error && <Text accessibilityRole="alert" style={{ color: p.destructive, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{error}</Text>}
    <Button palette={p} size="lg" label={actionLabel} onPress={submit} block>{actionLabel}</Button>
  </View>;
}

/** The ways to go, written as words at the head of the board, the chosen one underlined in gold. */
function WordTabs<T extends string>({ options, value, onChange, label, palette: p }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; palette: ReaderPalette;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={s.words}>
    {options.map((option) => {
      const on = option.value === value;
      return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected: on }} aria-selected={on}
        onPress={() => onChange(option.value)} hitSlop={{ top: 4, bottom: 4, left: 12, right: 12 }} style={({ pressed }) => [s.word, { opacity: pressed && !on ? 0.6 : 1 }]}>
        <Text numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 21, lineHeight: 36, fontFamily: on ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{option.label}</Text>
        <BrushStroke on={on} width={56} color={p.ornament} />
      </Pressable>;
    })}
  </View>;
}

/** Size of the round − and + beside the stars. */
const STEP = 44;

/** A number to type, held in the eight-pointed star as the mushaf holds its numbers; its name above, its range below. */
function StarField({ label, value, onChange, hint, size, palette: p, onSubmit }: {
  label: string; value: string; onChange: (value: string) => void; hint: string; size: number; palette: ReaderPalette; onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const c = size / 2, a = size * 0.33;
  const font = Math.round(size * (size >= 120 ? 0.3 : 0.27));
  return <View style={s.field}>
    <Text numberOfLines={1} style={[s.label, { color: p.mutedForeground }]}>{label}</Text>
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
        <Path d={khatam(c, c, a)} fill={focused ? mixColor(p.background, p.ornament, 0.1) : mixColor(p.background, p.ornament, 0.05)}
          stroke={focused ? p.ornament : withAlpha(p.ornament, 0.7)} strokeWidth={focused ? 2 : 1.2} strokeLinejoin="round" />
        <Circle cx={c} cy={c} r={a * 0.94} fill="none" stroke={withAlpha(p.ornament, focused ? 0.55 : 0.35)} strokeWidth={0.9} strokeDasharray="1 4" strokeLinecap="round" />
      </Svg>
      <TextInput accessibilityLabel={label} accessibilityHint={hint} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        keyboardType="number-pad" inputMode="numeric" maxLength={3} selectTextOnFocus selectionColor={p.primary} onSubmitEditing={onSubmit} returnKeyType="go"
        style={[s.input, { top: c - font, height: font * 2, left: c - a, width: a * 2, fontSize: font, color: p.foreground }]} />
    </View>
    <Text numberOfLines={1} style={[s.hint, { color: p.mutedForeground }]}>{hint}</Text>
  </View>;
}

/** A round step to the page before or after. */
function Step({ label, onPress, disabled, plus = false, palette: p }: { label: string; onPress: () => void; disabled: boolean; plus?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.step, { borderColor: withAlpha(p.ornament, 0.55), backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.4 : 1 }]}>
    <ReaderIcon name={plus ? 'plus' : 'minus'} color={p.foreground} size={18} />
  </Pressable>;
}

function focusView(view: View | null) {
  if (!view) return;
  if (Platform.OS === 'web') (view as unknown as HTMLElement).focus?.();
  else AccessibilityInfo.sendAccessibilityEvent(view, 'focus');
}

/** The chosen surah, its name in calligraphy in its title's frame; pressing it opens the list of surahs. */
function SurahField({ surah, hint, width, star, calligraphy, palette: p, onPress, ref }: {
  surah?: Surah; hint: string; width: number; calligraphy: boolean; palette: ReaderPalette; onPress: () => void; ref: Ref<View>;
  /** The height of the star beside it, which the frame is centred on. */
  star: number;
}) {
  return <View style={[s.field, { width }]}>
    <Text numberOfLines={1} style={[s.label, { color: p.mutedForeground }]}>{t('reader.jump.surah')}</Text>
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={surah?.name ?? t('reader.jump.chooseSurah')} accessibilityHint={t('reader.jump.changeSurah')} onPress={onPress}
      style={{ marginVertical: Math.max(0, (star - 64) / 2) }}>
      {({ pressed }) => <Cartouche width={width} height={64} palette={p} filled={pressed}>
        <View style={s.surahInner}>
          {surah && calligraphy
            ? <Text numberOfLines={1} style={[calligraphyStyle(32), { flexShrink: 1, color: p.ornament, lineHeight: 44 }]}>{surahNameGlyph(surah.number)}</Text>
            : <Text numberOfLines={1} style={{ flexShrink: 1, color: surah ? p.foreground : p.mutedForeground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{surah?.name ?? t('reader.jump.chooseSurah')}</Text>}
          <ReaderIcon name="chevron-down" size={16} color={p.mutedForeground} />
        </View>
      </Cartouche>}
    </Pressable>
    <Text numberOfLines={1} style={[s.hint, { color: p.mutedForeground }]}>{hint}</Text>
  </View>;
}

/** Where the jump leads, at the foot of the board: its surahs, in calligraphy when there is room, and where in the mushaf. */
function Destination({ caption, surahs, name, detail, calligraphy, width, palette: p }: {
  caption: string; surahs: Surah[]; name: string; detail: string; calligraphy: boolean; width: number; palette: ReaderPalette;
}) {
  // One or two surahs are written as their titles are; more (a short surah's page) by name.
  const glyphs = calligraphy && surahs.length > 0 && surahs.length <= 2;
  return <View accessibilityLiveRegion="polite" accessible accessibilityLabel={formatList([caption, name || t('reader.jump.chooseDestination'), detail].filter(Boolean))} style={s.destination}>
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{caption}</Text>
    {glyphs ? <View style={s.glyphs}>
      {surahs.map((value, i) => <View key={value.number} style={s.glyphPair}>
        {i > 0 && <Svg width={10} height={10} aria-hidden><Path d={khatam(5, 5, 3)} fill={withAlpha(p.ornament, 0.5)} /></Svg>}
        <Text numberOfLines={1} style={[calligraphyStyle(surahs.length > 1 && width < 320 ? 28 : 32), { color: p.ornament, lineHeight: 44 }]}>{surahNameGlyph(value.number)}</Text>
      </View>)}
    </View> : <Text style={{ color: name ? p.foreground : p.mutedForeground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{name || t('reader.jump.chooseDestination')}</Text>}
    {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{detail}</Text>}
  </View>;
}

/** A row of the list of surahs: its height at the usual text size, which the rows not drawn yet stand in for. */
const ROW = 72;
/** Rows drawn as the list opens, about the chosen surah; the rest follow once the sheet is on screen. */
const FIRST_ROWS = 20;

/**
 * The available surahs (all, or those of the goal session), searchable by name or number, as the
 * index lists them. To open quickly, only the rows about the chosen surah are drawn at first (the
 * others hold their place), and the whole list a moment later.
 */
function SurahPicker({ surahs, selected, limited, calligraphy, palette: p, onChoose, onBack, onReveal, pageName = (page) => t('reader.jump.startPage', { page }) }: {
  surahs: Surah[]; selected?: number; limited: boolean; calligraphy: boolean; palette: ReaderPalette; onChoose: (number: number) => void; onBack: () => void; onReveal: (y: number) => void;
  /** Where a surah starts: its page, or its thumun. */
  pageName?: (page: number) => string;
}) {
  const [query, setQuery] = useState('');
  const [complete, setComplete] = useState(false);
  const back = useRef<View>(null);
  useEffect(() => { focusView(back.current); }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => { timer = setTimeout(() => setComplete(true), 60); });
    return () => { cancelAnimationFrame(frame); if (timer) clearTimeout(timer); };
  }, []);
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
  const chosen = shown.findIndex(value => value.number === selected);
  const start = complete ? 0 : Math.max(0, Math.min(chosen - 6, shown.length - FIRST_ROWS));
  const end = complete ? shown.length : Math.min(shown.length, start + FIRST_ROWS);
  return <View style={s.picker}>
    <View style={s.pickerHeading}>
      <Button ref={back} palette={p} variant="outline" icon="back" label={t('reader.jump.backToForm')} onPress={onBack} />
      <View style={s.grow}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{limited ? t('reader.jump.sessionSurahs') : t('reader.jump.chooseSurah')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.jump.surahCount', { count: surahs.length })}</Text>
      </View>
    </View>
    <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('reader.jump.searchSurah')} placeholder={t('reader.jump.searchPlaceholder')} />
    <View onLayout={(event) => { layout.current.list = event.nativeEvent.layout.y; reveal(); }}
      style={[s.list, { borderColor: p.border, backgroundColor: p.card }]}>
      {shown.length ? <>
        {start > 0 && <View style={{ height: start * ROW }} />}
        {shown.slice(start, end).map((value, i) => {
          const current = value.number === selected;
          return <SurahRow key={value.number} surah={value} first={start + i === 0} current={current} calligraphy={calligraphy} detail={`${t('reader.jump.ayahs', { count: value.ayahs.length })} · ${pageName(value.ayahs[0].pageNumber)}`}
            palette={p} onChoose={onChoose} onLayout={current ? (y) => { layout.current.row = y; reveal(); } : undefined} />;
        })}
        {end < shown.length && <View style={{ height: (shown.length - end) * ROW }} />}
      </> : <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', padding: 20 }}>{t('reader.jump.noSurah')}</Text>}
    </View>
  </View>;
}

/** A surah in the list: its number on the star (filled when chosen), its name in calligraphy, its size and where it starts. */
const SurahRow = memo(function SurahRow({ surah, first, current, calligraphy, detail, palette: p, onChoose, onLayout }: {
  surah: Surah; first: boolean; current: boolean; calligraphy: boolean; detail: string; palette: ReaderPalette; onChoose: (number: number) => void; onLayout?: (y: number) => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={surah.name} accessibilityState={{ selected: current }} aria-selected={current}
    onLayout={onLayout ? (event) => onLayout(event.nativeEvent.layout.y) : undefined} onPress={() => onChoose(surah.number)}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? p.accent : current ? withAlpha(p.ornament, 0.1) : 'transparent' }]}>
    {!first && <View style={[s.separator, { backgroundColor: p.border }]} />}
    <Medallion value={surah.number} size={40} palette={p} current={current} />
    <View style={s.grow}>
      {calligraphy
        ? <Text accessibilityLabel={surah.name} numberOfLines={1} style={[calligraphyStyle(28), { color: p.ornament, lineHeight: 38 }]}>{surahNameGlyph(surah.number)}</Text>
        : <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{surah.name}</Text>}
      <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{detail}</Text>
    </View>
    {current && <ReaderIcon name="done" size={18} color={p.primary} />}
  </Pressable>;
});

const s = StyleSheet.create({
  form: { gap: 14 }, grow: { flex: 1, minWidth: 0 },
  board: { paddingTop: 34, paddingHorizontal: BOARD, paddingBottom: 16, gap: 14 },
  words: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 36 },
  word: { alignItems: 'center', minHeight: 44, justifyContent: 'flex-end' },
  pagePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ayahFields: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  field: { alignItems: 'center', gap: 2 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  input: { position: 'absolute', padding: 0, fontFamily: 'UiNumericSemiBold', textAlign: 'center', writingDirection: 'ltr', includeFontPadding: false,
    ...Platform.select({ web: { outlineStyle: 'solid', outlineWidth: 0 } }) },
  step: { width: STEP, height: STEP, borderRadius: STEP / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  surahInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 22 },
  destination: { alignItems: 'center', gap: 2 },
  glyphs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 10 },
  glyphPair: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  picker: { gap: 14 }, pickerHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: ROW, paddingVertical: 8, paddingHorizontal: 14 },
  separator: { position: 'absolute', top: 0, start: 66, end: 0, height: StyleSheet.hairlineWidth },
});
