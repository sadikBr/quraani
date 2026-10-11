# Tasmee' (التسميع)

The app shows the start of a place in the mushaf. The user recites the rest from memory, reveals
the text to check it, and grades themselves: «أتقنت», «تردّدت» or «أخطأت». Routes:
`/practice` (choosing a session) and `/practice/session`.

## What is practised

- **Everything memorized**: the memorization record that memorization and revision goals keep
  for each riwayah (`memoryFor`). Practice only reads it.
- **A selection**: surahs, juzs, hizbs, quarters or ayah ranges, chosen with the same sheet as
  memorization (`MemorizedSelectionSheet` with `purpose="practice"`). It is remembered per
  riwayah, together with the edition's ayah count.
- **Places to review**: those whose last grade was not «أتقنت».

The riwayah is the reader's, unless a goal opens practice with its own (`?riwayah=…&scope=memorized`).

## Places and cues (`engine.ts`, pure)

- **Cue modes**: «أكمل الآية» shows the first words of an ayah. «ما بعدها» shows a whole ayah,
  and the user recites what follows it.
- **Reach**: to the end of the ayah, three ayahs, or the end of the page. A place always leaves
  at least a few words to recite, and never runs past its part of the scope.
- **Unique cues**: a cue shows the fewest words (at least three) that point to one place in the
  whole mushaf. Words are compared after search normalization. If the whole ayah repeats (a
  refrain), up to two ayahs before it are shown, lighter, within the same surah. If that still
  repeats (a surah's opening letters, an ayah that starts the next), the place is named: surah
  and ayah number.
- **Choosing places**: the scope is cut into as many parts as places, by amount of text, and one
  place is drawn from each part. Places never overlap, and the order is shuffled.
- **Weights**: a place last graded «أخطأت» weighs 4, «تردّدت» 2.5, an unseen one 1. One known
  in the last two sessions weighs 0.15.

## Records (`progress.ts`)

- The record is stored under `practice:v1`, keyed by riwayah. Places are kept by `surah:ayah`,
  so corrections to an edition's pages do not lose them.
- Each place records how often it was seen, missed and hesitated over, its last grade, its
  session number and its date.
- Changing a grade within the same session replaces the earlier one.
- The record is capped at 3000 places; the oldest well-known ones go first.
- Decoding keeps whatever is valid.

## Session

- A session lives in memory (`PracticeProvider`). Each grade is saved as soon as it is given.
- **Each place**: one place per page, swiped like the mushaf. Words can be revealed one at a time
  or to the end of the ayah, or everything at once. Once all is shown, grading moves on to the
  next place.
- **Hint**: «تلميح» shows the surah and ayah number. Ayah markers stay hidden until the hint is
  shown or checking starts.
- **Listening**: the place can be heard with the chosen reciter.
- **Summary**: the counts and the places to review, each opening the mushaf at its ayah, and a
  retry of what was not «أتقنت».

Tests: `tests/practice.test.js`.
