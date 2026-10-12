import { expect, test } from 'bun:test';
import {
  decodeFatwas, decodeMeanings, decodeNotes, decodeQiraat, decodeSayings, decodeServiceBooks, decodeSimilar, decodeTopics,
  decodeTranslationLanguages, parseHafsReferences, watchLink,
} from '../src/lib/quranpedia/ayah-services';
import { decodeBookContent } from '../src/lib/quranpedia/related-content';
import { QuranpediaClient } from '../src/lib/quranpedia/client';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';

// Shaped as the services answer for 2:189 (fields as observed; texts shortened).
const books = [
  { id: 136, has_image: 0, name: 'تفسير القرآن العظيم', parts: 8, fundamental: 1, author: 'ابن كثير', year: 774, images: [], category: { id: 3, name: 'كتب التفسير' } },
  { id: 1, has_image: 0, name: 'تيسير التفسير', parts: 1, fundamental: 0, author: null, year: null, images: [], category: { id: 2, name: 'التفسير' } },
  { id: 0, name: 'بلا رقم' },
];

test('book lists keep each book with its author, year and standing, and skip malformed ones', () => {
  expect(decodeServiceBooks(books)).toEqual([
    { id: 136, name: 'تفسير القرآن العظيم', author: 'ابن كثير', year: 774, fundamental: true },
    { id: 1, name: 'تيسير التفسير', author: '', year: null, fundamental: false },
  ]);
  expect(() => decodeServiceBooks({ error: 'x' })).toThrow();
});

test('word meanings, similar ayahs, qira\'at and topics decode as the sheet shows them', () => {
  const meanings = decodeMeanings([{ book_info: { id: 491, name: 'السراج في بيان غريب القرآن', author: 'الخضيري' }, words: [{ text: 'الأَهِلّةِ', meaning: '<p>جَمْعُ هِلَالٍ</p>' }, { text: '', meaning: 'x' }] }]);
  expect(meanings).toEqual([{ book: { id: 491, name: 'السراج في بيان غريب القرآن', author: 'الخضيري' }, words: [{ word: 'الأَهِلّةِ', meaning: 'جَمْعُ هِلَالٍ' }] }]);

  const similar = decodeSimilar([{ notes: 'ضبط الآية', images: [], websites: [], youtube: [{ id: 1, file_name: 'https://www.youtube.com/embed/JLcmBV9-azw?start=0' }],
    ayahs: [{ info: { number: 215, text: '﻿يَسْأَلُونَكَ مَاذَا يُنْفِقُونَ', surah: { id: 2, name: 'سورة البقرة' } }, text: '<span>ﲼ</span>', ayah_ids: [222], ayah_to_number: null }, { info: { number: 3, surah: { id: 200 } } }] }]);
  expect(similar).toEqual([{ note: 'ضبط الآية', videos: ['https://www.youtube.com/embed/JLcmBV9-azw?start=0'], ayahs: [{ surah: 2, ayah: 215, surahName: 'سورة البقرة', text: 'يَسْأَلُونَكَ مَاذَا يُنْفِقُونَ' }] }]);

  const qiraat = decodeQiraat([{ ayah_word: 'الْبُيُوتَ', qiraat: [{ qiraa_text: '(البُيُوت) : بضم الباء', rewayat: [
    { rawi: { id: 2, name: 'ورش', qiraa: { id: 1, short_name: 'نافع' } }, audio: 'https://files.quranpedia.net/recitations/261/002188.mp3' },
    { rawi: { id: 10, name: 'حفص', qiraa: { short_name: 'عاصم' } }, audio: 'http://insecure.example/x.mp3' },
  ] }] }]);
  expect(qiraat[0].readings[0].rawis).toEqual([
    { id: 2, name: 'ورش', qiraa: 'نافع', audio: 'https://files.quranpedia.net/recitations/261/002188.mp3' },
    { id: 10, name: 'حفص', qiraa: 'عاصم', audio: null },
  ]);

  expect(decodeTopics([{ id: 5903, name: 'ألوان من البر', related_ayahs: '2:189', parent: { id: 5402, name: 'البرّ' } }, { id: 400, name: 'الباب', related_ayahs: '2:58, 2:189,4:154,x', parent: null }]))
    .toEqual([{ id: 5903, name: 'ألوان من البر', parent: { id: 5402, name: 'البرّ' }, ayahs: [{ surah: 2, ayah: 189 }] },
      { id: 400, name: 'الباب', parent: null, ayahs: [{ surah: 2, ayah: 58 }, { surah: 2, ayah: 189 }, { surah: 4, ayah: 154 }] }]);
  expect(parseHafsReferences('115:1,0:3,2:0')).toEqual([]);
});

test('fatwas, notes, sayings and languages keep their prose as plain text', () => {
  expect(decodeFatwas([{ id: 2166, fatwa: { question: 'ما معنى قوله تعالى؟', question_summary: '', answer: '<p>هي مواقيت</p>', answer_summary: '' }, attachments: [], people: [{ id: 4087, ar_name: 'ابن باز' }], category: null }]))
    .toEqual([{ id: 2166, question: 'ما معنى قوله تعالى؟', answer: 'هي مواقيت', muftis: ['ابن باز'] }]);
  expect(decodeNotes([{ id: 10732, ar_note: 'يسألونك عن الأهلة', author: 'عبدالله بلقاسم', images: [{ id: 1, name: null, url: 'https://files.quranpedia.net/a.png' }],
    youtube: [{ id: 2, name: null, url: 'https://www.youtube.com/embed/tkc8GlLZUyk?start=892&end=1604' }], websites: [], category: { id: 21, name: 'وقفات مع سور وآيات' }, book: null }]))
    .toEqual([{ id: 10732, text: 'يسألونك عن الأهلة', author: 'عبدالله بلقاسم', category: 'وقفات مع سور وآيات', images: ['https://files.quranpedia.net/a.png'], videos: ['https://www.youtube.com/embed/tkc8GlLZUyk?start=892&end=1604'] }]);
  expect(decodeSayings([{ id: 6047, title: 'سورة البقرة', type: 'نزول الآية', text: 'عن عطاء <sup>1</sup>', narrators: [{ id: 1, name: 'عطاء' }] }]))
    .toEqual([{ id: 6047, title: 'سورة البقرة', kind: 'نزول الآية', text: 'عن عطاء 1', narrators: ['عطاء'] }]);
  expect(decodeTranslationLanguages([{ id: 2, name: 'الإنجليزية', en_name: 'English', local_name: 'English', code: 'en', direction: 'ltr' }, { code: 'fa', local_name: 'فارسی', direction: 'rtl' }, { code: '../x' }]))
    .toEqual([{ code: 'en', name: 'الإنجليزية', localName: 'English', direction: 'ltr' }, { code: 'fa', name: 'fa', localName: 'فارسی', direction: 'rtl' }]);
  expect(watchLink('https://www.youtube.com/embed/tkc8GlLZUyk?start=892&end=1604')).toBe('https://www.youtube.com/watch?v=tkc8GlLZUyk&t=892s');
  expect(watchLink('https://example.com/v')).toBe('https://example.com/v');
});

test('book content keeps where in the book it is', () => {
  const content = decodeBookContent({ book: { id: 460, name: 'المحرر', author: { ar_name: 'المزيني' }, language: { direction: 'rtl' } }, content: [{ text: 'نص', part: 1, page: 245, ayahs: '2:189-2:189' }] });
  expect(content.citations).toEqual([{ part: '1', page: 245 }]);
});

test('the services are requested by the Hafs reference, and only known book services', async () => {
  const paths = [];
  const client = new QuranpediaClient({ storage: new MemoryCacheStorage(), fetch: async (url) => { paths.push(url); return Response.json(url.includes('available-languages') ? [] : url.endsWith('/e3rab') ? books : []); } });
  expect((await client.getAyahBooks(2, 189, 'e3rab')).data).toHaveLength(2);
  await client.getQiraat(2, 189); await client.getTranslationLanguages(2, 189);
  expect(paths.map((url) => url.replace('https://api.quranpedia.net/v1', ''))).toEqual(['/ayah/2/189/e3rab', '/ayah/2/189/qiraat', '/translations/available-languages/2/189']);
  expect(() => client.getAyahBooks(2, 189, 'book/1')).toThrow();
  expect(() => client.getNotes(115, 1)).toThrow();
  expect(() => client.getTranslations(2, 189, 'f r')).toThrow();
});

test('the sheet offers what the ayah lists, the probed books found, and finds ayahs by their Hafs place', async () => {
  const { availableSciences, editionAyah } = await import('../src/features/quran-reader/components/reading/ayah/sciences');
  const ayah = { mushafId: 4, surahNumber: 2, ayahNumber: 188, hafsAyahNumbers: [189], availableContent: ['tafsir', 'qiraat', 'unknown'] };
  expect([...availableSciences(ayah, ['nasekh'])].sort()).toEqual(['nasekh', 'qiraat', 'tafsir']);
  // Without options in the data, everything the source lists is offered.
  expect(availableSciences({ ...ayah, availableContent: [] }, []).size).toBe(11);
  const quran = { surahs: [{ number: 2, ayahs: [ayah, { ...ayah, ayahNumber: 213, hafsAyahNumbers: [215] }] }] };
  expect(editionAyah(quran, { surah: 2, ayah: 215 })?.ayahNumber).toBe(213);
  expect(editionAyah(quran, { surah: 3, ayah: 1 })).toBeUndefined();
});
