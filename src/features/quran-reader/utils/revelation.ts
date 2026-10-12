/**
 * Where each surah was revealed, as the titles of the Madinah mushaf give it (the King Fahd
 * Complex's, for Hafs and for Warsh): 28 Medinan surahs, the other 86 Meccan. A few are disputed
 * among the scholars (al-Ra'd, al-Hajj, al-Rahman, al-Insan, al-Zalzalah among them); the mushaf's
 * reading is the one followed here.
 */
export type Revelation = 'meccan' | 'medinan';

const MEDINAN: ReadonlySet<number> = new Set([2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110]);

export const surahRevelation = (surah: number): Revelation => MEDINAN.has(surah) ? 'medinan' : 'meccan';
