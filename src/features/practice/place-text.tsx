import { Text, View } from 'react-native';
import { ArabicText } from '@/components/arabic-text';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { ayahWords } from '@/features/quran-reader/utils/page-practice';
import { formatList, t } from '@/i18n';
import type { PracticePlace, PracticeSource } from './engine';

type Ayah = PracticeSource['ayahs'][number] & { marker?: string };

/** The words of a place: the cue, then what is recited (`revealed` words of it), in reading order. */
export function placeWords(source: PracticeSource, place: PracticePlace) {
  const ayahs: { ayah: Ayah; words: string[]; cue: number }[] = [];
  for (let i = place.ayah; i < place.end; i++) {
    const words = ayahWords(source.ayahs[i].text);
    ayahs.push({ ayah: source.ayahs[i] as Ayah, words, cue: i === place.ayah ? Math.min(place.shown, words.length) : 0 });
  }
  const total = ayahs.reduce((n, a) => n + a.words.length - a.cue, 0);
  return { ayahs, total };
}

/** Text size for the whole passage, chosen once so it does not change while words are revealed. */
export function passageSize(source: PracticeSource, place: PracticePlace) {
  let words = 0;
  for (let i = place.ayah - place.context; i < place.end; i++) words += ayahWords(source.ayahs[i].text).length;
  return words <= 24 ? 30 : words <= 60 ? 27 : words <= 120 ? 25 : 23;
}

/**
 * The cue and what has been revealed. Ayahs shown before the cue (to tell it apart) sit above it,
 * lighter. Hidden words are not drawn: the text grows as it is revealed, ending in «…». Ayah
 * markers carry the ayah's number, so they stay hidden until the hint is shown or checking starts.
 */
export function PlaceText({ source, place, revealed, markers, fontFamily, display = (text) => text, size, palette: p }: {
  source: PracticeSource; place: PracticePlace; revealed: number; markers: boolean; fontFamily: string; size: number; palette: ReaderPalette;
  /** The text as the font draws it (see `quranScript`). */
  display?: (text: string) => string;
}) {
  const { ayahs, total } = placeWords(source, place);
  const lineHeight = Math.round(size * 1.95);
  const quran = { fontFamily, fontSize: size, lineHeight, writingDirection: 'rtl' as const, textAlign: 'center' as const, fontWeight: '400' as const, includeFontPadding: true };
  const context = Array.from({ length: place.context }, (_, i) => source.ayahs[place.ayah - place.context + i] as Ayah);
  const pieces: { text: string; muted?: boolean; marker?: boolean }[] = [];
  let left = revealed, more = false;
  for (const { ayah, words, cue } of ayahs) {
    const visible = cue + Math.max(0, Math.min(words.length - cue, left));
    left -= visible - cue;
    pieces.push({ text: words.slice(0, visible).join('') });
    if (visible < words.length) { more = true; break; }
    if (markers && ayah.marker) pieces.push({ text: ` ${ayah.marker} `, marker: true });
    else pieces.push({ text: ' ' });
  }
  if (revealed < total && !more) more = true;
  const spoken = pieces.filter((x) => !x.marker).map((x) => x.text).join('').trim();
  return <View style={{ gap: 10 }}>
    {!!context.length && <Text accessibilityLabel={context.map((a) => a.text).join(' ')}
      style={[quran, { fontSize: Math.round(size * 0.8), lineHeight: Math.round(size * 0.8 * 1.95), color: p.mutedForeground }]}>
      {context.map((a, i) => <Text key={i}>{display(a.text)}{markers && a.marker ? <Text style={{ color: p.ornament }}>{` ${a.marker} `}</Text> : ' '}</Text>)}
    </Text>}
    <Text accessibilityLabel={more ? formatList([spoken, t('practice.session.hidden')]) : spoken} style={[quran, { color: p.foreground }]}>
      {pieces.map((x, i) => x.marker ? <Text key={i} style={{ color: p.ornament }}>{x.text}</Text> : <Text key={i}>{display(x.text)}</Text>)}
      {more && <ArabicText style={{ color: p.mutedForeground, fontSize: Math.round(size * 0.8) }}>{' …'}</ArabicText>}
    </Text>
  </View>;
}
