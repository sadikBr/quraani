# Activity (مواظبتك)

The days the user read, memorized or revised, and the run of days in a row they make.

- `log.ts` (pure, tested in `tests/activity.test.js`): `activityOf(plans)` reads each day from the
  goals (every progress recorded in a khatma, daily wird, memorization or revision, on its date; a
  recurring reading on the day of its occurrence). `mergeActivity` takes that into the saved days
  (`activity:v1`): today follows the goals exactly, so a same-day undo takes the day back out;
  earlier days only gain, so a day stays after its goal is finished, archived or deleted.
  `streakOf` gives the run under way (up to today, or up to yesterday while today is still to
  come), the longest run and the count of days.
- `provider.tsx`: keeps the days as the goals change. With an account they come to a phone that
  has none of its own (`restore`), and each phone then keeps its own from the same goals, so no
  choice between copies is ever asked.
- `src/features/widgets/wird-widget.tsx` gives the run of days to the home-screen wird widget.
- `streak-card.tsx`: the home screen's card (the flame, the last seven days, a word to keep going).
- `activity-screen.tsx` (`/activity`): the run, the longest run and the total, any month as a
  calendar, and the hadith on steady deeds.

A day also counts when the mushaf was open for a few minutes in it (`READING_SECONDS`, counted
by `useCountsAsReading` in the reader while it is in front; `read` in the saved state), goal or
no goal.
There is no notification for it; the goals' own reminders are what bring the user back each day.
