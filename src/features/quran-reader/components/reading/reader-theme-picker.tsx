import { IconTile } from '@/components/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerThemeOptions, readerThemes, type ReaderAppearance, type ReaderPalette } from '../../theme';
import { ReaderIcon } from '../ui/reader-chrome';
import { readerShape } from '../../design';
import { SettingsSelection } from './settings-ui';
import { t } from '@/i18n';
import { tRich } from '@/i18n/rich';

interface Props {
  appearance: ReaderAppearance;
  onChange: (appearance: ReaderAppearance) => void;
  palette: ReaderPalette;
}

/** A small reading surface shows paper, Quran ink, ornament and toolbar colors. */
function ThemePreview({ palette }: { palette: ReaderPalette }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.preview, { backgroundColor: palette.background }]}>
    <View style={[styles.previewPage, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.ornamentRow}><View style={[styles.rule, { backgroundColor: palette.ornament }]} /><View style={[styles.ornament, { borderColor: palette.ornament }]} /><View style={[styles.rule, { backgroundColor: palette.ornament }]} /></View>
      {[100, 100, 100, 72].map((width, i) => <View key={i} style={{ width: `${width}%`, flexDirection: 'row', alignSelf: 'center', gap: 3, alignItems: 'center' }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, borderWidth: 1, borderColor: palette.ornament }} />
        <View style={[styles.previewLine, { backgroundColor: palette.foreground }]} />
      </View>)}
      <View style={[styles.previewToolbar, { backgroundColor: palette.accent }]}><View style={[styles.previewDot, { backgroundColor: palette.primary }]} /><View style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: palette.primary, opacity: 0.45 }} /><View style={[styles.previewDot, { backgroundColor: palette.primary }]} /></View>
    </View>
  </View>;
}

export function ReaderThemePicker({ appearance, onChange, palette }: Props) {
  const [width, setWidth] = useState(0);
  const columns = width >= 560 ? 3 : 2;
  const cardWidth = width ? Math.floor((width - (columns - 1) * 12) / columns) : undefined;
  const selectedLabel = readerThemeOptions.find(option => option.id === appearance)?.label;
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.appearance.label')} style={styles.panel}>
    <View style={styles.current}>
      <View style={[styles.currentDot, { backgroundColor: palette.primary }]} />
      <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{tRich('settings.appearance.current', { theme: <Text style={{ color: palette.foreground, fontWeight: '600' }}>{selectedLabel}</Text> })}</Text>
    </View>
    <Pressable accessibilityRole="radio" accessibilityLabel={t('themes.system')} accessibilityState={{ checked: appearance === 'system' }} aria-checked={appearance === 'system'}
      onPress={() => onChange('system')} style={({ pressed }) => [styles.system, { backgroundColor: pressed ? palette.accent : palette.card, borderColor: appearance === 'system' ? palette.primary : palette.border }]}>
      <IconTile name="system" palette={palette} />
      <View style={{ flex: 1 }}><Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600' }}>{t('themes.system')}</Text><Text style={{ color: palette.mutedForeground, fontSize: 14 }}>{t('settings.appearance.systemDetail')}</Text></View>
      <SettingsSelection selected={appearance === 'system'} palette={palette} />
    </Pressable>
    <View style={{ gap: 22 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {[false, true].map(dark => <View key={String(dark)} style={{ gap: 12 }}>
        <View style={styles.groupHeading}><ReaderIcon name={dark ? 'moon' : 'sun'} color={palette.mutedForeground} size={16} /><Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 16, fontWeight: '600' }}>{dark ? t('settings.appearance.darkShades') : t('settings.appearance.lightShades')}</Text><View style={[styles.groupRule, { backgroundColor: palette.border }]} /></View>
        <View style={styles.grid}>{readerThemeOptions.filter(option => option.id !== 'system' && option.dark === dark).map(option => {
          if (option.id === 'system') return null;
          const selected = appearance === option.id;
          const sample = readerThemes[option.id];
          return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityHint={t('settings.appearance.themeHint')}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [styles.card, { width: cardWidth, borderColor: selected ? palette.primary : palette.border,
              backgroundColor: pressed ? palette.accent : palette.card }]}>
            <ThemePreview palette={sample} />
            <View style={styles.labelRow}><Text style={[styles.label, { color: palette.foreground }]}>{option.label}</Text><SettingsSelection selected={selected} palette={palette} /></View>
          </Pressable>;
        })}</View>
      </View>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 20 }, current: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  currentDot: { width: 6, height: 6, borderRadius: 3 },
  // Option tiles: a constant 1.5 border keeps the layout still when the accent colour marks the selection.
  system: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1.5, borderRadius: readerShape.card },
  systemIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, groupRule: { height: StyleSheet.hairlineWidth, flex: 1, marginStart: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { padding: 8, borderWidth: 1.5, borderRadius: readerShape.card, gap: 6 },
  preview: { height: 108, borderRadius: readerShape.sm, padding: 10, overflow: 'hidden' },
  previewPage: { flex: 1, padding: 9, borderRadius: readerShape.detail, borderWidth: 1, gap: 6, overflow: 'hidden' },
  ornamentRow: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 7, marginBottom: 3 },
  rule: { width: 14, height: 1, opacity: 0.5 }, ornament: { width: 8, height: 8, borderWidth: 1, transform: [{ rotate: '45deg' }] },
  previewLine: { flex: 1, height: 2, borderRadius: 2, opacity: 0.48 },
  previewToolbar: { height: 12, position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewDot: { width: 3, height: 3, borderRadius: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 38, paddingHorizontal: 4, paddingVertical: 3 },
  label: { flex: 1, fontSize: 14, fontWeight: '500' },
});
