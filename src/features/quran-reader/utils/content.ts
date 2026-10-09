import type { Ayah, Quran } from "@/lib/quranpedia/types";
import type { IndexEntry, ReaderContent } from "../types/reader";

function reference(ayah: Ayah) {
    return {
        mushafId: ayah.mushafId,
        surahNumber: ayah.surahNumber,
        ayahNumber: ayah.ayahNumber,
    };
}

export function prepareReaderContent(quran: Quran): ReaderContent {
    const pages = new Map<number, Ayah[]>();
    const juz = new Map<number, IndexEntry>();
    const quarters = new Map<number, IndexEntry>();
    const hizbs = new Map<number, IndexEntry>();
    const addIndex = (
        map: Map<number, IndexEntry>,
        number: number | null,
        ayah: Ayah,
    ) => {
        if (number !== null && !map.has(number)) {
            map.set(number, {
                number,
                start: reference(ayah),
                pageNumber: ayah.pageNumber,
            });
        }
    };
    for (const surah of quran.surahs) {
        for (const ayah of surah.ayahs) {
            const page = pages.get(ayah.pageNumber) ?? [];
            page.push(ayah);
            pages.set(ayah.pageNumber, page);
            addIndex(juz, ayah.juzNumber, ayah);
            addIndex(quarters, ayah.hizbQuarter, ayah);
            addIndex(
                hizbs,
                ayah.hizbQuarter === null
                    ? null
                    : Math.ceil(ayah.hizbQuarter / 4),
                ayah,
            );
        }
    }
    return {
        quran,
        pages: [...pages].map(([number, ayahs]) => ({
            mushafId: quran.id,
            number,
            ayahs,
            previousAyah: pages.get(number - 1)?.at(-1),
        })),
        juzIndex: [...juz.values()],
        hizbIndex: [...hizbs.values()],
        quarterHizbIndex: [...quarters.values()],
    };
}

export function pageAssetEntries(pageNumber: number) {
    if (
        !Number.isSafeInteger(pageNumber) ||
        pageNumber < 1 ||
        pageNumber > 604
    ) {
        throw new RangeError("Invalid Warsh page");
    }
    const stem = String(pageNumber).padStart(3, "0");
    // Archive entries, not invented public URLs. Extraction belongs to the page renderer.
    return { svg: `${stem}.svg`, regions: `${stem}.json` };
}
