// Compares the Quran text bundled with the app (assets/quran) with what Quranpedia serves now, and
// lists every ayah that differs, so a change at the source is reviewed before a new copy is bundled
// (scripts/bundle-quran.mjs). One request per edition, not a crawl; saved responses can be given:
//
//   bun scripts/verify-quranpedia.mjs [saved-mushaf-4.json] [saved-mushaf-2.json]
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { prepareReaderContent } from "../src/features/quran-reader/utils/content.ts";
import { createQuranSearch } from "../src/features/quran-reader/utils/search.ts";
import { expandBundledMushaf } from "../src/lib/quranpedia/bundled.ts";
import { decodeQuran } from "../src/lib/quranpedia/validation.ts";

const EDITIONS = [
    { id: 4, riwayah: "ورش", ayahs: 6214, saved: process.argv[2] },
    { id: 2, riwayah: "حفص", ayahs: 6236, saved: process.argv[3] },
];
let changed = 0;
for (const edition of EDITIONS) {
    const bundle = JSON.parse(await readFile(new URL(`../assets/quran/mushaf-${edition.id}.json`, import.meta.url), "utf8"));
    const bundled = expandBundledMushaf(bundle);
    // The bundled copy itself: what the app checks when it reads it.
    const quran = decodeQuran(bundled, edition.id);
    const content = prepareReaderContent(quran);
    assert.equal(quran.riwayah.name, edition.riwayah);
    assert.equal(quran.surahs.flatMap((s) => s.ayahs).length, edition.ayahs);
    assert.deepEqual(content.pages.map((p) => p.number), Array.from({ length: 604 }, (_, i) => i + 1));
    assert.deepEqual([content.juzIndex.length, content.hizbIndex.length, content.quarterHizbIndex.length], [30, 60, 240]);
    if (edition.id === 4) assert.equal(createQuranSearch(quran)("الحمد").items[0].reference.ayahNumber, 1);

    let bytes;
    if (edition.saved) bytes = await readFile(edition.saved);
    else {
        const response = await fetch(bundle.source, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
        assert(response.ok, `Quranpedia returned ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
    }
    if (createHash("sha256").update(bytes).digest("hex") === bundle.sha256) {
        console.log(`Mushaf ${edition.id} (${edition.riwayah}): Quranpedia serves the bundled copy of ${bundle.fetched}, byte for byte.`);
        continue;
    }
    // Compared as served, field by field, not as the app respells it.
    const live = JSON.parse(bytes.toString("utf8"));
    const rows = (response) => new Map(response.surahs.flatMap((s) => s.ayahs.map((a) => [`${s.id}:${a.number}`,
        { text: a.text, marker: a.marker, page: a.page_number, juz: a.juz, hizb: a.hizb, hafs: a.number_in_hafs.join(","), options: a.options.join(",") }])));
    const before = rows(bundled), after = rows(live);
    const differing = [];
    for (const key of new Set([...before.keys(), ...after.keys()])) {
        const a = before.get(key), b = after.get(key);
        const fields = !a ? ["added"] : !b ? ["removed"] : Object.keys(a).filter((field) => a[field] !== b[field]);
        if (fields.length) differing.push(`${key} (${fields.join(", ")})`);
    }
    changed += differing.length;
    console.log(`Mushaf ${edition.id} (${edition.riwayah}): Quranpedia's response differs from the bundled copy of ${bundle.fetched}`
        + (differing.length ? ` in ${differing.length} ayahs:\n  ${differing.join("\n  ")}` : " outside the ayahs (the edition's own fields, or its formatting)."));
}
if (changed) {
    console.log("\nThe app keeps showing its bundled text. To take the new one: review the ayahs above, then `bun scripts/bundle-quran.mjs <id>`,"
        + " and for Warsh regenerate the tajweed colours (assets/tajweed/README.md).");
    process.exitCode = 1;
}
