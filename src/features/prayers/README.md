# Prayer times (مواقيت الصلاة)

The five prayers and sunrise at the user's place, the next one with a countdown, and alerts at
each time: a notification, the takbir, or the whole athan. Route: `/prayers`.

The screen (`prayers-screen.tsx`) keeps to the times: the place (with «تغيير»), the next prayer in
the theme's colour (Hijri and Gregorian dates, its name and time, a ticking countdown, and a bar
from the time we are in to the next), then any day's times, a week at a time: a strip of seven days
(Monday to Sunday, as Morocco's calendars; today dotted, the chosen day filled) with arrows to the
previous and next week, up to 52 weeks either way. The chosen day's six times follow, each with its
alert bell; on today those past are dimmed and the present one is marked «الوقت الحالي».
«اليوم» comes back to today. Its last row, «إعدادات الصلاة», opens `/settings?tab=prayers`.

Everything else is in the settings' «الصلاة» tab (`prayer-settings.tsx`): the alerts and the athan
(with its test and Android's conditions), the prayer times notification, and the calculation.

The home screen's «اليوم» tab opens with the day's card (`home-card.tsx`): the next prayer and the time left,
the day drawn as the sun's path (each time at its hour, Fajr and Isha under the horizon, the part
already passed in the theme's colour, the sun marking now), and the six times in a row; after Isha
it shows the next day. It opens the home screen's «الصلاة» tab (which shows this screen in place,
without its own header) or `/prayers`, or asks for the place when there is none.

## Times (`times.ts`, pure)

- Computed on the phone with [Adhan](https://github.com/batoulapps/adhan-js) (MIT). Nothing is
  fetched, so they work offline.
- **Methods**: `habous` by default (Morocco's Ministry of Habous and Islamic Affairs: Fajr 19°,
  Isha 17°, sunrise −3 min, Dhuhr and Maghrib +5 min), then Algeria, Tunisia, France (UOIF) and
  Adhan's built-in methods. The Habous preset also carries a few seconds per prayer so that the
  minutes round like the published tables: `tests/prayers.test.js` checks Casablanca and Oujda for
  October 2026, 371 of 372 times equal (one sunrise falls exactly on the half minute).
- **Asr**: «الجمهور» (shadow equal to the object) or «الحنفية» (twice). High latitudes use Adhan's
  recommended rule. Each prayer can be moved by up to 30 minutes, to match a mosque.
- **Days** are calendar days in the phone's time zone; times are instants shown in that zone.
- **Hijri date**: the tabular calendar (Kuwaiti algorithm), which can differ by a day from the
  announced one, so it can be shifted by up to two days.

## The place (`location.ts`, `cities.ts`)

- «استخدام موقعي» asks for the location once (`expo-location`, foreground only), takes a recent
  known position or a low-accuracy fix, rounds it to about 100 m, and names it after the bundled
  city within 25 km, else «قرب …» the nearest within 150 km, else «موقعي الحالي». There is no
  reverse geocoding: the app stores the position on the phone and sends it nowhere.
- Or a city from the list: about 85 Moroccan cities and 60 others where Arabic speakers live.
  Coordinates from GeoNames (CC BY 4.0); names in `prayers.cities`.

## Settings (`settings.ts`, key `prayers:v1`)

`normalizePrayers` checks every field of saved or changed data; a change is just the fields it
sets. Alerts are off until the user turns them on (which asks for notifications); each prayer then
has «بلا تنبيه», «إشعار», «تكبير» or «الأذان كاملًا» (sunrise only the first two), plus an
optional reminder 5–30 minutes before. The takbir's sound (`takbir`, 9) and the whole athan's voice
(`voice`, 7) are chosen apart. «أذان قصير» (`short`) saved by the first version reads as «تكبير».

## Alerts (`notifications.ts`, `athan-native.ts`)

`prayerAlerts` lists what to schedule; `syncPrayerAlerts` applies it after every change, each day
and each return to the app:

- **Notifications** (expo-notifications) for two weeks (two days on iOS, which keeps few), with ids
  starting `quranni-prayer:`. Their data records whether exact alarms were allowed; when that
  changes they are scheduled again, since Android does not upgrade alarms already set. «تكبير» uses
  a channel per takbir whose sound is that takbir (`assets/athan/takbir_<id>.ogg`, added by the
  `expo-notifications` plugin; a channel keeps the sound it was made with). The first version's
  channels (`prayer-athan-<voice>`) are deleted once their notifications are cancelled. While the
  app is open, prayer notifications keep their sound (the shared handler in
  `plans/notifications.ts`).
- **The whole athan** is played by the app's own Android module (`modules/athan`), given a month
  of times. It keeps them, arms one alarm at a time (exact when allowed, re-armed after a reboot,
  an update or a clock change; an athan up to 10 minutes late still plays, and none plays twice),
  and at the time starts a foreground service that plays
  `res/raw/athan_full_<voice>.ogg` on the alarm stream, with a notification to stop it. That
  notification's full-screen intent opens `AthanActivity` over the lock screen when the phone is
  locked or its screen off (otherwise Android shows it as a heads-up notification): the prayer, the
  place and a stop button; it closes when the athan ends. Android 14+ asks the user to allow
  full-screen notifications. The athan stays silent when the phone is silenced, in «عدم الإزعاج»,
  or in a call, and shows the notification only; if Android refuses the service (an inexact alarm
  on Android 12+), the takbir notification comes instead. Without the module (Expo Go),
  «الأذان كاملًا» acts as «تكبير».
- **Test** («تجربة التنبيه», alerts on): sends the next prayer's takbir, or its whole athan, in
  10 seconds by the same path as at prayer time (an expo notification on the takbir's channel; the
  module's alarm, `AthanModule.test`), so the user can lock the phone and see the athan's screen.
  The test athan plays even when the phone is silenced, and never touches the scheduled ones.
- **Reliability** (Android app, alerts on): the settings ask for exact alarms («المنبّهات
  والتذكيرات», not granted at install on Android 14+; without them every alert can be late), for
  full-screen notifications when a whole athan is chosen, and to be exempt from battery
  optimisation.
- On iOS, which cannot play the Ogg clips, alerts are plain notifications.

## The prayer times notification (`times-notification.ts`, `AthanTimes.kt`)

«المواقيت في الإشعارات» (in the settings' «الصلاة» tab; Android app only, setting `timesNotification`) keeps
a quiet notification (channel `prayer-times`, low importance) that is always there:

- **Collapsed:** the next prayer in colour, its time, the time left, then the next two times of
  that day (or the date when none are left).
- **Expanded:** the same line, the Hijri and Gregorian date, a hairline, and the six times as a
  list: the next one in colour and bold, those past dimmed. After Isha it shows the next day,
  marked «غدًا». Tapping it opens the prayer times (`quranmobile://prayers`).

It is drawn natively with `DecoratedCustomViewStyle` and two layouts
(`modules/athan/android/src/main/res/layout/athan_times_*.xml`). Each row has its normal, next and
past versions in the layout, switched with `setViewVisibility`, so every colour comes from resources
(`values` and `values-night`) and follows the system's light or dark shade; the rest of the text
uses the system's notification text styles. The countdown is a `Chronometer` running in the
notification. Unlike the app, the layouts are not forced right to left: they follow the phone's
direction like the system's header around them (icon and arrow), so on a phone in English the next
prayer sits by the icon and the times run left to right; each line still reads as Arabic.

The app sends 30 days of times (and their date labels) after every change, each day and each return
to the app, debounced; the module keeps them, writes the clock times in the phone's zone, and
refreshes the notification at each prayer and at midnight with a non-waking alarm (exact when
allowed; it never uses the athan's "while idle" quota), on the athan's own alarm, and after a
restart, an update or a change of the clock. Without exact alarms the refresh can be up to ten
minutes late, so the countdown is hidden and the switch offers the permission. Android 14+ lets
the user swipe it away; it comes back at the next refresh. Turning it off removes it and its alarm.

## The athan's screen (`AthanActivity.kt`, `athan-screen-designer.tsx`)

When a whole athan plays on a locked phone, its notification's full-screen intent opens a screen
over the lock screen: a photo of a mosque drifting slowly (or a plain colour), darkened for the
text, rings pulsing out around the prayer and its time (or a breathing glow), «حان وقت صلاة», the
prayer's name, its time, the Hijri date and the place, and a frosted «إيقاف الأذان» button. It is
drawn natively, edge to edge, and closes when the athan ends.

«شاشة الأذان» (`/athan-screen`, from the alerts card in the settings) designs it: background (seven photos, see
`modules/athan/PHOTOS.md`, or green or navy), darkening, movement (pulse, glow, none) and the date,
with a live miniature drawn in React Native to the same proportions (keep the two in step), and a
button that opens the real screen silently (`previewScreen`; it closes when left). The look is
saved in `prayers:v1` (`screen`) and sent to the module (`setScreenStyle`), which reads it when the
screen opens. Each athan carries its screen text (`name`, `time`, `date`, `place`); athans saved
by an earlier version show their notification's text instead.

## Credits

The recordings, how they were cut and their licences are in `assets/athan/README.md`. The
settings end with a link to the app's credits page (`/credits`, `features/credits`), which lists every
recording, Adhan and GeoNames with the rest of what the app uses: title, author, source and
licence links, and the changes.

## Native module notes

`modules/athan` is a local Expo module (autolinked from `modules/`, Android only). It is built with
the app (EAS or `expo run:android`) and is absent from Expo Go. Kotlin, platform APIs only
(no AndroidX); `AthanModule.schedule(json)` replaces the list, `test(json, seconds)` arms a test,
`showTimes(json)` and `hideTimes()` drive the prayer times notification,
`stop()`, and the permission checks and settings shortcuts the screen uses. `AthanActivity` is
built in code (no layout resources) and declared with `showWhenLocked` and `turnScreenOn`.
