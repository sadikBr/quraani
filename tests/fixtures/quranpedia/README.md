# Quranpedia response samples

Source: https://api.quranpedia.net/v1, inspected 2026-10-08.
These small samples are regression fixtures, not a bundled Quran corpus.
App content is fetched live and periodically refreshed.

- `warsh-metadata.json`: metadata from `/mushafs/4` without the surah corpus.
- `mushafs.json`: edition catalog from `/mushafs`, including nullable descriptions.
- `warsh-fatiha.json`: `/mushafs/4/1`; partition fields are absent here.
- `warsh-page2-ayahs.json`: the first four ayahs from surah 2 in `/mushafs/4`.
- `warsh-page1-regions.json`: `001.json` from the official Warsh SVG archive.
- `warsh-typography.json`: source ayahs for pages 1, 3, 48, 604 and the opening of
  surah 9, used to verify reader sectioning and Bismillah placement.

Quranpedia source: https://quranpedia.net

- `warsh-ayah-markers.json`: public `/api/page/warsh/29` and `/api/page/warsh/604`
  SVGs inspected 2026-10-09. Keeps original verse polygons, ornament paths and
  transforms; omits Quran text and number glyph paths. Tests matching reversed
  marker order and repeated ayah numbers on a page spanning three surahs.
- `warsh-ayah-markers.json` also includes `/api/page/warsh/86`: its first polygon
  and number belong to 4:44, continued from page 85. The page metadata starts at
  4:45. This verifies continuation handling without relaxing other page checks.

Hafs samples added 2026-10-09: original edition-2 metadata, Al-Fatiha and the
first 32 Baqarah ayahs; matching public tajweed HTML extracts; seven Fatiha
colored glyph lines and page-3 SVG selection polygons. Small regression samples
only, not a frozen corpus for app distribution. Source: https://quranpedia.net
# Warsh tajweed regression sample

`warsh-tajweed-sample.json` contains unmodified selected ayahs from Quranpedia
mushaf 4, retrieved 2026-10-09, including Al-Fatiha, the beginning of Al-Baqarah,
Ta-Ha's opening, Al-Mulk 9–10's canonical encoding variants, and An-Nas. See
`assets/tajweed/README.md` for the annotation source and full-corpus validation.

Since 2026-11-12 the app reads the Quran text from its bundled copy (`assets/quran`), and the
colour tests run on that text. This sample stays as a specimen of the 2026-10 spelling
(`tests/quranpedia-respelling.test.js`), beside `warsh-v3-sample.json`: the same and other ayahs
as Quranpedia has served them since it moved to its 3.0 fonts.
