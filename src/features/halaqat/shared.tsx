import { Fragment, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import Svg, { Path } from 'react-native-svg';
import { GhostLines, Lawh, lawhColors } from '@/components/craft/lawh';
import { Cartouche } from '@/components/craft/marks';
import { SurahName } from '@/features/quran-reader/components/ui/surah-name';
import { Button } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import { weekdaysLabel } from '@/features/plans/recurring';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { usePlans } from '@/features/plans/provider';
import { memoryFor } from '@/features/plans/memorization';
import type { AyahSpan } from '@/features/plans/types';
import { rangeLabel, type PlanIndex } from '@/features/plans/engine';
import { formatList, t } from '@/i18n';
import { ATTENDANCE, portionAyahs, portionOf, shapeOf, spanOf, validPortion, type Attendance, type Grade, type Portion, type QuranShape, type Student, type Halaqa } from './model';

/**
 * A participant as the halaqa sees them: the phone's owner (`me`) knows what their own record
 * (محفوظك) holds, besides what they had when they joined.
 */
export function useLinkedStudent<T extends Student | undefined>(student: T, riwayah: Riwayah, index: PlanIndex | undefined, shape: QuranShape | undefined): T {
  const { memorization } = usePlans();
  if (!student?.me || !index || !shape) return student;
  let record: AyahSpan[] = [];
  try { record = memoryFor(memorization, riwayah, index); } catch { record = []; }
  return record.length ? { ...student, known: [...student.known, ...record.map((span) => portionOf(shape, span))] } : student;
}

/** The halaqa's edition, for its ayahs' texts, names and pages, and how its ayahs are counted. */
export function useHalaqaIndex(riwayah: Riwayah) {
  const { index, error, retry } = usePlanIndex(riwayah);
  const shape = useMemo(() => index ? shapeOf(index) : undefined, [index]);
  return { index, shape, error, retry };
}

const surahName = (index: PlanIndex, surah: number) => index.surahNames[surah] ?? '';

/** A portion in words: «سورة الملك ١١–٢٠», «سورة الملك كاملة», «من سورة الإخلاص إلى سورة الناس». */
export function portionLabel(index: PlanIndex, shape: QuranShape, portion: Portion): string {
  if (!validPortion(shape, portion)) return '';
  const { from, to } = portion;
  const wholeFrom = from.ayah === 1, wholeTo = to.ayah === shape.counts[to.surah - 1];
  if (from.surah === to.surah) {
    if (wholeFrom && wholeTo) return t('halaqat.portion.wholeSurah', { surah: surahName(index, from.surah) });
    if (from.ayah === to.ayah) return t('halaqat.portion.oneAyah', { surah: surahName(index, from.surah), ayah: from.ayah });
    return t('halaqat.portion.ayahs', { surah: surahName(index, from.surah), from: from.ayah, to: to.ayah });
  }
  if (wholeFrom && wholeTo) return t('halaqat.portion.surahs', { from: surahName(index, from.surah), to: surahName(index, to.surah) });
  return t('halaqat.portion.across', { fromSurah: surahName(index, from.surah), fromAyah: from.ayah, toSurah: surahName(index, to.surah), toAyah: to.ayah });
}

/** A portion's size and where it is: «٢٠ آية · الصفحات 562–563». */
export function portionDetail(index: PlanIndex, shape: QuranShape, portion: Portion): string {
  if (!validPortion(shape, portion)) return '';
  const span = spanOf(shape, portion);
  return formatList([t('halaqat.ayahCount', { count: portionAyahs(shape, portion) }), rangeLabel(index, span.start, span.end)]);
}

export const gradeTone = (p: ReaderPalette, grade: Grade) => ({ excellent: p.success, good: p.ornament, fair: p.warning, repeat: p.destructive })[grade];

/** A grade, in its colour. */
export function GradeMark({ grade, palette: p, label }: { grade: Grade; palette: ReaderPalette; label?: string }) {
  const tone = gradeTone(p, grade);
  return <View style={[s.grade, { backgroundColor: withAlpha(tone, 0.12), borderColor: withAlpha(tone, 0.35) }]}>
    <Text numberOfLines={1} style={{ color: tone, fontSize: 12, fontWeight: '600', lineHeight: 18 }}>{label ?? t(`halaqat.grades.${grade}`)}</Text>
  </View>;
}

export const attendanceTone = (p: ReaderPalette, attendance: Attendance) => ({ present: p.success, late: p.warning, excused: p.mutedForeground, absent: p.destructive })[attendance];

/** Whether a student came: four small choices in a row, the chosen one in its colour. */
export function AttendancePicker({ value, onChange, palette: p, name, compact = false }: {
  value: Attendance | undefined; onChange: (value: Attendance) => void; palette: ReaderPalette; name: string; compact?: boolean;
}) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('halaqat.attendance.label', { name })} style={[s.attendance, compact && { gap: 4 }]}>
    {ATTENDANCE.map((option) => {
      const selected = option === value, tone = attendanceTone(p, option);
      return <Pressable key={option} accessibilityRole="radio" accessibilityLabel={t(`halaqat.attendance.${option}`)} accessibilityState={{ checked: selected }} aria-checked={selected}
        onPress={() => onChange(option)} hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [s.attendanceOption, compact && s.attendanceCompact, {
          borderColor: selected ? tone : p.input, backgroundColor: selected ? withAlpha(tone, 0.14) : pressed ? p.accent : p.background,
        }, !selected && readerElevation(1, p)]}>
        <Text numberOfLines={1} style={{ color: selected ? tone : p.mutedForeground, fontSize: compact ? 12 : 13, fontWeight: selected ? '700' : '500', textAlign: 'center' }}>
          {t(`halaqat.attendance.${option}`)}
        </Text>
      </Pressable>;
    })}
  </View>;
}

/** A line written on a participant's lawh: what it is, the portion (or what stands for none), and the ways to change it. */
export interface LawhLine {
  title: string; portion: Portion | undefined; emptyText: string;
  onChange?: () => void; onClear?: () => void;
}

/**
 * A participant's lawh, as in the kuttab: one board with what they are given written on it (the
 * new portion, then the revision), side by side with a dotted rule between them where the board
 * is wide enough, one under the other where it is not. Each says what it is; then its surah's name
 * in calligraphy in the mushaf's title frame, the ayahs under it, and its size; or, with none, the
 * board wiped (dotted lines) and the words for none. The way to change it (or give one) is under
 * it. `tone` colours the board's edge (a grade).
 */
export function LawhBoard({ lines, index, shape, palette: p, tone }: {
  lines: LawhLine[]; index: PlanIndex; shape: QuranShape; palette: ReaderPalette; tone?: string;
}) {
  const [width, setWidth] = useState(0);
  // Side by side while each half keeps room for a surah's frame.
  const split = lines.length > 1 && (width - RULE) / lines.length >= 132;
  const column = split ? (width - RULE * (lines.length - 1)) / lines.length : width;
  return <Lawh palette={p} tone={tone} contentStyle={{ paddingTop: 40, paddingBottom: 18, paddingHorizontal: 12 }}>
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: split ? 'row' : 'column', minHeight: 40 }}>
      {width > 0 && lines.map((line, i) => <Fragment key={line.title}>
        {i > 0 && (split ? <LawhRule palette={p} vertical /> : <LawhRule palette={p} />)}
        <LawhColumn line={line} index={index} shape={shape} width={column} large={lines.length === 1} palette={p} />
      </Fragment>)}
    </View>
  </Lawh>;
}

/** The room a rule between two halves of a lawh takes. */
const RULE = 17;

function LawhColumn({ line, index, shape, width, large, palette: p }: {
  line: LawhLine; index: PlanIndex; shape: QuranShape; width: number; large: boolean; palette: ReaderPalette;
}) {
  const valid = validPortion(shape, line.portion);
  const frame = large ? { width: Math.min(232, width - 8), height: 58 } : { width: Math.min(140, width - 6), height: 46 };
  return <View style={{ width, alignItems: 'center', gap: 6 }}>
    <Text style={{ color: p.ornament, fontSize: 12, fontWeight: '700', lineHeight: 18 }}>{line.title}</Text>
    <View accessible accessibilityLabel={formatList([line.title, ...(valid ? [portionLabel(index, shape, line.portion!), portionDetail(index, shape, line.portion!)] : [line.emptyText])])}
      style={{ alignItems: 'center', gap: 4, alignSelf: 'stretch' }}>
      {valid ? <>
        <PortionFigure portion={line.portion!} index={index} shape={shape} frame={frame} palette={p} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{portionDetail(index, shape, line.portion!)}</Text>
      </> : <>
        <GhostLines lines={2} palette={p} width="78%" />
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{line.emptyText}</Text>
      </>}
    </View>
    {(line.onChange || (valid && line.onClear)) && <View style={s.lineActions}>
      {line.onChange && (valid
        ? <Button size="sm" variant="outline" icon="pencil" palette={p} onPress={line.onChange} label={t('halaqat.portion.changeLabel', { title: line.title })}>{t('halaqat.portion.change')}</Button>
        : <Button size="sm" variant="outline" icon="plus" palette={p} onPress={line.onChange} label={t('halaqat.portion.chooseLabel', { title: line.title })}>{t('halaqat.portion.choose')}</Button>)}
      {valid && line.onClear && <Button size="sm" variant="ghost" icon="close" palette={p} onPress={line.onClear} label={t('halaqat.portion.clearLabel', { title: line.title })} />}
    </View>}
  </View>;
}

/**
 * A portion as the mushaf heads it: its surah's name in calligraphy in a title frame, and its ayahs
 * under it («الآيات ٣١–٤٠», «كاملة»); across surahs, each surah's frame, «إلى» between them.
 */
function PortionFigure({ portion, index, shape, frame, palette: p }: {
  portion: Portion; index: PlanIndex; shape: QuranShape; frame: { width: number; height: number }; palette: ReaderPalette;
}) {
  const { from, to } = portion;
  const wholeFrom = from.ayah === 1, wholeTo = to.ayah === shape.counts[to.surah - 1];
  const name = (surah: number) => <Cartouche width={frame.width} height={frame.height} palette={p} filled>
    <SurahName number={surah} name={index.surahNames[surah] ?? ''} size={Math.round(frame.height * 0.6)} color={p.ornament} align="center" />
  </Cartouche>;
  const ayahs = (text: string) => <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{text}</Text>;
  if (from.surah === to.surah) return <>
    {name(from.surah)}
    {ayahs(wholeFrom && wholeTo ? t('halaqat.portion.figure.whole') : from.ayah === to.ayah ? t('halaqat.portion.figure.ayah', { ayah: from.ayah })
      : t('halaqat.portion.figure.ayahs', { from: from.ayah, to: to.ayah }))}
  </>;
  return <>
    {name(from.surah)}
    {!wholeFrom && ayahs(t('halaqat.portion.figure.fromAyah', { ayah: from.ayah }))}
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('halaqat.portion.figure.to')}</Text>
    {name(to.surah)}
    {!wholeTo && ayahs(t('halaqat.portion.figure.toAyah', { ayah: to.ayah }))}
  </>;
}

/** The rule between two parts of a lawh: a dotted line with a small lozenge at its middle, across or (`vertical`) down. */
function LawhRule({ palette: p, vertical = false }: { palette: ReaderPalette; vertical?: boolean }) {
  const [length, setLength] = useState(0);
  const colors = lawhColors(p), mid = length / 2;
  const line = vertical ? `M 6 2 V ${mid - 10} M 6 ${mid + 10} V ${length - 2}` : `M 2 6 H ${mid - 10} M ${mid + 10} 6 H ${length - 2}`;
  return <View onLayout={(e) => setLength(vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width)}
    style={vertical ? { width: RULE, alignSelf: 'stretch', alignItems: 'center' } : { height: 12, marginVertical: 14 }}
    aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {length > 0 && <Svg width={vertical ? 12 : length} height={vertical ? length : 12}>
      <Path d={line} stroke={colors.rule} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="0.5 6" />
      <Path d={vertical ? `M 6 ${mid - 4.5} L 10.5 ${mid} L 6 ${mid + 4.5} L 1.5 ${mid} Z` : `M ${mid} 1.5 L ${mid + 4.5} 6 L ${mid} 10.5 L ${mid - 4.5} 6 Z`} fill={withAlpha(p.ornament, 0.7)} />
    </Svg>}
  </View>;
}

/** A halaqa in a line: its riwayah, its days, and its time. */
export function halaqaFacts(halaqa: Halaqa) {
  return formatList([t('common.riwayahOf', { riwayah: RIWAYAT[halaqa.riwayah].label }), halaqa.weekdays.length ? weekdaysLabel(halaqa.weekdays) : t('halaqat.list.noDays'),
    ...(halaqa.time ? [t('halaqat.reminders.at', { time: `${String(halaqa.time.hour).padStart(2, '0')}:${String(halaqa.time.minute).padStart(2, '0')}` })] : [])]);
}

/** A participant's name, and «(أنت)» for the phone's owner. */
export const displayName = (student: Student) => student.me ? t('halaqat.me.you', { name: student.name }) : student.name;

/** A student's mark in lists: their number in the halaqa in a star, as the app numbers things. */
export const studentNumber = (students: { id: string }[], id: string) => students.findIndex((s) => s.id === id) + 1;

const s = StyleSheet.create({
  lineActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 },
  grade: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 1, borderRadius: readerShape.pill, borderWidth: StyleSheet.hairlineWidth },
  attendance: { flexDirection: 'row', gap: 6 },
  attendanceOption: { flex: 1, minWidth: 0, minHeight: 34, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1 },
  attendanceCompact: { minHeight: 30, paddingHorizontal: 2 },
});

/** Back, or to the halaqat when there is nothing to go back to (opened from a link). */
export const backOrHalaqat = () => { if (router.canGoBack()) router.back(); else router.replace('/halaqat'); };
/** Past a halaqa the user left or deleted (and the screen on it): to where they were before, or the halaqat. */
export const pastHalaqa = (screens: number) => { if (router.canDismiss()) router.dismiss(screens); else router.replace('/halaqat'); };
