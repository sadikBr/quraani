import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { Button, Empty } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import { validDate } from '@/features/plans/dates';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { formatList, t } from '@/i18n';
import { useHalaqa, useHalaqat } from './provider';
import { absent, activeStudents, assignmentFor, entryOf, heard, newId, sessionOn, type Attendance, type Entry, type Halaqa, type Student } from './model';
import { AttendancePicker, GradeMark, portionLabel, studentNumber, useHalaqaIndex, displayName } from './shared';
import { ConfirmDialog } from './confirm-dialog';

/**
 * A session of the halaqa, on a day: the roll call, then each student with the portions they are
 * to recite, how they went once heard, and the way to hear them.
 */
export function SessionScreen() {
  const params = useLocalSearchParams<{ halaqa: string; date: string }>();
  const { palette: p } = useReadingPreferences();
  const { halaqa, ready } = useHalaqa(params.halaqa);
  if (!halaqa || !validDate(params.date)) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <View style={page.content}>{ready ? <Empty icon="users" palette={p} title={t('halaqat.notFound')} description={t('halaqat.notFoundDetail')} /> : <ActivityIndicator color={p.mutedForeground} />}</View>
  </SafeAreaView>;
  return <Session halaqa={halaqa} date={params.date} />;
}

function Session({ halaqa, date }: { halaqa: Halaqa; date: string }) {
  const { palette: p } = useReadingPreferences();
  const { change } = useHalaqat();
  const { index, shape } = useHalaqaIndex(halaqa.riwayah);
  const session = sessionOn(halaqa, date);
  // The session is made with its first entry; until then it has this id.
  const [sessionId] = useState(() => session?.id ?? newId('session'));
  const [deleting, setDeleting] = useState(false);
  // An absence for a student already heard waits for the teacher to confirm: it drops what they recited.
  const [dropping, setDropping] = useState<{ student: Student; attendance: Attendance } | null>(null);
  // Today's students, and those who have since left but were in it.
  const students = halaqa.students.filter((s) => !s.leftOn || entryOf(session, s.id));
  const unmarked = activeStudents(halaqa).filter((s) => !entryOf(session, s.id));
  const save = (entries: Entry[]) => change({ type: 'saveEntries', halaqa: halaqa.id, date, session: session?.id ?? sessionId, entries });
  const mark = (student: Student, attendance: Attendance, confirmed = false) => {
    const entry = entryOf(session, student.id);
    const away = attendance === 'absent' || attendance === 'excused';
    if (away && heard(entry) && !confirmed) { setDropping({ student, attendance }); return; }
    // Someone absent recites nothing and is given nothing: they keep the portions they had.
    save([entry ? (away ? { student: student.id, attendance, recitations: [], ...(entry.note ? { note: entry.note } : {}) } : { ...entry, attendance })
      : { student: student.id, attendance, recitations: [] }]);
  };
  const done = students.filter((s) => heard(entryOf(session, s.id))).length;
  const away = students.filter((s) => absent(entryOf(session, s.id))).length;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
      <PageTitle title={weekdayDateLabel(date)} subtitle={formatList([halaqa.name, t('halaqat.detail.heardOf', { done, total: students.length }), ...(away ? [t('halaqat.detail.away', { count: away })] : [])])} palette={p} />
      <Section title={t('halaqat.session.students')} palette={p}
        action={unmarked.length ? <Button size="sm" variant="outline" icon="roll" palette={p} onPress={() => save(unmarked.map((s) => ({ student: s.id, attendance: 'present' as const, recitations: [] })))}>{t('halaqat.session.allPresent')}</Button> : undefined}>
        {!students.length && <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('halaqat.detail.noStudents')}</Text>}
        <View style={{ gap: 12 }}>
          {students.map((student) => {
            const entry = entryOf(session, student.id);
            const assigned = assignmentFor(halaqa, student, date);
            const missing = absent(entry), done = heard(entry);
            const hear = () => router.push({ pathname: '/halaqat/recite', params: { halaqa: halaqa.id, date, student: student.id, session: session?.id ?? sessionId } });
            const lines = index && shape ? [
              assigned.new && t('halaqat.session.newLine', { portion: portionLabel(index, shape, assigned.new) }),
              assigned.revision && t('halaqat.session.revisionLine', { portion: portionLabel(index, shape, assigned.revision) }),
            ].filter((x): x is string => !!x) : [];
            return <View key={student.id} style={[s.card, { backgroundColor: p.card, borderColor: done ? withAlpha(p.ornament, 0.6) : p.border, opacity: missing ? 0.75 : 1 }, readerElevation(1, p)]}>
              <Pressable accessibilityRole="button" accessibilityLabel={formatList([student.name, ...(done ? [t('halaqat.session.heard')] : lines)])}
                accessibilityHint={t('halaqat.session.hearHint')} onPress={hear} style={({ pressed }) => [s.head, { opacity: pressed ? 0.7 : 1 }]}>
                <Medallion value={studentNumber(halaqa.students, student.id)} size={40} palette={p} current={done} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 17, fontWeight: '600' }}>{displayName(student)}</Text>
                  {done ? <View style={s.grades}>
                    {entry!.recitations.map((r) => <GradeMark key={r.kind} grade={r.grade} palette={p} label={formatList([t(`halaqat.kinds.${r.kind}`), t(`halaqat.grades.${r.grade}`)])} />)}
                  </View> : lines.length ? lines.map((line) => <Text key={line} numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{line}</Text>)
                    : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('halaqat.detail.noPortion')}</Text>}
                </View>
                {!missing && <View style={[s.hear, { backgroundColor: done ? 'transparent' : p.primary, borderColor: done ? p.input : p.primary }]}>
                  <ReaderIcon name={done ? 'pencil' : 'headphones'} color={done ? p.foreground : p.primaryForeground} size={15} />
                  <Text style={{ color: done ? p.foreground : p.primaryForeground, fontSize: 13, fontWeight: '600' }}>{done ? t('halaqat.session.edit') : t('halaqat.session.hear')}</Text>
                </View>}
              </Pressable>
              <AttendancePicker compact name={student.name} value={entry?.attendance} onChange={(value) => mark(student, value)} palette={p} />
            </View>;
          })}
        </View>
      </Section>
      {session && <Button variant="ghost" icon="trash" tone={p.destructive} palette={p} onPress={() => setDeleting(true)}>{t('halaqat.session.delete')}</Button>}
    </ScrollView>
    {dropping && <ConfirmDialog title={t('halaqat.session.dropConfirmTitle')} body={t('halaqat.session.dropConfirmBody', { name: dropping.student.name })}
      confirm={t('halaqat.session.dropConfirm')} onClose={() => setDropping(null)}
      onConfirm={() => { mark(dropping.student, dropping.attendance, true); setDropping(null); }} />}
    {deleting && <ConfirmDialog title={t('halaqat.session.deleteConfirmTitle')} body={t('halaqat.session.deleteConfirmBody')} confirm={t('halaqat.session.delete')}
      onClose={() => setDeleting(false)} onConfirm={() => { setDeleting(false); change({ type: 'deleteSession', halaqa: halaqa.id, date }); router.back(); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 12, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  hear: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: readerShape.pill, borderWidth: 1 },
});
