/** Wire types: some fields differ between catalog, full-mushaf and surah endpoints. */
export interface MushafResponse {
  id: number;
  name: string;
  description: string | null;
  bismillah: string;
  image?: string | null;
  font_file?: string | null;
  images?: string | null;
  images_png?: string | null;
  rawi: {
    id: number;
    name: string;
    full_name: string;
    qiraa: { id: number; name?: string | null; short_name?: string | null };
  };
}

export interface AyahResponse {
  id: number;
  number: number;
  surah: string | number;
  page_number: number;
  text: string;
  marker: string;
  options: string[];
  number_in_hafs: number[];
  juz?: number;
  /** The live Warsh corpus uses 1–240 quarter-hizb positions, not 1–60 hizbs. */
  hizb?: number;
  ruku?: number;
  manzil?: number;
}

export interface SurahResponse {
  id: number;
  name: string;
  coded_name: string;
  ayahs: AyahResponse[];
}

export interface FullMushafResponse extends MushafResponse {
  surahs: SurahResponse[];
}

export interface AyahReference {
  mushafId: number;
  surahNumber: number;
  ayahNumber: number;
}

export interface Mushaf {
  id: number;
  name: string;
  description: string | null;
  bismillah: string;
  riwayah: { id: number; name: string; fullName: string; qiraahId: number };
  assets: { fontUrl: string | null; svgArchiveUrl: string | null; pngArchiveUrl: string | null };
}

export interface Ayah extends AyahReference {
  sourceId: number;
  pageNumber: number;
  /** Original text and marker are never trimmed, normalized or combined. */
  text: string;
  marker: string;
  availableContent: string[];
  hafsAyahNumbers: number[];
  juzNumber: number | null;
  hizbQuarter: number | null;
}

export interface Surah {
  number: number;
  name: string;
  codedName: string;
  ayahs: Ayah[];
}

export interface Quran extends Mushaf {
  surahs: Surah[];
}

export interface PageAyahRegion {
  reference: AyahReference;
  pageNumber: number;
  markerPosition: { x: number; y: number };
  polygon: { x: number; y: number }[];
}
