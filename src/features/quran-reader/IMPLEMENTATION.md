# Warsh reader foundation

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
  (**نص متصل**) per surah section. Both use the bundled Warsh font and adjustable
  text size and line spacing. Continuous text wraps to the available width, with
  inline ayah markers and no fixed line count. Original `text` and `marker` remain
  separate and unchanged. Old `mode: ayah` preferences migrate to separate rows.
- Bismillah is supplied by the mushaf metadata. Warsh Al-Fatiha's first numbered
  ayah is “الحمد…”, not Bismillah. The renderer should show Bismillah as an
  unnumbered opening at surah starts except surah 9; do not insert it into the
  ayah dataset. The traditional SVG already contains its printed opening.
- Tap the page to toggle reading tools; tap an ayah number or long-press its text
  to open actions. Actions include bookmarks, copy, native sharing, tafsir and
  translations. Printed hit regions preserve the artwork geometry.
- The page number and jump action belong to the animated bottom toolbar. Focus
  mode has no persistent page footer, and toggling tools does not resize the text.
  The page viewport is clipped below a reserved native top safe area, including
  the camera cutout. Late larger measurements are accepted; hiding system bars
  never reduces the reserved top or bottom space during a portrait session.
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
`assets/fonts/`. `useWarshFont` loads it at runtime on mobile and web. Cmap
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

## API and cache

`QuranpediaClient` provides corpus/ayah methods plus `getTafsirBooks`,
`getBookContent`, and `getTranslations`.
It has no React or native dependencies. Inject storage/fetch/clock for reuse and
testing. It validates references before requests and response structure before
mapping or persistence, applies a 15-second timeout to fetching and JSON reading,
and deduplicates concurrent requests for the same resource.

`loadReaderContent` loads the default Warsh corpus in **one documented API
request** and prepares page, juz, hizb, and quarter-hizb indexes. This response is
approximately 5.24 MiB over the inspected HTTP connection. It enables full local
search without a crawl. No corpus snapshot ships in the application.

- Native persistent cache: `expo-sqlite/kv-store`.
- Web persistent cache: IndexedDB, avoiding localStorage quota pressure.
- Non-browser/static rendering: an in-memory store; hooks fetch after mounting.
- Keys include cache schema version and endpoint, including mushaf identity.
- Responses remain fresh for **24 hours**. The next load after expiry refetches
  the entire resource, so source corrections replace cached text. Manual refresh
  bypasses freshness; `allowStale: false` requires a successful current response.
- On network errors, timeout, 429, or 5xx, a previously validated cache can be
  returned with `stale: true`, its original `fetchedAt`, and `refreshError`.
  The future reader must show that cached content could not be refreshed.
- Invalid JSON/schema and 4xx other than 429 are not hidden behind stale cache.
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
- `hooks/use-warsh-font.ts`: bundled Warsh font readiness.
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
