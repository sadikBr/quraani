import type { HalaqaMark, Ledger, Mark } from './types';

/** Where the phone keeps what it knows of an account (never synced itself), one per account. */
export const LEDGER_KEY = 'sync:v1';
export const ledgerKey = (user: string) => `${LEDGER_KEY}:${user}`;

export const emptyLedger = (user: string): Ledger => ({ version: 1, user, documents: {}, halaqat: {} });

const isMark = (value: unknown): value is Mark => !!value && typeof value === 'object' &&
  Number.isInteger((value as Mark).revision) && (value as Mark).revision >= 0 && typeof (value as Mark).fp === 'string';
const marks = (value: unknown): value is Record<string, Mark> => !!value && typeof value === 'object' && !Array.isArray(value) &&
  Object.values(value).every(isMark);
const isHalaqaMark = (value: unknown): value is HalaqaMark => isMark(value) && Number.isInteger((value as HalaqaMark).version) &&
  marks((value as HalaqaMark).students) && marks((value as HalaqaMark).entries);

/**
 * The phone's marks for `user`: a fresh ledger when there are none, they are someone else's, or
 * they can't be read (then everything is compared afresh, which is always safe).
 */
export function decodeLedger(raw: string | null, user: string): Ledger {
  if (!raw) return emptyLedger(user);
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || saved.user !== user || !marks(saved.documents) || !saved.halaqat || typeof saved.halaqat !== 'object' ||
      !Object.values(saved.halaqat).every(isHalaqaMark)) return emptyLedger(user);
    return saved as Ledger;
  } catch {
    return emptyLedger(user);
  }
}
