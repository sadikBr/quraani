import { useEffect, useState } from 'react';
import type { Quran } from '@/lib/quranpedia/types';
import type { QuranPage } from '../types/reader';
import { loadTajweedSurah } from '../services/tajweed-service';
import type { TajweedSurah } from '../utils/tajweed';
interface Result { mushafId: number; numbers: string; data: Record<number, TajweedSurah>; error: boolean }
export function useTajweed(page: QuranPage, quran: Quran, enabled: boolean) {
  const numbers = [...new Set(page.ayahs.map((a) => a.surahNumber))].join(',');
  const [result, setResult] = useState<Result>({ mushafId: quran.id, numbers, data: {}, error: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all(numbers.split(',').map(async (n) => {
      const surah = quran.surahs.find((s) => s.number === Number(n))!;
      return [surah.number, await loadTajweedSurah(surah, quran.id)] as const;
    })).then((entries) => { if (active) setResult({ mushafId: quran.id, numbers, data: Object.fromEntries(entries), error: false }); })
      .catch(() => { if (active) setResult({ mushafId: quran.id, numbers, data: {}, error: true }); });
    return () => { active = false; };
  }, [enabled, quran, numbers, retry]);
  // A result (or error) belongs to the edition and surahs it was loaded for.
  const matches = enabled && result.mushafId === quran.id && result.numbers === numbers;
  return { data: matches ? result.data : {}, error: matches && result.error,
    retry: () => { setResult({ mushafId: quran.id, numbers, data: {}, error: false }); setRetry((n) => n + 1); } };
}
