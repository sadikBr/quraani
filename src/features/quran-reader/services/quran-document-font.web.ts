import { Asset } from 'expo-asset';

const pending = new Map<number, Promise<string>>();
const loaded = new Map<number, string>();
/** A font already loaded, at once (a screen that shows it again need not wait a render for it). */
export const loadedQuranDocumentFont = (mushafId: number) => loaded.get(mushafId);
export function loadQuranDocumentFont(mushafId: number): Promise<string> {
  if (mushafId !== 2 && mushafId !== 4) return Promise.reject(new Error('Unsupported Quran font'));
  const existing = pending.get(mushafId);
  if (existing) return existing;
  const task = (async () => {
    const module = mushafId === 4 ? require('@/assets/fonts/UthmanicWarsh_V21.ttf') : require('@/assets/fonts/UthmanicHafs_V22.ttf');
    const asset = Asset.fromModule(module);
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Quran font is unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return `data:font/ttf;base64,${btoa(chunks.join(''))}`;
  })().then((uri) => { loaded.set(mushafId, uri); return uri; }, (error) => { pending.delete(mushafId); throw error; });
  pending.set(mushafId, task);
  return task;
}
