import { useCallback, useEffect, useState } from 'react';
import type { Reciter } from '@/lib/quranpedia/reciters';
import { quranpedia } from '@/features/quran-reader/services/reader-service';
import { pickReciter, recitersFor } from './catalog';
import { downloadedReciters } from './downloads';

const loadReciters = async () => (await quranpedia.getReciters()).data;

/** The reciter to play now (see `pickReciter`), from Quranpedia's cached list or the downloaded reciters. */
export const resolveReciter = (riwayahId: number, chosen?: number) => pickReciter(loadReciters, downloadedReciters, riwayahId, chosen);

export interface ReciterCatalog {
  reciters: Reciter[];
  loading: boolean;
  /** The list could not be loaded and nothing is downloaded. */
  failed: boolean;
  retry: () => void;
}

/** Reciters for a riwayah from Quranpedia (cached), falling back to downloaded ones offline. */
export function useReciters(riwayahId: number | undefined): ReciterCatalog {
  const [state, setState] = useState<{ reciters: Reciter[]; loading: boolean; failed: boolean }>({ reciters: [], loading: true, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (riwayahId === undefined) return;
    let active = true;
    const offline = () => recitersFor(downloadedReciters(), riwayahId);
    loadReciters().then(
      (all) => { if (active) setState({ reciters: recitersFor(all, riwayahId), loading: false, failed: false }); },
      () => { if (active) { const reciters = offline(); setState({ reciters, loading: false, failed: !reciters.length }); } },
    );
    return () => { active = false; };
  }, [riwayahId, attempt]);
  const retry = useCallback(() => { setState((s) => ({ ...s, loading: true, failed: false })); setAttempt((n) => n + 1); }, []);
  return { ...state, retry };
}
