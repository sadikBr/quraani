import { NativeModules, PermissionsAndroid, Platform, TurboModuleRegistry } from 'react-native';
import { initWhisper, type WhisperContext } from 'whisper.rn';
import { fromBase64 } from './base64';

/**
 * Listening on the phone: the microphone as 16 kHz mono 16-bit samples (what Whisper takes), and
 * the listening model (whisper.cpp through whisper.rn) turning them into text. Nothing leaves the
 * phone. On the web, `listener.web.ts` says it is not available.
 *
 * Both are native modules, so they exist only in an app built with them (an APK or a development
 * build), not in Expo Go: there the feature is not offered.
 */
export const listeningSupported = !!NativeModules.RNLiveAudioStream && !!TurboModuleRegistry.get('RNWhisper');
const SAMPLE_RATE = 16_000;

interface LiveAudioStreamApi {
  init(options: { sampleRate: number; channels: number; bitsPerSample: number; audioSource?: number; bufferSize?: number; wavFile: string }): Promise<void> | void;
  start(): void;
  stop(): unknown;
  on(event: 'data', callback: (base64: string) => void): { remove(): void } | undefined;
}
// The package declares its types under another module name, so it is typed here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LiveAudioStream = require('@fugood/react-native-audio-pcm-stream').default as LiveAudioStreamApi;
/** Android's voice recognition source: tuned for speech, without the call processing. */
const VOICE_RECOGNITION = 6;

/** Asks for the microphone once (Android); `ask` is the explanation shown with the request. */
export async function allowMicrophone(ask: { title: string; message: string; ok: string }): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, { title: ask.title, message: ask.message, buttonPositive: ask.ok });
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

export interface Recording {
  /** Seconds recorded so far. */
  seconds(): number;
  /** Stops and gives the samples recorded. */
  stop(): Promise<{ audio: ArrayBuffer; seconds: number }>;
}

/** Starts recording from the microphone. */
export async function startRecording(): Promise<Recording> {
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  // A new recorder each time: the module releases it when it stops.
  await LiveAudioStream.init({ sampleRate: SAMPLE_RATE, channels: 1, bitsPerSample: 16, audioSource: VOICE_RECOGNITION, bufferSize: 4096, wavFile: '' });
  const subscription = LiveAudioStream.on('data', (data) => {
    const chunk = fromBase64(data);
    chunks.push(chunk);
    bytes += chunk.length;
  });
  LiveAudioStream.start();
  const seconds = () => bytes / 2 / SAMPLE_RATE;
  return {
    seconds,
    async stop() {
      LiveAudioStream.stop();
      // The buffer being read when it stopped still arrives.
      await new Promise((resolve) => setTimeout(resolve, 300));
      subscription?.remove();
      const audio = new Uint8Array(bytes - (bytes % 2));
      let at = 0;
      for (const chunk of chunks) {
        const part = chunk.subarray(0, Math.min(chunk.length, audio.length - at));
        audio.set(part, at);
        at += part.length;
      }
      return { audio: audio.buffer, seconds: seconds() };
    },
  };
}

let loaded: { path: string; context: Promise<WhisperContext> } | null = null;
/** The model, loaded once and kept while the app runs. */
function listener(path: string) {
  if (loaded?.path !== path) loaded = { path, context: initWhisper({ filePath: path, useGpu: false }) };
  const current = loaded;
  current.context.catch(() => { if (loaded === current) loaded = null; });
  return current.context;
}

/** What the model hears in the samples, as Arabic text, and the seconds it took; `onProgress` gets 0–100. */
export async function transcribe(modelPath: string, audio: ArrayBuffer, onProgress: (percent: number) => void): Promise<{ text: string; took: number }> {
  const began = Date.now();
  const whisper = await listener(modelPath);
  const { promise } = whisper.transcribeData(audio, { language: 'ar', onProgress });
  const result = await promise;
  return { text: result.result.trim(), took: (Date.now() - began) / 1000 };
}
