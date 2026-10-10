# Reading goals

Supports a dated khatma, a continuous daily wird, memorization, and recurring
surah reading.
Each goal owns its riwayah, schedule, progress and optional reminder. No
account or server is needed. Routes live in `src/app/plans`; the reader menu opens
the goals overview.

The UI calls these **goals (الأهداف)**. Existing `/plans` routes, storage keys,
notification identifiers, and internal `ReadingPlan` types remain stable so saved
goals and notification links continue to work. The overview separates due goals,
all current goals, and the archive; its daily total counts completed portions or
complete recurring occurrences, excluding partial progress and archived goals.

Creation is a two-step flow: choose the type, amount and starting point, then
review the schedule, name, repeat and reminder settings. Khatma and daily wird are two
strategies for a single reading goal. Memorization is a separate goal slot and can
coexist with one current reading goal. Only one current reading goal is allowed
across both strategies and riwayat. Active, paused and future goals occupy this
slot; completed and archived goals free it. Creating or restoring a replacement
stops repetition of any completed reading goal
without changing its completed cycle or history.

`goal-limit.ts` enforces this inside the serialized repository write, protecting
creation, archive restoration, undo and repeat changes. Existing duplicates from
older versions are preserved and may still be edited or archived; loading never
discards current reading progress. The UI links to the existing goal while a
reading goal is current, and disables both creation choices.

The goal chooser also offers Al-Kahf every Friday, Al-Mulk every day (with a
21:00 reminder preset), and custom recurring reading. Recurring goals can coexist
with the sequential reading goal and with each other. The same card frame,
typography, theme palette, geometry, form sections and detail controls are shared
across goal types.

## Scheduling and progress

`engine.ts` is a pure scheduling layer. `buildPlanIndex` reads actual page, juz,
hizb and quarter-hizb boundaries from the chosen Quranpedia edition. It never
assumes a fixed number of pages per hizb. All ranges use ayah ordinals with an
exclusive end, bound to an edition fingerprint. A changed corpus is rejected
without overwriting saved progress.

- Both strategies can start from a page, surah or hizb. `start-point.ts` resolves
  the exact first ayah in the selected edition; surah/hizb selection never rounds
  back to the beginning of its containing page. The saved cycle retains that
  ayah ordinal, so existing storage needs no migration.
- A khatma distributes the remaining Quran over 1–52 weeks, up to seven portions
  per week (fewer when fewer ayahs remain than the requested number of days).
  When whole selected units cannot fill every day, division plans use quarter
  hizbs, then ayah boundaries. Missed portions remain due. The user can extend
  the schedule or redistribute the remaining range through its original end.
- A wird uses a chosen daily amount with no completion deadline. Unfinished reading carries forward without
  adding missed-day debt. Once a portion is completed, the next is available on
  the following local calendar day. Division quotas align to the corresponding
  boundaries; the first/final portion can be shorter.
- A memorization goal uses a weekly quota measured in quarter-hizbs (at least one
  quarter) and selected weekdays. The quota is divided across those days using
  complete ayahs and real quarter-hizb boundaries, so every assigned session is
  readable and no ayah is counted twice. If a day would receive no new ayahs
  because a boundary is larger than its share, that slot stays empty and the
  remaining quota carries forward. Missed days are re-anchored to the next
  selected day rather than creating duplicate assignments.
- Memorization is edition-specific. The creation flow can start with surahs,
  juzs, quarters, or exact ayah ranges already known. Confirming a session adds
  its exact ranges to the durable memorized record; correction and undo subtract
  only the affected ranges. That record remains after a goal is completed,
  archived or deleted, and it is reused when creating the next memorization goal.
  Warsh and Hafs records are kept separate and a changed Quran corpus is rejected.
- Opening or swiping a page does not record reading. Reader controls explicitly
  save through the current page or complete the assigned portion. Receipts bind
  writes to a cycle and portion so stale/repeated taps cannot advance another
  portion. The last progress entry can be undone.
- Starting a portion opens a bounded reader for its remaining page range. Swipes,
  adjacent-page rendering, preloading and quick jumps stop at both ends. The
  toolbar shows the page within the portion, and a completion card scrolls below
  its final page. Printed artwork retains its layout; text layouts and practice
  include only assigned ayahs on partial boundary pages. Start/end references
  identify exact ayah boundaries in the printed view. The normal reader remains
  unrestricted. `reading-session.ts` revalidates the edition and exact portion
  inside the serialized progress write, including after a schedule change.
- Pausing shifts pending dates by the paused calendar days. A completed repeat
  cycle restarts at the beginning of the Quran the following day (or today, if
  the app is reopened later) and retains a
  summary of the previous cycle. Archiving stops reminders and keeps the goal
  for a 14-day recovery period.

Local calendar dates are stored as `YYYY-MM-DD`; calendar arithmetic does not
depend on the device's DST offset. Schedule previews are generated by the same
engine that creates saved plans.

## Recurring surah goals

`recurring.ts` handles one or more whole surahs, ordered as in the chosen edition,
on selected weekdays from a chosen start date. Each date has its own progress
log, with no catch-up debt: an unfinished occurrence remains in history and the
next scheduled date starts fresh. Recurring goals remain active until paused or
archived; they do not claim the khatma/daily-wird slot.

Creation previews the next three dates using the same scheduling functions as
the saved goal. The surah picker supports names and numbers. Each chosen surah
opens its own bounded reader session; after completing it, the user returns to
the goal to begin the next. Both riwayat and the existing reader layouts work.
Only completing every chosen surah counts as a completed occurrence.

Receipts use the occurrence date (`YYYYMMDD`) and surah slot, so an old reader
session cannot record progress against another date or surah. Saves recheck the
current local date. Today's last progress entry can be undone. Pausing cancels
reminders; resuming uses the original weekdays without shifting the calendar.
Editing weekdays changes availability while preserving earlier progress logs.
Names and reminders are editable; the selected surahs and riwayah stay fixed.

## Archive retention and deletion

Archived goals have an `archivedOn` local calendar date. Their deletion date is
14 calendar days later, displayed in the archive and goal details. Restoration
clears this date; re-archiving starts a fresh period. A goal archived while paused
is restored paused, so resuming shifts its dates by the real pause instead of
restoring a backlog. Restored memorization goals re-plan from tomorrow if a
session was already finished today. Manual permanent deletion
is available from archive cards and details after an explicit confirmation.
`deleteArchivedGoal` rechecks status inside the serialized write, so a stale
confirmation cannot delete a restored/current goal.

`archive.ts` applies retention on repository load and writes, plus foreground
and day-change cleanup through the provider. No background service is required:
expired items are removed the next time the app runs. Existing archives without
a date receive a full 14-day grace period on first load, persisted immediately;
we never infer an archive date from old reading dates. Existing storage stays
compatible through the optional field. Failed writes keep the old data intact.

## Persistence and notifications

`repository.ts` stores a validated versioned envelope under `plans:v1` using the
app's existing SQLite/IndexedDB storage adapter. Existing sequential records are
unchanged; recurring records use a distinct goal type, range list and dated
occurrence logs, and memorization records use edition-bound ayah spans independent
of goal lifecycle. All are validated before loading or saving. Reads and writes are serialized;
successful storage is required before publishing progress to the UI. A future
schema must add an explicit migration, not silently discard older plans.

Phone reminders use local `expo-notifications` notifications. Permission is
requested only when the user saves a plan with reminders enabled. Web does not
offer reminders. Notifications are rebuilt after edits, foregrounding, calendar
day changes and timezone offset changes. Tapping one opens its plan.

`local-notifications.ts` imports only the SDK's local notification modules. In
SDK 57, importing the package entry point also starts remote-push registration,
which throws in Android Expo Go even when the app only needs local reminders.
Do not replace the adapter with a package-level import. Recheck its module paths
and the notification regression tests when upgrading Expo; local reminders stay
enabled in Expo Go as well as development and release builds.

Android Expo Go uses Expo's built-in fallback notification channel; SDK 57's
custom channel manager can have a missing scoped `NotificationsChannelsProvider`.
App builds use the named reading-plan channel, falling back only for that known
missing-provider error. The selected channel is also applied to scheduled triggers.
Reminder setup and permission failures do not prevent saving a plan or its
settings: the reminder is saved as off, and the detail screen explains how to
retry. Background sync errors are shown in Arabic without exposing native traces.

The queue covers at most the next 30 days, capped at 48 total notifications
across all plans to leave space for other app notifications. Opening the app
refreshes the queue; delivery stops when that preloaded window is exhausted.
The operating system controls delivery timing. Schedule changes cancel only
notifications carrying this feature's identifier prefix.
Recurring reminders use only selected weekdays from the start date, and skip
occurrences already completed. Completing all surahs cancels that day's pending
reminder; partial reading keeps it scheduled.

## Adding other plan types

`ReadingPlan` separates `SequentialPlan`, `MemorizationPlan` and
`RecurringPlan`; use `isSequentialPlan`, `isMemorizationPlan` and
`isRecurringPlan` to narrow it before accessing strategy-specific progress.
Future goals such as memorization revision should define their own range and
completion rules while reusing calendar, storage, reminders, reader actions and
lifecycle UI. Avoid representing disjoint ranges as contiguous khatma reading.

## Verification

`tests/plans.test.js` covers both editions, every supported duration and unit,
coverage without gaps, boundary alignment, partial progress, stale completion,
missed days, pause/resume, catch-up, repeat cycles, invalid storage, concurrent
writes and notification queue limits. Native notification delivery and native
date/time picker interaction still require testing on a phone/development build.
`tests/recurring-goals.test.js` covers weekday/date boundaries, independent
occurrences, multiple nonadjacent surahs in both editions, stale receipts,
undo, schedule edits, pause/archive, persistence coexistence and reminder filtering.
`tests/memorization-goals.test.js` covers edition-specific durable memory,
quarter-hizb quotas, weekdays and carry-forward, disjoint ranges, exact bounded
reader sessions, confirmation/undo/correction, stale writes, archive/delete,
reloading, reminders, and completion of the full Quran.

## Edition corrections

Goals store ayah ordinals plus an edition fingerprint (`corpus`) that also covers
page/hizb/juz metadata. When the source corrects metadata only (same ayah count),
`relink.ts` re-links goals and the memorization record to the new fingerprint the
first time a screen loads that edition, instead of locking them. Pause, archive
and delete never need the mushaf, so an offline or re-downloading edition cannot
block them. Memorized ranges are stored as bare `{ start, end }` and compared by
value.

A repeating khatma that is reopened days after completion starts its next cycle
today rather than on the day after completion, so it never starts overdue.
