import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchTile, artColors, Emblem } from '@/components/craft/art';
import { t } from '@/i18n';
import { contrastRatio, withAlpha } from '../../../design';
import type { ReaderPalette } from '../../../theme';
import type { Science, ScienceGroup } from './sciences';

const GAP = 8, ROW = 42, HEAD = 36, FOOT = 14, MEDALLION = 15;

/**
 * The ayah's sciences as an arcade of three arches, as the riwaq of a Maghribi mosque: each arch a
 * door holding the names of what it opens, under its emblem and its name; the middle one rises
 * above the others. An arch shows only what the ayah has.
 */
export function Arcade({ groups, palette: p, onOpen }: {
  groups: { group: ScienceGroup; sciences: Science[] }[]; palette: ReaderPalette; onOpen: (science: Science) => void;
}) {
  const [width, setWidth] = useState(0);
  // What each door holds, measured: a name may take two lines, at a large text size more.
  const [inside, setInside] = useState<Record<string, number>>({});
  const shown = groups.filter((entry) => entry.sciences.length);
  const count = shown.length;
  const w = count ? Math.floor((width - GAP * (count - 1)) / count) : 0;
  const rise = Math.round(Math.min(64, w * 0.5)), lift = count === 3 ? 14 : 0;
  const rows = Math.max(1, ...shown.map((entry) => entry.sciences.length));
  const content = Math.max(HEAD + rows * ROW, ...shown.map((entry) => inside[entry.group.id] ?? 0));
  const height = rise + lift + 2 + content + FOOT;
  const colors = artColors(p);
  // The arch's name in the theme's gold, unless the gold is too close to the tile to be read.
  const heading = contrastRatio(p.ornament, colors.surface) >= 3 ? p.ornament : colors.ink;
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[s.arcade, { height: width ? height : undefined }]}>
    {w > 0 && shown.map(({ group, sciences }, i) => {
      const middle = count === 3 && i === 1;
      const r = rise + (middle ? lift : 0), h = height - (middle ? 0 : lift), focus = Math.round(r * 0.6);
      return <View key={group.id} style={{ width: w, height: h, marginTop: middle ? 0 : lift }}>
        <View style={StyleSheet.absoluteFill}>
          <ArchTile w={w} h={h} rise={r} motif={group.motif} palette={p} focus={focus} medallion={MEDALLION} faded={Math.min(0.62, (r + 2) / h)} />
        </View>
        <View aria-hidden style={[s.emblem, { top: focus - MEDALLION, left: w / 2 - MEDALLION }]}>
          <Emblem name={group.emblem} size={18} color={colors.edge} />
        </View>
        <View style={[s.door, { top: r + 2 }]} onLayout={(event) => {
          const measured = Math.ceil(event.nativeEvent.layout.height);
          if (Math.abs((inside[group.id] ?? 0) - measured) > 1) setInside((all) => ({ ...all, [group.id]: measured }));
        }}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[s.title, { color: heading }]}>{t(`reader.sciences.groups.${group.id}`)}</Text>
          <View style={[s.rule, { backgroundColor: colors.line }]} />
          {sciences.map((science, j) => <Fragment key={science}>
            {j > 0 && <View aria-hidden style={[s.dot, { backgroundColor: colors.line }]} />}
            <Pressable accessibilityRole="button" accessibilityLabel={t(`reader.sciences.names.${science}`)} accessibilityHint={t(`reader.sciences.hints.${science}`)}
              onPress={() => onOpen(science)} style={({ pressed }) => [s.science, { backgroundColor: pressed ? withAlpha(colors.ink, 0.14) : 'transparent' }]}>
              <Text maxFontSizeMultiplier={1.4} style={[s.name, { color: colors.ink }]}>{t(`reader.sciences.names.${science}`)}</Text>
            </Pressable>
          </Fragment>)}
        </View>
      </View>;
    })}
  </View>;
}

const s = StyleSheet.create({
  arcade: { flexDirection: 'row', gap: GAP, alignItems: 'flex-start' },
  emblem: { position: 'absolute', width: MEDALLION * 2, height: MEDALLION * 2, alignItems: 'center', justifyContent: 'center' },
  door: { position: 'absolute', left: 0, right: 0, alignItems: 'stretch', paddingHorizontal: 7 },
  title: { fontSize: 14, lineHeight: 22, fontFamily: 'ReaderNaskhBold', textAlign: 'center' },
  rule: { alignSelf: 'center', width: 28, height: StyleSheet.hairlineWidth, marginTop: 5, marginBottom: 3 },
  dot: { alignSelf: 'center', width: 3, height: 3, borderRadius: 1.5, marginVertical: -1.5 },
  science: { minHeight: ROW - 3, paddingVertical: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  name: { fontSize: 15, lineHeight: 22, fontFamily: 'ReaderNaskhSemibold', textAlign: 'center' },
});
