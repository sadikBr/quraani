import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArabicText } from '@/components/arabic-text';
import { t } from '@/i18n';
import type { ReaderPalette } from '../../theme';
import { readerShape } from '../../design';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { quranScript, type WarshScript } from '../../utils/quran-script';
import { SettingsCard, SettingsCardHeading, SettingsSelection } from './settings-ui';

// eslint-disable-next-line no-restricted-syntax -- Quran text (Al-Mulk 10 in the Warsh edition), shown in each script.
const SAMPLE = 'فَكَذَّبْنَا وَقُلْنَا';
const SCRIPTS: readonly WarshScript[] = ['maghribi', 'mashriqi'];

/**
 * Warsh only: the letters drawn as in the Maghrib (the Warsh font) or as in the East (the Madinah
 * mushaf's font), each shown on a phrase of the Warsh text. The printed pages keep their letters.
 */
export function WarshScriptCard({ palette: p }: { palette: ReaderPalette }) {
  const { preferences, update } = useReadingPreferences();
  const { loaded } = useQuranFont();
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('settings.warshScript.title')} detail={t('settings.warshScript.detail')} icon="word" palette={p} />
    <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.warshScript.title')} style={styles.row}>
      {SCRIPTS.map((script) => {
        const selected = preferences.warshScript === script;
        const { fontFamily, display } = quranScript('warsh', script);
        return <Pressable key={script} accessibilityRole="radio" accessibilityLabel={t(`settings.warshScript.${script}.label`)} accessibilityHint={t(`settings.warshScript.${script}.detail`)}
          accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => update({ warshScript: script })}
          style={({ pressed }) => [styles.choice, { backgroundColor: pressed ? p.accent : p.background, borderColor: selected ? p.primary : p.input }]}>
          <View style={styles.top}><SettingsSelection palette={p} selected={selected} /></View>
          {loaded && <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.sample, { fontFamily, color: p.foreground }]}>{display(SAMPLE)}</Text>}
          <ArabicText style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t(`settings.warshScript.${script}.label`)}</ArabicText>
          <ArabicText style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19 }}>{t(`settings.warshScript.${script}.detail`)}</ArabicText>
        </Pressable>;
      })}
    </View>
    <ArabicText style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('settings.warshScript.pagesNote')}</ArabicText>
  </SettingsCard>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  // A constant 1.5 border keeps the layout still when the accent colour marks the selection.
  choice: { flex: 1, minWidth: 0, gap: 4, borderWidth: 1.5, borderRadius: readerShape.lg, paddingHorizontal: 12, paddingVertical: 12 },
  top: { flexDirection: 'row-reverse', marginBottom: 2 },
  sample: { fontSize: 24, lineHeight: 46, textAlign: 'center', writingDirection: 'rtl', includeFontPadding: true },
});
