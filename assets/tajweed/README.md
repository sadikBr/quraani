# Warsh tajweed colors

`warsh-azraq-v1.json` contains color offsets, not replacement Quran text. It is
bundled for offline use in both Quran text layouts and the settings preview.
Printed Warsh SVGs remain unchanged, as requested. Hafs continues to use its
separate Quranpedia annotations and printed color fonts.

## Sources and scope

- Quran text: [Quranpedia mushaf 4](https://api.quranpedia.net/v1/mushafs/4),
  King Fahd Complex Warsh V21 text, 114 surahs / 6,214 ayahs.
- Rule analysis: [QUD Quranic Phonemizer](https://github.com/QUD-Technologies/quranic-phonemizer),
  pinned commit `c48980e051dd88f0919e3148021823a3da06d4b5`, MIT (notice in
  `QUD-LICENSE.txt`). Its Warsh implementation is specifically **al-Azraq**.
- Rule provenance: the pinned repository's
  [Warsh research](https://github.com/QUD-Technologies/quranic-phonemizer/tree/c48980e051dd88f0919e3148021823a3da06d4b5/docs/warsh/research/v2),
  including references to Al-Nashr and Al-Wafi for naql, hamza, inclination,
  lam/raa and madd. The producer's default variant choices are recorded in the
  JSON metadata. This is an algorithmic annotation source, not a new claim of
  scholarly certification or a facsimile of a publisher's colored mushaf.

Every ayah is analyzed with ibtida at its start and waqf at its end. The app says
this in settings; continuously reading through an ayah boundary can change the
applicable rule. Internal optional stop signs do not force stops. Other Warsh
routes and selectable awjuh are outside this feature's scope. Colors identify
rule families, not durations. When rules overlap, the generator uses documented
precedence and displays one color. The common palette follows the app's existing
Hafs palette; Warsh-specific colors are explained in its settings legend.

The generator uses the analysis source-unit placements, not a regex over Hafs
text or a guessed mapping between Hafs and Warsh ayah numbers. Only explicitly
classified source units are colored. Silent-letter coloring does not spread to
the pronounced consonant which triggered an assimilation. Warsh raa tarqiq and
lam taghliz are assigned only to the classified raa/lam, with generic emphasis
in the divine name left in the ordinary ink.

## Reproduce and validate

1. Check out the exact annotator commit above outside this application.
2. With Python 3.11+ and PyYAML available, save the Quranpedia mushaf 4 JSON.
3. Run from this repository:

```sh
python3 scripts/generate-warsh-tajweed.py \
  --source /path/to/quranic-phonemizer \
  --corpus /path/to/quranpedia-mushaf-4.json
bun test tests/warsh-tajweed.test.js
```

The app has no Python dependency and makes no phonemizer/server request at
runtime. Generation fails without writing production data if any ayah differs
or cannot be analyzed. The complete 6,214-ayah generation passed with zero
annotation/alignment errors on 2026-10-09. This verifies coverage and alignment,
not independent scholarly review of every rule.

Alignment compares all Unicode scalars, allowing only presentation tatweel,
whitespace, rub-el-hizb marks and RLM to be excluded from the comparison, and
canonical Unicode equivalence. In this snapshot the only remaining encoding
differences are composed maddah in 67:9 and combining-mark order in 67:10. Original
Quranpedia characters are retained at every position; NFD is used solely for the
source-to-original offset map. The stored fingerprint includes original letters,
diacritics, spacing and signs. Runtime rejects shifted/mismatching annotations,
invalid ranges and any Hafs reference, leaving complete plain text available.

The source corpus SHA-256, pinned annotator commit, boundary policy and variant
profile are recorded in the JSON. Decoder caches are limited to four surahs.
Warsh V21 and Hafs V22 document fonts are separately cached and embedded so that
the native joined-text renderer cannot display one edition using the other's
font. Practice hides/reveals the existing colored words without changing text.
