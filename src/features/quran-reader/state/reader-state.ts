import { DEFAULT_MUSHAF_ID, DEFAULT_READER_MODE } from "../config";
import type { AyahReference, ReaderMode } from "../types/reader";
import { ayahKey } from "../utils/references";

export interface ReaderState {
    mushafId: number;
    mode: ReaderMode;
    selectedAyah: AyahReference | null;
    hiddenAyahs: ReadonlySet<string>;
}

export function createReaderState(mushafId = DEFAULT_MUSHAF_ID): ReaderState {
    return {
        mushafId,
        mode: DEFAULT_READER_MODE,
        selectedAyah: null,
        hiddenAyahs: new Set(),
    };
}

export type ReaderAction =
    | { type: "set-mode"; mode: ReaderMode }
    | { type: "set-mushaf"; mushafId: number }
    | { type: "tap-ayah"; reference: AyahReference }
    | { type: "select-ayah"; reference: AyahReference }
    | { type: "clear-selection" }
    | { type: "hide"; references: AyahReference[] }
    | { type: "reveal"; references: AyahReference[] }
    | { type: "reveal-all" };

export function readerReducer(
    state: ReaderState,
    action: ReaderAction,
): ReaderState {
    switch (action.type) {
        case "set-mode":
            return { ...state, mode: action.mode };
        case "set-mushaf":
            return createReaderState(action.mushafId);
        case "clear-selection":
            return { ...state, selectedAyah: null };
        case "reveal-all":
            return { ...state, hiddenAyahs: new Set() };
        case "select-ayah":
        case "tap-ayah": {
            if (action.reference.mushafId !== state.mushafId) return state;
            const hiddenAyahs = new Set(state.hiddenAyahs);
            if (action.type === "tap-ayah")
                hiddenAyahs.delete(ayahKey(action.reference));
            return { ...state, selectedAyah: action.reference, hiddenAyahs };
        }
        case "hide":
        case "reveal": {
            const hiddenAyahs = new Set(state.hiddenAyahs);
            for (const reference of action.references) {
                if (reference.mushafId !== state.mushafId) continue;
                if (action.type === "hide") hiddenAyahs.add(ayahKey(reference));
                else hiddenAyahs.delete(ayahKey(reference));
            }
            return { ...state, hiddenAyahs };
        }
    }
}
