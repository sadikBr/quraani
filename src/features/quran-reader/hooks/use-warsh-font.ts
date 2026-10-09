import { useFonts } from "expo-font";
import { SURAH_NAME_FONT_FAMILY, WARSH_FONT_FAMILY } from "../config";

// Keep platform assets out of the framework-independent reader configuration.
const WARSH_FONT_SOURCE = require("@/assets/fonts/UthmanicWarsh_V21.ttf");
const SURAH_NAME_FONT_SOURCE = require("@/assets/fonts/surah_name.ttf");

export function useWarshFont() {
    const [loaded, error] = useFonts({
        [WARSH_FONT_FAMILY]: WARSH_FONT_SOURCE,
        [SURAH_NAME_FONT_FAMILY]: SURAH_NAME_FONT_SOURCE,
    });
    return { loaded, error, fontFamily: WARSH_FONT_FAMILY };
}
