/**
 * The Quran text ships with the app: a copy of Quranpedia's corpus response for an edition,
 * taken on a known day and reviewed (assets/quran, written by scripts/bundle-quran.mjs), so the
 * text read is the text that was checked, with or without a connection, and a change at the
 * source reaches readers only through a new version of the app.
 *
 * The copy keeps every value the app reads, exactly as served, in less room: each ayah is a row
 * (the response repeats its field names 6,000 times) and the lists of available content, which
 * many ayahs share, are kept once. `expandBundledMushaf` gives the response back for
 * `decodeQuran`, which validates it like any other.
 */
export interface BundledMushaf {
  version: 1;
  /** Where the copy came from, the day it was taken, and the SHA-256 of the response's bytes. */
  source: string;
  fetched: string;
  sha256: string;
  /** The response's own fields about the edition (id, name, bismillah, rawi…). */
  mushaf: Record<string, unknown>;
  /** The distinct `options` lists; an ayah names its own by position. */
  options: string[][];
  surahs: { id: number; name: string; coded_name: string; ayahs: BundledAyah[] }[];
}
/** id, number, page_number, text, marker, juz, hizb, number_in_hafs, position in `options`. */
export type BundledAyah = [number, number, number, string, string, number | null, number | null, number[], number];

interface SourceAyah {
  id: number; number: number; surah: string | number; page_number: number; text: string; marker: string;
  juz: number | null; hizb: number | null; options: string[]; number_in_hafs: number[];
}
interface SourceMushaf { surahs: { id: number; name: string; coded_name: string; ayahs: SourceAyah[] }[]; [field: string]: unknown }

/** The copy to bundle of a corpus response (already validated by `decodeQuran`). */
export function packMushaf(response: SourceMushaf, origin: { source: string; fetched: string; sha256: string }): BundledMushaf {
  const { surahs, ...mushaf } = response;
  const options: string[][] = [], positions = new Map<string, number>();
  const position = (list: string[]) => {
    const key = JSON.stringify(list);
    let at = positions.get(key);
    if (at === undefined) { at = options.push(list) - 1; positions.set(key, at); }
    return at;
  };
  return {
    version: 1, ...origin, mushaf, options,
    surahs: surahs.map((surah) => ({
      id: surah.id, name: surah.name, coded_name: surah.coded_name,
      ayahs: surah.ayahs.map((a): BundledAyah => {
        if (Number(a.surah) !== surah.id) throw new Error(`Ayah ${a.id} is not of surah ${surah.id}`);
        return [a.id, a.number, a.page_number, a.text, a.marker, a.juz, a.hizb, a.number_in_hafs, position(a.options)];
      }),
    })),
  };
}

/** The corpus response a bundled copy was made from (without the fields the app never reads). */
export function expandBundledMushaf(bundle: BundledMushaf): unknown {
  if (bundle?.version !== 1 || !Array.isArray(bundle.surahs) || !Array.isArray(bundle.options)) throw new Error('Unreadable bundled Quran text');
  return {
    ...bundle.mushaf,
    surahs: bundle.surahs.map((surah) => ({
      id: surah.id, name: surah.name, coded_name: surah.coded_name,
      ayahs: surah.ayahs.map(([id, number, page_number, text, marker, juz, hizb, number_in_hafs, options]) => ({
        id, number, surah: String(surah.id), page_number, text, marker, juz, hizb, options: bundle.options[options], number_in_hafs,
      })),
    })),
  };
}
