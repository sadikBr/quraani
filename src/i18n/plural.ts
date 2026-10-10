import type { PluralCategory } from './types';

/** CLDR rules for Arabic. Hermes has no Intl.PluralRules, so rules live here. */
export function arabicPlural(count: number): PluralCategory {
  if (!Number.isInteger(count)) return 'other';
  const n = Math.abs(count), mod = n % 100;
  if (n === 0) return 'zero';
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  if (mod >= 3 && mod <= 10) return 'few';
  if (mod >= 11 && mod <= 99) return 'many';
  return 'other';
}
