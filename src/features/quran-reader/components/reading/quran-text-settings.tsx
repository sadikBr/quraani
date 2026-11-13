import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { SwitchMark, Tabs } from '@/components/ui';
import { Row, RowGroup } from '@/components/craft/page';
import { t } from '@/i18n';
import type { ReaderPalette } from '../../theme';
import { readerShape, withAlpha } from '../../design';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import type { WarshScript } from '../../utils/quran-script';
import { readerFontLabel, readerFontStep, readerFontSteps, snapReaderFontSize } from '../../utils/reader-typography';
import { tajweedColor } from '../../utils/tajweed';
import { ReaderFontSlider } from './reader-font-slider';
import { SettingBlock, settingsStyles } from './settings-ui';
import { TextPreview } from './text-preview';
import { WarshTajweedLegend } from './warsh-tajweed-legend';

const SCRIPTS: readonly WarshScript[] = ['maghribi', 'mashriqi'];
const toSize = (step: number) => readerFontSteps[Math.max(0, Math.min(readerFontSteps.length - 1, Math.round(step)))];

/**
 * How the Quran text looks, wherever it is set as text: the text written on a lawh as the reader
 * would set it, then the choices it shows, as rows on one card: the letter style (Warsh), tajweed
 * colours and, for the text mode, size, spacing and the ayah layout. On a wide screen the lawh
 * sits beside them.
 */
export function QuranTextSettings({ palette: p }: { palette: ReaderPalette }) {
  const { preferences, update, dark } = useReadingPreferences();
  const { mode, textLayout, riwayah, warshScript, spacious, fontSize, tajweed, tajweedRules } = preferences;
  // A size being dragged shows in the preview at once and is saved on release, so the reader and
  // storage don't update on every gesture event. A change made elsewhere still wins.
  const [draft, setDraft] = useState({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  if (draft.saved !== fontSize) setDraft({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  const step = readerFontStep(draft.size);
  const [wide, setWide] = useState(false);
  const textMode = mode === 'text';
  return <View onLayout={(event) => setWide(event.nativeEvent.layout.width >= 620)} style={[styles.body, wide && styles.wide]}>
    <View style={wide ? { flex: 1.15, minWidth: 0 } : undefined}>
      <TextPreview palette={p} fontSize={draft.size} spacious={spacious} textLayout={textLayout} />
    </View>
    <RowGroup palette={p} style={wide ? { flex: 1 } : undefined}>
      {riwayah === 'warsh' && <SettingBlock key="script" title={t('settings.warshScript.title')} detail={t(`settings.warshScript.${warshScript}.detail`)} palette={p}>
        <Tabs palette={p} role="radio" label={t('settings.warshScript.title')} value={warshScript} onChange={(value) => update({ warshScript: value })}
          options={SCRIPTS.map((script) => ({ value: script, label: t(`settings.warshScript.${script}.label`),
            // The letters Warsh's own mushafs are written in, shown as the one to choose.
            ...(script === 'maghribi' && { hint: t('settings.warshScript.recommended'), badge: <Text style={[styles.recommended, { color: p.success, backgroundColor: withAlpha(p.success, 0.12) }]}>{t('settings.warshScript.recommended')}</Text> }) }))} />
      </SettingBlock>}
      <Row key="tajweed" title={t('settings.tajweed.title')} detail={riwayah === 'warsh' ? t('settings.tajweed.warshDetail') : t('settings.tajweed.hafsDetail')}
        label={t('settings.tajweed.title')} role="switch" selected={tajweed} onPress={() => update({ tajweed: !tajweed })}
        leading={<TajweedInks palette={p} dark={dark} />} trailing={<SwitchMark checked={tajweed} palette={p} />} palette={p} />
      {tajweed && textMode && <Row key="rules" title={t('settings.tajweed.rules')} detail={t('settings.tajweed.rulesDetail')}
        label={t('settings.tajweed.rules')} role="switch" selected={tajweedRules} onPress={() => update({ tajweedRules: !tajweedRules })}
        trailing={<SwitchMark checked={tajweedRules} palette={p} />} palette={p} />}
      {riwayah === 'warsh' && tajweed && <View key="legend" style={[settingsStyles.block, { paddingVertical: 4, paddingBottom: 14 }]}>
        <WarshTajweedLegend palette={p} dark={dark} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19 }}>{t('settings.tajweed.stopNote')}</Text>
      </View>}
      {textMode && <SettingBlock key="size" title={t('settings.fontSize.label')} value={readerFontLabel(step)} palette={p}>
        <View>
          <ReaderFontSlider value={readerFontStep(fontSize)} previewValue={step} palette={p}
            onPreview={(next) => setDraft({ saved: fontSize, size: toSize(next) })}
            onCommit={(next) => { const size = toSize(next); if (size !== fontSize) update({ fontSize: size }); }} />
          {/* The seven sizes, each a little taller than the last, filled in gold up to the one chosen. */}
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.ticks} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
            {readerFontSteps.map((size, index) => <View key={size} style={[styles.tick, { height: 5 + index * 2, backgroundColor: index <= step ? p.ornament : withAlpha(p.mutedForeground, 0.3) }]} />)}
          </View>
          <View style={styles.rangeLabels}>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeSmall')}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeLarge')}</Text>
          </View>
        </View>
      </SettingBlock>}
      {textMode && <SettingBlock key="spacing" title={t('settings.textComfort.lineSpacing')} palette={p}>
        <Tabs palette={p} role="radio" label={t('settings.textComfort.lineSpacing')} value={spacious ? 'spacious' : 'normal'} onChange={(value) => update({ spacious: value === 'spacious' })}
          options={[{ value: 'normal', label: t('settings.textComfort.spacing.normal') }, { value: 'spacious', label: t('settings.textComfort.spacing.spacious') }] as const} />
      </SettingBlock>}
      {textMode && <SettingBlock key="layout" title={t('settings.textLayout.title')} detail={textLayout === 'ayah' ? t('settings.textLayout.ayahDetail') : t('settings.textLayout.flowingDetail')} palette={p}>
        <Tabs palette={p} role="radio" label={t('settings.textLayout.label')} value={textLayout} onChange={(value) => update({ textLayout: value })}
          options={[{ value: 'ayah', label: t('settings.textLayout.ayah') }, { value: 'flowing', label: t('settings.textLayout.flowing') }] as const} />
      </SettingBlock>}
    </RowGroup>
  </View>;
}

/** The tajweed row's mark: three strokes in the tajweed colours themselves (a madd, a ghunna, a qalqala), on the gold tile of a row. */
function TajweedInks({ palette: p, dark }: { palette: ReaderPalette; dark: boolean }) {
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.inks, { backgroundColor: withAlpha(p.ornament, 0.12) }]}>
    {['madda_normal', 'ghn', 'qlq'].map((rule, i) => <View key={rule} style={{ width: 4, height: 12 + i * 4, borderRadius: 2, backgroundColor: tajweedColor(rule, dark, p.foreground) }} />)}
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 16 }, wide: { flexDirection: 'row', alignItems: 'flex-start' },
  recommended: { fontSize: 11, lineHeight: 18, fontWeight: '600', paddingHorizontal: 7, borderRadius: readerShape.pill, overflow: 'hidden' },
  inks: { width: 40, height: 40, borderRadius: readerShape.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  // Laid from the right like the slider (smallest at the reading start), centred under its stops.
  ticks: { flexDirection: 'row-reverse', ...Platform.select({ native: { direction: 'ltr' as const } }), alignItems: 'flex-end', justifyContent: 'space-between', height: 18, marginTop: -6,
    // The thumb's centre at either end: 11px in from the web's range input, about 14 on the native slider.
    marginHorizontal: Platform.OS === 'web' ? 9.5 : 12.5 },
  tick: { width: 3, borderRadius: 2 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
