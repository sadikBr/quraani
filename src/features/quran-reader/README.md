# Quran reader structure

This feature owns the Quran reading experience. The initial scope is reading,
page navigation, the surah/juz/hizb index, search, ayah actions, and hide/reveal.
The data layer, local search, page/index preparation, font-loading hook, and
selection/hide/reveal state are implemented. A visual reader prototype now opens
at the home route, with original printed Warsh SVG pages as the default,
justified adjustable ayah text, and quiet page controls. Display settings sit
behind the menu. The full navigation/index remains later work. See [the implementation decisions](./IMPLEMENTATION.md) and
[prototype validation](./PROTOTYPE_QA.md).

```text
assets/fonts/                         Quran fonts, matched to the selected mushaf
src/
  app/                                Expo Router screens and layouts only
  components/                         Shared app UI (existing)
  constants/                          Shared theme tokens (existing)
  hooks/                              Shared app hooks (existing)
  lib/
    quranpedia/                       API client, response types, and data mapping
  features/
    quran-reader/
      components/
        reading/                      Mushaf pages, ayah lists, reader controls
        navigation/                   Page movement and jump controls
        ayah/                         Ayah selection, action sheet, hide/reveal UI
        catalog/                      Surah, juz, and hizb index
        search/                       Search input, results, and highlighting
      hooks/                          Reader data and interaction hooks
      services/                       Persistent API client and reader loading
      state/                          Reading position, selection, hidden ayahs
      storage/                        Content cache, bookmarks, saved preferences
      types/                          Reader models and Quran references
      utils/                          Reference, navigation, and search helpers
```

## Boundaries

- Keep Quranpedia HTTP requests and API-specific response shapes in
  `src/lib/quranpedia/`. Keep this code independent of React Native so a future
  web application can reuse it.
- Keep the reader's data models in `types/`. Include the mushaf identity with
  surah/ayah references; do not assume numbering or page boundaries match across
  editions.
- Use `state/` for active UI state and `storage/` for persistence. Saved reading
  position and bookmarks must retain their mushaf identity. Cached content needs
  a version or refresh policy so Quranpedia corrections can be applied.
- Keep original Quran text intact. Search normalization belongs in `utils/` and
  must operate on a separate value, not modify displayed text.
- Keep hide/reveal state separate from Quran content and memorization progress.
- Use `reading/` for both traditional page and flowing ayah presentations. Do not
  assume the API supplies enough layout metadata for traditional pages until its
  assets and font have been verified.
- Keep reusable buttons, sheets, and typography in `src/components/`; keep
  reader-specific UI inside this feature.
- Remove each `.gitkeep` when its directory gains implementation files.

## Routes to add during implementation

Screens should be thin wrappers around this feature. Planned route files:

- `src/app/reader/_layout.tsx`: reader navigation layout.
- `src/app/reader/index.tsx`: open or resume the selected mushaf.
- `src/app/reader/page/[page].tsx`: page reader with mushaf context.
- `src/app/reader/catalog.tsx`: surah/juz/hizb index.
- `src/app/reader/search.tsx`: Quran search.

These route files are intentionally not scaffolded as empty files: Expo Router
treats files under `src/app/` as routes. Add them when there are screens to render
and integrate their layout with the existing tab navigation.

## Index, search, and saved ayahs

`components/ui/library-chrome.tsx` supplies shared headers, persistent search
fields, tabs and empty states. The index filters surahs, juzs and hizbs by name
or number (including Arabic digits), retaining each division's exact first ayah.
Search and bookmarks share `AyahResultCard`, with the edition's Quran font,
surah calligraphy, page references, and direct open/save controls.

Bookmarks can be filtered by surah name, Quran text or a `surah:ayah` reference,
and sorted in Quran order or by newest saved insertion. `utils/saved-ayahs.ts`
keeps these operations separate from displayed text and preserves existing
bookmark keys and storage. Removal offers an immediate undo; restoring re-adds
the bookmark through the existing provider. Riwayah-specific saved lists remain
separate. Quran search retains its debounce and paginated, virtualized results.
