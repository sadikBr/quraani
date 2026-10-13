import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { Segments } from '@/features/quran-reader/components/ui/reader-chrome';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-icon';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { PersonPhoto } from '@/features/account/avatar';
import { initialOf } from '@/features/account/profile';
import { formatList, formatNumber, t } from '@/i18n';

export interface BoardRow { key: string; name: string; photo?: string; cacheKey?: string; total: number; recent: number; me?: boolean }
type Period = 'recent' | 'total';

/**
 * Everyone's points, ranked: this month's or all of them, each with their place in a star (the
 * first filled with gold), their photo and name, and their points. The one reading is marked.
 * How points are counted is a tap away.
 */
export function Scoreboard({ rows, palette: p }: { rows: BoardRow[]; palette: ReaderPalette }) {
  const [period, setPeriod] = useState<Period>('recent');
  const [how, setHow] = useState(false);
  const sorted = [...rows].sort((a, b) => b[period] - a[period] || a.name.localeCompare(b.name, 'ar'));
  // Equal points, equal place.
  const rankOf = (row: BoardRow) => 1 + sorted.filter((x) => x[period] > row[period]).length;
  const none = rows.every((r) => !r[period]);
  return <View style={{ gap: 12 }}>
    <Segments palette={p} value={period} onChange={setPeriod}
      options={[{ value: 'recent', label: t('halaqat.sharing.month') }, { value: 'total', label: t('halaqat.sharing.all') }]} />
    <View style={[s.board, { backgroundColor: p.card, borderColor: p.border }]}>
      {sorted.map((row, i) => {
        const rank = rankOf(row), points = row[period];
        const name = row.me ? t('halaqat.me.you', { name: row.name }) : row.name;
        return <View key={row.key} accessible accessibilityLabel={formatList([t('halaqat.sharing.rank', { rank }), name, t('halaqat.sharing.points', { count: points })])}
          style={[s.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, row.me && { backgroundColor: withAlpha(p.ornament, 0.08) }]}>
          <Medallion value={rank} size={34} palette={p} current={rank === 1 && points > 0} />
          <PersonPhoto size={34} photo={row.photo} cacheKey={row.cacheKey} initial={initialOf(row.name, t('halaqat.sharing.noInitial'))} palette={p} />
          <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: p.foreground, fontSize: 15, fontWeight: row.me ? '700' : '500' }}>{name}</Text>
          <View style={{ alignItems: 'center', minWidth: 44 }}>
            <Text style={{ color: points ? p.foreground : p.mutedForeground, fontSize: 18, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(points)}</Text>
          </View>
        </View>;
      })}
    </View>
    {none && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('halaqat.sharing.noPoints')}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((x) => !x)} hitSlop={6}
      style={({ pressed }) => [s.how, { opacity: pressed ? 0.7 : 1 }]}>
      <ReaderIcon name="info" color={p.mutedForeground} size={14} />
      <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('halaqat.sharing.howTitle')}</Text>
    </Pressable>
    {how && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('halaqat.sharing.how')}</Text>}
  </View>;
}

const s = StyleSheet.create({
  board: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 54 },
  how: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
});
