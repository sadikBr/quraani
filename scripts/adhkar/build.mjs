// Builds the app's daily adhkar from Hisn al-Muslim (hisnmuslim.com). Run: node scripts/adhkar/build.mjs
//
// hisnmuslim-ar.json holds the source texts as published by the site's API (chapters 27, 25, 28 and 1),
// Unicode-normalized (NFC). This script only rearranges them for the app: it removes the book's
// brackets and counting notes (the count is shown separately), splits counted parts into their own
// counters, separates the morning and evening wordings the book gives in its notes, and keeps
// the book's instructions as short notes. Every edit is asserted, so a changed source fails loudly.
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('./hisnmuslim-ar.json', import.meta.url), 'utf8'));
const byId = new Map(Object.values(source.chapters).flat().map((item) => [item.id, item]));
const n = (text) => text.normalize('NFC');
const fail = (message) => { throw new Error(message); };

/** Typos in the API text, corrected against the mushaf and the book. */
const corrections = {
  76: [['وَ النَّاسِ', 'وَالنَّاسِ']], 70: [['وَ النَّاسِ', 'وَالنَّاسِ']], 99: [['وَ النَّاسِ', 'وَالنَّاسِ']],
  98: [['نَبَيِّنَا', 'نَبِيِّنَا']],
  4: [['وَعَلَىَ جُنُوبِهِمْ', 'وَعَلَى جُنُوبِهِمْ']],
};
const raw = (id) => (corrections[id] ?? []).reduce((text, [from, to]) => replaceOnce(text, from, to), n(byId.get(id)?.text ?? fail(`Missing dhikr ${id}`)));
/** Spacing and punctuation only; the words and their marks are kept. */
const tidy = (text) => n(text)
  .replace(/ـ/g, '') // tatweel
  .replace(/,/g, '،')
  .replace(/\s+([،.:])/g, '$1')
  .replace(/:(?=\S)/g, ': ')
  .replace(/\s*\*\s*/g, ' ٭ ') // the book's ayah separators
  .replace(/[ \t]{2,}/g, ' ')
  .trim();
/** The quoted words of a dhikr: inside (( … )), or ( … ) in some chapters. */
function quoted(id) {
  const text = raw(id);
  const [open, close] = text.includes('((') ? ['((', '))'] : ['( ', ' )'];
  const start = text.indexOf(open), end = text.lastIndexOf(close);
  if (start < 0 || end <= start) fail(`No quotation in ${id}`);
  return tidy(text.slice(start + open.length, end));
}
function replaceOnce(text, from, to) {
  const at = text.indexOf(n(from));
  if (at < 0 || text.indexOf(n(from), at + 1) >= 0) fail(`Expected one «${from}»`);
  return text.slice(0, at) + n(to) + text.slice(at + n(from).length);
}
const swap = (text, pairs) => pairs.reduce((value, [from, to]) => replaceOnce(value, from, to), text);
/** Removes a fixed annotation (e.g. the spoken count) from a source text. */
const without = (id, ...parts) => tidy(parts.reduce((text, part) => replaceOnce(text, part, ''), raw(id))).replace(/\.$/, '');
/** Quran passages separated by «بسم الله…» start on their own lines. */
const surahLines = (text) => text.split(/[.،]\s*(?=بسم الله)/).map((line) => line.trim()).join('\n');

const item = (key, text, count, extra = {}) => ({ key, text: n(text), count, ...extra });

// Morning and evening (chapter 27). The book gives the evening wording in notes after the morning one.
const q = (id) => quoted(id);
const shared = {
  75: item('75', without(75), 1, { audio: 75, quran: true }),
  76: item('76', surahLines(without(76, ' (ثلاثَ مرَّاتٍ).')), 3, { audio: 76, quran: true }),
  79: item('79', q(79), 1, { audio: 79 }),
  82: item('82', q(82), 3, { audio: 82 }),
  83: item('83', q(83), 7, { audio: 83 }),
  84: item('84', q(84), 1, { audio: 84 }),
  85: item('85', q(85), 1, { audio: 85 }),
  86: item('86', q(86), 3, { audio: 86 }),
  87: item('87', q(87), 3, { audio: 87 }),
  88: item('88', q(88), 1, { audio: 88 }),
  91: item('91', q(91), 100, { audio: 91 }),
  92: item('92', q(92), 10, { audio: 92, note: 'أو مرة واحدة عند الكسل' }),
  98: item('98', q(98), 10, { audio: 98 }),
};
const morning = [
  shared[75], shared[76],
  item('77', q(77), 1, { audio: 77 }),
  item('78', q(78), 1, { audio: 78 }),
  shared[79],
  item('80', q(80), 4, { audio: 80 }),
  item('81', q(81), 1, { audio: 81 }),
  shared[82], shared[83], shared[84], shared[85], shared[86], shared[87], shared[88],
  item('89', q(89), 1, { audio: 89 }),
  item('90', q(90), 1, { audio: 90 }),
  shared[91], shared[92],
  item('93', q(93), 100, { audio: 93 }),
  item('94', q(94), 3, { audio: 94 }),
  item('95', q(95), 1, { audio: 95 }),
  item('96', q(96), 100, { audio: 96, note: 'مائة مرة في اليوم' }),
  shared[98],
];
// The recordings say the morning words, so the evening wordings have none.
const evening = [
  shared[75], shared[76],
  item('77e', swap(q(77), [
    ['أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ', 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ'],
    ['خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيرَ مَا بَعْدَهُ', 'خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا'],
    ['شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ', 'شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا'],
  ]), 1),
  item('78e', swap(q(78), [
    ['بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا', 'بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا'],
    ['النُّشُورُ', 'الْمَصِيرُ'],
  ]), 1),
  shared[79],
  item('80e', swap(q(80), [['أَصْبَحْتُ', 'أَمْسَيْتُ']]), 4),
  item('81e', swap(q(81), [['مَا أَصْبَحَ بِي', 'مَا أَمْسَى بِي']]), 1),
  shared[82], shared[83], shared[84], shared[85], shared[86], shared[87], shared[88],
  item('89e', swap(q(89), [
    ['أَصْبَحْنَا وَأَصْبَحَ', 'أَمْسَيْنَا وَأَمْسَى'],
    ['خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ', 'خَيْرَ هَذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا'],
    ['مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ', 'مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا'],
  ]), 1),
  item('90e', swap(q(90), [['أَصْبَحْنا', 'أَمْسَيْنَا']]), 1),
  shared[91], shared[92],
  item('97', q(97), 3, { audio: 97 }),
  shared[98],
];

// After the prayer (chapter 25): counted parts get their own counters.
const [istighfar, salam] = q(66).split(n(' (ثَلاَثَاً) '));
const [tahlil, mani] = q(67).split(n(' [ثلاثاً]، '));
const [tasbih, tamam] = q(69).split(n(' (ثلاثاً وثلاثين) '));
const [subhan, hamd, takbir] = tasbih.split('، ').map((part) => part.replace(/^وَ/, ''));
if (!salam || !mani || !tamam || !takbir) fail('Unexpected after-prayer wording');
const afterPrayer = [
  item('66a', istighfar, 3, { audio: 66 }),
  item('66b', salam, 1),
  item('67a', tahlil, 3, { audio: 67 }),
  item('67b', mani, 1),
  item('68', q(68), 1, { audio: 68 }),
  item('69a', subhan, 33, { audio: 69 }),
  item('69b', hamd, 33),
  item('69c', takbir, 33),
  item('69d', tamam, 1, { note: 'تمام المائة' }),
  item('70', surahLines(without(70, ' بَعْدَ كُلِّ صَلاَةٍ.')), 1, { audio: 70, quran: true, note: 'بعد كل صلاة' }),
  item('71', without(71, ' عَقِبَ كلِّ صَلاَةٍ.'), 1, { audio: 71, quran: true, note: 'عقب كل صلاة' }),
  item('72', q(72), 10, { audio: 72, note: 'بعد صلاة المغرب وصلاة الصبح' }),
  item('73', q(73), 1, { audio: 73, note: 'بعد السلام من صلاة الفجر' }),
];

// Before sleep (chapter 28).
const sleep99 = quoted(99);
const sleepSurahs = sleep99.slice(sleep99.indexOf('بسم الله'), sleep99.lastIndexOf('﴾') + 1);
const [sleepSubhan, sleepHamd, sleepTakbir] = q(106).split(/\s*\([^)]*\)\s*/).filter(Boolean);
if (!sleepTakbir) fail('Unexpected tasbih wording');
const sleep = [
  item('99', surahLines(sleepSurahs), 3, { audio: 99, quran: true, note: 'يجمع كفيه ثم ينفث فيهما فيقرأ فيهما، ثم يمسح بهما ما استطاع من جسده، يبدأ بهما على رأسه ووجهه وما أقبل من جسده' }),
  item('100', without(100), 1, { audio: 100, quran: true }),
  item('101', without(101), 1, { audio: 101, quran: true }),
  item('102', q(102), 1, { audio: 102 }),
  item('103', q(103), 1, { audio: 103 }),
  item('104', q(104), 1, { audio: 104 }),
  item('105', q(105), 1, { audio: 105 }),
  item('106a', sleepSubhan, 33, { audio: 106 }),
  item('106b', sleepHamd.replace(/^وَ/, ''), 33),
  item('106c', sleepTakbir.replace(/^وَ/, ''), 34),
  item('107', q(107), 1, { audio: 107 }),
  item('108', q(108), 1, { audio: 108 }),
  item('109', q(109), 1, { audio: 109 }),
  item('110', swap(q(110), [['يَقْرَأُ ', ''], ['السَّجْدَة ِ،', 'السَّجْدَةِ،']]), 1, { audio: 110, note: 'يقرأ سورتي السجدة والملك', surahs: [32, 67] }),
  item('111', q(111), 1, { audio: 111 }),
];

// On waking (chapter 1).
const waking = [
  item('1', q(1), 1, { audio: 1 }),
  item('2', q(2), 1, { audio: 2 }),
  item('3', q(3), 1, { audio: 3 }),
  item('4', tidy(raw(4)).replace('﴿ ', '﴿').replace(' ﴾', '﴾'), 1, { audio: 4, quran: true, note: 'من آخر سورة آل عمران' }),
];

const collections = { morning, evening, afterPrayer, sleep, waking };
for (const [id, items] of Object.entries(collections)) {
  const keys = new Set(items.map((i) => i.key));
  if (keys.size !== items.length) fail(`Duplicate keys in ${id}`);
  for (const i of items) if (!i.text || /[()[\]]/.test(i.text) || !(i.count >= 1)) fail(`Bad dhikr ${id}/${i.key}: ${i.text}`);
}
const out = { source: 'حصن المسلم، سعيد بن علي بن وهف القحطاني (hisnmuslim.com)', audio: 'https://www.hisnmuslim.com/audio/ar/', collections };
writeFileSync(new URL('../../src/features/adhkar/hisn-al-muslim.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(Object.entries(collections).map(([id, items]) => `${id}: ${items.length}`).join(', '));
