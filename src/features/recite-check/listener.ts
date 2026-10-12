import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { listenWith, type Listening, type ListeningEvents } from './listening-session';

export type { Listening, ListeningProblem } from './listening-session';

/**
 * Listening through the phone's own speech recognition service (Google's on Android, Apple's on
 * iOS), by `expo-speech-recognition`: it turns the recitation into Arabic text as it goes. The
 * service may send the audio to its servers to do so, unless it recognises on the phone.
 *
 * A native module, so only in an app built with it (an APK or a development build): in Expo Go,
 * and on the web (`listener.web.ts`), the feature is not offered.
 */
const speech = requireOptionalNativeModule<typeof ExpoSpeechRecognitionModule>('ExpoSpeechRecognition');
export const listeningSupported = !!speech;

/** Whether the phone has a speech recognition service to listen with. */
export const recognitionAvailable = () => !!speech?.isRecognitionAvailable();

/** Asks for the microphone (and, on iOS, speech recognition) once. */
export async function allowListening(): Promise<boolean> {
  return !!speech && (await speech.requestPermissionsAsync()).granted;
}

/**
 * Listens until stopped, giving the text heard so far as it grows and the input volume; see
 * `listenWith`.
 */
export function startListening(on: ListeningEvents): Listening {
  if (!speech) throw new Error('Speech recognition is not in this build');
  return listenWith(speech, Platform.OS, on);
}
