import { useEffect, useState } from 'react';
import type { Quran } from '@/lib/quranpedia/types';
import type { QuranPage } from '../types/reader';
import { loadTajweedSurah } from '../services/tajweed-service';
import type { TajweedSurah } from '../utils/tajweed';
export function useTajweed(page: QuranPage, quran: Quran, enabled: boolean) {
  const [data, setData] = useState<Record<number, TajweedSurah>>({});
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const numbers = [...new Set(page.ayahs.map((a) => a.surahNumber))].join(',');
  useEffect(() => {
    if (!enabled || quran.id !== 2) return;
    let active = true;
    void Promise.all(numbers.split(',').map(async (n) => {
      const surah = quran.surahs.find((s) => s.number === Number(n))!;
      return [surah.number, await loadTajweedSurah(surah)] as const;
    })).then((entries) => { if (active) { setData(Object.fromEntries(entries)); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [enabled, quran, numbers, retry]);
  return { data: enabled && quran.id === 2 ? data : {}, error, retry: () => { setError(false); setRetry((n) => n + 1); } };
}
