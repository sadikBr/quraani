# Athan and takbir recordings

Seven voices for the whole athan and nine takbir sounds, chosen in the prayer settings. The files:

- `takbir_<id>.ogg` (this folder): the opening «الله أكبر، الله أكبر», the notification sound for
  «تكبير». The `expo-notifications` plugin copies them into the Android app (`res/raw`), where each
  has its own notification channel (`prayer-takbir-<id>`), since a channel keeps its sound.
- `athan_full_<voice>.ogg` (`modules/athan/android/src/main/res/raw/`): the whole athan, played by
  the app's own Android module for «الأذان كاملًا», with its screen and a button to stop it.
- `preview_<voice>.m4a` and `preview_takbir_<id>.m4a` (this folder): the athan's opening and each
  takbir as AAC, so the pickers can play them on every platform.
- `athan_<voice>.ogg` (this folder, `original`, `azeez`, `azemi`): the first version's sounds for
  «أذان قصير». Nothing new uses them; they stay one more version for the notifications scheduled
  before an update on the old `prayer-athan-<voice>` channels, which the app deletes when it next
  syncs its alerts. Remove them, and their lines in `app.json`, in the version after.

## How they were made

`original`, `azeez`, `azemi`: the clips prepared by the Taqwa project
(https://github.com/MohamedAbulgasem/Taqwa, `assets/audio/`, commit `7533d29`), copied unchanged:
`athan_full_*` from its whole athans, `takbir_*` from its takbir clips. Its `assets/audio/README.md`
records how each was cut.

The others were cut here from the Commons originals with ffmpeg, on phrase boundaries, the same way:
a 0.15 s fade in and a short fade out, `loudnorm=I=-16:TP=-2:LRA=11` then a limiter at −4 dBFS,
mono 44.1 kHz, Vorbis q4 (`.ogg`) or AAC 64 kbit/s (`.m4a`). Measured afterwards: −15.6 to
−18.7 LUFS, peaks near −3.6 dBFS. The previews of the first three voices are their Taqwa
excerpts transcoded; every `preview_takbir_*` is its `takbir_*` transcoded.

| Id | Whole athan (s in the source) | Takbir (s in the source) | Preview |
|---|---|---|---|
| `original` | Taqwa, 154.1 s | Taqwa, 15.8 s | Taqwa excerpt |
| `azeez` | Taqwa, 86.2 s | Taqwa, 5.6 s | Taqwa excerpt |
| `azemi` | Taqwa, 211.4 s | Taqwa, 5.2 s | Taqwa excerpt |
| `shalqar` | 2.9–134.3 (131.4 s) | 2.9–11.5 | 2.9–27.5 |
| `ghana` | 0.7–84.06 (83.4 s) | 0.7–7.4 | 0.7–20.2 |
| `nigeria` | 0.1–64.89 (64.8 s) | 0.1–8.4 (its two short pairs) | 0.1–20.0 |
| `aishatu` | 1.6–93.0 (91.4 s) | 1.6–10.8 | 1.6–28.0 |
| `makkah` | none (the recording stops early) | 7.9–15.6 | the takbir |
| `medina` | none (a takbir only) | 0.3–13.6 | the takbir |

## Sources and licences

The licences are those of the recordings, not of the Taqwa code (GPL-3.0), which is not used. Where
a licence is ShareAlike, these cut files are released under it too. The app's credits page
(`src/features/credits/credits.ts`, route `/credits`) gives each recording's title, author, source
link, licence link and changes, which is the attribution the CC BY licences ask for; the pickers
repeat the licence.

### `original`: "Beautiful adhan"

- **By:** Adam-synagda, own work, via Wikimedia Commons:
  https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg
- **Licence:** CC0 1.0 Universal (public domain dedication). No attribution required.

### `azeez`: "The Adhan – Muslim Call to Prayer – Aaqib Azeez"

- **By:** Aaqib Azeez, uploaded by Atcovi, own work, via Wikimedia Commons:
  https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3
- **Licence:** Creative Commons Attribution-ShareAlike 4.0,
  https://creativecommons.org/licenses/by-sa/4.0/
- **Changes:** trimmed, faded and loudness-matched (by Taqwa), transcoded (here).

### `azemi`: "Eid al-Fitr Fajr azan at Malmö Mosque – 19 August 2012"

- **By:** Islamic Center Malmö (muezzin Besim Azemi), published under YouTube's CC BY licence and
  imported to Wikimedia Commons, where a licence reviewer confirmed it:
  https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm
- **Licence:** Creative Commons Attribution 3.0 Unported, https://creativecommons.org/licenses/by/3.0/
- **Changes:** the recording is a Fajr athan; the two «الصلاة خير من النوم» phrases were cut out
  so it serves every prayer, and it ends before the salawat that follow. Trimmed, faded and
  loudness-matched (by Taqwa), transcoded (here).

### `shalqar`: "Adhan in Shalqar mosque"

- **By:** Esetok, own work, via Wikimedia Commons (a video; its sound is used):
  https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm
- **Licence:** Creative Commons Attribution-ShareAlike 4.0
- **Changes:** sound taken from the video, trimmed, faded, loudness-matched, re-encoded.

### `ghana`: "Athan during Ramadan 2"

- **By:** daSupremo, own work, via Wikimedia Commons (Wiki Loves Ramadan 2026):
  https://commons.wikimedia.org/wiki/File:Athan_during_Ramadan_2.wav
- **Licence:** Creative Commons Attribution-ShareAlike 4.0
- **Changes:** cut from Commons' MP3 rendering of the WAV; trimmed, faded, loudness-matched,
  re-encoded.

### `nigeria`: "Call to prayer"

- **By:** Isaacayodele32, own work, via Wikimedia Commons (Wiki Loves Africa 2026):
  https://commons.wikimedia.org/wiki/File:Call_to_prayer.ogg
- **Licence:** Creative Commons Attribution-ShareAlike 4.0
- **Changes:** trimmed, faded, loudness-matched, re-encoded.

### `aishatu`: "Iqamah"

- **By:** Aishatu98, own work, via Wikimedia Commons:
  https://commons.wikimedia.org/wiki/File:Iqamah.ogg
- **Licence:** CC0 1.0 Universal. No attribution required.
- **Note:** despite its title, the recording is a whole athan (its twelve phrases, «حيّ على
  الصلاة» twice and so on), not the iqamah.
- **Changes:** trimmed, faded, loudness-matched, re-encoded.

### `makkah` (takbir only): "AZAAN in makkah"

- **By:** Seyfula Islam, published on YouTube under its CC BY licence and imported to Wikimedia
  Commons: https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm
- **Licence:** Creative Commons Attribution 3.0 Unported
- **Changes:** the opening takbir taken from the video's sound, faded, loudness-matched,
  re-encoded. The recording stops before the athan ends, so it is not offered as a whole athan.

### `medina` (takbir only): "Oración Al-Azzan"

- **By:** B9., own work, via Wikimedia Commons:
  https://commons.wikimedia.org/wiki/File:Oraci%C3%B3n_Al-Azzan.ogg
- **Licence:** released into the public domain by its author.
- **Changes:** the opening takbir, faded, loudness-matched, re-encoded.

### Not used

Other free recordings on Commons were heard and left out: one that repeats the `original` voice,
and recordings of the Hassan II Mosque, the Koutoubia and Makkah (2018), noisier or incomplete.
