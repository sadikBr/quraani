import { useFonts } from 'expo-font';
import { SURAH_NAME_FONT_FAMILY } from '../config';
import { useReadingPreferences } from '../state/reading-preferences-provider';
import { RIWAYAT } from '../riwayat';

export function useQuranFont() {
  const { preferences: { riwayah } } = useReadingPreferences();
  const [loaded, error] = useFonts({
    QuranWarsh: require('@/assets/fonts/UthmanicWarsh_V21.ttf'),
    QuranHafs: require('@/assets/fonts/UthmanicHafs_V22.ttf'),
    [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf'),
  });
  return { loaded, error, fontFamily: RIWAYAT[riwayah].fontFamily };
}
