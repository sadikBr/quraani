import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty, Progress } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { IconButton, ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { spanCount } from '@/features/plans/memorization';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { Trail, type TrailState } from '@/features/plans/goal-card';
import { formatList, formatNumber, t } from '@/i18n';
import { useHalaqa, useHalaqat } from './provider';
import {
  ATTENDANCE, attendanceOf, currentAssignment, historyOf, markCount, memorizedBy, totalAyahs,
  type Attendance, type Halaqa, type Portion, type QuranShape, type RecitationKind, type Student,
} from './model';
import type { PlanIndex } from '@/features/plans/engine';
import { attendanceTone, GradeMark, LawhBoard, portionLabel, useHalaqaIndex, displayName, useLinkedStudent } from './shared';
import { PortionSheet } from './portion-sheet';

/**
 * A student: the portions they are on (their lawh, and their revision), how much they have
 * memorized, how often they came, and every recitation with its grade and marks.
 */
export function StudentScreen() {
  const params = useLocalSearchParams<{ halaqa: string; student: string }>();
  const { palette: p } = useReadingPreferences();
  const { halaqa, ready } = useHalaqa(params.halaqa);
  const student = halaqa?.students.find((s) => s.id === params.student);
  if (!halaqa || !student) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <View style={page.content}>{ready ? <Empty icon="users" palette={p} title={t('halaqat.notFound')} description={t('halaqat.notFoundDetail')} /> : <ActivityIndicator color={p.mutedForeground} />}</View>
  </SafeAreaView>;
  return <StudentDetail halaqa={halaqa} student={student} />;
}

function StudentDetail({ halaqa, student }: { halaqa: Halaqa; student: Student }) {
  const { palette: p } = useReadingPreferences();
  const { change } = useHalaqat();
  const { index, shape, error, retry } = useHalaqaIndex(halaqa.riwayah);
  const [choosing, setChoosing] = useState<RecitationKind | null>(null);
  const assigned = currentAssignment(halaqa, student);
  const history = historyOf(halaqa, student.id);
  // The portions they are on were given by their last session that gave any, or when they joined.
  const giver = history.find((h) => h.entry.next);
  const reassign = (kind: RecitationKind, portion: Portion | undefined) => {
    const next = { ...assigned, [kind]: portion };
    const clean = { ...(next.new ? { new: next.new } : {}), ...(next.revision ? { revision: next.revision } : {}) };
    if (giver) change({ type: 'saveEntries', halaqa: halaqa.id, date: giver.session.date, session: giver.session.id, entries: [{ ...giver.entry, next: clean }] });
    else change({ type: 'saveStudent', halaqa: halaqa.id, student: { ...student, first: clean } });
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p}
      actions={<IconButton name="settings" label={t('halaqat.student.settings')} palette={p} onPress={() => router.push({ pathname: '/halaqat/student-form', params: { halaqa: halaqa.id, student: student.id } })} />} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      <PageTitle title={displayName(student)} subtitle={formatList([halaqa.name, t(`halaqat.directions.${student.direction}`), ...(student.leftOn ? [t('halaqat.detail.leftOn', { date: weekdayDateLabel(student.leftOn) })] : [])])} palette={p} />
      {error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>
        : !index || !shape ? <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
        <Section title={t('halaqat.student.current')} palette={p}>
          <LawhBoard index={index} shape={shape} palette={p} lines={[
            { title: t('halaqat.lawh.new'), portion: assigned.new, emptyText: t('halaqat.student.noNew'), onChange: () => setChoosing('new') },
            { title: t('halaqat.lawh.revision'), portion: assigned.revision, emptyText: t('halaqat.student.noRevision'), onChange: () => setChoosing('revision'), onClear: () => reassign('revision', undefined) },
          ]} />
        </Section>
        <StudentRecord halaqa={halaqa} student={student} index={index} shape={shape} editable />
      </>}
    </ScrollView>
    {choosing && index && shape && <PortionSheet index={index} shape={shape} value={assigned[choosing]} fallbackSurah={student.direction === 'forward' ? 1 : 114} title={t(choosing === 'new' ? 'halaqat.lawh.new' : 'halaqat.lawh.revision')}
      subtitle={t('halaqat.student.changeCurrent')} onClose={() => setChoosing(null)} onSave={(portion) => { reassign(choosing, portion); setChoosing(null); }} />}
  </SafeAreaView>;
}

/** A day's attendance as a bead of a trail: present full, late half, absent empty, excused a small dot. */
const trailOf = (attendance: Attendance): TrailState => ({ present: 'done', late: 'partial', absent: 'missed', excused: 'off' } as const)[attendance];

/** One bead, as the trail draws it, beside its words. */
function AttendanceBead({ attendance, palette: p, size = 12 }: { attendance: Attendance; palette: ReaderPalette; size?: number }) {
  const r = size / 2, c = r + 1, rr = r - 0.6, state = trailOf(attendance);
  return <Svg width={size + 2} height={size + 2} aria-hidden>
    {state === 'off' ? <Circle cx={c} cy={c} r={1.8} fill={withAlpha(p.ornament, 0.6)} /> : <>
      <Circle cx={c} cy={c} r={rr} fill={state === 'done' ? p.ornament : p.card} stroke={state === 'missed' ? withAlpha(p.ornament, 0.45) : p.ornament} strokeWidth={1.1} />
      {state === 'partial' && <Path d={`M ${c} ${c - rr} A ${rr} ${rr} 0 0 1 ${c} ${c + rr} Z`} fill={p.ornament} />}
    </>}
  </Svg>;
}

/**
 * A participant's record: how much they have memorized (and what share of the Quran), their
 * attendance as a trail of the last sessions, and every recitation with its grade and marks
 * (`editable`: each day opens to change it).
 */
export function StudentRecord({ halaqa, student, index, shape, editable = false, self = false }: {
  halaqa: Halaqa; student: Student; index: PlanIndex; shape: QuranShape; editable?: boolean;
  /** Read by the participant themselves (on their own phone): «محفوظك», «سجلّ تسميعك». */
  self?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  const history = historyOf(halaqa, student.id);
  const attendance = attendanceOf(halaqa, student.id);
  // The phone's owner counts what their own record holds too.
  const linked = useLinkedStudent(student, halaqa.riwayah, index, shape);
  const memorized = spanCount(memorizedBy(shape, halaqa, linked));
  const memorizedText = self ? t('halaqat.sharing.myMemorized', { count: memorized }) : t('halaqat.student.memorized', { count: memorized });
  const share = formatNumber(Math.round((memorized / totalAyahs(shape)) * 1000) / 10);
  // The last sessions, oldest first, as beads from the reading start.
  const trail = history.slice(0, TRAIL).reverse().map((h) => trailOf(h.entry.attendance));
  return <>
    <Section title={self ? t('halaqat.sharing.myProgress') : t('halaqat.student.progress')} palette={p}>
      <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={s.body}>
          <View style={s.figure}>
            <Text style={{ color: p.foreground, fontSize: 34, lineHeight: 48, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(memorized)}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 14, fontWeight: '600', lineHeight: 22 }}>{t('halaqat.student.ayahsMemorized', { count: memorized })}</Text>
              <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('halaqat.student.share', { percent: share })}</Text>
            </View>
          </View>
          <Progress value={memorized / totalAyahs(shape)} palette={p} label={memorizedText} />
        </View>
        <View style={[s.body, s.split, { borderColor: p.border }]}>
          <Text style={{ color: p.mutedForeground, fontSize: 12, fontWeight: '600' }}>{t('halaqat.student.attendance', { count: history.length })}</Text>
          {trail.length > 1 && <Trail states={trail} palette={p} />}
          <View style={s.keys}>
            {ATTENDANCE.map((a) => <View key={a} style={s.key} accessible accessibilityLabel={formatList([t(`halaqat.attendance.${a}`), formatNumber(attendance[a])])}>
              <AttendanceBead attendance={a} palette={p} />
              <Text style={{ color: attendance[a] ? p.foreground : p.mutedForeground, fontSize: 13 }}>{t(`halaqat.attendance.${a}`)}</Text>
              <Text style={{ color: attendance[a] ? p.foreground : p.mutedForeground, fontSize: 15, lineHeight: 22, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(attendance[a])}</Text>
            </View>)}
          </View>
        </View>
      </View>
    </Section>
    <Section title={self ? t('halaqat.sharing.myHistory') : t('halaqat.student.history')} palette={p}>
      {!history.length ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{self ? t('halaqat.sharing.myNoHistory') : t('halaqat.student.noHistory')}</Text>
        : <View style={{ gap: 10 }}>{history.slice(0, 60).map(({ session, entry }) => {
          const edit = () => router.push({ pathname: '/halaqat/recite', params: { halaqa: halaqa.id, date: session.date, student: student.id, session: session.id } });
          return <View key={session.id} style={[s.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={[s.body, { gap: 10 }]}>
              <View style={s.day}>
                <AttendanceBead attendance={entry.attendance} palette={p} />
                <Text style={{ flex: 1, color: p.foreground, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text>
                <Text style={{ color: attendanceTone(p, entry.attendance), fontSize: 12, fontWeight: '600' }}>{t(`halaqat.attendance.${entry.attendance}`)}</Text>
              </View>
              {entry.recitations.map((r) => {
                const mistakes = markCount(r.marks, 'mistake'), hesitations = markCount(r.marks, 'hesitation');
                return <View key={r.kind} style={s.recitation}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: p.ornament, fontSize: 12, fontWeight: '700', lineHeight: 18 }}>{t(`halaqat.kinds.${r.kind}`)}</Text>
                    <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 27, fontFamily: 'ReaderNaskhBold' }}>{portionLabel(index, shape, r.portion)}</Text>
                    {(mistakes > 0 || hesitations > 0) && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>
                      {formatList([...(mistakes ? [t('halaqat.marks.mistakeCount', { count: mistakes })] : []), ...(hesitations ? [t('halaqat.marks.hesitationCount', { count: hesitations })] : [])])}
                    </Text>}
                  </View>
                  <GradeMark grade={r.grade} palette={p} />
                </View>;
              })}
              {!!entry.note && <View style={[s.note, { borderColor: withAlpha(p.ornament, 0.6) }]}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{entry.note}</Text>
              </View>}
            </View>
            {editable && <Pressable accessibilityRole="button" accessibilityLabel={formatList([t('halaqat.student.editEntry'), weekdayDateLabel(session.date)])} onPress={edit}
              style={({ pressed }) => [s.foot, { borderColor: p.border, backgroundColor: pressed ? p.accent : 'transparent' }]}>
              <ReaderIcon name="pencil" color={p.mutedForeground} size={14} />
              <Text style={{ flex: 1, color: p.mutedForeground, fontSize: 13 }}>{t('halaqat.student.editEntry')}</Text>
              <ReaderIcon name="chevron" color={p.mutedForeground} size={15} />
            </Pressable>}
          </View>;
        })}</View>}
    </Section>
  </>;
}

/** How many sessions the attendance trail shows. */
const TRAIL = 14;

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  body: { paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  split: { borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  figure: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recitation: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  note: { borderStartWidth: 2, paddingStart: 10, paddingVertical: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 44, paddingHorizontal: 14 },
});
