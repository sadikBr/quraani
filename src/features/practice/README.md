# Tasmee' (التسميع)

The app shows a place in the mushaf. The user recites what goes with it from memory, reveals
the text to check it, and grades themselves: «أتقنت», «تردّدت» or «أخطأت»; or, asked which surah
an ayah is from, chooses it. «اختبار الحفظ» mixes the kinds of question, like a teacher's exam,
and ends with a score. Routes: `/practice` (choosing a session) and `/practice/session`.

## The page (`practice-screen.tsx`)

- **«من يسمّع؟»**: oneself, or someone else (see below).
- **The lawh** at the top says how the session goes: two words written at its head choose a
  tasmee' or «اختبار الحفظ» (`settings.exam`); under them, the tasmee's kind of question, how far
  to recite and how many places, or the exam's number of questions and latest results.
- Below it, what to recite, each started with one tap (the lawh decides which session starts):
  - **«مقترح لك»** (`presets.ts`): arched cards in a row. One's own: the places to review,
    everything memorized (the record memorization and revision goals keep, `memoryFor`), what
    was memorized in the last two weeks («جديد حفظك») and before the last month («قديم حفظك»),
    from the memorization goals' progress (each only when both exist, so neither repeats
    everything), then Juz' 'Amma and Juz' Tabarak. Listening to someone else: the two juz and
    two surahs often learnt by heart (al-Kahf, Ya-Sin).
  - **«مختاراتك»**: selections saved under a name and a mark (up to 12 per riwayah), made on the
    dial (below). A tap starts one; the pencil (or a long press) edits it.
  - **«مواضع تحتاج مراجعة»**: the places whose last grade was not «أتقنت», each opening the mushaf.
- «في أي سورة؟» needs three surahs or more: a smaller portion started with it says so.

The riwayah is the reader's, unless a goal opens practice with its own (`?riwayah=…&scope=memorized`,
which also turns back to reciting oneself).

## The dial (`pick-editor.tsx`, `range-dial.tsx`, `dial.ts`)

- A selection is chosen on a wheel of the surahs (or the juz, or the hizbs), its centre beyond
  the right edge so its rim runs down the screen; the unit at the pointer (left) is named below
  it with a button to add or remove it. Turning the wheel (a drag, with a little carry on a
  flick) settles on a unit; a tap adds or removes a unit; a long press then a drag adds (or
  removes) every unit it passes. Round the rim, what is chosen is a band in the primary colour,
  what one has memorized a dotted gold line, and each juz' start a tick and its number.
- «قائمة» opens the list sheet (`MemorizedSelectionSheet`): surahs, juz, hizbs, quarters, an
  exact stretch of ayahs, and search. For a screen reader the wheel is one adjustable control.
- The pure parts (units, angles, taps and sweeps, where the wheel opens) are in `dial.ts`.

## Places and cues (`engine.ts`, pure)

- **Cue modes** (`CueMode`, each place carries its `kind`): «أكمل الآية» shows the first words of
  an ayah. «ما بعدها» shows a whole ayah, and the user recites what follows it. «ما قبلها» shows
  a whole ayah, and the user recites what comes before it, within its surah (`startFor`: one
  ayah back, three, or from the start of the page; more when too few words). «في أي سورة؟» shows
  a whole ayah and offers four surahs (`surahChoices`): its own, others of the scope (the nearer
  likelier), then neighbours in the mushaf. It is asked only of ayahs of 3 to 40 words whose
  words are found in one surah (a refrain within one surah still names it), and only when what
  is practised spans three surahs or more (`surahQuestionFits`): with fewer, the answer is known
  before the ayah is read, so the mode is offered disabled and the exam leaves it out.
- A right surah answer does not clear a recitation missed at the same place: the place stays to
  review (and «سمّع هذه المواضع» recites the places to review, whatever the mode).
- **Reach**: to the end of the ayah, three ayahs, or the end of the page. A place always leaves
  at least a few words to recite, and never runs past its part of the scope.
- **Unique cues**: a cue shows the fewest words (at least three) that point to one place in the
  whole mushaf. Words are compared after search normalization. If the whole ayah repeats (a
  refrain), up to two ayahs before it are shown, lighter, within the same surah; in «ما قبلها»,
  the ayahs after it (those before it are the answer). If that still repeats (a surah's opening
  letters, an ayah that starts the next), the place is named: surah and ayah number.
- **Choosing places**: the scope is cut into as many parts as places, by amount of text, and one
  place is drawn from each part. Places never overlap, and the order is shuffled.
- **Weights**: a place last graded «أخطأت» weighs 4, «تردّدت» 2.5, an unseen one 1. One known
  in the last two sessions weighs 0.15.

## The exam (`chooseExam`)

- `EXAM_COUNTS` questions (10 or 20), spread over the scope like any session. The four kinds take
  turns, so each comes up about as often; a kind that cannot be asked at an ayah gives way to the
  next. Recitation runs to the end of an ayah or so, and an ayah of more than 40 words is only
  ever asked to be completed (`MAX_WHOLE_CUE`).
- No help while reciting: no hint, no word-by-word reveal. «كشف الجواب» shows it all, then the
  user grades it. Surah questions are graded by the choice, at once.
- **Score** (`examScore`): «أتقنت» counts a point, «تردّدت» half, «أخطأت» none; the share gives a
  teacher's grade: ممتاز (90%), جيد جدًا (75%), جيد (60%), مقبول (50%), else «يحتاج إلى مراجعة».
- After each answer the exam moves to the next question left unanswered, then to the result. The
  result is saved once every question is answered, and its grades then stand. Grades are recorded
  per place like any session, so missed places come back in tasmee' and in the review. A retry
  of what was missed is a plain session, its surah choices in a new order.

## Listening to someone else («من يسمّع؟ غيري»)

- For a teacher or a parent who holds the phone while someone else recites. Settings keep the
  choice (`helper`). One's own record is left out (memorized portions, places to review), and
  nothing is drawn by one's own missed places; saved selections serve both (one per child, say).
- Each place is shown whole at once, to follow the recitation, with the cue highlighted: the
  words to read out. Grades come at once (no reveal); a surah question is answered with what
  the reciter says.
- Nothing is recorded: no grades, no session count, no exam in the history.
- The wording speaks to the listener and never assumes the reciter's gender: the task as a
  verbal noun («إكمال الآية»), grades as nouns («إتقان», «تردّد», «خطأ»), results in the passive
  («أُتقن ٨ من ١٠»).

## Look

- Shapes carry meaning: the **lawh** (`lawh.tsx`), the kuttab's wooden board, is how one is
  tested: the page's settings, each exam question (its edge takes the grade's colour once
  graded), and the score; hidden words are dotted rules on it (`GhostLines`). **Arches**
  (`art.tsx`), as the doors and niches of the Maghrib, are what one recites: each suggestion an
  arched tile with a geometric pattern (eight-pointed stars, a rosette, a mashrabiya lattice, a
  crescent among stars, ripples, nested arches) fading into its title, a juz' number on a
  medallion, a surah's name in calligraphy in a surah title's frame; a saved selection's mark on
  a small arch. The **wheel** is the whole Quran, chosen from.
- Lines are drawn a line's width inside their drawing, never on its edge: a fraction of a pixel
  past it is cut off on dense screens.
- **Kinds as diagrams** (`mode-diagram.tsx`): each kind is drawn as two lines of a page, solid
  where text is shown and dotted where it is recited; the surah question as an ayah over an
  empty surah frame.
- **Surah choices**: the surah-name calligraphy in the pointed frame of a surah title
  (`cartouchePath`); the right one turns green, a wrong choice red.
- Colours are the theme's roles only: the board is the card warmed by `ornament`; the arches are
  the primary colour deepened with the ink on a light page (written in the page's paper), the
  card warmed by the gold on a dark one, patterns in gold (`artColors`).

## Records (`progress.ts`)

- The record is stored under `practice:v1`, keyed by riwayah. Places are kept by `surah:ayah`,
  so corrections to an edition's pages do not lose them.
- Each place records how often it was seen, missed and hesitated over, its last grade, its
  session number and its date.
- Changing a grade within the same session replaces the earlier one.
- The record is capped at 3000 places; the oldest well-known ones go first.
- Exams are kept per riwayah, the latest 30: date, questions, and how many of each grade.
- Settings keep the exam's number of questions (`examCount`) besides the session's, and which
  of the two the lawh is set to (`exam`).
- Saved selections (`picks`) are kept per riwayah as ayah positions with the edition's ayah count,
  merged and in order; another edition drops them. The single selection kept before (and the one
  kept to listen to someone else) become the first saved ones, unnamed.
- Decoding keeps whatever is valid.

## Session

- A session lives in memory (`PracticeProvider`). Each grade is saved as soon as it is given.
- **Each place**: one place per page, swiped like the mushaf. Words can be revealed one at a time
  or to the end of the ayah, or everything at once. Once all is shown, grading moves on to the
  next place.
- **The text** (`place-view.ts`, `place-text.tsx`): set as the reader sets it, in the riwayah's
  letters (Maghribi or Mashriqi for Warsh), the reader's size and line spacing, and its tajweed
  colours when they are on. `placeView` says what shows (the cue, the words revealed, markers,
  the highlight); it is drawn as React Native text, or, with colours, as a web document like the
  reader's (`place-document.ts`: a browser keeps an ayah's letters joined across colours, which
  React Native on Android does not). The document is built once per place, and what shows is
  applied in place; it takes no touches, so the page scrolls and swipes over it. If it cannot be
  drawn, the plain text is shown.
- Ayahs shown to tell a refrain apart are the same size as the rest, lighter, with a line saying
  why («يتكرر هذا الموضع في القرآن، فذكرنا ما قبله»).
- **Hint**: «تلميح» shows the surah and ayah number. Ayah markers stay hidden until the hint is
  shown or checking starts.
- **Listening**: the place can be heard with the chosen reciter.
- **Summary**: the counts and the places to review, each opening the mushaf at its ayah, and a
  retry of what was not «أتقنت».

Tests: `tests/practice.test.js`, `tests/practice-text.test.js`, `tests/practice-dial.test.js`.
