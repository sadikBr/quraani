import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Lawh } from '@/components/craft/lawh';
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

export const gradeTone = (p: ReaderPalette, grade: Grade) => ({ excellent: p.success, good: p.primary, fair: p.warning, repeat: p.destructive })[grade];

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

/**
 * A portion written on a lawh, as in the kuttab: what it is (its kind above it), its surah and
 * ayahs, its size, and the way to change it; or, with none yet, the way to give one.
 */
export function LawhPortion({ title, portion, index, shape, palette: p, onChange, onClear, emptyText, tone }: {
  title: string; portion: Portion | undefined; index: PlanIndex; shape: QuranShape; palette: ReaderPalette;
  onChange?: () => void; onClear?: () => void; emptyText: string; tone?: string;
}) {
  const valid = validPortion(shape, portion);
  return <Lawh palette={p} tone={tone} contentStyle={{ paddingTop: 42, gap: 6, alignItems: 'center' }}>
    <Text style={{ color: p.mutedForeground, fontSize: 12, fontWeight: '600' }}>{title}</Text>
    {valid ? <>
      <Text style={{ color: p.foreground, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{portionLabel(index, shape, portion)}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{portionDetail(index, shape, portion)}</Text>
    </> : <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{emptyText}</Text>}
    {(onChange || (valid && onClear)) && <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      {onChange && <Button size="sm" variant="outline" icon={valid ? 'pencil' : 'plus'} palette={p} onPress={onChange}
        label={valid ? t('halaqat.portion.changeLabel', { title }) : t('halaqat.portion.chooseLabel', { title })}>{valid ? t('halaqat.portion.change') : t('halaqat.portion.choose')}</Button>}
      {valid && onClear && <Button size="sm" variant="ghost" icon="close" palette={p} onPress={onClear} label={t('halaqat.portion.clearLabel', { title })}>{t('halaqat.portion.clear')}</Button>}
    </View>}
  </Lawh>;
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
  grade: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 1, borderRadius: readerShape.pill, borderWidth: StyleSheet.hairlineWidth },
  attendance: { flexDirection: 'row', gap: 6 },
  attendanceOption: { flex: 1, minWidth: 0, minHeight: 34, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1 },
  attendanceCompact: { minHeight: 30, paddingHorizontal: 2 },
});

/** Back, or to the halaqat when there is nothing to go back to (opened from a link). */
export const backOrHalaqat = () => { if (router.canGoBack()) router.back(); else router.replace('/halaqat'); };
/** Past a halaqa the user left or deleted (and the screen on it): to where they were before, or the halaqat. */
export const pastHalaqa = (screens: number) => { if (router.canDismiss()) router.dismiss(screens); else router.replace('/halaqat'); };
