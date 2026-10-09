import type { Ayah, AyahReference, Quran } from "@/lib/quranpedia/types";

export type ReaderMode = "page" | "text";
export type ReaderTextLayout = "ayah" | "flowing";
export type { AyahReference };

export interface QuranPage {
    mushafId: number;
    number: number;
    ayahs: Ayah[];
    previousAyah?: Ayah;
}

export interface IndexEntry {
    number: number;
    start: AyahReference;
    pageNumber: number;
}

export interface ReaderContent {
    quran: Quran;
    pages: QuranPage[];
    juzIndex: IndexEntry[];
    hizbIndex: IndexEntry[];
    quarterHizbIndex: IndexEntry[];
}
