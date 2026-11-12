# Recitation (الاستماع)

The reader's listening, from Quranpedia's reciters (`/reciters`). One player (`player.ts`) keeps
going between screens; the reader shows its controls (`recitation-bar.tsx`) above the page
navigation, and the page follows the ayah being recited.

## Two ways of listening (`listening` in the reading preferences)

Settings → «التلاوة» → «طريقة الاستماع». Each way keeps its own reciter per riwayah and its own
repetition (`reciters` and `repeat`, `surahReciters` and `surahRepeat`).

- **«آية بعد آية»** (`ayah`, the default): each ayah on its own, from editions with one file per
  ayah, or surah files with Quranpedia's ayah timings (played by segment). Each ayah repeats the
  chosen number of times; the bar moves by ayah.
- **«السورة كاملة»** (`surah`): the surah's continuous recording (`SSS.mp3`), from editions with
  one file per surah, timed or not (`surahRecitersFor`). It plays to the end, repeats the chosen
  number of times, then goes on to the next surah the reciter recorded. The bar moves by surah
  and has a seek bar (`seek-bar.tsx`). With timings («تتبع الآيات» in the list) the recording
  starts at the chosen ayah and the page follows the ayah heard; without them it starts at the
  top of the surah and the page stays where it is.

Repeating one ayah and listening to a goal's portion need each ayah on its own, so they stay
ayah by ayah with that way's reciter (`useListen`). Practice sessions do the same.

Whole surahs default to Al-Husary in an edition with timings when there is one; ayah by ayah
defaults to Quranpedia's Al-Husary editions by id (`catalog.ts`).

## Pausing on its own

The moon in the bar asks the recitation to pause by itself, for falling asleep to it (`setSleep`,
`sleep` in the player's state): in 15, 30, 45 or 60 minutes, or at the end of the surah being
recited; each press moves to the next choice, then to none. The time is checked as the recording
plays (not with a timer of its own, which a sleeping phone may hold back); when it comes the
recitation pauses where it is. At the end of the surah it stops. It lasts until it comes or the
recitation is stopped; choosing another ayah keeps it.

## Hearing a reciter before choosing

Each reciter in the list has a listen button (`sample.ts`): about 20 seconds from the opening of
Al-Fatiha (or of the first surah they recorded), from their first ayah files one after another or
the start of their surah file, fading out at the end. Saved files are used when the reciter is
downloaded. It has its own player and takes the app's sound like the recitation does, so it stops
a recitation under way; it stops when another sample plays, when a reciter is chosen, or when the
list closes.

## Offline

`downloads.ts` saves a reciter's surahs (ayah files or surah files) under
`documents/recitations/<id>/`, with a manifest that keeps the reciter so it plays without the
reciter list. Timings are saved beside them once loaded.
