import type { Ayah, AyahReference, Quran } from "@/lib/quranpedia/types";

export type ReaderMode = "page" | "text";
export type ReaderTextLayout = "ayah" | "flowing";
/** How the reader is paged: by the mushaf's pages, or (Warsh) a page per thumun. */
export type ReaderPaging = "mushaf" | "thumun";
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
    /** Set on the reader's view paged by thumun, whose page numbers (and each ayah's) are athman. */
    paging?: "thumun";
}
