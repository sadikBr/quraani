import { fallbackLocale, locales, type Locale } from './locales';
import type { LocaleDefinition, MessageArgs, MessageKey } from './types';

let current: Locale = fallbackLocale;
const flat = new Map<Locale, Map<string, string>>();

/** Switch language before the first render; screens read text while rendering. */
export function setLocale(locale: Locale) { current = locale; }
export function getLocale(): Locale { return current; }
export function localeInfo(): LocaleDefinition { return locales[current]; }

function flatten(tree: unknown, prefix: string, into: Map<string, string>) {
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') into.set(path, value);
    else if (value && typeof value === 'object') flatten(value, path, into);
  }
  return into;
}
function catalog(locale: Locale) {
  let map = flat.get(locale);
  if (!map) flat.set(locale, map = flatten(locales[locale].messages, '', new Map()));
  return map;
}
function lookup(key: string, count: number | undefined): string | undefined {
  for (const locale of current === fallbackLocale ? [current] : [current, fallbackLocale]) {
    const map = catalog(locale);
    if (count !== undefined) {
      const form = map.get(`${key}_${locales[locale].plural(count)}`) ?? map.get(`${key}_other`);
      if (form !== undefined) return form;
    }
    const plain = map.get(key);
    if (plain !== undefined) return plain;
  }
  return undefined;
}
const warn = (message: string) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[i18n] ${message}`);
};

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return options ? new Intl.NumberFormat(localeInfo().numberLocale, options).format(value) : value.toLocaleString(localeInfo().numberLocale);
}

const PLACEHOLDER = /\{\{\s*(\w+)\s*(?:,\s*(\w+)\s*)?\}\}/g;
/** Splits a message around its placeholders; values may be anything (strings, numbers, React nodes). */
export function translateParts<T>(key: MessageKey, params: Record<string, T> = {}): (string | T)[] {
  const count = typeof params.count === 'number' ? params.count : undefined;
  const message = lookup(key, count);
  if (message === undefined) { warn(`missing message "${key}"`); return [key]; }
  const parts: (string | T)[] = [];
  let last = 0;
  for (const match of message.matchAll(PLACEHOLDER)) {
    if (match.index! > last) parts.push(message.slice(last, match.index));
    const [whole, name, format] = match;
    if (!(name in params)) { warn(`"${key}" is missing {{${name}}}`); parts.push(whole); }
    else {
      const value = params[name];
      parts.push(format === 'number' && typeof value === 'number' ? formatNumber(value) : value);
    }
    last = match.index! + whole.length;
  }
  if (last < message.length) parts.push(message.slice(last));
  return parts;
}

/**
 * The text for `key` in the current language.
 * - `{{name}}` is replaced by `params.name`; `{{n, number}}` formats a number for the locale (١٢٣ in Arabic).
 * - Plural messages (`key_zero`, `key_one`, `key_two`, `key_few`, `key_many`, `key_other`) pick a form from `params.count`.
 */
export function t<K extends MessageKey>(key: K, ...args: MessageArgs<K>): string {
  return translateParts<string | number>(key, args[0] as Record<string, string | number> | undefined).map(String).join('');
}
