import { ArabicText } from '@/components/arabic-text';
import { memo, useRef } from 'react';
import { Platform, StyleSheet, Text, type TextStyle, View } from "react-native";
import { rtlTextAlignment } from '@/lib/ui-text-alignment';
import type { Ayah, AyahReference, Quran } from "@/lib/quranpedia/types";
import { SURAH_NAME_FONT_FAMILY } from "../../config";
import type { ReaderPalette } from "../../theme";
import type { QuranPage as Page, ReaderMode } from "../../types/reader";
import { pageSections } from "../../utils/page-sections";
import { ayahKey } from "../../utils/references";

interface Props {
    page: Page;
    quran: Quran;
    mode: ReaderMode;
    fontFamily: string;
    fontSize: number;
    spacious: boolean;
    palette: ReaderPalette;
    selectedAyah: AyahReference | null;
    onTap: (ayah: Ayah) => void;
    onSelect: (ayah: Ayah) => void;
    onTargetOffset?: (y: number) => void;
    hiddenAyahs: ReadonlySet<string>;
}

// This font substitutes Arabic-Indic number sequences with complete calligraphy.
function headingGlyph(number: number) {
    return String(number).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

export const QuranPage = memo(function QuranPage({
    page,
    quran,
    mode,
    fontFamily,
    fontSize,
    spacious,
    palette,
    selectedAyah,
    onTap,
    onSelect,
    onTargetOffset,
    hiddenAyahs,
}: Props) {
    const offsets = useRef<{ section?: number; ayahs?: number; row?: number }>({});
    const reportTarget = () => {
        const { section, ayahs, row } = offsets.current;
        if (section !== undefined && ayahs !== undefined && row !== undefined) onTargetOffset?.(22 + section + ayahs + row);
    };
    const sections = pageSections(page, quran);
    const arabicStyle: TextStyle = {
        fontFamily,
        fontSize,
        lineHeight: Math.ceil(fontSize * (spacious ? 2.25 : 1.9)),
        color: palette.text,
        fontWeight: "400",
        writingDirection: "rtl",
        textAlign: mode === 'page' ? 'justify' : rtlTextAlignment('right', Platform.OS),
        includeFontPadding: true,
    };
    const renderAyah = (ayah: Ayah) => {
        const hidden = hiddenAyahs.has(ayahKey(ayah));
        const selected =
            selectedAyah !== null && ayahKey(selectedAyah) === ayahKey(ayah);
        return (
            <Text
                key={ayahKey(ayah)}
                style={
                    selected ? { backgroundColor: palette.selected } : undefined
                }
            >
                <Text onPress={(event) => { event.stopPropagation(); onTap(ayah); }}
                    onLongPress={(event) => { event.stopPropagation(); onSelect(ayah); }} accessibilityRole="button"
                    accessibilityActions={[{ name: 'longpress', label: 'فتح إجراءات الآية' }]}
                    onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'longpress') onSelect(ayah); }}
                    accessibilityLabel={`السورة ${ayah.surahNumber}، الآية ${ayah.ayahNumber}. ${hidden ? 'آية مخفية، اضغط للإظهار' : ayah.text}`}
                    accessibilityHint="اضغط لإظهار أدوات القراءة، واضغط مطولاً لفتح إجراءات الآية">
                    {hidden ? "اضغط لإظهار الآية" : ayah.text}
                </Text>
                {"\u00A0"}
                <Text style={{ color: palette.ornament }} onPress={(event) => { event.stopPropagation(); onSelect(ayah); }}
                    accessibilityRole="button" accessibilityLabel={`إجراءات الآية ${ayah.ayahNumber}، السورة ${ayah.surahNumber}`}>
                    {ayah.marker}
                </Text>{" "}
            </Text>
        );
    };
    return (
        <View
            style={[
                styles.page,
                { backgroundColor: palette.paper },
            ]}
        >
            {sections.map((section) => (
                <View key={section.surah.number} style={styles.section} onLayout={(event) => {
                    if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.section = event.nativeEvent.layout.y; reportTarget(); }
                }}>
                    {section.opensSurah && <View
                        style={[
                            styles.surahHeader,
                            { backgroundColor: palette.goldSoft, borderColor: palette.border },
                        ]}
                    >
                        <Text
                            accessibilityRole="header"
                            accessibilityLabel={section.surah.name}
                            style={[arabicStyle, styles.surahName, { fontFamily: SURAH_NAME_FONT_FAMILY }]}
                        >
                            {headingGlyph(section.surah.number)}
                        </Text>
                    </View>}
                    {section.showBismillah && (
                        <Text
                            accessibilityLabel={quran.bismillah}
                            style={[arabicStyle, styles.bismillah, { fontFamily: SURAH_NAME_FONT_FAMILY }]}
                        >
                            {headingGlyph(115)}
                        </Text>
                    )}
                    {mode === "page" ? (
                        <Text style={[arabicStyle, styles.paragraph]}>
                            {section.ayahs.map(renderAyah)}
                        </Text>
                    ) : (
                        <View style={styles.ayahs} onLayout={(event) => {
                            if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.ayahs = event.nativeEvent.layout.y; reportTarget(); }
                        }}>
                            {section.ayahs.map((ayah) => (
                                <View
                                    key={ayahKey(ayah)}
                                    onLayout={(event) => {
                                        if (selectedAyah && ayahKey(selectedAyah) === ayahKey(ayah)) { offsets.current.row = event.nativeEvent.layout.y; reportTarget(); }
                                    }}
                                    style={[
                                        styles.ayahRow,
                                        { borderColor: palette.border },
                                    ]}
                                >
                                    <ArabicText
                                        style={[
                                            styles.reference,
                                            { color: palette.accent, backgroundColor: palette.accentSoft },
                                        ]}
                                    >
                                        {String(ayah.surahNumber)}:{String(ayah.ayahNumber)}
                                    </ArabicText>
                                    <Text
                                        style={[arabicStyle, styles.paragraph]}
                                    >
                                        {renderAyah(ayah)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ))}

        </View>
    );
});

const styles = StyleSheet.create({
    page: {
        flexGrow: 1,
        paddingHorizontal: 0,
        paddingTop: 22,
        paddingBottom: 16,
    },
    section: { marginBottom: 12 },
    surahHeader: {
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        marginBottom: 16,
    },
    surahName: { flexShrink: 1, textAlign: "center", paddingVertical: 4 },
    bismillah: { textAlign: "center", paddingVertical: 10, marginBottom: 10 },
    paragraph: { paddingVertical: 8 },
    ayahs: { gap: 14 },
    ayahRow: { paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
    reference: { fontSize: 11, textAlign: "center", alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
});
