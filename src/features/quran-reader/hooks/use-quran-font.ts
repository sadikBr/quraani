import { useFonts } from 'expo-font';
import { SURAH_NAME_FONT_FAMILY } from '../config';
import { useReadingPreferences } from '../state/reading-preferences-provider';
import type { Riwayah } from '../riwayat';
import { quranScript } from '../utils/quran-script';

/**
 * The Quran fonts, loaded, and how the text is drawn in the chosen riwayah (or `riwayah`): its
 * font, and `display` for each piece of text (the Warsh text in the Madinah letters when chosen).
 */
export function useQuranFont(riwayah?: Riwayah) {
  const { preferences } = useReadingPreferences();
  const [loaded, error] = useFonts({
    QuranWarsh: require('@/assets/fonts/UthmanicWarsh_V21.ttf'),
    QuranHafs: require('@/assets/fonts/UthmanicHafs_V22.ttf'),
    [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf'),
  });
  return { loaded, error, ...quranScript(riwayah ?? preferences.riwayah, preferences.warshScript) };
}
