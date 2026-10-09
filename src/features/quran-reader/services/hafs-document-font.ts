import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

let pending: Promise<string> | undefined;
/** Reuse the bundled font; no remote font request or per-page file read. */
export function loadHafsDocumentFont(): Promise<string> {
  return pending ??= (async () => {
    const asset = await Asset.fromModule(require('@/assets/fonts/UthmanicHafs_V22.ttf')).downloadAsync();
    if (!asset.localUri) throw new Error('Hafs font is unavailable');
    return `data:font/ttf;base64,${await new File(asset.localUri).base64()}`;
  })().catch((error) => { pending = undefined; throw error; });
}
