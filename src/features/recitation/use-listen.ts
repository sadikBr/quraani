import { useCallback } from 'react';
import type { AyahReference, Quran } from '@/lib/quranpedia/types';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { chooseReciter } from './catalog';
import { resolveReciter, useReciters } from './reciter-source';
import { playFrom, playSurah } from './player';

type Ref = Pick<AyahReference, 'surahNumber' | 'ayahNumber'>;

/**
 * Starts listening with the chosen reciter: from an ayah onward, or over a stretch (`to`). With
 * whole surahs chosen, listening onward plays the surahs' recordings; a stretch or one ayah's
 * repetition (`repeat` given) needs each ayah on its own, so it stays ayah by ayah.
 */
export function useListen(quran: Quran | undefined) {
  const { preferences } = useReadingPreferences();
  const chosen = preferences.reciters[preferences.riwayah];
  const surahChosen = preferences.surahReciters[preferences.riwayah];
  const { repeat, surahRepeat, listening } = preferences;
  return useCallback(async (from: Ref, options: { to?: Ref | null; repeat?: number } = {}) => {
    if (!quran) return;
    if (listening === 'surah' && !options.to && options.repeat === undefined) {
      await playSurah({ quran, reciter: () => resolveReciter(quran.riwayah.id, surahChosen, 'surah'), from, repeat: surahRepeat });
      return;
    }
    await playFrom({ quran, reciter: () => resolveReciter(quran.riwayah.id, chosen), from, to: options.to, repeat: options.repeat ?? repeat });
  }, [quran, chosen, surahChosen, repeat, surahRepeat, listening]);
}

/** Whether listening onward from the reader plays whole surahs (outside a goal's portion). */
export function useWholeSurahs(portion: boolean) {
  const { preferences } = useReadingPreferences();
  return preferences.listening === 'surah' && !portion;
}

/**
 * While whole surahs are chosen (`active`): whether the chosen reciter's recordings come with ayah
 * timings, so listening can start at an ayah (null while the reciter list loads).
 */
export function useSurahFollows(quran: Quran, active: boolean): boolean | null {
  const { preferences } = useReadingPreferences();
  const catalog = useReciters(active ? quran.riwayah.id : undefined, 'surah');
  if (!active || catalog.loading) return null;
  const reciter = chooseReciter(catalog.reciters, quran.riwayah.id, preferences.surahReciters[preferences.riwayah], 'surah');
  return reciter ? reciter.timingUrl !== null : null;
}
