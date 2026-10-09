import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

const pending = new Map<number, Promise<string>>();
/** Reuse the bundled font; no remote font request or per-page file read. */
export function loadQuranDocumentFont(mushafId: number): Promise<string> {
  if (mushafId !== 2 && mushafId !== 4) return Promise.reject(new Error('Unsupported Quran font'));
  const existing = pending.get(mushafId);
  if (existing) return existing;
  const task = (async () => {
    const module = mushafId === 4 ? require('@/assets/fonts/UthmanicWarsh_V21.ttf') : require('@/assets/fonts/UthmanicHafs_V22.ttf');
    const asset = await Asset.fromModule(module).downloadAsync();
    if (!asset.localUri) throw new Error('Quran font is unavailable');
    return `data:font/ttf;base64,${await new File(asset.localUri).base64()}`;
  })().catch((error) => { pending.delete(mushafId); throw error; });
  pending.set(mushafId, task);
  return task;
}
