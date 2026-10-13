# Halaqat

Study circles, a mosque's or a family's, for children or grown-ups. They are shared through the
account, so they need one: signed out, the halaqat wait on the phone (no list, no reminders) and
come back at sign-in. Those in it are participants («المشاركون»); the code calls them students.
Whoever runs one is its supervisor («المشرف», never «المعلّم»: they needn't be a teacher): its
owner («صاحب الحلقة»), and supervisors they invite. The phone's owner can be one of the
participants (`me`): their memorized portions then come from the app's own record («محفوظك», kept
with goals), and each new portion they pass in a session is added to it (`usePlans().remember`,
which also re-plans a memorization goal that owns the record). Nothing is ever taken out of the
record from here. `me` is kept with the account as the participant's `account`, so it is theirs on
each of their phones and no one else's.

- **Sharing** (`membership.ts`, `provider.tsx`, `supabase/migrations/…_joining_halaqat.sql`): each
  halaqa has a code of eight letters and digits that its supervisors share (`invite.tsx`: tiles,
  the share sheet, a link that opens `/halaqat/join?code=`); whoever enters it joins as a new
  participant under the name they give, and the supervisors' phones get them at the next sync. A
  supervisor renews the code when it has gone too far. The owner makes a one-time code (a week) for
  another supervisor, who records sessions and changes participants and settings, but can't
  delete the halaqa (they leave it). Supervisors take members out; the owner takes supervisors
  out. `/halaqat/members` is where this happens.
- **A member's view** (`joined-screen.tsx`): from their own phone, a member sees the halaqa (as
  `joined_halaqa` gives it: its settings, its supervisors, their own participant and days, and
  every participant's name, photo and points), never another participant's days. It is read from
  the account, remembered on the phone (`halaqat:membership:v1:<user>`), and refreshed when the app
  comes back; it is never edited there.
- **Points** (`entryPoints`, `scoresOf`, `scoreboard.tsx`): present 2, late 1; a new portion
  excellent 6, good 4, fair 2; a revision 3, 2, 1; this month's and all of them. The account counts
  them the same way for members (`entry_points`); supervisors count them on the phone.
- **A halaqa** has a name, a riwayah (which fixes how its ayahs are counted, so it cannot change
  once a portion is recorded), the weekdays it meets, its students and its sessions. It can meet
  at a set `time`, and then remind before each session (`reminder.before`, 0–120 minutes): local
  notifications like the adhkar's (`notifications.ts`, prefix `quranni-halaqa:`), scheduled about
  two weeks ahead from `halaqaReminderQueue`, skipping sessions where everyone is already heard or
  away. Tapping one opens that day's session.
- **A participant** (`Student`) has a name, the order they memorize in (`backward`: from An-Nas back, as in the
  kuttab; `forward`: from Al-Fatiha on), what they had memorized before joining (`known`), and
  their first portions. A student who leaves keeps their history (`leftOn`) and can come back;
  deleting one removes their entries too.
- **A session** is one day of a halaqa. Each student's entry holds their attendance, what they
  recited (`new` and/or `revision`, each with its portion, its marks and a grade), the portions
  given for next time (`next`, the student's «لوح»), and a note.
- **Portions** are stored by surah and ayah (`AyahRef`), not by an edition's ordinals, so they
  survive corrections to an edition's page data. `shapeOf(index)` gives the ayah counts that turn
  them into ordinals when needed.

`model.ts` is pure (tested in `tests/halaqat.test.js`): what a student is on (`assignmentFor`, the
last session's `next` before a date, or their first portions), what they have memorized
(`memorizedBy`: known plus new portions passed), and the suggestions after a session
(`suggestNext`: the next portion of the same length in the student's order, the same portion again
when graded «يُعاد», and the next stretch of memorized ayahs for revision). A grade is suggested
from the marks (`suggestGrade`); the teacher gives the final one.

Screens: the list (home tab «الحلقات», and `/halaqat`: those the user supervises, then those they
joined), the halaqa (`/halaqat/[id]`, or a member's view of it), joining (`/halaqat/join`), its
people and code (`/halaqat/members`), its form
(`/halaqat/new`, `?id=` to edit), a session with its roll call (`/halaqat/session`), hearing one
student (`/halaqat/recite`, the portion's text to tap mistakes and prompts on), a student
(`/halaqat/student`) and their form (`/halaqat/student-form`). A halaqa meeting today also shows on
the home screen's «اليوم».
