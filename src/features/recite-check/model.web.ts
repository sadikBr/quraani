/** The listening model runs on the phone only (whisper.cpp through a native module). */
export const LISTENING_MODEL = { url: '', bytes: 55_295_433, name: '' } as const;
export const listeningModelPath = (): string | null => null;
export const downloadListeningModel = (): Promise<string> => Promise.reject(new Error('Listening runs on the phone only'));
export const removeListeningModel = () => {};
