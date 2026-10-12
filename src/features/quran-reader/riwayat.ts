import { t } from '@/i18n';

export type Riwayah = 'warsh' | 'hafs';

/** `rawiId` is Quranpedia's number for the rawi, as its qira'at name him. */
export const RIWAYAT = {
  warsh: { mushafId: 4, rawiId: 2, get name() { return t('common.riwayah.warsh.name'); }, get label() { return t('common.riwayah.warsh.label'); }, fontFamily: 'QuranWarsh', pageSource: 'warsh' },
  // Edition 2 supplies Unicode Hafs text and the matching V22 font. Its page
  // boundaries and verse numbers match the official Hafs printed edition (1).
  hafs: { mushafId: 2, rawiId: 10, get name() { return t('common.riwayah.hafs.name'); }, get label() { return t('common.riwayah.hafs.label'); }, fontFamily: 'QuranHafs', pageSource: 'hafs' },
} as const;
export function editionForMushaf(mushafId: number) {
  if (mushafId === 4) return RIWAYAT.warsh;
  if (mushafId === 2) return RIWAYAT.hafs;
  throw new Error('Unsupported mushaf edition');
}
export function readingPositionKey(mushafId: number) {
  return `${editionForMushaf(mushafId).pageSource}:reading-position:v1`;
}
export function pageIdentity(page: { mushafId: number; number: number }) {
  return `${page.mushafId}:${page.number}`;
}
