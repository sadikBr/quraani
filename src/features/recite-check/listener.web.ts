/** Listening needs the phone's speech recognition; the web only explains that. */
export const listeningSupported = false;
export type ListeningProblem = 'permission' | 'unavailable' | 'language' | 'network' | 'failed';
export interface Listening { seconds(): number; stop(): Promise<{ text: string; seconds: number }>; cancel(): void }
export const recognitionAvailable = () => false;
export const allowListening = async () => false;
export function startListening(): Listening { throw new Error('Listening runs on the phone only'); }
