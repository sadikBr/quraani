import { localeInfo, t } from './translate';
export { formatNumber } from './translate';

/** Formats a calendar date ('YYYY-MM-DD') in the locale, independent of the device time zone. */
export function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeInfo().dateLocale, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
/** Joins items with the locale's list separator ("، " in Arabic). */
export const formatList = (items: readonly string[]) => items.join(t('common.listSeparator'));
