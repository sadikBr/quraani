import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { tajweedColor } from '../../utils/tajweed';
import { ReaderIcon } from '../ui/reader-chrome';
import { t } from '@/i18n';

// Tajweed rule ids and the message that names each one in the legend.
const meanings = [
  ['madda_normal', 'maddaNormal'], ['madda_permissible', 'maddaPermissible'],
  ['madda_obligatory', 'maddaObligatory'], ['madda_necessary', 'maddaNecessary'],
  ['ghn', 'ghunna'], ['idgh_ghn', 'idgham'], ['ikhf', 'ikhfa'],
  ['ikhf_shfw', 'ikhfaShafawi'], ['iqlb', 'iqlab'], ['qlq', 'qalqala'],
  ['warsh_naql', 'naql'], ['warsh_tashil', 'tashil'],
  ['warsh_taqlil', 'taqlil'], ['warsh_ra', 'raTarqiq'],
  ['warsh_lam', 'lamTaghliz'], ['slnt', 'silent'],
] as const;

/** The Warsh colours and the rule each one marks, folded away under its title until asked for. */
export function WarshTajweedLegend({ palette, dark }: { palette: ReaderPalette; dark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('reader.warshLegend.title')} accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setExpanded(!expanded)} style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={styles.drops} aria-hidden>
        {['madda_necessary', 'ikhf', 'warsh_taqlil'].map((rule) => <View key={rule} style={[styles.drop, { backgroundColor: tajweedColor(rule, dark, palette.foreground) }]} />)}
      </View>
      <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '600', flex: 1 }}>{t('reader.warshLegend.title')}</Text>
      <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}><ReaderIcon name="chevron-down" color={palette.mutedForeground} size={16} /></View>
    </Pressable>
    {expanded && <View style={{ gap: 12, paddingTop: 4, paddingBottom: 4 }}>
      <View style={styles.grid}>
        {meanings.map(([rule, label]) => <View key={rule} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: tajweedColor(rule, dark, palette.foreground) }]} />
          <Text style={{ color: palette.foreground, fontSize: 13, lineHeight: 20, flex: 1 }}>{t(`reader.warshLegend.rules.${label}`)}</Text>
        </View>)}
      </View>
      <Text style={{ color: palette.mutedForeground, fontSize: 12, lineHeight: 19 }}>{t('reader.warshLegend.note')}</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  drops: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 26 },
  drop: { width: 6, height: 6, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  item: { width: '50%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingEnd: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3, marginTop: 4 },
});
