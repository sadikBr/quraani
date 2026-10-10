import { useCallback } from 'react';
import type { AyahReference, Quran } from '@/lib/quranpedia/types';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { resolveReciter } from './reciter-source';
import { playFrom } from './player';

type Ref = Pick<AyahReference, 'surahNumber' | 'ayahNumber'>;

/** Starts listening with the chosen reciter: from an ayah onward, or over a stretch (`to`). */
export function useListen(quran: Quran | undefined) {
  const { preferences } = useReadingPreferences();
  const chosen = preferences.reciters[preferences.riwayah];
  const repeat = preferences.repeat;
  return useCallback(async (from: Ref, options: { to?: Ref | null; repeat?: number } = {}) => {
    if (!quran) return;
    await playFrom({ quran, reciter: () => resolveReciter(quran.riwayah.id, chosen), from, to: options.to, repeat: options.repeat ?? repeat });
  }, [quran, chosen, repeat]);
}
