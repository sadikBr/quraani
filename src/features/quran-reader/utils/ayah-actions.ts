import { editionForMushaf } from '../riwayat';
import type { Ayah, AyahReference, Quran } from '@/lib/quranpedia/types';
import { ayahKey } from './references';
export function passageAyahs(quran: Quran, start: AyahReference, endSurah: number, endAyah: number): Ayah[] {
  if (start.mushafId !== quran.id || !Number.isSafeInteger(endSurah) || !Number.isSafeInteger(endAyah)) return [];
  const ayahs = quran.surahs.flatMap((s) => s.ayahs);
  const a = ayahs.findIndex((v) => ayahKey(v) === ayahKey(start));
  const b = ayahs.findIndex((v) => v.surahNumber === endSurah && v.ayahNumber === endAyah);
  return a >= 0 && b >= a ? ayahs.slice(a, b + 1) : [];
}
export function decodeBookmarks(raw: string | null): string[] {
  try { const value = JSON.parse(raw ?? '[]'); return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && /^(?:4|2):(?:[1-9]|[1-9]\d|10\d|11[0-4]):[1-9]\d{0,2}$/.test(v)))] : []; } catch { return []; }
}
export function parallelAyahs(ayah: Ayah): number[] {
  return [...new Set(ayah.hafsAyahNumbers)].filter((n) => Number.isSafeInteger(n) && n > 0);
}
export function ayahShareText(ayah: Ayah, surahName: string) {
  return `${ayah.text} ${ayah.marker}\n${surahName} · الآية ${ayah.ayahNumber} · رواية ${editionForMushaf(ayah.mushafId).label}`;
}
