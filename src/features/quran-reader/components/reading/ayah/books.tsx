import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import type { BookService, ServiceBook } from '@/lib/quranpedia/ayah-services';
import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';
import { formatList, t } from '@/i18n';
import { readerShape, withAlpha } from '../../../design';
import { quranpedia } from '../../../services/reader-service';
import type { ReaderPalette } from '../../../theme';
import { ayahKey } from '../../../utils/references';
import { normalizeArabicSearch } from '../../../utils/search';
import { LibrarySearch } from '../../ui/library-chrome';
import { ReaderIcon } from '../../ui/reader-icon';
import { chooseBook, useSheetChoices } from './choices';
import { hafsNumbers } from './sciences';
import { Heading, Pill, Prose, settled, StaleNote, Star, Status, useInnerBack, useRequest, type ScienceProps } from './shared';

/** The tafsir read before any choice: al-Muyassar, short and plain, as the sheet always opened on. */
const FIRST_TAFSIR = 2012;
/** Up to this many books, they are offered side by side; more, from a list. */
const SIDE_BY_SIDE = 4;

const byStanding = (books: ServiceBook[]) => [...books.filter((book) => book.fundamental), ...books.filter((book) => !book.fundamental)];
const authorLine = (book: ServiceBook) => formatList([book.author, book.year ? t('reader.sciences.books.died', { year: book.year }) : ''].filter(Boolean));

/**
 * A science read in books (the tafsir, i'rab, the reasons of revelation, abrogation, the
 * ambiguous): the book open on the ayah, as its title page (a plate with a gold spine) and then
 * its text; the other books a touch away, side by side when few, from a list when many.
 */
export function BookView({ ayah, palette: p, service }: ScienceProps & { service: BookService }) {
  const choices = useSheetChoices();
  const [picking, setPicking] = useState(false);
  useInnerBack(picking ? () => setPicking(false) : null);
  // The books are listed by the first Hafs ayah the ayah spans.
  const first = hafsNumbers(ayah)[0];
  const books = useRequest(`books:${service}:${ayahKey(ayah)}`, async () => first ? quranpedia.getAyahBooks(ayah.surahNumber, first, service) : { data: [], stale: false });
  const list = useMemo(() => byStanding(books.data ?? []), [books.data]);
  const wanted = choices.books[service] ?? (service === 'tafsir' ? FIRST_TAFSIR : undefined);
  const book = list.find((entry) => entry.id === wanted) ?? list[0];
  const choose = (id: number) => { chooseBook(service, id); setPicking(false); };

  if (books.status !== 'ready' || !book) return <Status loaded={books} empty={!list.length} palette={p} />;
  if (picking) return <BookList books={list} chosen={book.id} palette={p} onChoose={choose} />;
  return <View style={{ gap: 18 }}>
    {list.length > SIDE_BY_SIDE
      ? <BookPlate book={book} count={list.length} palette={p} onPress={() => setPicking(true)} />
      : list.length > 1
        ? <View accessibilityRole="radiogroup" accessibilityLabel={t('reader.sciences.books.choose')} style={s.choices}>
          {list.map((entry) => <Pill key={entry.id} radio label={entry.name} hint={authorLine(entry)} selected={entry.id === book.id} palette={p} style={{ maxWidth: '100%' }} onPress={() => chooseBook(service, entry.id)} />)}
        </View>
        : <BookPlate book={book} palette={p} />}
    <BookText key={book.id} ayah={ayah} service={service} book={book} palette={p} />
  </View>;
}

/** The open book's title page: its name, its author and when he died, a gold spine at its side. */
function BookPlate({ book, count, palette: p, onPress }: { book: ServiceBook; count?: number; palette: ReaderPalette; onPress?: () => void }) {
  const body = <>
    <View aria-hidden style={[s.spine, { backgroundColor: withAlpha(p.ornament, 0.85) }]} />
    <View style={{ flex: 1, minWidth: 0, gap: 2, paddingVertical: 12 }}>
      <Text style={{ color: p.foreground, fontSize: 17, lineHeight: 29, fontFamily: 'ReaderNaskhBold' }}>{book.name}</Text>
      {!!authorLine(book) && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{authorLine(book)}</Text>}
      {!!count && <Text style={{ color: p.primary, fontSize: 12, lineHeight: 20, fontWeight: '600', marginTop: 2 }}>{t('reader.sciences.books.among', { count })}</Text>}
    </View>
    {onPress && <ReaderIcon name="chevron-down" color={p.mutedForeground} size={18} />}
  </>;
  const look = [s.plate, { backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.45) }];
  if (!onPress) return <View style={look}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={formatList([book.name, authorLine(book)].filter(Boolean))} accessibilityHint={t('reader.sciences.books.choose')} onPress={onPress}
    style={({ pressed }) => [look, pressed && { backgroundColor: p.accent }]}>{body}</Pressable>;
}

/** All the books, the reference works first, with a search by title or author. */
function BookList({ books, chosen, palette: p, onChoose }: { books: ServiceBook[]; chosen: number; palette: ReaderPalette; onChoose: (id: number) => void }) {
  const [query, setQuery] = useState('');
  const needle = normalizeArabicSearch(query);
  const found = needle ? books.filter((book) => normalizeArabicSearch(`${book.name} ${book.author}`).includes(needle)) : books;
  const sections = [
    { title: t('reader.sciences.books.fundamental'), books: found.filter((book) => book.fundamental) },
    { title: t('reader.sciences.books.rest'), books: found.filter((book) => !book.fundamental) },
  ].filter((section) => section.books.length);
  return <View style={{ gap: 16 }}>
    <LibrarySearch value={query} onChange={setQuery} label={t('reader.sciences.books.search')} placeholder={t('reader.sciences.books.search')} palette={p} />
    {!sections.length && <Text style={{ color: p.mutedForeground, fontSize: 14, textAlign: 'center', paddingVertical: 12 }}>{t('reader.sciences.books.none')}</Text>}
    {sections.map((section) => <View key={section.title} accessibilityRole="radiogroup" style={{ gap: 6 }}>
      <Heading palette={p} size={16}>{section.title}</Heading>
      {section.books.map((book) => {
        const on = book.id === chosen;
        return <Pressable key={book.id} accessibilityRole="radio" accessibilityLabel={book.name} accessibilityHint={authorLine(book)} accessibilityState={{ checked: on }} aria-checked={on}
          onPress={() => onChoose(book.id)} style={({ pressed }) => [s.book, { backgroundColor: pressed ? p.accent : on ? withAlpha(p.primary, 0.06) : 'transparent' }]}>
          <CheckMark checked={on} palette={p} radio />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 27, fontFamily: on ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{book.name}</Text>
            {!!authorLine(book) && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{authorLine(book)}</Text>}
          </View>
        </Pressable>;
      })}
    </View>)}
  </View>;
}

/** The book's text on the ayah (on each Hafs ayah it spans), ending on a star and where in the book it is. */
function BookText({ ayah, service, book, palette: p }: { ayah: ScienceProps['ayah']; service: BookService; book: ServiceBook; palette: ReaderPalette }) {
  const numbers = hafsNumbers(ayah);
  const content = useRequest(`book:${service}:${book.id}:${ayahKey(ayah)}`, async () => {
    const answers = await settled(numbers.map(async (hafs) => ({ hafs, answer: await quranpedia.getBookContent(ayah.surahNumber, hafs, book.id) })));
    return { data: answers.map(({ hafs, answer }) => ({ hafs, text: answer.data, prose: answer.data.texts.map(relatedPlainText).filter(Boolean).join('\n') })), stale: answers.some(({ answer }) => answer.stale) };
  });
  const parts = (content.data ?? []).filter((part) => part.prose);
  if (content.status !== 'ready') return <Status loaded={content} empty={false} palette={p} />;
  if (!parts.length) return <Status loaded={content} empty palette={p} />;
  return <View style={{ gap: 18 }}>
    {parts.map((part) => <View key={part.hafs} style={{ gap: 12 }}>
      {parts.length > 1 && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.related.parallelReference', { surah: ayah.surahNumber, ayah: part.hafs })}</Text>}
      <Prose text={part.prose} direction={part.text.direction} palette={p} />
    </View>)}
    <Colophon text={parts[0].text} palette={p} />
    {content.stale && <StaleNote palette={p} />}
  </View>;
}

/** The end of a passage: a star between two lines, then where it is in the book. */
function Colophon({ text, palette: p }: { text: RelatedText; palette: ReaderPalette }) {
  const place = text.citations?.[0];
  return <View style={{ alignItems: 'center', gap: 6 }}>
    <View aria-hidden style={s.colophon}>
      <Svg width={60} height={2}><Path d="M 0 1 H 60" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} /></Svg>
      <Star size={12} palette={p} filled />
      <Svg width={60} height={2}><Path d="M 0 1 H 60" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} /></Svg>
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
      {formatList([text.book.name, place ? (place.part && place.part !== '0' ? t('reader.sciences.books.partPage', { part: place.part, page: place.page }) : t('reader.sciences.books.page', { page: place.page })) : ''].filter(Boolean))}
    </Text>
  </View>;
}

const s = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plate: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingEnd: 14, borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  spine: { alignSelf: 'stretch', width: 6 },
  book: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 10, borderRadius: readerShape.lg },
  colophon: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
});
