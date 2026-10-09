import type { View } from 'react-native';
import type { PreparedAyahCard } from './ayah-card-export';

export async function prepareAyahCard(view: View, width: number, height: number, name: string): Promise<PreparedAyahCard> {
  await document.fonts.ready;
  const { default: html2canvas } = await import('html2canvas-pro');
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = Math.round(1080 * height / width);
  await html2canvas(view as unknown as HTMLElement, { canvas, scale: 1080 / width, backgroundColor: null, logging: false });
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image export failed')), 'image/png'));
  const file = new File([blob], `${name}.png`, { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const canShare = !!navigator.canShare?.({ files: [file] });
  const download = () => {
    const link = document.createElement('a');
    link.href = url; link.download = file.name;
    document.body.appendChild(link); link.click(); link.remove();
  };
  return {
    uri: canvas.toDataURL('image/png'),
    action: canShare ? 'share' : 'download',
    // The image is prepared before the tap so Web Share retains user activation.
    share: async () => {
      if (canShare) {
        try { await navigator.share({ files: [file], title: 'بطاقة آية · قراني' }); return 'shared'; }
        catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; }
      }
      download(); return 'downloaded';
    },
    dispose: () => URL.revokeObjectURL(url),
  };
}
