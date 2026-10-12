/** Listening needs the phone's microphone and the native model; the web only explains that. */
export const listeningSupported = false;
export interface Recording { seconds(): number; stop(): Promise<{ audio: ArrayBuffer; seconds: number }> }
export const allowMicrophone = async () => false;
export const startRecording = (): Promise<Recording> => Promise.reject(new Error('Listening runs on the phone only'));
export const transcribe = (): Promise<{ text: string; took: number }> => Promise.reject(new Error('Listening runs on the phone only'));
