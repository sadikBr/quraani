import { expect, test } from 'bun:test';
import { cardTranslation, cardQuranFontSize, cardMinimumHeight } from '../src/features/quran-reader/utils/ayah-card';

const translation = (id, text) => ({ book: { id, name: `Source ${id}`, author: '' }, texts: [text], direction: 'ltr' });
test('a Warsh ayah spanning several Hafs ayahs uses a single complete translation source in order', () => {
  const result = cardTranslation([
    [translation(1, 'Only the first'), translation(2, '<p>First &amp; second</p>')],
    [translation(3, 'Different author'), translation(2, 'The continuation')],
  ]);
  expect(result).toEqual({ bookId: 2, source: 'Source 2', text: 'First & second\nThe continuation' });
});
test('missing or empty parallel translations never produce a partial or mixed-source card', () => {
  expect(cardTranslation([])).toBeNull();
  expect(cardTranslation([[translation(1, 'A')], []])).toBeNull();
  expect(cardTranslation([[translation(1, 'A')], [translation(2, 'B')]])).toBeNull();
  expect(cardTranslation([[translation(1, 'A')], [translation(1, '<p></p>')]])).toBeNull();
});
test('card typography does not shrink in response to Quran diacritics and keeps long text readable', () => {
  expect(cardQuranFontSize('الْحَمْدُ لِلَّهِ', false, 'status')).toBe(cardQuranFontSize('الحمد لله', false, 'status'));
  expect(cardQuranFontSize('كلمة '.repeat(300), true, 'status')).toBeGreaterThanOrEqual(22);
  expect(cardMinimumHeight(360, 'status')).toBe(640);
  expect(cardMinimumHeight(360, 'square')).toBe(360);
});
