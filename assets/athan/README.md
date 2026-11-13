# Athan and takbir recordings

Twelve voices for the whole athan, and thirteen takbir sounds (the same twelve and a single
takbir), chosen in the prayer settings. The pickers group them: the athans of the three mosques
(`makkah`, `madinah`, `aqsa`), then the muezzins. The files:

- `takbir_<id>.ogg` (this folder): the opening «الله أكبر، الله أكبر», the notification sound for
  «تكبير». The `expo-notifications` plugin copies them into the Android app (`res/raw`, listed in
  `app.json`), where each has its own notification channel (`prayer-takbir2-<id>`), since a
  channel keeps its sound. The channels of the earlier recordings (`prayer-takbir-<id>`,
  `prayer-athan-<voice>`) are deleted when the app next syncs its alerts.
- `athan_full_<voice>.ogg`: the whole athan, played by the app's own Android module
  (`AthanService.kt`) for «الأذان كاملًا», with its screen and a button to stop it. Two come with
  the app (`makkah` and `madinah`, in `modules/athan/android/src/main/res/raw/`, named in the
  module so resource shrinking keeps them). The other ten are in `full/` here and are not built
  into the app (they were 14 MB of it): the app fetches one the first time it is chosen, from
  this repository's `main` branch (`src/features/prayers/athan-voices.ts`), and keeps it on the
  phone. **Moving or renaming `full/` breaks that for the apps already installed.**
- `preview_<voice>.m4a` and `preview_takbir_<id>.m4a` (this folder): the athan's opening and each
  takbir as AAC, so the pickers can play them on every platform.

## How they were made

Each source was heard and measured (phrase segments, bandwidth, clipping, noise) before it was
chosen, then cut here with ffmpeg on phrase boundaries, the same way for all:

- whole athan: from 0.3 s before the first phrase to 2.5 s after the last;
- takbir: the opening phrase, or its first two phrases when they are short takbirs, with a short
  tail before the next phrase;
- preview: the takbir, extended over the following phrases up to 34 s;
- a 0.15 s fade in and a short fade out, two-pass `loudnorm=I=-16:TP=-2:LRA=11` (linear), then
  `alimiter` at −4 dBFS, mono 44.1 kHz, Vorbis q3 (`.ogg`) or AAC 64 kbit/s (`.m4a`);
- `aqsa` only: a light denoise first (`afftdn=nr=10:nf=-38:tn=1`).

Measured afterwards: every whole athan at −16.0 ± 0.1 LUFS, peaks −3.4 to −4.7 dBFS.

| Id | Source file | Whole athan (s in the source) | Takbir (s) | Preview (s) |
|---|---|---|---|---|
| `makkah` | Muezzin, `Adhan - Mecca.mp3` | 0.0–204.3 | 13.6 | 28.9 |
| `madinah` | Al-Azan, `masjid_an_nabawi.mp3` | 0.0–215.0 | 13.6 | 32.4 |
| `aqsa` | Muezzin, `Adhan - al-Aqsa.mp3` | 0.7–251.7 | 8.3 | 27.0 |
| `alafasy` | AlAdhan `a7` | 4.8–241.0 | 17.3 | 17.3 |
| `alafasy2` | AlAdhan `a4` (Dubai One TV) | 0.2–214.5 | 23.2 | 23.2 |
| `nufais` | AlAdhan `a1` | 9.5–210.1 | 16.4 | 16.4 |
| `zahrani` | AlAdhan `a11` | 0.0–131.5 | 13.7 | 26.0 |
| `ozcan` | AlAdhan `a2` | 0.1–232.9 | 22.0 | 22.0 |
| `qatami` | Islamweb, «أذان ناصر القطامي» | 0.2–132.1 | 13.8 | 26.9 |
| `dosari` | Islamweb, «أذان بصوت الشيخ ياسر الدوسري» | 0.0–175.1 | 15.2 | 34.5 |
| `kurdi` | Islamweb, «الأذان بصوت أحمد الكوردي» | 0.0–197.5 | 15.6 | 34.5 |
| `abdulbasit` | Al-Azan, `abdul_basit_abdus_samad.mp3` | 0.0–172.9 | 14.7 | 32.7 |
| `single` | Muezzin, `AllahuAkbar.mp3` | none (a takbir only) | 5.9 (0.5–6.35 in the source) | the takbir |

The takbir and preview columns are lengths from the athan's start. Not checked by ear yet:
`alafasy2` may end with a short spoken du'a after the athan.

## Sources and rights

These are well-known muezzins' recordings, chosen for their quality over the freely licensed
field recordings used before. They are **not** under open licences:

- **AlAdhan** (https://aladhan.com, its adhan recordings `a1`–`a11`, taken here from the copies
  in https://github.com/ki1lux/Adhani): AlAdhan's maintainer has said on the Islamic Network
  community forum (thread `d/255`) that its adhan audio may be used in apps. `alafasy`, `alafasy2`,
  `nufais`, `zahrani`, `ozcan`.
- **Islamweb** (https://audio.islamweb.net, files tagged `www.islamweb.net`, taken from the copies
  in https://github.com/HouariZegai/PrayerTimes): no licence stated. `qatami`, `dosari`, `kurdi`.
- **Muezzin** by DBChoco (https://github.com/DBChoco/Muezzin, `ressources/audio/`): the app's
  code is open, its recordings carry no licence of their own. `makkah`, `aqsa`, `single`.
- **Al-Azan** by meypod (https://github.com/meypod/al-azan-compose, `app/src/main/res/raw/`): as
  above. `madinah`, `abdulbasit` (tagged `www.ayouby.com`).

The rights to all of them stay with the muezzins and their publishers. They are included at the
app author's choice for personal use; before a store release, get the publishers' permission
(Islamweb, the mosques' broadcasters) or replace those voices. The credits page
(`src/features/credits/credits.ts`, route `/credits`) names each recording, its source and its
terms («بإذن الناشر» for AlAdhan's, «الحقوق لأصحابها» for the others).

### Heard and left out

- Too low in quality: three TvQuran adhans (narrow band, artefacts), one Islamweb adhan with clicks
  and clipping, an Iranian broadcast of Ragheb Mustafa Ghalwash (about 4 kHz of bandwidth), and the
  Mihrab app's files (8 kbit/s).
- A Fajr adhan (it has «الصلاة خير من النوم»), recordings whose muezzin is unknown, and
  a concert piece.
- No Moroccan muezzin's recording of usable quality was found.
