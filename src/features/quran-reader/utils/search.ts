import type { AyahReference, Quran } from "@/lib/quranpedia/types";

/** Search-only normalization; never apply to text rendered by the reader. */
export function normalizeArabicSearch(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .replace(/[\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/[ىےی]/g, "ي")
        .replace(/ک/g, "ك")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

interface SearchDocument {
    reference: AyahReference;
    pageNumber: number;
    text: string;
    surahName: string;
    searchable: string;
}

export type QuranSearchResult = Omit<SearchDocument, "searchable">;

/** Index the selected edition only. Remote JSON search currently returns Hafs. */
export function createQuranSearch(quran: Quran) {
    const documents: SearchDocument[] = quran.surahs.flatMap((surah) =>
        surah.ayahs.map((ayah) => ({
            reference: {
                mushafId: quran.id,
                surahNumber: surah.number,
                ayahNumber: ayah.ayahNumber,
            },
            pageNumber: ayah.pageNumber,
            text: ayah.text,
            surahName: surah.name,
            searchable: normalizeArabicSearch(ayah.text),
        })),
    );
    return (
        query: string,
        options: { offset?: number; limit?: number } = {},
    ) => {
        const normalized = normalizeArabicSearch(query);
        const offset = options.offset ?? 0;
        const limit = options.limit ?? 50;
        if (
            !Number.isSafeInteger(offset) ||
            offset < 0 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            throw new RangeError("Invalid search pagination");
        }
        if (normalized.length < 2)
            return { items: [] as QuranSearchResult[], total: 0 };
        const matches = documents.filter((document) =>
            document.searchable.includes(normalized),
        );
        return {
            items: matches.slice(offset, offset + limit).map((document) => ({
                reference: document.reference,
                pageNumber: document.pageNumber,
                text: document.text,
                surahName: document.surahName,
            })),
            total: matches.length,
        };
    };
}

export function searchSurahs(quran: Quran, query: string) {
    const normalized = normalizeArabicSearch(query);
    return quran.surahs.filter(
        (surah) =>
            normalizeArabicSearch(surah.name).includes(normalized) ||
            String(surah.number) === normalized,
    );
}
