# التسميع بالصوت (experimental)

The reader recites from memory, starting at an ayah (from the ayah sheet); the phone listens and
the app shows, word by word, what was recited, said differently («بغير لفظها»), left out
(«لم تُقرأ») or added («زائدة»). Everything runs on the phone; the recitation is never sent anywhere.

## Pieces

- `listener.ts`: the microphone through `@fugood/react-native-audio-pcm-stream` (16 kHz mono 16-bit
  samples, Android's voice-recognition source), and the model through `whisper.rn` (whisper.cpp),
  which takes those samples as they are (`transcribeData`, language `ar`). `listener.web.ts`: not
  available on the web.
- `model.ts`: downloads the model once (55 MB) into the app's documents, keeps it only if its size
  is exact, and can delete it.
- `compare.ts` (pure, tested in `tests/recite-check.test.js`): normalises both texts to letters
  (marks dropped; hamza, alef, ya and ta marbuta forms unified; a dagger alef read as an alef except
  over ya/waw), then aligns the words. A word counts as recited when it is at least 70% alike
  (one- and two-letter words must match): spelling differences between the mushaf's script and the
  model's plain spelling pass (الصلوة/الصلاة), changed words do not (قال/قل). A word the model
  splits or joins (يا أيها / يَٰٓأَيُّهَا) still counts. The isti'adha, basmala and «صدق الله العظيم»
  around the recitation are left out; the words after where it stopped are not counted as left out.
- `recite-check-screen.tsx` (route `/recite-check?surah=&ayah=`): download, record, compare, result
  (counts, the ayahs coloured, the places to look at, and the model's raw transcript to judge it).

## The model

Tarteel AI's [whisper-base-ar-quran](https://huggingface.co/tarteel-ai/whisper-base-ar-quran)
(Apache-2.0, a Whisper base fine-tuned on Quran recitation, reported WER 5.75%), converted for
whisper.cpp (v1.9.2) and quantized to q5_0. It is downloaded from a public re-hosting:
`ismaeltag-ui/ahzab-modeles`, release `whisper-base-ar-quran-v1`,
`ggml-tarteel-base-ar-quran-q5_0.bin`, 55,295,433 bytes,
SHA-256 `1eb6255686651cb496e7ef52bc15c4f4f3fe197af6eea40eeb60e9f212a96950` (checked 2026-10-12; it
runs in whisper.cpp). Before relying on it, host it ourselves: attach the same file to a release
of our own repository and change `LISTENING_MODEL.url` in `model.ts`. To rebuild it from the
source: `convert-h5-to-ggml.py` from whisper.cpp on the Hugging Face checkpoint, then
`whisper-quantize ggml-model.bin out.bin q5_0`.

## Limits

- Only words are compared: tajweed (madd lengths, ghunna, makharij) is not judged.
- Whether the model hears Warsh well is the open question this experiment answers: its training
  data is not stated, so Warsh words and pronunciation (imala, ibdal, naql) may be heard as Hafs.
  The raw transcript is shown with each result for that reason.
- A word left out just before stopping cannot be told from stopping there.
- The comparison waits for the whole recitation (no live highlighting yet).

## Build

Native modules: run `bun install` (updates `bun.lock`), then build as usual. `buffer` is there for
whisper.rn, whose `safe-buffer` needs Node's `buffer`, which React Native does not have. Expo Go does not
contain them, so there the action is not offered (`listeningSupported`); test with the APK or a
development build. `expo-audio`'s
plugin now allows recording on Android (`recordAudioAndroid: true`), which `RECORD_AUDIO` needs.
