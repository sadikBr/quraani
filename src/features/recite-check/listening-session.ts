import type { ExpoSpeechRecognitionErrorCode, ExpoSpeechRecognitionModule, ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

/**
 * One recitation listened to by the phone's speech recognition (`listener.ts` gives it the
 * service): the text heard as it grows, carried over the sessions the service ends by itself.
 * Without React Native, so it can be tested with a stand-in service.
 */
export type Recognizer = Pick<typeof ExpoSpeechRecognitionModule, 'start' | 'stop' | 'abort' | 'addListener' | 'getSpeechRecognitionServices'>;

/** Recitation is classical Arabic: the Saudi locale is the one the services know best for it. */
const LANGUAGE = 'ar-SA';
/** Google's services, preferred to another default (some phones default to their maker's, without Arabic). */
const GOOGLE_SERVICES = ['com.google.android.tts', 'com.google.android.googlequicksearchbox'];
/** Sessions in a row that end without a word before listening gives up (the reader has stopped reciting). */
const QUIET_SESSIONS = 6;
/** How long to wait for the service's last words after stopping. */
const LAST_WORDS_MS = 2500;
const RESTART_MS = 150;

export type ListeningProblem = 'permission' | 'unavailable' | 'language' | 'network' | 'failed';
const PROBLEMS: Partial<Record<ExpoSpeechRecognitionErrorCode, ListeningProblem>> = {
  'not-allowed': 'permission', 'service-not-allowed': 'unavailable', 'language-not-supported': 'language',
  network: 'network', 'audio-capture': 'failed', busy: 'failed',
};

export interface ListeningEvents {
  /** Everything heard so far, each time it grows or changes. */
  text(text: string): void;
  /** The input volume, from −2 to 10 (below 0 is silence). */
  level?(level: number): void;
  /** Listening stopped by itself, after `seconds`: after a long silence, or for a `problem` that stops it. */
  ended(text: string, seconds: number, problem?: ListeningProblem): void;
}

export interface Listening {
  /** Seconds listened so far. */
  seconds(): number;
  /** Stops listening and gives everything heard, once the service has given its last words, and the seconds listened. */
  stop(): Promise<{ text: string; seconds: number }>;
  /** Stops at once, without waiting (leaving the screen). */
  cancel(): void;
}

/**
 * Listens until stopped. The service ends a session after a pause in some cases (always on
 * Android 12 and below); listening then goes on in a new one, and the text of each is kept, until
 * too many end without a word.
 */
export function listenWith(recognizer: Recognizer, platform: string, on: ListeningEvents, timing = { restart: RESTART_MS, lastWords: LAST_WORDS_MS }): Listening {
  const services = platform === 'android' ? recognizer.getSpeechRecognitionServices() : [];
  const service = GOOGLE_SERVICES.find((name) => services.includes(name));
  const options: ExpoSpeechRecognitionOptions = {
    lang: LANGUAGE, interimResults: true, continuous: true, maxAlternatives: 1, addsPunctuation: false,
    ...(service && { androidRecognitionServicePackage: service }),
    androidIntentOptions: { EXTRA_MASK_OFFENSIVE_WORDS: false },
    volumeChangeEventOptions: { enabled: !!on.level, intervalMillis: 150 },
  };
  // The text of the sessions (or, on Android, of the segments of one) already ended, and of the current one.
  const done: string[] = [];
  let current = '';
  let listening = true;
  let quiet = 0;
  let lastError: ExpoSpeechRecognitionErrorCode | null = null;
  let finishing: ((text: string) => void) | null = null;
  const began = Date.now();
  let stoppedAt: number | null = null;
  const seconds = () => Math.round(((stoppedAt ?? Date.now()) - began) / 1000);
  const heard = () => [...done, current].filter(Boolean).join(' ');
  const subscriptions = [
    recognizer.addListener('result', (event) => {
      const transcript = event.results[0]?.transcript.trim() ?? '';
      // iOS gives the whole session each time; Android a segment, final once it ends.
      if (platform === 'ios' || !event.isFinal) current = transcript;
      else { if (transcript) done.push(transcript); current = ''; }
      if (transcript) quiet = 0;
      on.text(heard());
    }),
    recognizer.addListener('error', (event) => { lastError = event.error; }),
    recognizer.addListener('end', () => {
      if (current) { done.push(current); current = ''; }
      const problem = lastError ? PROBLEMS[lastError] : undefined;
      lastError = null;
      if (finishing) { finish(); return; }
      if (!listening) return;
      if (problem || ++quiet > QUIET_SESSIONS) {
        listening = false;
        remove();
        stoppedAt = Date.now();
        on.ended(heard(), seconds(), problem);
        return;
      }
      // A moment for the service to let go of the microphone before the next session.
      setTimeout(() => { if (listening) recognizer.start(options); }, timing.restart);
    }),
    ...(on.level ? [recognizer.addListener('volumechange', (event) => on.level!(event.value))] : []),
  ];
  const remove = () => { for (const subscription of subscriptions) subscription.remove(); };
  const finish = () => {
    const resolve = finishing;
    finishing = null;
    remove();
    resolve?.(heard());
  };
  recognizer.start(options);
  return {
    seconds,
    stop() {
      if (!listening) return Promise.resolve({ text: heard(), seconds: seconds() });
      listening = false;
      stoppedAt = Date.now();
      return new Promise((resolve) => {
        finishing = (text) => resolve({ text, seconds: seconds() });
        recognizer.stop();
        setTimeout(() => { if (finishing) { recognizer.abort(); finish(); } }, timing.lastWords);
      });
    },
    cancel() {
      if (!listening && !finishing) return;
      listening = false;
      finishing = null;
      remove();
      recognizer.abort();
    },
  };
}
