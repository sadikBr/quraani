import type { ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { formatNumber, t } from '@/i18n';
import { athanSoundsSupported, fullAthanSupported } from './notifications';
import type { AlertKind } from './settings';
import { hijriDate } from './times';

export const alertIcons: Record<AlertKind, ReaderIconName> = { off: 'bell-off', notify: 'bell', takbir: 'bell-ring', full: 'volume' };
/**
 * What a prayer's alert does here: a whole athan falls back to the takbir without the module, and
 * on iOS both are plain notifications.
 */
export function effectiveAlert(kind: AlertKind): AlertKind {
  if (kind === 'off' || kind === 'notify') return kind;
  if (!athanSoundsSupported) return 'notify';
  return kind === 'full' && !fullAthanSupported ? 'takbir' : kind;
}

/** «+2», «−1», isolated left to right so the sign stays before the number in Arabic text. */
export const signedMinutes = (n: number) => `\u2066${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}\u2069`;

export function hijriLabel(day: string, offset: number) {
  const h = hijriDate(day, offset);
  return t('prayers.hijri', { day: h.day, month: t(`prayers.hijriMonths.m${h.month}` as 'prayers.hijriMonths.m1'), year: formatNumber(h.year, { useGrouping: false }) });
}
