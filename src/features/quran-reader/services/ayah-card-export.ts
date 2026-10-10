import { PixelRatio, Platform, type View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { t } from '@/i18n';

export interface PreparedAyahCard {
  uri: string;
  action: 'share' | 'download';
  share: () => Promise<'shared' | 'downloaded' | 'cancelled'>;
  dispose: () => void;
}

export async function prepareAyahCard(view: View, width: number, height: number, name: string): Promise<PreparedAyahCard> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
  // iOS accepts points; Android's scaleWidth/scaleHeight are physical pixels.
  const scale = Platform.OS === 'ios' ? PixelRatio.get() : 1;
  const uri = await captureRef(view, { format: 'png', result: 'tmpfile', fileName: name,
    width: 1080 / scale, height: Math.round(1080 * height / width) / scale });
  return {
    uri,
    action: 'share',
    share: async () => { await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('reader.ayahCard.shareDialogTitle') }); return 'shared'; },
    dispose: () => releaseCapture(uri),
  };
}
