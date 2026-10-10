import type { LocaleDefinition } from '../types';
import { arabicPlural } from '../plural';
import ar from './ar';

export const locales = {
  ar: { tag: 'ar', numberLocale: 'ar', dateLocale: 'ar-MA', direction: 'rtl', plural: arabicPlural, messages: ar },
} satisfies Record<string, LocaleDefinition>;
export type Locale = keyof typeof locales;
export const fallbackLocale: Locale = 'ar';
