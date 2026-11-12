import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareReaderContent } from "../src/features/quran-reader/utils/content.ts";
import { createQuranSearch } from "../src/features/quran-reader/utils/search.ts";
import { decodeQuran } from "../src/lib/quranpedia/validation.ts";
import { matchWarshSpelling } from "../src/features/quran-reader/utils/warsh-tajweed.ts";

// One request, not a crawl. A saved response can be supplied for offline validation.
const inputPath = process.argv[2];
let payload;
if (inputPath) {
    payload = JSON.parse(await readFile(inputPath, "utf8"));
} else {
    const response = await fetch("https://api.quranpedia.net/v1/mushafs/4", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok, `Quranpedia returned ${response.status}`);
    payload = await response.json();
}

const quran = decodeQuran(payload, 4);
const content = prepareReaderContent(quran);
assert.equal(quran.riwayah.name, "ورش");
assert.equal(content.pages.length, 604);
assert.equal(quran.surahs.flatMap((s) => s.ayahs).length, 6214);
assert.deepEqual(
    content.pages.map((p) => p.number),
    Array.from({ length: 604 }, (_, i) => i + 1),
);
assert.equal(content.juzIndex.length, 30);
assert.equal(content.hizbIndex.length, 60);
assert.equal(content.quarterHizbIndex.length, 240);
assert.equal(quran.surahs[1].ayahs.length, 285);
assert.equal(
    createQuranSearch(quran)("الحمد").items[0].reference.ayahNumber,
    1,
);
// The bundled tajweed colours were made for the 2026-10 spelling; count the ayahs they still fit.
const colours = JSON.parse(await readFile(new URL("../assets/tajweed/warsh-azraq-v1.json", import.meta.url), "utf8"));
const ayahs = quran.surahs.flatMap((s) => s.ayahs);
const unmatched = ayahs.filter((a) => !matchWarshSpelling(a.text, colours.ayahs[`${a.surahNumber}:${a.ayahNumber}`][0]));
assert(/^[^\u0870-\u089F\u08C9-\u08FF]*$/u.test(ayahs.map((a) => a.text).join("")), "Warsh text has letters the bundled font cannot draw");
console.log(`Warsh colours fit ${ayahs.length - unmatched.length} of ${ayahs.length} ayahs; plain: ${unmatched.map((a) => `${a.surahNumber}:${a.ayahNumber}`).join(" ") || "none"}.`);
assert(unmatched.length < 200, "Warsh colours no longer fit the corpus; regenerate assets/tajweed");
console.log(
    "Verified Warsh: 114 surahs, 6,214 ayahs, 604 pages, 30 juz, 60 hizbs, 240 quarters; Warsh search references preserved.",
);
