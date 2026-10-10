import type messages from './locales/ar';

/** CLDR plural categories. A message is plural when its keys end in one of these suffixes. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** Arabic is the source catalog: every key and placeholder is derived from it. */
export type Messages = typeof messages;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
type Leaves<T, P extends string = ''> = {
  [K in keyof T & (string | number)]: T[K] extends string ? { key: Join<P, `${K}`>; value: T[K] } : Leaves<T[K], Join<P, `${K}`>>
}[keyof T & (string | number)];
type Entry = Leaves<Messages>;
type Base<K extends string> = K extends `${infer B}_${PluralCategory}` ? B : K;
type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
type Placeholders<S extends string> = S extends `${string}{{${infer P}}}${infer R}`
  ? Trim<P extends `${infer N},${string}` ? N : P> | Placeholders<R> : never;
type PlaceholderMap = {
  [E in Entry as Base<E['key']>]: Placeholders<E['value']> | (E['key'] extends `${string}_${PluralCategory}` ? 'count' : never)
};

/** Every translatable key, e.g. 'plans.detail.title'. Plural keys appear once, without their suffix. */
export type MessageKey = keyof PlaceholderMap;
type Values<K extends MessageKey, V> = { [P in Exclude<PlaceholderMap[K], 'count'>]: V }
  & ('count' extends PlaceholderMap[K] ? { count: number } : unknown);
/** The params a key needs: none, or exactly its placeholders (plus `count` for plurals). */
export type MessageArgs<K extends MessageKey, V = string | number> = [PlaceholderMap[K]] extends [never] ? [] : [params: Values<K, V>];

type DeepString<T> = { [K in keyof T]?: T[K] extends string ? string : DeepString<T[K]> };
/** Another language: same keys (any may be missing and falls back to Arabic), its own plural forms. */
export type LocaleMessages = DeepString<Messages> & Record<string, unknown>;
export interface LocaleDefinition {
  /** BCP-47 tag of the interface language, for lang and accessibilityLanguage. */
  tag: string;
  /** BCP-47 tag used for numbers, e.g. 'ar' renders ١٢٣. */
  numberLocale: string;
  /** BCP-47 tag used for calendar dates, e.g. 'ar-MA' renders 10 أكتوبر. */
  dateLocale: string;
  direction: 'rtl' | 'ltr';
  plural: (count: number) => PluralCategory;
  messages: Messages | LocaleMessages;
}
