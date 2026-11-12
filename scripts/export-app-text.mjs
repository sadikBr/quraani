// Writes an edition's text as the app reads it from its bundled copy (assets/quran), in the shape
// of Quranpedia's response, for tools that work on the text the app shows: the Warsh tajweed
// generator takes it as its corpus (assets/tajweed/README.md).
//
//   bun scripts/export-app-text.mjs 4 /tmp/app-warsh-text.json
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { expandBundledMushaf } from "../src/lib/quranpedia/bundled.ts";
import { decodeQuran } from "../src/lib/quranpedia/validation.ts";

const id = Number(process.argv[2]), output = process.argv[3];
assert((id === 4 || id === 2) && output, "Usage: bun scripts/export-app-text.mjs <4|2> <output.json>");
const bundle = JSON.parse(await readFile(new URL(`../assets/quran/mushaf-${id}.json`, import.meta.url), "utf8"));
const response = expandBundledMushaf(bundle);
const texts = new Map(decodeQuran(response, id).surahs.flatMap((s) => s.ayahs.map((a) => [`${s.number}:${a.ayahNumber}`, a.text])));
for (const surah of response.surahs) for (const ayah of surah.ayahs) ayah.text = texts.get(`${surah.id}:${ayah.number}`);
await writeFile(output, JSON.stringify({ ...response, sourceSha256: bundle.sha256 }));
console.log(`Wrote ${texts.size} ayahs of mushaf ${id} (source sha256 ${bundle.sha256}) to ${output}`);
