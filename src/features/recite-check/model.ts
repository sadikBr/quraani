import { Directory, File, Paths } from 'expo-file-system';

/**
 * The listening model: Tarteel AI's whisper-base-ar-quran (Apache-2.0), a Whisper model trained on
 * Quran recitation, converted for whisper.cpp and quantized (q5_0). Downloaded once, on demand,
 * and kept on the phone; everything after runs offline. The release it comes from is a
 * re-hosting of the published model (see README.md, which also says how to host it ourselves).
 */
export const LISTENING_MODEL = {
  url: 'https://github.com/ismaeltag-ui/ahzab-modeles/releases/download/whisper-base-ar-quran-v1/ggml-tarteel-base-ar-quran-q5_0.bin',
  /** Checked after downloading: a partial or different file is not kept. */
  bytes: 55_295_433,
  name: 'ggml-tarteel-base-ar-quran-q5_0.bin',
} as const;

const folder = () => new Directory(Paths.document, 'listening');
const modelFile = () => new File(folder(), LISTENING_MODEL.name);

/** The model's path, once it is downloaded whole. */
export function listeningModelPath(): string | null {
  try {
    const file = modelFile();
    return file.exists && file.size === LISTENING_MODEL.bytes ? file.uri : null;
  } catch { return null; }
}

/** Downloads the model, reporting the fraction done. A download that fails leaves nothing behind. */
export async function downloadListeningModel(onProgress: (fraction: number) => void, signal: AbortSignal): Promise<string> {
  folder().create({ intermediates: true, idempotent: true });
  const target = modelFile();
  try {
    await File.downloadFileAsync(LISTENING_MODEL.url, target, {
      idempotent: true, signal,
      onProgress: ({ bytesWritten, totalBytes }) => onProgress(Math.min(1, bytesWritten / (totalBytes > 0 ? totalBytes : LISTENING_MODEL.bytes))),
    });
  } catch (error) {
    removeListeningModel();
    throw error;
  }
  const path = listeningModelPath();
  if (!path) { removeListeningModel(); throw new Error('The listening model did not download whole'); }
  return path;
}

export function removeListeningModel() {
  try { const file = modelFile(); if (file.exists) file.delete(); } catch { /* Nothing to remove. */ }
}
