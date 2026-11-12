# The Quran text bundled with the app

`mushaf-4.json` (Warsh, 6,214 ayahs) and `mushaf-2.json` (Hafs, 6,236 ayahs) are copies of
Quranpedia's corpus responses, King Fahd Complex text, taken on **2026-11-12**:

| Edition | Source | SHA-256 of the response |
| --- | --- | --- |
| 4, Warsh | https://api.quranpedia.net/v1/mushafs/4 | `44d8c428e4a5a30b1fd03c4d293a735682708f9c8655b09aa172fee558e33e51` |
| 2, Hafs | https://api.quranpedia.net/v1/mushafs/2 | `060c959f2ad920683b047f1dd007ad49be82822a970e21a1343798425ab83fe3` |

The app reads the Quran text from these copies only (`services/reader-service.ts`): it is the
same text with or without a connection, and a change at the source reaches readers only when a
new copy is reviewed and shipped. What an ayah opens (tafsir, translations…), the printed pages
and the Hafs colours still come from Quranpedia.

Each copy keeps every value the app reads exactly as served, in less room
(`src/lib/quranpedia/bundled.ts`): an ayah is a row, and the lists of available content are kept
once. No text is edited here. The app spells it for its fonts when it reads it
(`src/lib/quranpedia/encoding.ts`).

## Checks made on these copies

- The app's own validation (114 surahs, pages 1–604 in order, each ayah's fields), and
  `tests/bundled-quran.test.js`: the ayah counts, the indexes, letters the bundled fonts draw.
- Warsh, against the King Fahd Complex data the tajweed analysis uses (the `king-fahd-v2` corpus
  of the pinned QUD repository, `assets/tajweed/README.md`), character by character apart from
  tatweel, spaces and canonically equivalent spellings: 6,203 ayahs are the same. **Eleven differ
  in a sign or a letter and are worth checking against a printed Warsh mushaf** (the King Fahd
  data first, then this copy):

  | Ayah | King Fahd data | This copy |
  | --- | --- | --- |
  | 2:71 | «فَادَّٰرَٰءْتُمْ» | the hamza on a tatweel, without the fatha and dagger alif before it |
  | 5:43 | «اُوتِيتُمْ» (damma on the alif) | a hamza dot on the alif |
  | 7:1 | «اُنزِلَ» (damma on the alif) | a hamza dot on the alif |
  | 23:44 | «اُ۟مَّةٗ» (dot and damma) | the dot alone |
  | 12:110, 21:87 | a small noon above («نُۨجِے») | a whole noon («نُنجِے») |
  | 6:4 | no stop sign after «اَ۬للَّهُ» | a stop sign |
  | 9:118, 11:2, 43:65 | a stop sign (after «عَلَيْهِمُۥٓ», «اَ۬للَّهَ», «يَوْمٍ») | none |
  | 53:61 | the sajda sign after «وَاعْبُدُواْ» | none |

- Hafs has had no such comparison here: only the app's validation and tests.

## A new copy

```sh
bun run verify:quranpedia        # lists the ayahs Quranpedia now serves differently
bun scripts/bundle-quran.mjs 4   # after reviewing them (2 for Hafs)
```

Then, for Warsh, regenerate the tajweed colours (`assets/tajweed/README.md`), run `bun test`, and
update the table above.
