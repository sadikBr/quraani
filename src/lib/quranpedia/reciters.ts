import { QuranpediaError } from "./errors";

/** How a recitation's audio is split. */
export type RecitationMode = "ayah" | "surah";
export type RecitationStyle = "murattal" | "mujawwad" | "muallim";

export interface Reciter {
    id: number;
    /** The edition's published title, e.g. «مصحف عمر القزابري برواية ورش عن نافع». */
    title: string;
    /** The reciter's name taken from the title, e.g. «عمر القزابري». */
    name: string;
    /** The transmission path when the title states one, e.g. «من طريق الأصبهاني». */
    path: string | null;
    /** Quranpedia's rawi id; it matches `Quran.riwayah.id` of a mushaf. */
    riwayahId: number;
    style: RecitationStyle;
    /** "ayah": one file per ayah (`SSSAAA.mp3`, basmala `SSS000.mp3`); "surah": one file per surah (`SSS.mp3`). */
    mode: RecitationMode;
    /** Base URL without a trailing slash. */
    server: string;
    /** Zip of per-ayah start/end times for surah files, when available. */
    timingUrl: string | null;
    surahs: number[];
}

/** A single ayah can be played (and repeated) only with ayah files or surah timings. */
export const playsSingleAyahs = (reciter: Reciter) =>
    reciter.mode === "ayah" || reciter.timingUrl !== null;

const STYLES: Record<number, RecitationStyle> = {
    1: "murattal",
    2: "mujawwad",
    3: "muallim",
};

const TITLE = /^(?:المصحف\s+\S+\s+|مصحف\s+|مجود\s+|معلم\s+)?(?:للقارئ|القارئ|للشيخ|الشيخ|شيخ)?\s*(.+?)(?:\s+برواية\s.*)?$/u;
const PATH = /(من\s+طريق\s+.+)$/u;

/** «مصحف محمد عبدالكريم برواية ورش عن نافع من طريق الأصبهاني» → name «محمد عبدالكريم», path «من طريق الأصبهاني». */
export function reciterNameParts(title: string): {
    name: string;
    path: string | null;
} {
    const clean = title.replace(/\s+/g, " ").trim();
    const name = TITLE.exec(clean)?.[1]?.trim() || clean;
    return { name, path: PATH.exec(clean)?.[1] ?? null };
}

function httpsUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value.trim());
        return url.protocol === "https:"
            ? url.href.replace(/\/+$/, "")
            : null;
    } catch {
        return null;
    }
}

function id(value: unknown): number | null {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0
        ? value
        : null;
}

/**
 * `/reciters` returns reciters grouped by person; each entry is one edition.
 * Malformed editions are skipped so one bad entry cannot hide the others.
 */
export function decodeReciters(value: unknown): Reciter[] {
    if (!Array.isArray(value))
        throw new QuranpediaError(
            "invalid-response",
            "Invalid Quranpedia field: reciters",
        );
    const reciters: Reciter[] = [];
    for (const entry of value.flat()) {
        if (!entry || typeof entry !== "object") continue;
        const source = entry as Record<string, unknown>;
        const reciterId = id(source.id);
        const server = httpsUrl(source.server);
        const rawi = source.rawi as Record<string, unknown> | null;
        const riwayahId = id(rawi?.id);
        const classification = id(
            (source.classification as Record<string, unknown> | null)?.id,
        );
        const style =
            STYLES[
                id(
                    (source.recitation_type as Record<string, unknown> | null)
                        ?.id,
                ) ?? 0
            ];
        const title =
            typeof source.name === "string" ? source.name.trim() : "";
        const surahs = Array.isArray(source.surahs_list)
            ? [
                  ...new Set(
                      source.surahs_list.filter(
                          (n): n is number =>
                              Number.isInteger(n) && n >= 1 && n <= 114,
                      ),
                  ),
              ].sort((a, b) => a - b)
            : [];
        if (
            !reciterId ||
            !server ||
            !riwayahId ||
            !style ||
            !title ||
            !surahs.length ||
            (classification !== 1 && classification !== 2)
        )
            continue;
        reciters.push({
            id: reciterId,
            title,
            ...reciterNameParts(title),
            riwayahId,
            style,
            mode: classification === 2 ? "ayah" : "surah",
            server,
            timingUrl: httpsUrl(source.timing_url),
            surahs,
        });
    }
    return reciters;
}
