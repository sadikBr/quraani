# Reader prototype validation

The home route now opens the Warsh reader instead of the Expo starter screen.
The root uses an Expo Router stack and safe-area insets. Existing starter examples remain in the repository but are not shown as
reader tabs. No new native library was needed for this stage.

## Implemented experience

- Live/cached Warsh text with its bundled matching font. Text does not render in
  a fallback font while the Warsh font is loading; font failure has its own state.
- **Mushaf**: original Warsh SVG artwork with printed justification and line breaks.
  Ordinary pages keep their 15-line layout; pages 1–2 keep their opening layout.
  Page artwork scales to available width without reflowing.
- **Ayahs**: individual rows with edition-local surah/ayah references.
- Original ayah markers use the same Warsh font, a distinct color, and a
  nonbreaking separator from the text. Original text/marker values remain intact.
- Separate unnumbered Bismillah at surah openings, except surah 9. Page 604
  correctly includes three surah sections and three openings.
- Ayah-mode text size 24–48, default 32; comfortable/spacious line height at 1.9/2.25 times
  text size. System font scaling stays enabled. No fixed-height text boxes,
  truncation, automatic text shrinking, or artificial letter spacing.
- Explicit RTL text direction and right alignment, regular font weight, font
  padding, and extra vertical space for diacritics.
- Quiet borderless reading surface with an Arabic page number,
  small page arrows, and a reading-settings menu. Demo samples, branding, hints,
  ayah counts, and selection banners are removed from the reading surface.
- Surah calligraphy on the first two printed pages and headings in ayah mode
  use the bundled `surah_name.ttf`. The font
  renders Arabic-Indic surah numbers and 115 as calligraphy, with actual text
  retained as accessibility labels.
- System/light/dark appearance, text controls, view mode, source credit, and any
  stale-cache notice sit inside the settings menu. Tap the selected ayah again
  to clear its highlight.
- Loading, font errors, and network retry. Reader settings and
  position are session state for now; persistence belongs to the next stage.

## Checks completed on 2026-10-08

The initial prototype received the export and wide typography checks below.
The borderless printed reader subsequently passed lint, typecheck, and 27 tests,
including actual Warsh page region matching and 15 line bands on page 3;
its phone-width reading surface, settings menu, and navigation were checked in
the browser. Native device validation remains pending.

| Check | Result |
| --- | --- |
| Regression tests | 23 pass, including Bismillah placement, continuation pages, long ayah and multiple surahs |
| TypeScript / ESLint | Pass |
| Expo production export | Android Hermes, iOS Hermes, web bundle and static routes all succeed |
| Browser at 390 × 844 | Al-Fatiha and dense page visually inspected in dark/light themes |
| Browser at 320 × 740 | Closing-surah ayah view inspected at size 48; heading/Bismillah wrap without fixed-box clipping |
| Largest text / spacious lines | Long ayah inspected at size 48 with spacious line height |
| Applied font | Computed style confirms `QuranWarsh`, RTL, 32px text / 61px default line height |
| Selection | Warsh 2:5 and 114:6 select correctly; page switching clears selection |
| Page 604 | Three headers and openings; final ayah reachable by scrolling; next-page control disabled |
| Browser error logs | No errors captured during final interactions |

The browser screenshots demonstrate the web rendering of shared components;
they are not screenshots from Android or iOS. Automated tests validate data and
sectioning, not native glyph shaping.

## Native device validation still required

This environment has no Android emulator/ADB or iOS simulator/Xcode. Successful
platform exports confirm bundling, not installation or native rendering.

Run the reader on at least one Android and one iOS device, and record device,
OS, font scaling, screenshots, and observations for the following checks:

1. Al-Fatiha at sizes 24, 32 and 48: joined letters, all diacritics and seven ayah
   markers; Bismillah is unnumbered and not duplicated.
2. Pages 3 and 48 at normal and largest text: no clipped marks, lost text, wrong
   marker placement or horizontal overflow; the entire page is scrollable.
3. Page 604 in both modes: all three surahs, correct openings, final ayah reachable.
4. Dark, light and system appearance: readable text/markers, matching status bar,
   usable controls, safe areas clear of notches and system navigation.
5. OS font scaling at 100%, 150% and 200%: wrapping controls remain usable and
   Arabic line spacing scales without overlap. Use portrait phone and tablet sizes.
6. VoiceOver/TalkBack: read the Arabic text and use selection/settings/navigation.
   Confirm nested selectable text is exposed correctly by each native platform;
   use individual-ayah mode when checking per-ayah access.

Native typography acceptance remains pending until these device checks pass.


## Ayah actions, hiding and search — 2026-10-09

- Browser checks at phone (390×844) and desktop sizes: visible-ayah selection,
  action sheet, persistent bookmark/reopen/removal, copy feedback, sourced tafsir
  and French translations, hidden printed polygons and tap-to-reveal.
- A three-ayah passage on Al-Fatiha was hidden, revealed together, re-hidden and
  cleared through the reader drawer. Explicit search jumps highlight/reveal the
  destination. Page mode was restored after testing flowing-mode scrolling.
- Long Al-Baqarah ayahs scroll to the final ayah and open the correct action
  sheet. Repeated page navigation (11→12→13→14→13) retains correct references.
- Local search handles Warsh yeh forms, returns original text/Warsh references,
  and opens Al-Fatiha correctly from a result. Automated pagination checks cover
  long result lists without duplicate or omitted references.
- 59 automated tests pass, including real related-content response fixtures,
  source identity validation, cached reading, slow/interrupted request timeouts,
  invalid data, passage bounds and text preservation. ESLint and TypeScript pass.
- Android, iOS and web exports pass. Native installation/rendering is not tested
  in this environment. Native Share/clipboard, keyboard overlap, SVG selection
  and reveal with TalkBack/VoiceOver, modal focus/escape, and OS text scaling still
  require the device checks listed above. Export success is not device acceptance.


## Swipe performance changes — 2026-10-09

- Browser verification: eight consecutive page-header advances from page 13 to
  21, repeated forward gestures, then four closely spaced forward swipes 31→35
  and four reverse swipes 35→31. Visible page artwork was present after settling
  and no page loading spinner was present in the reverse-swipe check.
- 67 tests pass. New coverage checks parallel loading, a reserved foreground slot,
  request promotion/deduplication, rapid cached turns, direction-aware boundaries,
  cancellation of obsolete queued preloads, LRU/byte budgets, stale refresh and
  retry after failure. Lint and TypeScript pass.
- Native frame rate and memory acceptance remain pending device profiling. The
  browser gesture checks are not Android/iOS frame-rate measurements. First-time
  cold downloads and distant jumps may still load while waiting for artwork.
