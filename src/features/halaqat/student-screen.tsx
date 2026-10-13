import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty, Progress } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { IconButton } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { spanCount } from '@/features/plans/memorization';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { formatList, formatNumber, t } from '@/i18n';
import { useHalaqa, useHalaqat } from './provider';
import {
  ATTENDANCE, attendanceOf, currentAssignment, historyOf, markCount, memorizedBy, totalAyahs,
  type Halaqa, type Portion, type RecitationKind, type Student,
} from './model';
import { attendanceTone, GradeMark, LawhPortion, portionLabel, useHalaqaIndex, displayName, useLinkedStudent } from './shared';
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
  const attendance = attendanceOf(halaqa, student.id);
  // The phone's owner counts what their own record holds too.
  const linked = useLinkedStudent(student, halaqa.riwayah, index, shape);
  const memorized = shape ? spanCount(memorizedBy(shape, halaqa, linked)) : 0;
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
          <View style={{ gap: 12 }}>
            <LawhPortion title={t('halaqat.lawh.new')} portion={assigned.new} index={index} shape={shape} palette={p} emptyText={t('halaqat.student.noNew')}
              onChange={() => setChoosing('new')} />
            <LawhPortion title={t('halaqat.lawh.revision')} portion={assigned.revision} index={index} shape={shape} palette={p} emptyText={t('halaqat.student.noRevision')}
              onChange={() => setChoosing('revision')} onClear={() => reassign('revision', undefined)} />
          </View>
        </Section>
        <Section title={t('halaqat.student.progress')} palette={p}>
          <View style={[s.panel, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: p.foreground, fontSize: 18, fontFamily: 'ReaderNaskhBold', lineHeight: 30 }}>{t('halaqat.student.memorized', { count: memorized })}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('halaqat.student.share', { percent: formatNumber(Math.round((memorized / totalAyahs(shape)) * 1000) / 10) })}</Text>
            </View>
            <Progress value={memorized / totalAyahs(shape)} palette={p} label={t('halaqat.student.memorized', { count: memorized })} />
            <View style={s.stats}>
              {ATTENDANCE.map((a) => <View key={a} style={[s.stat, { borderColor: withAlpha(attendanceTone(p, a), 0.35) }]}>
                <Text style={{ color: attendanceTone(p, a), fontSize: 18, fontWeight: '700' }}>{formatNumber(attendance[a])}</Text>
                <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 11 }}>{t(`halaqat.attendance.${a}`)}</Text>
              </View>)}
            </View>
          </View>
        </Section>
        <Section title={t('halaqat.student.history')} palette={p}>
          {!history.length ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('halaqat.student.noHistory')}</Text>
            : <View style={{ gap: 10 }}>{history.slice(0, 60).map(({ session, entry }) => <View key={session.id} style={[s.panel, { backgroundColor: p.card, borderColor: p.border, gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: p.foreground, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text>
                <Text style={{ color: attendanceTone(p, entry.attendance), fontSize: 12, fontWeight: '600' }}>{t(`halaqat.attendance.${entry.attendance}`)}</Text>
              </View>
              {entry.recitations.map((r) => <View key={r.kind} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{formatList([t(`halaqat.kinds.${r.kind}`), portionLabel(index, shape, r.portion)])}</Text>
                  <GradeMark grade={r.grade} palette={p} />
                </View>
                {(markCount(r.marks, 'mistake') > 0 || markCount(r.marks, 'hesitation') > 0) && <Text style={{ color: p.mutedForeground, fontSize: 12 }}>
                  {formatList([...(markCount(r.marks, 'mistake') ? [t('halaqat.marks.mistakeCount', { count: markCount(r.marks, 'mistake') })] : []),
                    ...(markCount(r.marks, 'hesitation') ? [t('halaqat.marks.hesitationCount', { count: markCount(r.marks, 'hesitation') })] : [])])}
                </Text>}
              </View>)}
              {!!entry.note && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{entry.note}</Text>}
              <Button size="sm" variant="ghost" icon="pencil" palette={p} style={{ alignSelf: 'flex-start' }}
                onPress={() => router.push({ pathname: '/halaqat/recite', params: { halaqa: halaqa.id, date: session.date, student: student.id, session: session.id } })}>{t('halaqat.student.editEntry')}</Button>
            </View>)}</View>}
        </Section>
      </>}
    </ScrollView>
    {choosing && index && shape && <PortionSheet index={index} shape={shape} value={assigned[choosing]} fallbackSurah={student.direction === 'forward' ? 1 : 114} title={t(choosing === 'new' ? 'halaqat.lawh.new' : 'halaqat.lawh.revision')}
      subtitle={t('halaqat.student.changeCurrent')} onClose={() => setChoosing(null)} onSave={(portion) => { reassign(choosing, portion); setChoosing(null); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', borderWidth: 1, borderRadius: readerShape.control, paddingVertical: 6 },
});
