import { useCallback, useEffect, useState } from 'react';
import type { Reciter } from '@/lib/quranpedia/reciters';
import { quranpedia } from '@/features/quran-reader/services/reader-service';
import type { ListeningMode } from '@/features/quran-reader/state/reading-preferences';
import { pickReciter, recitersOf } from './catalog';
import { downloadedReciters } from './downloads';

const loadReciters = async () => (await quranpedia.getReciters()).data;

/** The reciter to play now (see `pickReciter`), from Quranpedia's cached list or the downloaded reciters. */
export const resolveReciter = (riwayahId: number, chosen?: number, listening: ListeningMode = 'ayah') =>
  pickReciter(loadReciters, downloadedReciters, riwayahId, chosen, listening);

export interface ReciterCatalog {
  reciters: Reciter[];
  loading: boolean;
  /** The list could not be loaded and nothing is downloaded. */
  failed: boolean;
  retry: () => void;
}

/** Reciters for a riwayah and a way of listening from Quranpedia (cached), falling back to downloaded ones offline. */
export function useReciters(riwayahId: number | undefined, listening: ListeningMode = 'ayah'): ReciterCatalog {
  const key = `${riwayahId}|${listening}`;
  const [state, setState] = useState<{ key: string; reciters: Reciter[]; loading: boolean; failed: boolean }>({ key, reciters: [], loading: true, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (riwayahId === undefined) return;
    let active = true;
    const offline = () => recitersOf(downloadedReciters(), riwayahId, listening);
    loadReciters().then(
      (all) => { if (active) setState({ key, reciters: recitersOf(all, riwayahId, listening), loading: false, failed: false }); },
      () => { if (active) { const reciters = offline(); setState({ key, reciters, loading: false, failed: !reciters.length }); } },
    );
    return () => { active = false; };
  }, [key, riwayahId, listening, attempt]);
  const retry = useCallback(() => { setState((s) => ({ ...s, loading: true, failed: false })); setAttempt((n) => n + 1); }, []);
  // A list loaded for another riwayah or way of listening is not shown while the new one loads.
  if (state.key !== key) return { reciters: [], loading: true, failed: false, retry };
  return { reciters: state.reciters, loading: state.loading, failed: state.failed, retry };
}
