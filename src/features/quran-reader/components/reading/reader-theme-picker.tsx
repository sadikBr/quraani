import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerThemeOptions, readerThemes, type ReaderAppearance, type ReaderPalette } from '../../theme';
import { ReaderIcon, SectionHeading } from '../ui/reader-chrome';
import { readerShape } from '../../design';

interface Props {
  appearance: ReaderAppearance;
  onChange: (appearance: ReaderAppearance) => void;
  palette: ReaderPalette;
}

/** Small native views preview each palette without loading Quran artwork. */
function ThemePreview({ palette, split = false }: { palette: ReaderPalette; split?: boolean }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={[styles.preview, { backgroundColor: palette.background, borderColor: palette.border }]}>
    <View style={[styles.previewPage, { backgroundColor: palette.paper }]}>
      <View style={[styles.previewTitle, { backgroundColor: palette.ornament }]} />
      <View style={[styles.previewLine, { backgroundColor: palette.text }]} />
      <View style={[styles.previewLine, { backgroundColor: palette.text, width: '84%' }]} />
      <View style={[styles.previewSelection, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
        <View style={[styles.previewLine, { backgroundColor: palette.accent, width: '72%' }]} />
      </View>
    </View>
    <View style={[styles.previewRail, { backgroundColor: palette.accentSoft }]}>
      <View style={[styles.previewDot, { backgroundColor: palette.accent }]} />
      <View style={[styles.previewDot, { backgroundColor: palette.muted, opacity: 0.5 }]} />
      <View style={[styles.previewDot, { backgroundColor: palette.muted, opacity: 0.5 }]} />
    </View>
    {split && <View style={[styles.systemHalf, { backgroundColor: readerThemes.dark.paper }]}>
      <ReaderIcon name="moon" size={24} color={readerThemes.dark.ornament} />
    </View>}
  </View>;
}

export function ReaderThemePicker({ appearance, onChange, palette }: Props) {
  const [width, setWidth] = useState(0);
  const columns = width >= 600 ? 4 : width >= 420 ? 3 : width >= 240 ? 2 : 1;
  const cardWidth = width ? Math.floor((width - (columns - 1) * 10) / columns) : undefined;
  return <View style={[styles.panel, { borderColor: palette.border }]}>
    <SectionHeading title="مظهر التطبيق" description="اختر ألوانك. تُطبّق على التطبيق والمصحف مباشرةً." icon="sun" palette={palette} />
    <View accessibilityRole="radiogroup" accessibilityLabel="مظهر التطبيق" style={styles.grid}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {readerThemeOptions.map((option) => {
        const selected = appearance === option.id;
        const sample = option.id === 'system' ? readerThemes.light : readerThemes[option.id];
        return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label}
          accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityHint="يُطبّق على التطبيق والمصحف ويُحفظ تلقائيًا"
          onPress={() => onChange(option.id)}
          style={({ pressed }) => [styles.card, { width: cardWidth, borderColor: selected ? palette.accent : palette.border,
            backgroundColor: selected ? palette.accentSoft : palette.paper, opacity: pressed ? 0.75 : 1 }]}>
          <ThemePreview palette={sample} split={option.id === 'system'} />
          {selected && <View style={[styles.check, { backgroundColor: palette.accent }]}>
            <ReaderIcon name="check" color={palette.paper} size={13} />
          </View>}
          <View style={styles.labelRow}>
            <ReaderIcon name={option.id === 'system' ? 'system' : option.dark ? 'moon' : 'sun'} size={14} color={selected ? palette.accent : palette.muted} />
            <Text style={[styles.label, { color: selected ? palette.accent : palette.text }]}>{option.label}</Text>
          </View>
        </Pressable>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { paddingTop: 20, gap: 16, borderTopWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { padding: 6, borderWidth: 1, borderRadius: readerShape.card, gap: 6 },
  preview: { height: 82, borderRadius: readerShape.detail, borderWidth: 1, padding: 8, flexDirection: 'row', gap: 6, overflow: 'hidden' },
  previewPage: { flex: 1, padding: 6, borderRadius: 2, alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewTitle: { width: '56%', height: 5, borderRadius: 2 },
  previewLine: { width: '100%', height: 3, borderRadius: 2, opacity: 0.5 },
  previewSelection: { width: '100%', height: 16, borderRadius: 2, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  previewRail: { width: '18%', borderRadius: 2, alignItems: 'center', paddingTop: 9, gap: 9 },
  previewDot: { width: 5, height: 5, borderRadius: 3 },
  systemHalf: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 11, left: 11, width: 21, height: 21, borderRadius: readerShape.detail, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 28 },
  label: { fontSize: 12, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
