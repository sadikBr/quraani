import type { AyahReference, Quran } from "@/lib/quranpedia/types";

// Private-use markers for Uthmani letters that standard spelling may or may
// not write: superscript alef (ٱلۡعَٰلَمِينَ = العالمين, but ٱلرَّحۡمَٰنِ = الرحمن),
// small waw and small yeh (حَوۡلَهُۥ = حوله, ٱلنَّبِيِّـۧنَ = النبيين), and bare
// hamza (ءَامَنُواْ = آمنوا, ءَأَنذَرۡتَهُمۡ = أأنذرتهم, شَيۡءٖ = شيء).
const OPTIONAL_ALEF = "\uE000";
const OPTIONAL_WAW = "\uE001";
const OPTIONAL_YEH = "\uE002";
const OPTIONAL = /[\uE000-\uE002]/g;

/** Quranic annotation signs, stop marks and ornaments (۞ ۩ ۝), including those outside \p{M}. */
const QURANIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u08D3-\u08FF]/g;

function foldArabic(value: string): string {
    return value
        .replace(OPTIONAL, "")
        .normalize("NFKD") // Also separates hamza from أ إ آ ؤ ئ.
        .replace(/[\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
        // Silent waw seat before superscript alef: ٱلصَّلَوٰةَ = الصلاة.
        .replace(/\u0648\u0670/g, "\u0627")
        // Medial alef maksura with superscript alef: ٱلتَّوۡرَىٰةَ = التوراة.
        // A final one keeps the standard spelling: عَلَىٰ = على.
        .replace(/\u0649\p{M}*\u0670(?=\p{M}*\p{L})/gu, "\u0627")
        .replace(/[\u0670\u0621\u0674]/g, OPTIONAL_ALEF)
        .replace(/\u06E5/g, OPTIONAL_WAW)
        .replace(/[\u06E6\u06E7]/g, OPTIONAL_YEH)
        .replace(QURANIC_MARKS, "")
        .replace(/\p{M}/gu, "")
        .replace(/[\u0623\u0625\u0622\u0671\u0672\u0673\u0675]/g, "\u0627")
        .replace(/\u0624/g, "\u0648")
        .replace(/[\u0626\u0649\u06D2\u06CC]/g, "\u064A")
        .replace(/\u0629/g, "\u0647")
        .replace(/[\u06A9\u06AA]/g, "\u0643")
        .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

/** Search-only normalization; never apply to text rendered by the reader. */
export function normalizeArabicSearch(value: string): string {
    return foldArabic(value).replace(OPTIONAL, "");
}

/**
 * Matches a query against Quran text, treating Uthmani superscript alef, bare
 * hamza and small waw/yeh as optional letters, so both العالمين/العلمين and الرحمن/الرحمان
 * match the printed spelling. Returns null for queries that are too short.
 */
export function createArabicMatcher(query: string): ((text: string) => boolean) | null {
    const normalized = normalizeArabicSearch(query);
    if (normalized.length < 2) return null;
    const optional = "[\uE000-\uE002]*";
    const pattern = [...normalized].map((char) => {
        const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return char === "\u0627" ? `(?:\u0627|${OPTIONAL_ALEF})`
            : char === "\u0648" ? `(?:\u0648|${OPTIONAL_WAW})`
            : char === "\u064A" ? `(?:\u064A|${OPTIONAL_YEH})` : escaped;
    }).join(optional);
    const expression = new RegExp(pattern, "u");
    return (text) => expression.test(text);
}

/** Search form of Quran text for createArabicMatcher. */
export const searchableArabic = foldArabic;

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
            searchable: searchableArabic(ayah.text),
        })),
    );
    return (
        query: string,
        options: { offset?: number; limit?: number } = {},
    ) => {
        const matches = createArabicMatcher(query);
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
        if (!matches) return { items: [] as QuranSearchResult[], total: 0 };
        const found = documents.filter((document) =>
            matches(document.searchable),
        );
        return {
            items: found.slice(offset, offset + limit).map((document) => ({
                reference: document.reference,
                pageNumber: document.pageNumber,
                text: document.text,
                surahName: document.surahName,
            })),
            total: found.length,
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
