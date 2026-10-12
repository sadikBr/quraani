import { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text as QuranText, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { createArabicMatcher, normalizeArabicSearch, searchableArabic, type QuranSearchResult } from '../../utils/search';
import type { ReaderPalette } from '../../theme';
import { readerShape, withAlpha } from '../../design';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { ReaderIcon } from '../ui/reader-chrome';
import { t } from '@/i18n';

/**
 * The words of `text` (split at its spaces) that a search for `query` found, as runs of plain and
 * found words in order; null when nothing is looked for. A word is found when it is part of a
 * shortest stretch of words that matches.
 */
function foundRuns(text: string, query: string): { text: string; found: boolean }[] | null {
  const matches = createArabicMatcher(query);
  if (!matches) return null;
  const words = text.split(' ');
  const span = normalizeArabicSearch(query).split(' ').length;
  const found = new Set<number>();
  const fits = (i: number, j: number) => matches(searchableArabic(words.slice(i, j + 1).join(' ')));
  for (let i = 0; i < words.length; i++) {
    for (let j = i; j < Math.min(words.length, i + span + 1); j++) {
      if (!fits(i, j)) continue;
      // The stretch must need its first word: otherwise it is found from the next word on.
      if (i < j && fits(i + 1, j)) break;
      for (let x = i; x <= j; x++) found.add(x);
      break;
    }
  }
  if (!found.size) return null;
  const runs: { text: string; found: boolean }[] = [];
  words.forEach((word, i) => {
    const last = runs[runs.length - 1], on = found.has(i);
    // The space before a word goes with the run before it, so a found run is the words alone.
    if (last && last.found === on) last.text += ` ${word}`;
    else { if (last) last.text += ' '; runs.push({ text: word, found: on }); }
  });
  return runs;
}

/**
 * An ayah found or kept, set as in the mushaf: its surah's name in the calligraphy of its title
 * and its number on the eight-pointed star at the head, then the ayah in the mushaf's script,
 * closed by its own ayah mark, the words searched for written in gold (as a manuscript rubricates).
 * A gold ribbon hangs from a kept ayah. Below, keeping it and opening it in the mushaf.
 */
export const AyahResultCard = memo(function AyahResultCard({ item, palette: p, fontFamily, display = (text) => text, marker, query = '', lines = 4, bookmarked, saved, canSave, onOpen, onSave }: {
  item: QuranSearchResult; palette: ReaderPalette; fontFamily: string; bookmarked: boolean; saved: boolean; canSave: boolean; onOpen: () => void; onSave: () => void;
  /** The text as the font draws it (see `quranScript`); applied word by word. */
  display?: (text: string) => string;
  /** The ayah's end mark, as the mushaf's font draws it (its number in a rosette). */
  marker?: string;
  /** What was searched for, to mark the words found. */
  query?: string;
  /** The most lines of the ayah shown. */
  lines?: number;
}) {
  const runs = useMemo(() => foundRuns(item.text, query), [item.text, query]);
  const { surahNumber, ayahNumber } = item.reference;
  return <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('library.result.label', { surah: item.surahName, ayah: ayahNumber, page: item.pageNumber, text: item.text })} accessibilityHint={t('library.result.hint')} onPress={onOpen}
      style={({ pressed }) => [s.body, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={s.heading}>
        <QuranText accessibilityLabel={item.surahName} numberOfLines={1} style={[calligraphyStyle(30), { color: p.ornament, lineHeight: 40, flexShrink: 1 }]}>{surahNameGlyph(surahNumber)}</QuranText>
        <Medallion value={ayahNumber} size={34} palette={p} />
        <View style={{ flex: 1 }} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, marginEnd: bookmarked ? 26 : 0 }}>{t('library.index.item.page', { page: item.pageNumber })}</Text>
      </View>
      <QuranText numberOfLines={lines} style={[s.ayah, { color: p.foreground, fontFamily }]}>
        {runs ? runs.map((run, i) => <QuranText key={i} style={run.found ? { color: p.ornament, backgroundColor: withAlpha(p.ornament, 0.13) } : undefined}>{display(run.text)}</QuranText>) : display(item.text)}
        {!!marker && <QuranText style={{ color: p.ornament }}>{` ${marker}`}</QuranText>}
      </QuranText>
    </Pressable>
    {bookmarked && <Ribbon palette={p} />}
    <View style={[s.footer, { borderColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={bookmarked ? t('library.result.unsaveLabel', { surah: item.surahName, ayah: ayahNumber }) : t('library.result.saveLabel', { surah: item.surahName, ayah: ayahNumber })} accessibilityState={{ disabled: !canSave, selected: bookmarked }} aria-pressed={bookmarked} disabled={!canSave} onPress={onSave}
        style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accent : 'transparent', opacity: canSave ? 1 : 0.4 }]}>
        <ReaderIcon name={bookmarked && !saved ? 'check' : 'bookmark'} color={bookmarked && !saved ? p.primary : p.mutedForeground} size={17} />
        <Text style={{ color: bookmarked && !saved ? p.primary : p.mutedForeground, fontSize: 13, fontWeight: '500' }}>{saved ? t('library.result.unsave') : bookmarked ? t('library.result.saved') : t('library.result.save')}</Text>
      </Pressable>
      <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: p.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('library.result.openLabel', { surah: item.surahName, ayah: ayahNumber })} onPress={onOpen} style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <Text style={{ color: p.primary, fontSize: 13, fontWeight: '600' }}>{t('library.result.open')}</Text><ReaderIcon name="chevron" color={p.primary} size={15} />
      </Pressable>
    </View>
  </View>;
});

/** The silk ribbon of a kept ayah, hanging from the card's top edge at its end. */
function Ribbon({ palette: p }: { palette: ReaderPalette }) {
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.ribbon}>
    <Svg width={16} height={30}>
      <Path d="M 0 0 H 16 V 29 L 8 23 L 0 29 Z" fill={p.ornament} />
      <Path d="M 3 0 V 23.5 M 13 0 V 23.5" stroke={withAlpha(p.card, 0.45)} strokeWidth={0.8} />
    </Svg>
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  body: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 4 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ayah: { fontSize: 23, lineHeight: 46, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'auto' : 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  action: { flex: 1, minHeight: 46, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 6 },
  ribbon: { position: 'absolute', top: 0, end: 16 },
});
