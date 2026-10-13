import type { PhotoBody } from './api';

export const PHOTO_SIZE = 512;

/** On the web: a file chosen from the computer, cut to a centred square and made a small JPEG. */
export async function pickPhoto(): Promise<{ body: PhotoBody; preview: string } | null> {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
  if (!file) return null;
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PHOTO_SIZE;
  canvas.getContext('2d')?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('Could not read the photo');
  return { body: blob, preview: URL.createObjectURL(blob) };
}
