import type { Surah } from '@/lib/quranpedia/types';
import { decodeWarshTajweed, type WarshTajweedData } from '../utils/warsh-tajweed';
import type { TajweedSurah } from '../utils/tajweed';

const cache = new Map<number, { surah: Surah; data: TajweedSurah }>();
/** Decode again on the next request (a retry starts from scratch). */
export function forgetWarshTajweed() { cache.clear(); }
export function loadWarshTajweed(surah: Surah): TajweedSurah {
  const cached = cache.get(surah.number);
  if (cached?.surah === surah) {
    cache.delete(surah.number); cache.set(surah.number, cached);
    return cached.data;
  }
  // Lazy module loading avoids parsing annotations until colors are requested.
  const data = require('@/assets/tajweed/warsh-azraq-v1.json') as WarshTajweedData;
  const result = decodeWarshTajweed(surah, data);
  cache.delete(surah.number); cache.set(surah.number, { surah, data: result });
  while (cache.size > 4) cache.delete(cache.keys().next().value!);
  return result;
}
