import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { tajweedColor } from '../../utils/tajweed';
import { ReaderIcon } from '../ui/reader-chrome';

const meanings = [
  ['madda_normal', 'مد طبيعي أو عارض للسكون'], ['madda_permissible', 'مد منفصل أو بدل أو لين مهموز'],
  ['madda_obligatory', 'مد متصل'], ['madda_necessary', 'مد لازم'],
  ['ghn', 'غنة'], ['idgh_ghn', 'إدغام'], ['ikhf', 'إخفاء حقيقي'],
  ['ikhf_shfw', 'إخفاء شفوي'], ['iqlb', 'إقلاب'], ['qlq', 'قلقلة'],
  ['warsh_naql', 'نقل أو إبدال الهمز'], ['warsh_tashil', 'تسهيل الهمز'],
  ['warsh_taqlil', 'تقليل أو إمالة'], ['warsh_ra', 'ترقيق الراء'],
  ['warsh_lam', 'تغليظ اللام'], ['slnt', 'حرف غير منطوق'],
] as const;

export function WarshTajweedLegend({ palette, dark }: { palette: ReaderPalette; dark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="دليل ألوان ورش" accessibilityState={{ expanded }}
      onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
      <ReaderIcon name="book" color={palette.primary} size={18} />
      <Text style={{ color: palette.primary, fontSize: 13, flex: 1 }}>دليل ألوان ورش</Text>
      <Text style={{ color: palette.mutedForeground, fontSize: 18 }}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <View style={{ gap: 10, paddingVertical: 12 }}>
      {meanings.map(([rule, label]) => <View key={rule} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: tajweedColor(rule, dark, palette.foreground) }} />
        <Text style={{ color: palette.foreground, fontSize: 13, flex: 1 }}>{label}</Text>
      </View>)}
      <Text style={{ color: palette.mutedForeground, fontSize: 11, lineHeight: 20 }}>قد يجتمع أكثر من حكم في الحرف؛ يُعرض لون واحد للتوضيح. اللون لا يحدد عدد حركات المد.</Text>
    </View>}
  </View>;
}
