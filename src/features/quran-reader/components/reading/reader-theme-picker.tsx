import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerThemeOptions, readerThemes, type ReaderAppearance, type ReaderPalette } from '../../theme';
import { ReaderIcon } from '../ui/reader-chrome';

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
  return <View style={[styles.panel, { backgroundColor: palette.paper, borderColor: palette.border }]}>
    <View style={styles.titleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: palette.goldSoft }]}><ReaderIcon name="sun" color={palette.ornament} size={20} /></View>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>مظهر التطبيق</Text>
    </View>
    <Text style={[styles.description, { color: palette.muted }]}>ألوان تُشبه ذوقك. اختر مظهرك ليُطبّق ويُحفظ تلقائيًا.</Text>
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
  panel: { borderRadius: 22, padding: 16, gap: 14, borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' }, description: { fontSize: 13, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { padding: 8, borderWidth: 1.5, borderRadius: 16, gap: 9 },
  preview: { height: 88, borderRadius: 9, borderWidth: 1, padding: 8, flexDirection: 'row', gap: 6, overflow: 'hidden' },
  previewPage: { flex: 1, padding: 6, borderRadius: 5, alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewTitle: { width: '56%', height: 5, borderRadius: 2 },
  previewLine: { width: '100%', height: 3, borderRadius: 2, opacity: 0.5 },
  previewSelection: { width: '100%', height: 16, borderRadius: 5, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  previewRail: { width: '18%', borderRadius: 6, alignItems: 'center', paddingTop: 9, gap: 9 },
  previewDot: { width: 5, height: 5, borderRadius: 3 },
  systemHalf: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 13, left: 13, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 28 },
  label: { fontSize: 12, lineHeight: 21, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
