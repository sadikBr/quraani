import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { useTajweed } from '../../hooks/use-tajweed';
import { ReaderButton } from './reader-button';
import { readerShape } from '../../design';
import { ArabicText } from '@/components/arabic-text';
import { memo, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, type AccessibilityActionEvent, type TextStyle, View, type ViewProps } from "react-native";
import type { Ayah, AyahReference, Quran } from "@/lib/quranpedia/types";
import type { ReaderPalette } from "../../theme";
import type { QuranPage as Page, ReaderTextLayout } from "../../types/reader";
import { pageSections } from "../../utils/page-sections";
import { ayahKey } from "../../utils/references";
import { ayahWords } from '../../utils/page-practice';
import { flowingAyahOffset } from '../../utils/flowing-ayah-offset';
import { AyahTextAction } from './ayah-text-action';
import { readerTextLineHeight } from '../../utils/reader-typography';
import { TajweedTextSection } from './tajweed-text-section';
import { SurahOpening } from './surah-opening';

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
    onNavigate?: (page: number) => void;
    onTargetOffset?: (y: number) => void;
    onAyahOffset?: (ayah: Ayah, y: number) => void;
    visibleWords?: ReadonlyMap<string, number>;
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
    onNavigate,
    onTargetOffset,
    onAyahOffset,
    visibleWords,
}: Props) {
    const { preferences: { tajweed }, dark } = useReadingPreferences();
    const coloring = useTajweed(page, quran, tajweed);
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
    const sections = useMemo(() => pageSections(page, quran), [page, quran]);
    const arabicStyle: TextStyle = {
        fontFamily,
        fontSize,
        lineHeight: readerTextLineHeight(fontSize, spacious),
        color: palette.foreground,
        fontWeight: "400",
        writingDirection: "rtl",
        textAlign: 'justify',
        includeFontPadding: true,
    };
    const spokenLabel = (ayah: Ayah) => {
        const revealed = visibleWords?.get(ayahKey(ayah));
        const spokenText = revealed === undefined ? ayah.text : ayahWords(ayah.text).slice(0, revealed).join('');
        return `السورة ${ayah.surahNumber}، الآية ${ayah.ayahNumber}. ${spokenText || 'آية مخفية'}`;
    };
    // iOS exposes nested <Text> buttons only as raw text fragments: their labels,
    // hints and long-press actions are lost, and a paragraph's own custom actions
    // are dropped. Group the ayahs in a plain View that reads the spoken text and
    // offers each ayah's actions, without changing layout or touch handling.
    const ayahGroupAccessibility = (ayahs: readonly Ayah[]): ViewProps | undefined => Platform.OS !== 'ios' ? undefined : {
        accessible: true,
        accessibilityLabel: ayahs.map(spokenLabel).join(' '),
        accessibilityHint: ayahs.length > 1 ? 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات آية' : 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات الآية',
        accessibilityActions: [{ name: 'activate', label: 'إظهار أدوات القراءة' },
            ...ayahs.map((ayah) => ({ name: `ayah:${ayahKey(ayah)}`, label: `إجراءات الآية ${ayah.ayahNumber}، السورة ${ayah.surahNumber}` }))],
        onAccessibilityAction: (event: AccessibilityActionEvent) => {
            const name = event.nativeEvent.actionName;
            if (name === 'activate') { if (ayahs[0]) onTap(ayahs[0]); return; }
            const ayah = ayahs.find((value) => `ayah:${ayahKey(value)}` === name);
            if (ayah) onSelect(ayah);
        },
    };
    const renderAyah = (ayah: Ayah) => {
        const revealed = visibleWords?.get(ayahKey(ayah));
        const words = revealed === undefined ? undefined : ayahWords(ayah.text);
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
                    selected && !visibleWords ? { backgroundColor: palette.highlight } : undefined
                }
            >
                <AyahTextAction onPress={() => onTap(ayah)} onLongPress={() => onSelect(ayah)}
                    label={spokenLabel(ayah)}
                    hint="اضغط لإظهار أدوات القراءة، واضغط مطولاً لفتح إجراءات الآية">
                    {/* Keep hidden runs the same color as the page as well as transparent:
                        native nested text can inherit ink instead of honoring transparency. */}
                    {words ? words.map((word, index) => {
                        const hidden = index >= revealed!;
                        return <Text key={index} style={{ color: hidden ? palette.card : palette.foreground, opacity: hidden ? 0 : 1 }}
                            accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} aria-hidden={hidden}>
                            {word}
                        </Text>;
                    }) : ayah.text}
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
                { backgroundColor: palette.card },
            ]}
        >
            {tajweed && coloring.error && <View style={{ gap: 8, padding: 12 }}><ArabicText style={{ color: palette.mutedForeground }}>تعذر تحميل ألوان التجويد. النص الكامل ظاهر دون ألوان.</ArabicText><ReaderButton palette={palette} onPress={coloring.retry}>إعادة المحاولة</ReaderButton></View>}
            {sections.map((section) => (
                <View key={section.surah.number} style={styles.section} onLayout={(event) => {
                    if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.section = event.nativeEvent.layout.y; reportTarget(); }
                    if (onAyahOffset) { practiceOffsets.current.sections.set(section.surah.number, event.nativeEvent.layout.y); reportPracticeOffsets(); }
                }}>
                    {section.opensSurah && <SurahOpening number={section.surah.number} name={section.surah.name}
                        bismillah={section.showBismillah ? quran.bismillah : undefined} fontSize={fontSize} palette={palette} />}
                    {tajweed ? <View onLayout={(event) => {
                        if (section.surah.number === selectedAyah?.surahNumber) { offsets.current.ayahs = event.nativeEvent.layout.y; reportTarget(); }
                        if (onAyahOffset) { practiceOffsets.current.groups.set(section.surah.number, event.nativeEvent.layout.y); reportPracticeOffsets(); }
                    }}>
                        <TajweedTextSection ayahs={section.ayahs} pageNumber={page.number} layout={layout} fontSize={fontSize} spacious={spacious}
                            palette={palette} dark={dark} runs={coloring.data[section.surah.number]} selectedAyah={selectedAyah} visibleWords={visibleWords}
                            onTap={onTap} onSelect={onSelect} onNavigate={onNavigate} onOffset={(ayah, y) => {
                                if (selectedAyah && ayahKey(selectedAyah) === ayahKey(ayah)) { offsets.current.row = y; reportTarget(); }
                                if (onAyahOffset) { practiceOffsets.current.rows.set(ayahKey(ayah), { ayah, y }); reportPracticeOffsets(); }
                            }} />
                    </View> : layout === 'flowing' ? (
                        <View {...ayahGroupAccessibility(section.ayahs)} onLayout={(event) => {
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
                                    {...ayahGroupAccessibility([ayah])}
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
                                            { color: palette.secondaryForeground, backgroundColor: palette.secondary },
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
    paragraph: { paddingVertical: 8 },
    ayahs: { gap: 14 },
    ayahRow: { paddingBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
    reference: { fontSize: 12, textAlign: "center", alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: readerShape.pill, overflow: 'hidden' },
});
