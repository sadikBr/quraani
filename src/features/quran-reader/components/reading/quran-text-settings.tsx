import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Tabs } from '@/components/ui';
import { t } from '@/i18n';
import type { ReaderPalette } from '../../theme';
import { readerShape, withAlpha } from '../../design';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import type { WarshScript } from '../../utils/quran-script';
import { readerFontLabel, readerFontStep, readerFontSteps, snapReaderFontSize } from '../../utils/reader-typography';
import { ReaderFontSlider } from './reader-font-slider';
import { SettingsCard, SettingsToggle } from './settings-ui';
import { TextPreview } from './text-preview';
import { WarshTajweedLegend } from './warsh-tajweed-legend';

const SCRIPTS: readonly WarshScript[] = ['maghribi', 'mashriqi'];
const toSize = (step: number) => readerFontSteps[Math.max(0, Math.min(readerFontSteps.length - 1, Math.round(step)))];

/**
 * How the Quran text looks, wherever it is set as text: one live preview, then the choices it
 * shows: the letter style (Warsh), tajweed colours and, for the text mode, size, spacing and the
 * ayah layout. On a wide screen the preview sits beside them.
 */
export function QuranTextSettings({ palette: p }: { palette: ReaderPalette }) {
  const { preferences, update, dark } = useReadingPreferences();
  const { mode, textLayout, riwayah, warshScript, spacious, fontSize, tajweed } = preferences;
  // A size being dragged shows in the preview at once and is saved on release, so the reader and
  // storage don't update on every gesture event. A change made elsewhere still wins.
  const [draft, setDraft] = useState({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  if (draft.saved !== fontSize) setDraft({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  const step = readerFontStep(draft.size);
  const [wide, setWide] = useState(false);
  const textMode = mode === 'text';
  return <SettingsCard palette={p}>
    <View onLayout={(event) => setWide(event.nativeEvent.layout.width >= 620)} style={[styles.body, wide && styles.wide]}>
      <View style={wide ? { flex: 1.15, minWidth: 0 } : undefined}>
        <TextPreview palette={p} fontSize={draft.size} spacious={spacious} textLayout={textLayout} />
      </View>
      <View style={[styles.rows, wide && { flex: 1 }]}>
        {riwayah === 'warsh' && <Row title={t('settings.warshScript.title')} detail={t(`settings.warshScript.${warshScript}.detail`)} palette={p} first={wide}>
          <Tabs palette={p} role="radio" label={t('settings.warshScript.title')} value={warshScript} onChange={(value) => update({ warshScript: value })}
            options={SCRIPTS.map((script) => ({ value: script, label: t(`settings.warshScript.${script}.label`),
              // The letters Warsh's own mushafs are written in, shown as the one to choose.
              ...(script === 'maghribi' && { hint: t('settings.warshScript.recommended'), badge: <Text style={[styles.recommended, { color: p.success, backgroundColor: withAlpha(p.success, 0.12) }]}>{t('settings.warshScript.recommended')}</Text> }) }))} />
        </Row>}
        <View style={[styles.row, { borderColor: p.border }, wide && riwayah !== 'warsh' && styles.first]}>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: tajweed }} aria-checked={tajweed} accessibilityLabel={t('settings.tajweed.title')}
            onPress={() => update({ tajweed: !tajweed })} style={({ pressed }) => [styles.switch, { opacity: pressed ? 0.65 : 1 }]}>
            <View style={[styles.colors, { backgroundColor: p.muted }]}>{['#537fff', '#dd5359', '#50a86b'].map((color, i) => <View key={color} style={{ width: 4, height: 12 + i * 4, backgroundColor: color, borderRadius: 2 }} />)}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('settings.tajweed.title')}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{riwayah === 'warsh' ? t('settings.tajweed.warshDetail') : t('settings.tajweed.hafsDetail')}</Text>
            </View>
            <SettingsToggle checked={tajweed} palette={p} />
          </Pressable>
          {riwayah === 'warsh' && tajweed && <View>
            <WarshTajweedLegend palette={p} dark={dark} />
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.tajweed.stopNote')}</Text>
          </View>}
        </View>
        {textMode && <>
          <Row title={t('settings.fontSize.label')} value={readerFontLabel(step)} palette={p}>
            <View style={styles.slider}>
              <ReaderFontSlider value={readerFontStep(fontSize)} previewValue={step} palette={p}
                onPreview={(next) => setDraft({ saved: fontSize, size: toSize(next) })}
                onCommit={(next) => { const size = toSize(next); if (size !== fontSize) update({ fontSize: size }); }} />
              <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.ticks} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
                {readerFontSteps.map((size, index) => <View key={size} style={[styles.tick, { backgroundColor: index <= step ? p.primary : p.mutedForeground }]} />)}
              </View>
              <View style={styles.rangeLabels}>
                <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeSmall')}</Text>
                <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeLarge')}</Text>
              </View>
            </View>
          </Row>
          <Row title={t('settings.textComfort.lineSpacing')} palette={p}>
            <Tabs palette={p} role="radio" label={t('settings.textComfort.lineSpacing')} value={spacious ? 'spacious' : 'normal'} onChange={(value) => update({ spacious: value === 'spacious' })}
              options={[{ value: 'normal', label: t('settings.textComfort.spacing.normal') }, { value: 'spacious', label: t('settings.textComfort.spacing.spacious') }] as const} />
          </Row>
          <Row title={t('settings.textLayout.title')} detail={textLayout === 'ayah' ? t('settings.textLayout.ayahDetail') : t('settings.textLayout.flowingDetail')} palette={p}>
            <Tabs palette={p} role="radio" label={t('settings.textLayout.label')} value={textLayout} onChange={(value) => update({ textLayout: value })}
              options={[{ value: 'ayah', label: t('settings.textLayout.ayah') }, { value: 'flowing', label: t('settings.textLayout.flowing') }] as const} />
          </Row>
        </>}
      </View>
    </View>
  </SettingsCard>;
}

/** A choice under the preview: its name (and current value), the control, and what it means. */
function Row({ title, value, detail, first, palette: p, children }: { title: string; value?: string; detail?: string; first?: boolean; palette: ReaderPalette; children: ReactNode }) {
  return <View style={[styles.row, { borderColor: p.border }, first && styles.first]}>
    <View style={styles.rowHeading}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      {!!value && <Text accessibilityLiveRegion="polite" style={[styles.value, { color: p.secondaryForeground, backgroundColor: p.secondary }]}>{value}</Text>}
    </View>
    {children}
    {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{detail}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 20 }, wide: { flexDirection: 'row', alignItems: 'flex-start' },
  rows: { minWidth: 0, gap: 20 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 10 },
  // Beside the preview, the first choice needs no rule above it.
  first: { borderTopWidth: 0, paddingTop: 0 },
  rowHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { fontSize: 12, lineHeight: 20, paddingHorizontal: 8, paddingVertical: 1, borderRadius: readerShape.pill, overflow: 'hidden', textAlign: 'center' },
  recommended: { fontSize: 11, lineHeight: 18, fontWeight: '600', paddingHorizontal: 7, borderRadius: readerShape.pill, overflow: 'hidden' },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  colors: { width: 40, height: 40, borderRadius: readerShape.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  slider: { paddingHorizontal: 2 },
  ticks: { flexDirection: 'row-reverse', ...Platform.select({ native: { direction: 'ltr' as const } }), justifyContent: 'space-between', marginHorizontal: 12, marginTop: -2 },
  tick: { width: 4, height: 4, borderRadius: 2 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
