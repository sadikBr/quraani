# Quran reader foundation

## Riwayah selection — 2026-10-09

Settings persist `riwayah: warsh | hafs`, with Warsh retained for new and legacy
installs. Hafs uses Quranpedia edition **2** (Unicode text with UthmanicHafs V22);
its 6,236 ayahs and 604 page boundaries were compared with printed edition **1**.
Warsh remains edition **4**, with its original numbering. The two riwayat have
separate saved positions, bookmark stores, request keys, decoded pages and image
identities. Existing Warsh saves/cache entries remain usable. Search, the index,
copying, related content and share cards use the selected edition and font.
Hafs Fatiha includes its numbered basmala once, with no extra opening inserted.

The **ألوان التجويد** switch supports both riwayat. For Hafs it applies to printed
pages and both Quran text layouts. Hafs text annotations come on demand from Quranpedia's `/surah/1/{surah}/tajweed`.
Only known color tags are parsed, without executing source HTML. The colored text
must match the Unicode corpus exactly; repeated presentation tatweel is the sole
permitted difference and is mapped back onto the unchanged corpus characters.
Colored Unicode text uses a locally constructed WebView document on phones and
the same sandboxed document in the browser. This preserves Arabic shaping across
color boundaries, which native Android attributed text was breaking. The bundled
edition's font (Hafs V22 or Warsh V21) is read once, separately cached and embedded; source text is never replaced by
presentation characters or modified with synthetic joiners. Both text layouts
keep one inline text flow. Practice updates word visibility and selection through
the bridge without reloading the document; hidden words retain their layout but
are also hidden from accessibility. A color load failure leaves complete plain
text available and offers retry.

### Warsh letter style — 2026-10-12

Quranpedia has one Warsh font (V21, Maghribi: ق with one dot above, ف with one
below). Settings → القراءة → النص القرآني offers `warshScript: maghribi | mashriqi` for Warsh;
**مشرقي** draws the same Warsh text in the Hafs V22 font (Madinah letters). The
Warsh text spells ق/ف with the standard letters, so the font alone decides the
dots. V22 draws every character the Warsh font draws but three, which it shows
as a dot in a dashed circle (or lacks): U+0622 (drawn as U+0627 U+0653), U+06D2
(drawn as U+0649) and U+06DF, the Warsh hamza dot (eased, moved by naql, or the
vowel to start a wasl with; 281 times), drawn as U+06EC, V22's own dot for an
eased hamza. Found by comparing every glyph outline of both fonts with V22's
placeholder; `tests/quran-script.test.js` keeps the list. `utils/quran-script.ts`
maps them for display only, per piece after tajweed slicing, so the corpus,
offsets, search and copying are unchanged. The choice marks مغاربي as «موصى به»
for Warsh, the letters its mushafs are written in. Ayah markers sit at the same codepoints in both fonts. It applies to
the text layouts, tajweed text, practice, search results, share cards and the
adhkar's Quran passages; printed Warsh pages stay as printed.

### Quranpedia's 3.0 spelling — 2026-11-12

Quranpedia moved mushaf 4 to `UthmanicWarsh-v-3.0` and mushaf 2 to `UthmanicHafs-v-3.0`
(2026-10-08: V21 and V22) and respelt the text for them. Warsh now writes wasl alifs, hamza
dots and stop signs with Unicode 14 letters (U+0870–U+0888, U+08C9, U+08CC); both editions
write open tanween as U+08F0–U+08F2. The bundled fonts draw none of these, and the bundled Warsh
colours were made for the old spelling, so every Warsh surah failed their check: no colours in
the reader or the preview, and a retry failed the same way. Plain text still showed, partly in
a fallback font, and search for «الحمد» no longer found Warsh 1:1.

`lib/quranpedia/encoding.ts` spells the text back as the bundled fonts and colours do, when an
ayah is decoded (old-spelling text is unchanged). The Hafs tajweed markup, also respelt, gets the
same one-for-one mapping. A retry clears the decoded colours and the refresh backoff before
loading again.

Since then the Quran text itself ships with the app (`assets/quran`, read by
`services/reader-service.ts`; provenance, checks and how to take a new copy in its README): the
reader, search, goals, practice and adhkar read that copy, never the network, so the text is
the one that was reviewed, the first launch works offline, and a change at the source cannot
reach readers unseen (`bun run verify:quranpedia` lists what Quranpedia serves differently).
The Warsh colours are regenerated from the bundled text, so all 6,214 ayahs are coloured; each
ayah is still checked by its fingerprint, one that reads otherwise stays in plain ink, and only
a surah with no matching ayah reports an error. The copy earlier versions downloaded
(`quranpedia:v1:/mushafs/<id>`) is removed from the phone's cache.

The cache was not at fault: native caches use `expo-sqlite/kv-store`, which reads through
expo-sqlite's own SQLite binding, not Android's CursorWindow, and the document fonts are read
from the app bundle into memory, never stored. Sizes: the Warsh corpus response is 2,175,600
UTF-16 code units as JSON; the Warsh V21 font is 256,132 bytes (341,512 characters as base64)
and Hafs V22 297,700 bytes (396,936).

Warsh colors apply to both text layouts, practice and the live preview. The user
chose to leave printed Warsh pages unchanged. Its separately generated **al-Azraq**
annotations are bundled offline, checked against all 6,214 original ayahs and
validated against the exact original spelling at runtime. Hafs rules are never
reused for Warsh. The settings explain the stop-at-each-ayah policy and provide
a color legend. The pinned QUD annotator, research sources, reproducible generator,
known scope and alignment checks are documented in `assets/tajweed/README.md`.
These generated annotations are not presented as a publisher-certified mushaf.

Colored printed pages use the exact QPC V4 glyphs, line groups and verse targets
published at `/surah/1/{surah}/tajweed-uthmani`. A minimal locally constructed,
network-isolated document renders its COLR/CPAL page font through WebView on native
and a sandboxed frame on web; no publisher scripts or markup are embedded.
Only validated page/ayah messages can open actions. Number taps, long press,
toolbar taps, paging and text practice retain the existing behavior.
The page font comes from QUL's CORS-enabled CDN. Page 1 was verified byte-for-byte
against Quranpedia's font (SHA-256
`3ced9c0f79a08a533ca30c226d5d0eff470645b12dcad53091ce2e36575df62c`).
The font's built-in dark palette is used on dark themes. Unicode text and glyph
font data are never interchanged.
Surah names and unnumbered basmalas use the shared native `SurahOpening` component
and the same calligraphic font as Warsh. Printed colored pages reserve measured
spaces for these headings, keeping them aligned with their surah sections.
The shared calligraphy scale relates titles and basmalas to the current Quran
body size and caps their width on narrow screens. Tajweed pages report their
fitted font size instead of using a fixed opening size. Text previews and share
cards use the same optical proportions; compact index, toolbar and action-sheet
labels share the font metrics. Printed SVG ayahs/basmalas retain their original
relative proportions, with opening headings sized to the artwork's scale.

Tajweed surahs load only as needed, deduplicate concurrent work, keep a bounded
parsed memory cache and a 24-hour persistent source cache. Page fonts have bounded
memory and versioned persistent caching. The colored reader warms five nearby
fonts and skips the unused monochrome SVG preload runway. It does not download
all 604 fonts or crawl all surahs. Initial uncached tajweed loading needs a network
connection; previously loaded content and fonts remain available offline.

Checked live against Al-Fatiha, Al-Baqarah and An-Nas plus printed pages 1, 3 and
604. Browser checks cover both text layouts, light/dark color contrast, ayah-number
actions, word/ayah reveal, and preferences. Android/iOS exports verify packaging;
physical-device gesture, Arabic shaping and accessibility QA remain necessary.

Sources: [Hafs Unicode corpus](https://api.quranpedia.net/v1/mushafs/2),
[Hafs printed corpus](https://api.quranpedia.net/v1/mushafs/1),
[Quranpedia colored text](https://quranpedia.net/surah/1/1/tajweed),
[Quranpedia colored Mushaf](https://quranpedia.net/surah/1/1/tajweed-uthmani),
[QUL QPC V4 font](https://qul.tarteel.ai/resources/font/240),
[Expo SDK 57 WebView](https://docs.expo.dev/versions/v57.0.0/sdk/webview/).

## Reading format and interactions

- Default edition: Quranpedia mushaf **4**, Warsh (`ورش`) from Nafi. No automatic
  fallback to Hafs if Warsh is unavailable.
- Default traditional mode: **page**, labelled **Mushaf**. Render Quranpedia
  SVG outlines at their original aspect ratio, preserving printed justification
  and line breaks. Normal pages use the original 15-line layout; opening pages
  retain their smaller layout. No frame, border, decorative stars, or extra rules.
  This mode scales to page width; adjustable text size belongs to text mode.
- Alternative mode: **text**, labelled **النص القرآني**. Its saved `textLayout`
  selects separate ayah rows (**آيات منفصلة**) or a justified continuous paragraph
  (**نص متصل**) per surah section. Both use the bundled font for the selected riwayah and adjustable
  text size and line spacing. Continuous text wraps to the available width, with
  inline ayah markers and no fixed line count. Original `text` and `marker` remain
  separate and unchanged. Old `mode: ayah` preferences migrate to separate rows.
  Text is justified with what is left after the last full line centred, as in a
  mushaf (`JustifiedText`; the tajweed document uses `text-align-last: center`).
  Native text views only justify with the last line at the start, so the last line
  is drawn again, centred, over a hidden copy of itself found from `onTextLayout`.
- Bismillah is supplied by the mushaf metadata. Warsh Al-Fatiha's first numbered
  ayah is “الحمد…”, not Bismillah. The renderer should show Bismillah as an
  unnumbered opening at surah starts except surah 9; do not insert it into the
  ayah dataset. The traditional SVG already contains its printed opening.
- Tap the page to toggle reading tools; tap an ayah number or long-press its text
  to open actions. Actions include bookmarks, copy, native sharing, tafsir and
  translations. Printed hit regions preserve the artwork geometry.
- The page number and jump action belong to the animated bottom toolbar. Focus
  mode has no persistent page footer, and toggling tools does not resize the text.
  The scroll viewport reaches the top edge in focus mode. The camera safe area
  is starting padding inside the scroll content, so it does not mask lines as
  they scroll upward. Only the visible top toolbar paints a surface behind the
  status bar, and that surface animates away with the tools. Late larger safe-area
  measurements are accepted; hiding system bars never reduces the reserved
  content padding during a portrait session.
- The bottom toolbar starts page practice in the current text layout, preserving
  the mounted page and scroll position for both separate rows and continuous text.
  Printed artwork temporarily uses separate ayah rows for word-level practice.
  Words are hidden without moving markers or line breaks; the next-word and
  next-ayah controls reveal them in reading order. Wrapped-line positions on native
  and measured inline text on web keep the revealed ayah in view. Show All restores
  the words in place (or returns to printed artwork). Practice is session-only and resets on page
  navigation. Hidden words use zero opacity and the paper color for native nested
  text compatibility; their accessibility labels omit hidden Quran text.
- The action sheet groups bookmark, copy and share into equal icon actions, with
  separate expandable tafsir and translation rows. Its decorative surah heading
  and close control stay visible while related content scrolls. The sheet extends
  behind the home indicator with safely inset controls and a full-screen backdrop.
  It supports focus, dismiss/back/escape and labelled touch controls. The background is excluded from accessibility while
  either modal is open. Native screen-reader acceptance requires device testing.
- Runtime interaction state lives in `components/reading/reader-screen.tsx`;
  framework-independent selection helpers remain in `state/reader-state.ts`.

## Quran text settings

The reading tab has two groups (2026-10-12): **المصحف** (riwayah, reading mode)
and **النص القرآني**, one card (`quran-text-settings.tsx`) with a live preview
above the choices it shows: letter style (Warsh), tajweed colours and, in text
mode, size, spacing and the ayah layout. The letter style and colours stay
visible with the printed pages chosen, since the adhkar and search set the
Quran as text too.

Text mode offers seven font sizes (24–48 in steps of four) through an RTL slider.
Native uses the SDK-compatible community slider with tap-to-seek and accessibility
adjustments. Its native layout is explicitly LTR with `inverted` enabled so the
minimum stays on the right independently of app/device RTL. Web uses an RTL
keyboard-accessible range input. Dragging updates a local
preview immediately and saves on release, avoiding repeated reader/storage updates.
Legacy in-between saved sizes snap to the nearest stop when restored.

The preview (`text-preview.tsx`) shows Al-Mulk 9–10 by their Hafs numbers (Warsh
9–11) from the cached reader content: they open with both ق and ف, so the letter
style shows at any size. It uses the selected riwayah's font and letter style and
the same line-height calculation as the reader, in a window of fixed height (four
lines at the default size) so the choices below never move while a size is tried;
larger text runs past it and fades out. On native, `JustifiedText` keeps the
previous layout on screen while a changed text or size is measured in an invisible
copy, then changes once, so the centred last line never flashes. While Settings
covers the reader, `HoldTextPreferences` keeps the reader's text choices until they
have been still for 700 ms (or the reader is shown again), so its pages are laid
out once rather than at every step.
It follows separate/continuous text layout, spacing and theme. With tajweed
enabled, it reuses the reader's cached color rules and joined-text renderer in a
compact, non-interactive preview, including light/dark colors. Disabling tajweed
returns to plain text; each riwayah uses its own annotations and font. It wraps without
clipping at larger sizes, sits above the choices on phones, and beside them when
the card has at least 620 points of width. Printed-page mode keeps its fixed
typography. Native gesture and screen-reader acceptance need device QA.

## Live response and asset validation

Inspected on **2026-10-08**, using the public API and small HTTP range requests
against the ZIP archive rather than downloading every endpoint.

| Finding | Verified value |
| --- | --- |
| Mushaf | `/v1/mushafs/4`, Warsh |
| Surahs / ayahs / pages | 114 / 6,214 / 604, contiguous pages 1–604 |
| Al-Baqarah ayahs | 285 in this edition |
| First-page ayahs | Surah 1, Warsh ayahs 1–7 |
| Second-page ayahs | Surah 2, Warsh ayahs 1–4 |
| Corpus partition fields | `juz`, `hizb`, `ruku`, `manzil` |
| Per-surah response | Omits partition fields; `surah` arrives as a numeric string |
| Browser access | API returns `Access-Control-Allow-Origin: *`; direct web requests are supported |
| `hizb` meaning | 240 quarter positions; derive hizb with `ceil(quarter / 4)` |
| Missing partition metadata | 26 ayahs have `juz = 0` and `hizb = 0`; map to null, never guess |
| Font | `UthmanicWarsh_V21.ttf`, family “KFGQPC Warsh Uthmanic Script” |
| Font character coverage | Every character in all ayah texts and markers exists in its cmap |
| Page archive | 604 SVGs, 604 page JSON sidecars, one `mushaf-content.json` |
| Archive filenames | `001.svg` + `001.json` through `604.svg` + `604.json` |
| Archive size | 107,377,730 bytes; do not download automatically on app launch |
| Page 1 geometry | SVG `viewBox="-6 0 235 235"`, seven matching JSON ayah polygons |
| Page 2 geometry | Four regions, surah 2, Warsh numbers 1–4 |

The SVG artwork uses paths, with selectable `ayahPolygon` paths and a separate
`ayah_markers` group. Its legacy verse IDs differ from the current API IDs:
identify regions by **mushaf + surah + ayah**, not the SVG element ID.
`decodePageRegions` validates and maps JSON sidecars to those references.
`pageAssetEntries` returns archive entry names, not assumed public file URLs.
The reader now uses the verified, CORS-enabled individual SVG endpoint
`https://quranpedia.net/api/page/warsh/{page}` rather than downloading the archive.
`decodePrintedPage` checks every polygon against the current API page references,
then separates visible artwork from interactive regions. Only ink colors change;
glyph paths remain intact. The endpoint adds empty margins to pages 1–2; their
viewBox uses the original smaller opening-page size. Visible path bounds are
measured with their inherited transforms, and the horizontal viewBox origin is
centered on the ink with blank side gutters trimmed and a half-unit allowance
for glyph edges. The reading surface has 4px outer padding. Artwork and touch
polygons share that viewBox; vertical position, glyph paths, and the 15-line
layout remain unchanged while the text scales to fill the available width.

Page artwork loads on demand with a 15-second timeout, request deduplication,
a bounded 32-page memory cache (32 MiB estimated XML budget) and a 24-hour
persistent cache. Previously validated
artwork remains readable if an expired-page refresh fails. Cache corrections
replace the entire artwork rather than modifying Quran outlines.

The matching font is bundled unchanged with its embedded license in
`assets/fonts/`. `useQuranFont` loads it at runtime on mobile and web. Cmap
coverage and asset structure are verified; shaping, clipping, and visual layout
still need verification on Android/iOS devices. The prototype has been visually
checked in a browser; see `PROTOTYPE_QA.md` for exact coverage and remaining checks.

## Search decision

`/v1/search/الحمد/ayahs` returns JSON ayah results, despite the documentation only
listing encyclopedia search types. The inspected response returns Hafs 1:2 for
“الحمد”, whereas Warsh uses 1:1. No Warsh-specific search contract was confirmed.

Use `createQuranSearch(quran)` to build a local index of the loaded **Warsh**
corpus. It returns original text and Warsh references, with bounded pagination.
`searchSurahs` supports Arabic names and surah numbers. Search normalizes a
separate value, removing vowel/recitation marks and normalizing alif and yeh forms;
displayed Quran text is never changed. `/search` debounces queries, shows original
ayah previews with Warsh references, and adds results in batches to a virtualized
list. Opening a result jumps to and highlights the whole ayah. Substring colouring
is not applied using normalized offsets. `/bookmarks` lists saved Warsh ayahs and
opens them the same way; bookmark keys are persisted separately from position.

## Juz and quarter divisions

Quranpedia's Warsh edition tags `juz`/`hizb` by ayah number, as if Warsh ayahs
were Hafs ayahs with the same number (Warsh 2:142 carries the tag of Hafs 2:142),
so every division after a numbering difference is one or more ayahs late.
`utils/divisions.ts` recomputes both tags so divisions follow the text in every
riwayah. Edition data already tagged by text, like Hafs, is unchanged. Goals saved
against the old tags are re-linked automatically.

The Warsh mushaf divides by its own ۞ marks, the Maghribi athman (eighths of a
hizb, 480 in all), which in 57 of the 240 quarters fall a few ayahs from the Hafs
quarters (its hizb 2 starts at «وإذا لقوا», 2:75, not «أفتطمعون», 2:74). Its tags
come from `utils/warsh-eighths.ts`, two eighths to a quarter: 435 starts are the
marks in the King Fahd Complex Warsh text the reader shows; the 45 that open a
surah carry no mark and come from the Moroccan Muhammadi mushaf's index
(nuralhifz-data, CC BY 4.0), which agrees on 433 of the 435 marked ones. Every
16th start is a juz start of the King Fahd Complex data (juz 2 / hizb 3 at Warsh
2:141). Other riwayat take the 240 standard Hafs quarter starts through each
ayah's `number_in_hafs`.

## Thumun pages (Warsh)

In the text view, Warsh can be read a thumun to a page (`thumunPages`, shown in
the settings only for Warsh in the text view): 480 pages, labelled «الحزب ٢ ·
الثمن ١», each starting at the ayah that holds its ۞ and scrolling when it is
longer than the screen (an eighth is 0.7–1.8 printed pages). Only the reader
pages this way (`utils/thumun-pages.ts` gives it a paged view of the content in
which each ayah's `pageNumber` is its eighth); plans, goal readings, search,
the index and recitation keep the mushaf's pages. The saved reading position
records its paging, and is carried across a change of paging by its ayah (the
selected one, or the first of the page).

## API and cache

`QuranpediaClient` provides corpus/ayah methods plus the ayah's services, which
the ayah sheet opens (`src/lib/quranpedia/ayah-services.ts`): `getAyahBooks` (the
tafsir, i'rab, asbab, nasikh and mutashabih books that treat it, each read with
`getBookContent`), `getMeanings`, `getSimilar`, `getQiraat`, `getTopics`,
`getFatwas`, `getNotes`, `getSayings`, `getTranslationLanguages` and
`getTranslations`. These services are undocumented by the source; their decoders
keep the well-formed entries and skip the rest.
It has no React or native dependencies. Inject storage/fetch/clock for reuse and
testing. It validates references before requests and response structure before
mapping or persistence, applies a 15-second timeout to fetching and JSON reading,
and deduplicates concurrent requests for the same resource.

`loadReaderContent` reads the selected edition's corpus from the copy bundled with
the app (`assets/quran`, since 2026-11-12; before, one API request of about
5.24 MiB, cached) and prepares page, juz, hizb, and quarter-hizb indexes. It
enables full local search, and asks nothing of the network. The caches below
serve what an ayah opens, the printed pages and the Hafs colours.

- Native persistent cache: `expo-sqlite/kv-store`.
- Web persistent cache: IndexedDB, avoiding localStorage quota pressure.
- Non-browser/static rendering: an in-memory store; hooks fetch after mounting.
- Keys include cache schema version and endpoint, including mushaf identity.
- Corpus data (mushaf text/metadata, tajweed surah data) stays fresh for
  **30 days** (`CORPUS_TTL_MS`); tafsir and translations for 24 hours.
- Stale-while-revalidate: an expired entry is returned immediately and refreshed
  in the background (deduplicated, with back-off: `Retry-After`, otherwise 5 min
  for network/429/5xx and 1 h for other failures). Manual refresh still waits for
  the network; `allowStale: false` requires a successful current response.
- Any refresh failure (network, timeout, 429/5xx, other 4xx, invalid JSON or
  schema such as a captive-portal page) serves a previously validated cache with
  `stale: true`, its original `fetchedAt`, and `refreshError`. Invalid payloads
  are validated before writing and are never persisted.
- The riwayah/mushaf identity is checked while decoding, so a mismatched payload
  is never cached.
- Cache keys (`quranpedia:*`, printed page assets) are tracked in a bounded LRU
  index (≈150 MB native, 50 MB web); user data (preferences, bookmarks, goals,
  reading positions) is never evicted.
- Failed refreshes do not overwrite valid data. Persistence failure allows the
  network response to be used; `onCacheError` supports storage diagnostics.
- There are no automatic request retries or corpus crawling. Numeric
  `Retry-After` headers are exposed for 429/error handling.

Daily full-resource refresh is the initial correction policy. A later official
offline-download feature can use versioned dumps and delta sync. The changes
endpoint is not required for this cache strategy.

## Entry points and checks

- `services/reader-service.ts`: persistent client and default-edition loader.
- `hooks/use-reader-content.ts`: loading, error, stale data, and manual refresh.
- `hooks/use-quran-font.ts`: bundled font readiness and the script (font and display mapping) for the chosen riwayah.
- `state/reader-state.ts`: reversible selection and hide/reveal behavior.
- `utils/search.ts`: local Quran and surah-name search.

Run `bun run test`, `bun run typecheck`, and `bun run lint`.
Run `bun run verify:quranpedia` to recheck the live full corpus in one request;
an existing response file can be passed as its argument for offline verification.
The small regression fixtures record the observed wire shapes, not a frozen Quran
for app distribution.

Sources: [Quranpedia API](https://api.quranpedia.net/),
[Warsh corpus](https://api.quranpedia.net/v1/mushafs/4),
[official SVG archive](https://quranpedia.net/api-quran-svg/warsh.zip),
[individual Warsh page](https://quranpedia.net/api/page/warsh/3),
[Warsh font](https://quranpedia.net/assets/fonts/arabic/UthmanicWarsh_V21.ttf),
[Expo SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/),
[Expo SDK 57 Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

## On-demand tafsir and translations

### Shareable ayah cards

The ayah sheet's Share action opens `/share-ayah` with a validated Warsh surah
and ayah reference. The designer offers emerald, paper and night palettes,
9:16 Status and square presets, optional app branding, and optional French or
English translation. Quran text and its original marker are never normalized,
truncated or replaced; very long content expands the card with a visible notice
instead of clipping text or making it illegible. The dimensions shown in the
designer reflect that expanded export.

Translation is fetched only on request, via the ayah's parallel Hafs references.
One book must cover every mapped reference; missing parts or errors disable
sharing until retried or translation is disabled. Source and Hafs numbering are
included on the card. Requests cannot update a different ayah/language.

The rendered card is captured as a 1080-pixel-wide PNG after fonts and layout
settle. Native uses SDK-compatible view-shot and Expo Sharing; web uses
html2canvas-pro and pre-prepared File sharing, with a local download fallback.
Images are generated locally without uploads or photo-library permission.
The preview displays the actual generated PNG when ready. Changes invalidate
older captures and release temporary resources; dismissal of a share chooser
does not produce an error. A custom development build predating these native
dependencies needs rebuilding (both modules are included in SDK 57 Expo Go).

Tests cover source consistency across mapped verses, missing translation parts,
font sizing, and preset dimensions. Browser checks cover card customization and
the exported PNG; native bundles are checked separately from device sharing.

No related-content request runs until its action is selected. Tafsir currently
uses book 2012 (التفسير الميسر); translations offer French and English and show
all books returned for the selected language. Each card shows the API's book
name, author, parallel reference, stale-cache status, and a source link.

Quranpedia's related endpoints use Hafs references. The reader follows the
Warsh corpus's `hafsAyahNumbers` mapping and loads every parallel reference,
explicitly labelling that numbering. It does not replace Warsh text or infer a
mapping from matching verse numbers. Related responses use the existing timeout,
validation, deduplication and persistent-cache policy. Closing or changing the
panel prevents late responses from updating another ayah. HTML is converted to
plain prose for display; this conversion never touches original Quran text.

## Swipe responsiveness — 2026-10-09

- `printed-page-loader.ts` runs two background loads concurrently and reserves a
  third slot for visible pages or jumps. Requests deduplicate, visible demand
  promotes queued pages, and changed preload windows discard obsolete queued
  work. Already-running downloads finish and remain reusable.
- The moving window prepares the current page, both immediate neighbors, 12 pages
  in the reading direction and four behind. Reversing direction reverses that
  runway. Only three page views are mounted; the whole mushaf is not mounted or
  downloaded automatically.
- Remounted printed pages initialize from a synchronous decoded-memory snapshot.
  Cached pages do not flash a loading spinner. `printed-page-render.ts` shares
  parsed SVG element trees across remounts, invalidating them when ink colours
  change. Artwork geometry and ayah masks remain unchanged.
- SVG decoding/preparation yields before starting and pauses during a gesture or
  committed page-turn animation. Persistent writes do not delay displaying a
  downloaded page. The 90ms settling animation can be interrupted by a second
  gesture, which finishes the previous committed turn before starting another.
- Expired decoded memory remains readable while refreshing. Cold starts, uncached
  jumps or swiping beyond the downloaded runway on a slow connection can still
  require a download; preloading cannot provide artwork that has not arrived.
