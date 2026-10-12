import { useSyncExternalStore } from 'react';
import type { BookService } from '@/lib/quranpedia/ayah-services';
import { contentStorage } from '../../../storage/content-storage';

/**
 * What the reader last chose in the ayah sheet, kept for the next ayah: the book read for each
 * science (the tafsir of Ibn Kathir, say) and the language of the translations.
 */
export interface SheetChoices { books: Partial<Record<BookService, number>>; language: string | null }

const KEY = 'reader:ayah-sheet:v1';
const empty: SheetChoices = { books: {}, language: null };
let choices = empty;
let loaded = false;
const listeners = new Set<() => void>();
const publish = (next: SheetChoices) => { choices = next; listeners.forEach((listener) => listener()); };

export function decodeChoices(raw: string | null): SheetChoices {
  try {
    const value = JSON.parse(raw ?? 'null') as { books?: unknown; language?: unknown } | null;
    const books = value && value.books && typeof value.books === 'object' ? Object.fromEntries(Object.entries(value.books)
      .filter(([service, id]) => ['tafsir', 'e3rab', 'asbab', 'nasekh', 'mutshabeh'].includes(service) && typeof id === 'number' && Number.isSafeInteger(id) && id > 0)) : {};
    const language = typeof value?.language === 'string' && /^[a-z]{2,3}$/.test(value.language) ? value.language : null;
    return { books, language };
  } catch { return empty; }
}

function load() {
  if (loaded) return;
  loaded = true;
  void contentStorage.getItem(KEY).then((raw) => {
    const saved = decodeChoices(raw);
    // A choice made before the saved ones arrived wins.
    publish({ books: { ...saved.books, ...choices.books }, language: choices.language ?? saved.language });
  }).catch(() => {});
}

const subscribe = (listener: () => void) => { load(); listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useSheetChoices(): SheetChoices {
  return useSyncExternalStore(subscribe, () => choices, () => empty);
}

function save(next: SheetChoices) {
  publish(next);
  void contentStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

export const chooseBook = (service: BookService, id: number) => save({ ...choices, books: { ...choices.books, [service]: id } });
export const chooseLanguage = (code: string) => save({ ...choices, language: code });
