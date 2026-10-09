import { readerShape } from '../../design';
import { ArabicText } from '@/components/arabic-text';
import { memo, useRef } from 'react';
import { Platform, StyleSheet, Text, type TextStyle, View } from "react-native";
import type { Ayah, AyahReference, Quran } from "@/lib/quranpedia/types";
import { SURAH_NAME_FONT_FAMILY } from "../../config";
import type { ReaderPalette } from "../../theme";
import type { QuranPage as Page, ReaderTextLayout } from "../../types/reader";
import { pageSections } from "../../utils/page-sections";
import { ayahKey } from "../../utils/references";
import { ayahWords } from '../../utils/page-practice';
import { flowingAyahOffset } from '../../utils/flowing-ayah-offset';
import { AyahTextAction } from './ayah-text-action';

interface Props {
    page: Page;
    quran: Quran;
    layout: ReaderTextLayout;
    fontFamily: string;
    fontSize: number;
    spacious: boolean;
    palette: ReaderPalette;
    selectedAyah: AyahReference | null;
    onTap: (ayah: Ayah) => void;
    onSelect: (ayah: Ayah) => void;
    onTargetOffset?: (y: number) => void;
    onAyahOffset?: (ayah: Ayah, y: number) => void;
    visibleWords?: ReadonlyMap<string, number>;
}

// This font substitutes Arabic-Indic number sequences with complete calligraphy.
function headingGlyph(number: number) {
    return String(number).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

export const QuranPage = memo(function QuranPage({
    page,
    quran,
    layout,
    fontFamily,
    fontSize,
    spacious,
    palette,
    selectedAyah,
    onTap,
    onSelect,
    onTargetOffset,
    onAyahOffset,
    visibleWords,
}: Props) {
    const pageRef = useRef<View>(null);
    const flowingRefs = useRef(new Map<string, { ayah: Ayah; node: Text }>());
    const measureWebAyah = (ayah: Ayah) => {
        if (Platform.OS !== 'web' || layout !== 'flowing' || !pageRef.current || (!onAyahOffset && !onTargetOffset)) return;
        flowingRefs.current.get(ayahKey(ayah))?.node.measureLayout(pageRef.current, (_x, y) => {
            onAyahOffset?.(ayah, y);
            if (selectedAyah && ayahKey(ayah) === ayahKey(selectedAyah)) onTargetOffset?.(y);
        });
    };
    const measureWebTarget = () => {
        if (Platform.OS === 'web' && layout === 'flowing') {
            for (const { ayah } of flowingRefs.current.values()) measureWebAyah(ayah);
        }
    };
    const offsets = useRef<{ section?: number; ayahs?: number; row?: number }>({});
    const practiceOffsets = useRef({ sections: new Map<number, number>(), groups: new Map<number, number>(), rows: new Map<string, { ayah: Ayah; y: number }>() });
    const reportPracticeOffsets = () => {
        if (!onAyahOffset) return;
        for (const { ayah, y } of practiceOffsets.current.rows.values()) {
            const section = practiceOffsets.current.sections.get(ayah.surahNumber);
            const group = practiceOffsets.current.groups.get(ayah.surahNumber);
            if (section !== undefined && group !== undefined) onAyahOffset(ayah, 22 + section + group + y);
        }
    };
    const reportTarget = () => {
        const { section, ayahs, row } = offsets.current;
        if (section !== undefined && ayahs !== undefined && row !== undefined) onTargetOffset?.(22 + section + ayahs + row);
    };
    const sections = pageSections(page, quran);
    // These whole-word calligraphy glyphs have a smaller visible height than
    // the ayah font. Scale them separately, without inheriting verse spacing.
    const surahNameSize = Math.round(fontSize * 1.75);
    const bismillahSize = Math.round(fontSize * 1.5);
    const arabicStyle: TextStyle = {
        fontFamily,
        fontSize,
        lineHeight: Math.ceil(fontSize * (spacious ? 2.25 : 1.9)),
        color: palette.text,
        fontWeight: "400",
        writingDirection: "rtl",
        textAlign: 'justify',
        includeFontPadding: true,
    };
    const renderAyah = (ayah: Ayah) => {
        const revealed = visibleWords?.get(ayahKey(ayah));
        const words = revealed === undefined ? undefined : ayahWords(ayah.text);
        const spokenText = words ? words.slice(0, revealed).join('') : ayah.text;
        const selected =
            selectedAyah !== null && ayahKey(selectedAyah) === ayahKey(ayah);
        return (
            <Text
                key={ayahKey(ayah)}
                ref={Platform.OS === 'web' && layout === 'flowing' ? (node) => {
                    if (node) flowingRefs.current.set(ayahKey(ayah), { ayah, node });
                    else flowingRefs.current.delete(ayahKey(ayah));
                } : undefined}
                onLayout={Platform.OS === 'web' && layout === 'flowing' ? () => measureWebAyah(ayah) : undefined}
                style={
                    selected && !visibleWords ? { backgroundColor: palette.selected } : undefined
                }
            >
                <AyahTextAction onPress={() => onTap(ayah)} onLongPress={() => onSelect(ayah)}
                    label={`السورة ${ayah.surahNumber}، الآية ${ayah.ayahNumber}. ${spokenText || 'آية مخفية'}`}
                    hint="اضغط لإظهار أدوات القراءة، واضغط مطولاً لفتح إجراءات الآية">
                    {/* Keep hidden runs the same color as the page as well as transparent:
                        native nested text can inherit ink instead of honoring transparency. */}
                    {words ? words.map((word, index) => <Text key={index}
                        style={{ color: index < revealed! ? palette.text : palette.paper, opacity: index < revealed! ? 1 : 0 }}
                        accessibilityElementsHidden={index >= revealed!}
                        importantForAccessibility={index >= revealed! ? 'no-hide-descendants' : 'auto'}
                        aria-hidden={index >= revealed!}>{word}</Text>) : ayah.text}
                </AyahTextAction>
                {"\u00A0"}
                <AyahTextAction color={palette.ornament} onPress={() => onSelect(ayah)}
                    label={`إجراءات الآية ${ayah.ayahNumber}، السورة ${ayah.surahNumber}`}>
                    {ayah.marker}
                </AyahTextAction>{" "}
            </Text>
        );
    };
    return (
        <View
            ref={pageRef}
            onLayout={Platform.OS === 'web' ? measureWebTarget : undefined}
            style={[
                styles.page,
                { backgroundColor: palette.paper },
            ]}
        >
            {sections.map((section) => (
                <View key={section.surah.number} style={styles.section} onLayout={(event) => {
                    if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.section = event.nativeEvent.layout.y; reportTarget(); }
                    if (onAyahOffset) { practiceOffsets.current.sections.set(section.surah.number, event.nativeEvent.layout.y); reportPracticeOffsets(); }
                }}>
                    {section.opensSurah && <View style={styles.surahHeader}>
                        <Text
                            accessibilityRole="header"
                            accessibilityLabel={section.surah.name}
                            style={[arabicStyle, styles.surahName, {
                                fontFamily: SURAH_NAME_FONT_FAMILY,
                                fontSize: surahNameSize,
                                lineHeight: Math.ceil(surahNameSize * 1.15),
                                color: palette.ornament,
                            }]}
                        >
                            {headingGlyph(section.surah.number)}
                        </Text>
                    </View>}
                    {section.showBismillah && (
                        <Text
                            accessibilityLabel={quran.bismillah}
                            style={[arabicStyle, styles.bismillah, {
                                fontFamily: SURAH_NAME_FONT_FAMILY,
                                fontSize: bismillahSize,
                                lineHeight: Math.ceil(bismillahSize * 1.3),
                            }]}
                        >
                            {headingGlyph(115)}
                        </Text>
                    )}
                    {layout === 'flowing' ? (
                        <View onLayout={(event) => {
                            if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.ayahs = event.nativeEvent.layout.y; reportTarget(); }
                            if (onAyahOffset) { practiceOffsets.current.groups.set(section.surah.number, event.nativeEvent.layout.y); reportPracticeOffsets(); }
                        }}>
                        <Text style={[arabicStyle, styles.paragraph]}
                            onTextLayout={Platform.OS !== 'web' && (onAyahOffset || onTargetOffset) ? (event) => {
                                for (const ayah of section.ayahs) {
                                    const y = flowingAyahOffset(section.ayahs, ayah, event.nativeEvent.lines);
                                    if (y === undefined) continue;
                                    if (selectedAyah && ayahKey(ayah) === ayahKey(selectedAyah)) { offsets.current.row = y; reportTarget(); }
                                    if (onAyahOffset) practiceOffsets.current.rows.set(ayahKey(ayah), { ayah, y });
                                }
                                reportPracticeOffsets();
                            } : undefined}>
                            {section.ayahs.map(renderAyah)}
                        </Text>
                        </View>
                    ) : (
                        <View style={styles.ayahs} onLayout={(event) => {
                            if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.ayahs = event.nativeEvent.layout.y; reportTarget(); }
                            if (onAyahOffset) { practiceOffsets.current.groups.set(section.surah.number, event.nativeEvent.layout.y); reportPracticeOffsets(); }
                        }}>
                            {section.ayahs.map((ayah) => (
                                <View
                                    key={ayahKey(ayah)}
                                    onLayout={(event) => {
                                        if (selectedAyah && ayahKey(selectedAyah) === ayahKey(ayah)) { offsets.current.row = event.nativeEvent.layout.y; reportTarget(); }
                                        if (onAyahOffset) { practiceOffsets.current.rows.set(ayahKey(ayah), { ayah, y: event.nativeEvent.layout.y }); reportPracticeOffsets(); }
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    surahName: { flexShrink: 1, textAlign: "center", paddingVertical: 4 },
    bismillah: { textAlign: "center", paddingVertical: 10, marginBottom: 10 },
    paragraph: { paddingVertical: 8 },
    ayahs: { gap: 14 },
    ayahRow: { paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
    reference: { fontSize: 11, textAlign: "center", alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: readerShape.detail, overflow: 'hidden' },
});
