import { toBundledSpelling } from "./encoding";
import { QuranpediaError } from "./errors";
import type { Ayah, Mushaf, PageAyahRegion, Quran } from "./types";

type ObjectValue = Record<string, unknown>;

/** Both supported editions (Warsh 4, Hafs 2) use the 604-page Madani layout. */
export const MUSHAF_PAGE_COUNT = 604;
/** Longest surah in any counting system (Al-Baqarah, Kufan count). */
export const MAX_AYAHS_PER_SURAH = 286;

function fail(field: string): never {
    throw new QuranpediaError(
        "invalid-response",
        `Invalid Quranpedia field: ${field}`,
    );
}

function object(value: unknown, field: string): ObjectValue {
    if (!value || typeof value !== "object" || Array.isArray(value))
        fail(field);
    return value as ObjectValue;
}

function array(value: unknown, field: string): unknown[] {
    if (!Array.isArray(value)) fail(field);
    return value;
}

function text(value: unknown, field: string): string {
    if (typeof value !== "string") fail(field);
    return value;
}

function integer(
    value: unknown,
    field: string,
    max = Number.MAX_SAFE_INTEGER,
): number {
    const number =
        typeof value === "string" && /^\d+$/.test(value)
            ? Number(value)
            : value;
    if (
        typeof number !== "number" ||
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > max
    )
        fail(field);
    return number;
}

function optionalInteger(
    value: unknown,
    field: string,
    max: number,
): number | null {
    // Some Warsh ayahs use zero for missing partition metadata. Never guess Hafs values.
    return value == null || value === 0 ? null : integer(value, field, max);
}

function url(value: unknown, field: string): string | null {
    if (value == null) return null;
    const result = text(value, field);
    if (!/^https:\/\//.test(result)) fail(field);
    return result;
}

export function decodeMushaf(value: unknown): Mushaf {
    const source = object(value, "mushaf");
    const rawi = object(source.rawi, "rawi");
    const qiraa = object(rawi.qiraa, "qiraa");
    const id = integer(source.id, "id");
    return {
        id,
        name: text(source.name, "name"),
        description:
            source.description == null
                ? null
                : text(source.description, "description"),
        bismillah: toBundledSpelling(text(source.bismillah, "bismillah"), id),
        riwayah: {
            id: integer(rawi.id, "rawi.id"),
            name: text(rawi.name, "rawi.name"),
            fullName: text(rawi.full_name, "rawi.full_name"),
            qiraahId: integer(qiraa.id, "qiraa.id"),
        },
        assets: {
            fontUrl: url(source.font_file, "font_file"),
            svgArchiveUrl: url(source.images, "images"),
            pngArchiveUrl: url(source.images_png, "images_png"),
        },
    };
}

export function decodeMushafs(value: unknown): Mushaf[] {
    return array(value, "mushafs").map(decodeMushaf);
}

export function decodeAyah(
    value: unknown,
    mushafId: number,
    expectedSurah?: number,
): Ayah {
    const source = object(value, "ayah");
    const surahNumber = integer(source.surah, "surah", 114);
    if (expectedSurah !== undefined && surahNumber !== expectedSurah)
        fail("surah mismatch");
    const originalText = text(source.text, "text");
    if (!originalText.length) fail("text");
    return {
        mushafId,
        surahNumber,
        ayahNumber: integer(source.number, "number", MAX_AYAHS_PER_SURAH),
        sourceId: integer(source.id, "ayah.id"),
        pageNumber: integer(
            source.page_number,
            "page_number",
            MUSHAF_PAGE_COUNT,
        ),
        // Spelt as the bundled font and tajweed data spell it (see encoding.ts).
        text: toBundledSpelling(originalText, mushafId),
        marker: text(source.marker, "marker"),
        availableContent: array(source.options, "options").map((v) =>
            text(v, "options[]"),
        ),
        hafsAyahNumbers: array(source.number_in_hafs, "number_in_hafs").map(
            (v) => integer(v, "number_in_hafs[]", MAX_AYAHS_PER_SURAH),
        ),
        juzNumber: optionalInteger(source.juz, "juz", 30),
        hizbQuarter: optionalInteger(source.hizb, "hizb", 240),
    };
}

export function decodeSurahAyahs(
    value: unknown,
    mushafId: number,
    surahNumber: number,
): Ayah[] {
    const ayahs = array(value, "ayahs").map((v) =>
        decodeAyah(v, mushafId, surahNumber),
    );
    if (!ayahs.length) fail("empty surah");
    const ids = new Set<number>();
    ayahs.forEach((ayah, index) => {
        if (ayah.ayahNumber !== index + 1 || ids.has(ayah.sourceId))
            fail("ayah sequence");
        // Consecutive ayahs stay on the same page or continue on the next one.
        const step = index > 0 ? ayah.pageNumber - ayahs[index - 1].pageNumber : 0;
        if (step < 0 || step > 1) fail("page sequence");
        ids.add(ayah.sourceId);
    });
    return ayahs;
}

/** The full corpus must cover pages 1..pageCount contiguously, in order. */
export function decodeQuran(
    value: unknown,
    expectedMushafId: number,
    pageCount = MUSHAF_PAGE_COUNT,
): Quran {
    const source = object(value, "quran");
    const mushaf = decodeMushaf(source);
    if (mushaf.id !== expectedMushafId) fail("mushaf mismatch");
    const surahs = array(source.surahs, "surahs").map((v, index) => {
        const surah = object(v, "surah");
        const number = integer(surah.id, "surah.id", 114);
        if (number !== index + 1) fail("surah sequence");
        return {
            number,
            name: text(surah.name, "surah.name"),
            codedName: text(surah.coded_name, "coded_name"),
            ayahs: decodeSurahAyahs(surah.ayahs, mushaf.id, number),
        };
    });
    if (surahs.length !== 114) fail("surah count");
    const ids = new Set<number>();
    let lastPage = 0;
    for (const surah of surahs) {
        for (const ayah of surah.ayahs) {
            const step = ayah.pageNumber - lastPage;
            if (ids.has(ayah.sourceId) || step < 0 || step > 1)
                fail("corpus sequence");
            ids.add(ayah.sourceId);
            lastPage = ayah.pageNumber;
        }
    }
    if (lastPage !== pageCount) fail("page count");
    return { ...mushaf, surahs };
}

/** Archive sidecar geometry uses edition-local numbers, not the SVG's legacy IDs. */
export function decodePageRegions(
    value: unknown,
    mushafId: number,
    pageNumber: number,
): PageAyahRegion[] {
    return array(value, "page regions").map((v) => {
        const source = object(v, "region");
        if (integer(source.page_number, "region.page_number") !== pageNumber)
            fail("region page mismatch");
        const coordinate = (v: unknown): number => {
            if (typeof v !== "number" || !Number.isFinite(v))
                fail("coordinate");
            return v;
        };
        const polygon = text(source.polygon, "polygon")
            .trim()
            .split(/\s+/)
            .map((point) => {
                const pair = point.split(",");
                if (pair.length !== 2 || pair.some((v) => v === ""))
                    fail("polygon");
                return {
                    x: coordinate(Number(pair[0])),
                    y: coordinate(Number(pair[1])),
                };
            });
        if (polygon.length < 3) fail("polygon");
        return {
            reference: {
                mushafId,
                surahNumber: integer(source.surahNumber, "surahNumber", 114),
                ayahNumber: integer(source.ayahNumber, "ayahNumber"),
            },
            pageNumber,
            markerPosition: {
                x: coordinate(source.x),
                y: coordinate(source.y),
            },
            polygon,
        };
    });
}
