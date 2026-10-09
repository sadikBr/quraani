import type { AyahReference } from "../types/reader";

export function ayahKey(reference: AyahReference): string {
    return `${reference.mushafId}:${reference.surahNumber}:${reference.ayahNumber}`;
}
