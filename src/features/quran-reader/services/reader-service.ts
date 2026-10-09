import { QuranpediaClient, type RequestOptions } from "@/lib/quranpedia/client";
import { DEFAULT_MUSHAF_ID } from "../config";
import { contentStorage } from "../storage/content-storage";
import { prepareReaderContent } from "../utils/content";

export const quranpedia = new QuranpediaClient({ storage: contentStorage });

export async function loadReaderContent(options?: RequestOptions) {
    const result = await quranpedia.getMushaf(DEFAULT_MUSHAF_ID, options);
    if (result.data.riwayah.name !== "ورش")
        throw new Error("The selected edition is not Warsh");
    return { ...result, data: prepareReaderContent(result.data) };
}
