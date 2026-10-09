export type Riwayah = 'warsh' | 'hafs';

export const RIWAYAT = {
  warsh: { mushafId: 4, name: 'ورش', label: 'ورش عن نافع', fontFamily: 'QuranWarsh', pageSource: 'warsh' },
  // Edition 2 supplies Unicode Hafs text and the matching V22 font. Its page
  // boundaries and verse numbers match the official Hafs printed edition (1).
  hafs: { mushafId: 2, name: 'حفص', label: 'حفص عن عاصم', fontFamily: 'QuranHafs', pageSource: 'hafs' },
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
