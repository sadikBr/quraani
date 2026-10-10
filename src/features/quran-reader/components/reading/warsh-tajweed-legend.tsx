import { useState } from 'react';
import { Pressable, View } from 'react-native';
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

export function WarshTajweedLegend({ palette, dark }: { palette: ReaderPalette; dark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('reader.warshLegend.title')} accessibilityState={{ expanded }}
      onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
      <ReaderIcon name="book" color={palette.primary} size={18} />
      <Text style={{ color: palette.primary, fontSize: 13, flex: 1 }}>{t('reader.warshLegend.title')}</Text>
      <Text style={{ color: palette.mutedForeground, fontSize: 18 }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <View style={{ gap: 10, paddingVertical: 12 }}>
      {meanings.map(([rule, label]) => <View key={rule} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: tajweedColor(rule, dark, palette.foreground) }} />
        <Text style={{ color: palette.foreground, fontSize: 13, flex: 1 }}>{t(`reader.warshLegend.rules.${label}`)}</Text>
      </View>)}
      <Text style={{ color: palette.mutedForeground, fontSize: 11, lineHeight: 20 }}>{t('reader.warshLegend.note')}</Text>
    </View>}
  </View>;
}
