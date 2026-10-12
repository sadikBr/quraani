import { StyleSheet, Text as NativeText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { MeaningsBook } from '@/lib/quranpedia/ayah-services';
import { withAlpha } from '../../../design';
import { quranpedia } from '../../../services/reader-service';
import { normalizeArabicSearch } from '../../../utils/search';
import { RIGHT, StaleNote, Status, useAyahService, type ScienceProps } from './shared';

const load = (surah: number, ayah: number) => quranpedia.getMeanings(surah, ayah);

/** One rare word and what each book says it means. */
interface Entry { word: string; glosses: { meaning: string; book: string }[] }

function entries(books: MeaningsBook[]): Entry[] {
  const found = new Map<string, Entry>();
  for (const { book, words } of books) for (const { word, meaning } of words) {
    const key = normalizeArabicSearch(word);
    const entry = found.get(key) ?? { word, glosses: [] };
    if (!entry.glosses.some((gloss) => gloss.meaning === meaning)) entry.glosses.push({ meaning, book: book.name });
    found.set(key, entry);
  }
  return [...found.values()];
}

/**
 * The ayah's rare words as a glossary of the margin: each word set large in gold on the reading
 * side, across a gold line from what the books of gharib say it means.
 */
export function MeaningsView({ ayah, palette: p }: ScienceProps) {
  const meanings = useAyahService(ayah, 'meanings', load);
  const list = entries(meanings.data ?? []);
  if (meanings.status !== 'ready' || !list.length) return <Status loaded={meanings} empty={!list.length} palette={p} />;
  return <View style={{ gap: 22 }}>
    {list.map((entry) => <View key={entry.word} style={s.entry}>
      <View style={s.lemma}>
        <Text accessibilityRole="header" style={{ color: p.ornament, fontSize: 23, lineHeight: 40, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{entry.word}</Text>
      </View>
      <View style={[s.glosses, { borderColor: withAlpha(p.ornament, 0.4) }]}>
        {entry.glosses.map((gloss, i) => <View key={i} style={{ gap: 2 }}>
          <NativeText selectable style={{ color: p.foreground, fontSize: 17, lineHeight: 31, fontFamily: 'ReaderNaskh', writingDirection: 'rtl', textAlign: RIGHT }}>{gloss.meaning}</NativeText>
          <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{gloss.book}</Text>
        </View>)}
      </View>
    </View>)}
    {meanings.stale && <StaleNote palette={p} />}
  </View>;
}

const s = StyleSheet.create({
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  lemma: { width: '30%', minWidth: 84, paddingTop: 2 },
  glosses: { flex: 1, minWidth: 0, gap: 14, borderStartWidth: 1.5, paddingStart: 14 },
});
