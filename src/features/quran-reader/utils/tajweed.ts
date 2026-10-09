import type { Ayah, Surah } from '@/lib/quranpedia/types';
export interface TajweedRun { text: string; rule?: string }
export type TajweedSurah = Record<number, TajweedRun[]>;
// Quranpedia's published textual tajweed palette, with its dark-theme variants.
const colors: Record<string, [string, string]> = {
  ghn: ['#ff7e1e', '#ff9f54'], qlq: ['#dd0008', '#ff4d54'], idgh_ghn: ['#169200', '#3fbf2a'],
  idgh_w_ghn: ['#169200', '#3fbf2a'], iqlb: ['#26bffd', '#5dd4ff'], ikhf: ['#9400a8', '#c44fd8'],
  ikhf_shfw: ['#d500b7', '#f05ada'], idghm_shfw: ['#58b800', '#7dd636'], slnt: ['#888888', '#aaaaaa'],
  ham_wasl: ['#888888', '#aaaaaa'], madda_necessary: ['#000ebc', '#4d6aff'],
  madda_obligatory: ['#2144c1', '#5b78f0'], madda_pbligatory: ['#2144c1', '#5b78f0'],
  madda_permissible: ['#4050ff', '#6b7fff'], madda_normal: ['#537fff', '#7b9fff'], idgh_mus: ['#888888', '#b8b8b8'],
  // App palette for the separately annotated Warsh/al-Azraq corpus.
  warsh_badal: ['#4050ff', '#6b7fff'], warsh_leen: ['#4050ff', '#6b7fff'],
  warsh_madd_stop: ['#537fff', '#7b9fff'],
  warsh_naql: ['#007c80', '#4ddad3'], warsh_ibdal: ['#007c80', '#4ddad3'],
  warsh_tashil: ['#9655a8', '#dba2ee'], warsh_taqlil: ['#ad5700', '#ffba63'],
  warsh_imala: ['#ad5700', '#ffba63'], warsh_ra: ['#a54475', '#ef92c5'],
  warsh_lam: ['#866100', '#e8c45e'],
};
export function tajweedColor(rule: string | undefined, dark: boolean, fallback: string) {
  return rule ? colors[rule]?.[dark ? 1 : 0] ?? fallback : fallback;
}
function entities(text: string) {
  return text.replace(/&#(x[\da-f]+|\d+);/gi, (_, n: string) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}
/** Consume only known tags as data. Never execute or embed fetched HTML. */
export function decodeTajweedSurah(html: string, surah: Surah): TajweedSurah {
  const result: TajweedSurah = {};
  for (const match of html.matchAll(/<a\b([^>]*\bclass="ayah"[^>]*)>([\s\S]*?)<span\b[^>]*class="marker"/g)) {
    const number = Number(match[1].match(/\bayah="(\d+)"/)?.[1]);
    if (Number(match[1].match(/\bsurah="(\d+)"/)?.[1]) !== surah.number) throw new Error('Tajweed surah mismatch');
    const ayah = surah.ayahs.find((a) => a.ayahNumber === number);
    if (!ayah || result[number]) throw new Error('Unknown or repeated tajweed ayah');
    const runs: TajweedRun[] = [];
    let rule: string | undefined;
    for (const part of match[2].trim().split(/(<[^>]+>)/g)) {
      if (!part) continue;
      if (part.startsWith('<tajweed ')) {
        if (rule) throw new Error('Nested tajweed markup');
        rule = part.match(/\bclass="([a-z_]+)"/)?.[1];
        if (!rule || !colors[rule]) throw new Error('Unknown tajweed rule');
      } else if (part === '</tajweed>') rule = undefined;
      else if (part.startsWith('<')) throw new Error('Unexpected tajweed markup');
      else runs.push({ text: entities(part), ...(rule ? { rule } : {}) });
    }
    // Colors must align with the exact original Unicode text, never normalized offsets.
    result[number] = alignTajweed(runs, ayah.text);
  }
  if (surah.ayahs.some((a) => !result[a.ayahNumber])) throw new Error('Incomplete tajweed surah');
  return result;
}
export function sliceTajweed(runs: TajweedRun[] | undefined, text: string, start: number, end: number): TajweedRun[] {
  if (!runs) return [{ text: text.slice(start, end) }];
  let offset = 0;
  return runs.flatMap((run) => {
    const from = Math.max(0, start - offset), to = Math.min(run.text.length, end - offset);
    offset += run.text.length;
    return to > from ? [{ ...run, text: run.text.slice(from, to) }] : [];
  });
}
export interface TajweedWord { glyph: string; surah: number; ayah: number; marker: boolean }
export interface TajweedLine { words: TajweedWord[]; centered: boolean }
export type TajweedPrintedSurah = Record<number, TajweedLine[]>;
export function decodeTajweedPrintedSurah(html: string, surah: Surah): TajweedPrintedSurah {
  const result: TajweedPrintedSurah = {};
  const pages = [...html.matchAll(/<div\b[^>]*\bid="page-(\d+)"[^>]*>/g)];
  for (let i = 0; i < pages.length; i++) {
    const number = Number(pages[i][1]);
    const body = html.slice(pages[i].index! + pages[i][0].length, pages[i + 1]?.index ?? html.indexOf('</main>'));
    const lines: TajweedLine[] = [];
    for (const line of body.matchAll(/<div class="tj-line([^\"]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
      const words: TajweedWord[] = [];
      for (const word of line[2].matchAll(/<span\b([^>]*class="ayah tj-word[^>]+)>([^<]+)<\/span>/g)) {
        const ayah = Number(word[1].match(/\bayah="(\d+)"/)?.[1]);
        const chapter = Number(word[1].match(/\bsurah="(\d+)"/)?.[1]);
        const fontPage = Number(word[1].match(/font-family: tajweed_page_(\d+)/)?.[1]);
        if (chapter !== surah.number || fontPage !== number || !surah.ayahs.some((a) => a.ayahNumber === ayah) || !/^[\uFB50-\uFDFF\uFE70-\uFEFF ]+$/.test(word[2])) throw new Error('Invalid tajweed glyph reference');
        words.push({ glyph: word[2], surah: chapter, ayah, marker: word[1].includes('tj-marker') });
      }
      if (!words.length) throw new Error('Empty tajweed line');
      lines.push({ words, centered: line[1].includes('tj-line--centered') });
    }
    if (!lines.length) throw new Error('Missing tajweed lines');
    result[number] = lines;
  }
  for (const ayah of surah.ayahs) {
    if (!Object.values(result).some((lines) => lines.some((l) => l.words.some((w) => w.ayah === ayah.ayahNumber && w.marker)))) throw new Error('Missing tajweed ayah marker');
  }
  return result;
}
export function tajweedAyahKey(ayah: Pick<Ayah, 'surahNumber' | 'ayahNumber'>) { return `${ayah.surahNumber}:${ayah.ayahNumber}`; }

/** Quranpedia collapses repeated tatweel in HTML. Map only that presentation
 * difference; reject any change to letters, diacritics, whitespace or order. */
export function alignTajweed(runs: TajweedRun[], original: string): TajweedRun[] {
  const source = runs.flatMap((r) => [...r.text].map((char) => ({ char, rule: r.rule })));
  const significant = source.filter((c) => c.char !== 'ـ');
  if (significant.map((c) => c.char).join('') !== original.replace(/ـ/g, '')) throw new Error('Tajweed text mismatch');
  let i = 0;
  const aligned: TajweedRun[] = [];
  for (const char of original) {
    const rule = char === 'ـ' ? significant[Math.max(0, i - 1)]?.rule : significant[i++].rule;
    const last = aligned.at(-1);
    if (last && last.rule === rule) last.text += char;
    else aligned.push({ text: char, ...(rule ? { rule } : {}) });
  }
  return aligned;
}
