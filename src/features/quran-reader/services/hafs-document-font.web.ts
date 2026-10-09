import { Asset } from 'expo-asset';

let pending: Promise<string> | undefined;
export function loadHafsDocumentFont(): Promise<string> {
  return pending ??= (async () => {
    const asset = Asset.fromModule(require('@/assets/fonts/UthmanicHafs_V22.ttf'));
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('Hafs font is unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return `data:font/ttf;base64,${btoa(chunks.join(''))}`;
  })().catch((error) => { pending = undefined; throw error; });
}
