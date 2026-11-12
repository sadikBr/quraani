import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwakeWhileShown } from '@/hooks/use-keep-awake-while-shown';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { ArchPanel } from '@/components/craft/panels';
import { Alert, Button, Empty } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { validDate } from '@/features/plans/dates';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { formatList, formatNumber, t } from '@/i18n';
import { useHalaqa, useHalaqat } from './provider';
import { absent, activeStudents, assignmentFor, entryOf, heard, newId, sessionClosed, sessionOn, type Attendance, type Entry, type Halaqa, type Student } from './model';
import { AttendancePicker, GradeMark, portionLabel, studentNumber, useHalaqaIndex, displayName } from './shared';
import { ConfirmDialog } from './confirm-dialog';
import { HalaqaRing, RingCount, SeatLegend, seatsOf, type Seat } from './ring';

/**
 * A session of the halaqa, on a day: its ring (who has been heard, who is here waiting, who is not
 * marked yet, who is away) and what each kind of seat counts, then each participant with the
 * portions they are to recite (or how they went, once heard), the way to hear them, and the roll call.
 */
export function SessionScreen() {
  useKeepAwakeWhileShown('halaqa-session');
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
  const { today } = usePlans();
  const { index, shape } = useHalaqaIndex(halaqa.riwayah);
  const session = sessionOn(halaqa, date);
  // A week after its day the session only shows what was recorded: a tap opens the participant's record.
  const closed = sessionClosed(date, today);
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
  const seats = seatsOf(halaqa, session, students);
  const count = (seat: Seat) => seats.filter((x) => x === seat).length;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar title={weekdayDateLabel(date)} back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
      <PageTitle subtitle={halaqa.name} palette={p} />
      {students.length > 0 && <ArchPanel palette={p} rise={40} tone={done === students.length ? p.ornament : undefined} contentStyle={s.hero}>
        <HalaqaRing seats={seats} size={136} palette={p} label={formatList([t('halaqat.detail.heardOf', { done, total: students.length }), ...(away ? [t('halaqat.detail.away', { count: away })] : [])])}>
          <RingCount palette={p} value={formatNumber(done)} caption={t('halaqat.detail.ofTotal', { total: students.length })} />
        </HalaqaRing>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SeatLegend palette={p} items={[
            { seat: 'heard', label: t('halaqat.session.legend.heard'), count: count('heard') },
            { seat: 'present', label: t('halaqat.session.legend.present'), count: count('present') },
            { seat: 'waiting', label: t('halaqat.session.legend.waiting'), count: count('waiting') },
            { seat: 'away', label: t('halaqat.session.legend.away'), count: count('away') },
          ]} />
        </View>
      </ArchPanel>}
      {closed && <Alert palette={p} title={t('halaqat.session.closedTitle')}>{t('halaqat.session.closed')}</Alert>}
      <Section title={t('halaqat.session.students')} palette={p}
        action={unmarked.length && !closed ? <Button size="sm" variant="outline" icon="roll" palette={p} onPress={() => save(unmarked.map((s) => ({ student: s.id, attendance: 'present' as const, recitations: [] })))}>{t('halaqat.session.allPresent')}</Button> : undefined}>
        {!students.length && <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('halaqat.detail.noStudents')}</Text>}
        <View style={{ gap: 12 }}>
          {students.map((student) => {
            const entry = entryOf(session, student.id);
            const assigned = assignmentFor(halaqa, student, date);
            const missing = absent(entry), done = heard(entry);
            const hear = () => router.push(closed ? { pathname: '/halaqat/student', params: { halaqa: halaqa.id, student: student.id } }
              : { pathname: '/halaqat/recite', params: { halaqa: halaqa.id, date, student: student.id, session: session?.id ?? sessionId } });
            const lines = index && shape ? [
              assigned.new && { kind: t('halaqat.lawh.new'), portion: portionLabel(index, shape, assigned.new) },
              assigned.revision && { kind: t('halaqat.lawh.revision'), portion: portionLabel(index, shape, assigned.revision) },
            ].filter((x): x is { kind: string; portion: string } => !!x) : [];
            return <View key={student.id} style={[s.card, { backgroundColor: p.card, borderColor: done ? withAlpha(p.ornament, 0.55) : p.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={formatList([student.name, ...(done ? [t('halaqat.session.heard')] : lines.map((l) => formatList([l.kind, l.portion])))])}
                accessibilityHint={closed ? t('halaqat.session.recordHint') : t('halaqat.session.hearHint')} onPress={hear}
                style={({ pressed }) => [s.main, { backgroundColor: pressed ? p.accent : 'transparent', opacity: missing ? 0.6 : 1 }]}>
                <Medallion value={studentNumber(halaqa.students, student.id)} size={40} palette={p} current={done} tone={missing ? p.mutedForeground : undefined} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{displayName(student)}</Text>
                  {done ? <View style={s.grades}>
                    {entry!.recitations.map((r) => <GradeMark key={r.kind} grade={r.grade} palette={p} label={formatList([t(`halaqat.kinds.${r.kind}`), t(`halaqat.grades.${r.grade}`)])} />)}
                  </View> : missing ? <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`halaqat.attendance.${entry!.attendance}`)}</Text>
                    : lines.length ? lines.map((line) => <View key={line.kind} style={s.line}>
                      <Text style={{ color: p.ornament, fontSize: 12, fontWeight: '700' }}>{line.kind}</Text>
                      <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: p.mutedForeground, fontSize: 13 }}>{line.portion}</Text>
                    </View>)
                    : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('halaqat.detail.noPortion')}</Text>}
                </View>
                {!missing && !closed && <View style={[s.hear, { backgroundColor: done ? 'transparent' : p.primary, borderColor: done ? p.input : p.primary }]}>
                  <ReaderIcon name={done ? 'pencil' : 'headphones'} color={done ? p.foreground : p.primaryForeground} size={15} />
                  <Text style={{ color: done ? p.foreground : p.primaryForeground, fontSize: 13, fontWeight: '600' }}>{done ? t('halaqat.session.edit') : t('halaqat.session.hear')}</Text>
                </View>}
              </Pressable>
              {!closed && <View style={[s.foot, { borderColor: p.border }]}>
                <AttendancePicker compact name={student.name} value={entry?.attendance} onChange={(value) => mark(student, value)} palette={p} />
              </View>}
            </View>;
          })}
        </View>
      </Section>
      {session && !closed && <Button variant="ghost" icon="trash" tone={p.destructive} palette={p} onPress={() => setDeleting(true)}>{t('halaqat.session.delete')}</Button>}
    </ScrollView>
    {dropping && <ConfirmDialog title={t('halaqat.session.dropConfirmTitle')} body={t('halaqat.session.dropConfirmBody', { name: dropping.student.name })}
      confirm={t('halaqat.session.dropConfirm')} onClose={() => setDropping(null)}
      onConfirm={() => { mark(dropping.student, dropping.attendance, true); setDropping(null); }} />}
    {deleting && <ConfirmDialog title={t('halaqat.session.deleteConfirmTitle')} body={t('halaqat.session.deleteConfirmBody')} confirm={t('halaqat.session.delete')}
      onClose={() => setDeleting(false)} onConfirm={() => { setDeleting(false); change({ type: 'deleteSession', halaqa: halaqa.id, date }); router.back(); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 46, paddingHorizontal: 18, paddingBottom: 18 },
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hear: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: readerShape.pill, borderWidth: 1 },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
});
