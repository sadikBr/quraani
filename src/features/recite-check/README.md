# التسميع بالصوت (experimental)

The reader recites from memory, starting at an ayah (from the ayah sheet); the phone listens and
the app shows, word by word, what was recited, said differently («بغير لفظها»), left out
(«لم تُقرأ») or added («زائدة»).

## Pieces

- `listener.ts`: the phone's own speech recognition service through `expo-speech-recognition`
  (Google's on Android, preferred to another default; Apple's on iOS), in Arabic (`ar-SA`),
  continuous, with the words as they are heard. The service may send the audio to its servers to
  recognise it (the screen says so). `listening-session.ts` (pure, tested in
  `tests/recite-check.test.js`) keeps the text over the sessions the service ends by itself after a
  pause (always on Android 12 and below), listening again until stopped or until a long silence,
  and turns the service's errors into what the screen says. `listener.web.ts`: not available.
- `compare.ts` (pure, tested in `tests/recite-check.test.js`): normalises both texts to letters
  (marks dropped; hamza, alef, ya and ta marbuta forms unified; a dagger alef read as an alef except
  over ya/waw), then aligns the words. A word counts as recited when it is at least 70% alike
  (one- and two-letter words must match): spelling differences between the mushaf's script and the
  service's plain spelling pass (الصلوة/الصلاة), changed words do not (قال/قل). A word heard split or
  joined (يا أيها / يَٰٓأَيُّهَا) still counts. The isti'adha, basmala and «صدق الله العظيم» around
  the recitation are left out; the words after where it stopped are not counted as left out.
- `recite-check-screen.tsx` (route `/recite-check?surah=&ayah=`): listen (with the words heard and
  the input volume shown live), compare, result (counts, the ayahs coloured, the places to look at,
  and the raw text heard, to judge the listening).

## Why not a model on the phone

The first version ran Tarteel AI's whisper-base-ar-quran (whisper.cpp through whisper.rn, q5_0,
55 MB) on the phone. Tested on a phone (2026-10-12) it heard the first ayahs of Al-Fatiha, then
nonsense («يكناب الويام لسانين» for «إياك نعبد وإياك نستعين»): a base model, compressed, trained on
professional reciters, does not hear an ordinary voice on a phone microphone. The recording and the
hand-over to the model were checked and were right. That version is in the history of this branch
(commit «Experimental: «التسميع بالصوت»…» and the two after it).

## Limits

- Only words are compared: tajweed (madd lengths, ghunna, makharij) is not judged.
- The speech services are not made for recitation: how well they follow it, and Warsh (imala,
  ibdal, naql may be heard as Hafs or as other words), is what this experiment finds out. The raw
  text heard is shown with each result for that reason.
- Needs the internet unless the phone has the service's offline Arabic.
- A word left out just before stopping cannot be told from stopping there.

## Build

Native module: run `bun install` (updates `bun.lock`), then build as usual. Expo Go does not contain
it, so there the action is not offered (`listeningSupported`); test with the APK or a development
build. Its config plugin (in `app.json`) adds the microphone permission and lets the app see Google's
speech services (`androidSpeechServicePackages`).
