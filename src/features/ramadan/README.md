# Ramadan

What the app adds during the month, and only then (`ramadanDay`: the app's tabular Hijri date,
with the shift the user set in the prayer settings, so it follows the announced month).

- `ramadan-card.tsx`, on the home screen under the prayer times: the day of the month, the fast's
  two times at the user's place (it stops at Fajr and is broken at Maghrib, from the prayer times'
  own calculation), the time left to the one that comes next, and «ختمة رمضان».
- «ختمة رمضان» opens the new goal form filled in (`/plans/new?type=wird&preset=ramadan`): a daily
  wird of one juz', thirty of them. With a khatma or daily wird already under way (there is one at
  a time), the card opens that goal instead.

`ramadan.ts` is pure (`tests/ramadan.test.js`).
