import { formatNumber, t } from '@/i18n';
import { hijriDate } from './times';

/** «28 ربيع الآخر 1448 هـ», shifted by the user's offset. */
export function hijriLabel(day: string, offset: number) {
  const h = hijriDate(day, offset);
  return t('prayers.hijri', { day: h.day, month: t(`prayers.hijriMonths.m${h.month}` as 'prayers.hijriMonths.m1'), year: formatNumber(h.year, { useGrouping: false }) });
}
