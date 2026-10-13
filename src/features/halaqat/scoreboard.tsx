import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchTile, artColors } from '@/components/craft/art';
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
 * Everyone's points, ranked: this month's or all of them. The first three stand on a podium of
 * arched steps; the others follow, each with their place in a star, their photo and name, and
 * their points. The one reading is marked.
 * How points are counted is a tap away.
 */
export function Scoreboard({ rows, palette: p }: { rows: BoardRow[]; palette: ReaderPalette }) {
  const [period, setPeriod] = useState<Period>('recent');
  const [how, setHow] = useState(false);
  const sorted = [...rows].sort((a, b) => b[period] - a[period] || a.name.localeCompare(b.name, 'ar'));
  // Equal points, equal place.
  const rankOf = (row: BoardRow) => 1 + sorted.filter((x) => x[period] > row[period]).length;
  const none = rows.every((r) => !r[period]);
  // The first three on a podium once anyone has points, the others listed under it.
  const podium = !none && sorted.length >= 3;
  const rest = podium ? sorted.slice(3) : sorted;
  return <View style={{ gap: 12 }}>
    <Segments palette={p} value={period} onChange={setPeriod}
      options={[{ value: 'recent', label: t('halaqat.sharing.month') }, { value: 'total', label: t('halaqat.sharing.all') }]} />
    {podium && <Podium rows={sorted.slice(0, 3)} rankOf={rankOf} period={period} palette={p} />}
    {rest.length > 0 && <View style={[s.board, { backgroundColor: p.card, borderColor: p.border }]}>
      {rest.map((row, i) => {
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
    </View>}
    {none && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('halaqat.sharing.noPoints')}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((x) => !x)} hitSlop={6}
      style={({ pressed }) => [s.how, { opacity: pressed ? 0.7 : 1 }]}>
      <ReaderIcon name="info" color={p.mutedForeground} size={14} />
      <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('halaqat.sharing.howTitle')}</Text>
    </Pressable>
    {how && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('halaqat.sharing.how')}</Text>}
  </View>;
}

/** Each place's step: the first the tallest. */
const STEPS = [104, 84, 70];

/**
 * The first three, each over an arched step with their place in its medallion: the first in the
 * middle and tallest, the second at the reading start, the third after it. Over each step, their
 * photo (the first ringed with gold), their name and their points.
 */
function Podium({ rows, rankOf, period, palette: p }: { rows: BoardRow[]; rankOf: (row: BoardRow) => number; period: Period; palette: ReaderPalette }) {
  const [width, setWidth] = useState(0);
  const colors = artColors(p);
  const column = Math.min(112, (width - 16) / 3);
  // The second, the first, then the third, from the reading start.
  const order = [rows[1], rows[0], rows[2]];
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={s.podium}>
    {width > 0 && order.map((row) => {
      const place = rows.indexOf(row), rank = rankOf(row), points = row[period];
      const name = row.me ? t('halaqat.me.you', { name: row.name }) : row.name;
      const h = STEPS[place], rise = Math.round(column * 0.42), focus = Math.round(rise + (h - rise) * 0.38);
      const first = place === 0;
      return <View key={row.key} accessible accessibilityLabel={formatList([t('halaqat.sharing.rank', { rank }), name, t('halaqat.sharing.points', { count: points })])}
        style={{ width: column, alignItems: 'center', gap: 2 }}>
        <View style={[s.portrait, { borderColor: first ? p.ornament : 'transparent', borderRadius: (first ? 56 : 46) / 2 + 3 }]}>
          <PersonPhoto size={first ? 56 : 46} photo={row.photo} cacheKey={row.cacheKey} initial={initialOf(row.name, t('halaqat.sharing.noInitial'))} palette={p} />
        </View>
        <Text numberOfLines={1} style={{ maxWidth: column, color: p.foreground, fontSize: 13, lineHeight: 20, fontWeight: row.me ? '700' : '600', marginTop: 4 }}>{name}</Text>
        <Text style={{ color: points ? p.foreground : p.mutedForeground, fontSize: first ? 20 : 17, lineHeight: first ? 30 : 26, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(points)}</Text>
        <View style={{ width: column, height: h, marginTop: 4 }}>
          <ArchTile w={column} h={h} rise={rise} motif="circle" palette={p} focus={focus} medallion={first ? 17 : 15} faded={0.8} />
          <View style={[StyleSheet.absoluteFill, { top: focus - 16, height: 32, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: first ? p.ornament : colors.ink, fontSize: first ? 19 : 16, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(rank)}</Text>
          </View>
        </View>
      </View>;
    })}
  </View>;
}

const s = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, minHeight: 200 },
  portrait: { borderWidth: 2, padding: 1 },
  board: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 54 },
  how: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
});
