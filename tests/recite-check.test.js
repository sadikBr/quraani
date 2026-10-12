import { describe, expect, test } from 'bun:test';
import sample from './fixtures/quranpedia/warsh-tajweed-sample.json';
import { alike, ayahsToCompare, checkRecitation, normalizeWord } from '../src/features/recite-check/compare';

const surah = (n) => sample.surahs.find((s) => s.id === n).ayahs.map((a) => ({ surahNumber: n, ayahNumber: a.number, text: a.text }));
const fatiha = surah(1);
const nas = surah(114);
/** Each word in order: «.» recited, «W» said differently, «M» left out. */
const marks = (check) => check.words.map((w) => w.status === 'ok' ? '.' : w.status === 'wrong' ? 'W' : 'M').join('');

// What the model writes for a correct recitation of An-Nas, in plain spelling.
const NAS = 'قل أعوذ برب الناس ملك الناس إله الناس من شر الوسواس الخناس الذي يوسوس في صدور الناس من الجنة والناس';

describe('words of the Warsh mushaf against plain spelling', () => {
  test('marks, hamza and alef forms, and Uthmani spellings come to the same letters', () => {
    expect(normalizeWord('اِ۬لْحَمْدُ')).toBe(normalizeWord('الحمد'));
    expect(normalizeWord('اِ۬لْعَٰلَمِينَ')).toBe(normalizeWord('العالمين'));
    expect(normalizeWord('اَ۬لصِّرَٰطَ')).toBe(normalizeWord('الصراط'));
    expect(normalizeWord('اِ۬لذِے')).toBe(normalizeWord('الذي'));
    expect(normalizeWord('اَ۬لضَّآلِّينَۖ')).toBe(normalizeWord('الضالين'));
    // Warsh drops the hamza where Hafs writes it.
    expect(normalizeWord('يُومِنُونَ')).toBe(normalizeWord('يُؤْمِنُونَ'));
  });

  test('a spelling difference is the same word; a changed word is not', () => {
    expect(alike(normalizeWord('ٱلصَّلَوٰةَ'), normalizeWord('الصلاة'))).toBe(true);
    expect(alike(normalizeWord('ذَٰلِكَ'), normalizeWord('ذلك'))).toBe(true);
    expect(alike(normalizeWord('عَلَىٰ'), normalizeWord('على'))).toBe(true);
    expect(alike(normalizeWord('قَالَ'), normalizeWord('قل'))).toBe(false);
    expect(alike(normalizeWord('مِن'), normalizeWord('ما'))).toBe(false);
    expect(alike(normalizeWord('فِي'), normalizeWord('فيه'))).toBe(false);
  });
});

describe('a recitation compared with the ayahs', () => {
  test('a correct recitation: every word recited, up to the last ayah', () => {
    const check = checkRecitation(nas, NAS);
    expect(marks(check)).toBe('.'.repeat(20));
    expect(check.counts).toEqual({ ok: 20, wrong: 0, missed: 0, extra: 0 });
    expect(check.reached).toBe(5);
  });

  test('with diacritics, as the model often writes', () => {
    const check = checkRecitation(fatiha, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ مَلِكِ يَوْمِ الدِّينِ');
    expect(marks(check)).toBe('.........');
    expect(check.reached).toBe(2);
  });

  test('stopping early: the words after it are not counted as left out', () => {
    const check = checkRecitation(nas, 'قل أعوذ برب الناس ملك الناس');
    expect(marks(check)).toBe('......');
    expect(check.reached).toBe(1);
  });

  test('a word left out, a word changed and a word added are each found where they are', () => {
    // Leaves out «الخناس», says «قال» for «قل», adds «الكريم» after «برب», and stops before the last ayah.
    const check = checkRecitation(nas, 'قال أعوذ برب الكريم الناس ملك الناس إله الناس من شر الوسواس الذي يوسوس في صدور الناس');
    expect(check.words.find((w) => w.status === 'wrong')).toMatchObject({ ayah: 0, word: 0, heard: 'قال' });
    expect(check.words.find((w) => w.status === 'missed')).toMatchObject({ ayah: 3, word: 3 });
    expect(check.extras).toEqual([{ after: { ayah: 0, word: 2 }, text: 'الكريم' }]);
    expect(check.counts).toEqual({ ok: 15, wrong: 1, missed: 1, extra: 1 });
  });

  test('a whole ayah left out, then the recitation goes on', () => {
    const check = checkRecitation(nas, 'قل أعوذ برب الناس إله الناس من شر الوسواس الخناس');
    expect(marks(check)).toBe('....MM......');
    expect(check.words.filter((w) => w.status === 'missed').every((w) => w.ayah === 1)).toBe(true);
  });

  test('the isti\'adha and basmala before, and «صدق الله العظيم» after, are not part of the comparison', () => {
    const check = checkRecitation(nas, `أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم ${NAS} صدق الله العظيم`);
    expect(check.counts).toEqual({ ok: 20, wrong: 0, missed: 0, extra: 0 });
  });

  test('a word the model splits in two still counts as recited', () => {
    const ayahs = [{ surahNumber: 2, ayahNumber: 20, text: 'يَٰٓأَيُّهَا اَ۬لنَّاسُ اُ۟عْبُدُواْ رَبَّكُمُ' }];
    expect(marks(checkRecitation(ayahs, 'يا أيها الناس اعبدوا ربكم'))).toBe('....');
  });

  test('nothing recognised: nothing recited', () => {
    expect(checkRecitation(nas, '')).toMatchObject({ words: [], extras: [], reached: -1 });
  });

  test('only enough ayahs are compared to cover what was heard', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ text: 'كلمة '.repeat(10).trim(), i }));
    expect(ayahsToCompare(many, 50).length).toBe(12);
    expect(ayahsToCompare(nas, 500)).toHaveLength(6);
  });
});

describe('the microphone\'s samples', () => {
  test('base64 decodes to the same bytes as the platform decoder, at every padding', async () => {
    const { fromBase64 } = await import('../src/features/recite-check/base64');
    for (const length of [0, 1, 2, 3, 4, 5, 4096]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) % 256);
      const encoded = Buffer.from(bytes).toString('base64');
      expect(Array.from(fromBase64(encoded))).toEqual(Array.from(bytes));
    }
  });
});
