// Writes the Quran text bundled with the app (assets/quran/mushaf-<id>.json) from Quranpedia's
// corpus response for an edition: a saved response, or one request (not a crawl).
//
//   bun scripts/bundle-quran.mjs 4 [saved-response.json] [YYYY-MM-DD]
//   bun scripts/bundle-quran.mjs 2 [saved-response.json] [YYYY-MM-DD]
//
// Review what changed (`git diff`, `bun run verify:quranpedia`) before committing a new copy,
// and regenerate the Warsh tajweed colours after a new Warsh text (assets/tajweed/README.md).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { expandBundledMushaf, packMushaf } from "../src/lib/quranpedia/bundled.ts";
import { decodeQuran } from "../src/lib/quranpedia/validation.ts";

const EDITIONS = { 4: { riwayah: "ورش", ayahs: 6214 }, 2: { riwayah: "حفص", ayahs: 6236 } };
const id = Number(process.argv[2]), edition = EDITIONS[id];
assert(edition, "Usage: bun scripts/bundle-quran.mjs <4|2> [saved-response.json] [YYYY-MM-DD]");
const source = `https://api.quranpedia.net/v1/mushafs/${id}`;
let bytes;
if (process.argv[3]) bytes = await readFile(process.argv[3]);
else {
    const response = await fetch(source, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
    assert(response.ok, `Quranpedia returned ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
}
const fetched = process.argv[4] ?? new Date().toISOString().slice(0, 10);
assert(/^\d{4}-\d{2}-\d{2}$/.test(fetched), "The day the response was taken: YYYY-MM-DD");
const response = JSON.parse(bytes.toString("utf8"));
// The same checks the app makes, before and after packing.
const quran = decodeQuran(response, id);
assert.equal(quran.riwayah.name, edition.riwayah);
assert.equal(quran.surahs.flatMap((s) => s.ayahs).length, edition.ayahs);
const bundle = packMushaf(response, { source, fetched, sha256: createHash("sha256").update(bytes).digest("hex") });
assert.deepEqual(decodeQuran(expandBundledMushaf(JSON.parse(JSON.stringify(bundle))), id), quran);
await mkdir(new URL("../assets/quran/", import.meta.url), { recursive: true });
const output = new URL(`../assets/quran/mushaf-${id}.json`, import.meta.url);
await writeFile(output, JSON.stringify(bundle) + "\n");
console.log(`Wrote ${output.pathname}: ${edition.ayahs} ayahs, ${bundle.options.length} lists of available content, sha256 ${bundle.sha256}`);
