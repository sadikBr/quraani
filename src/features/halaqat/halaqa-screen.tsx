import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { AddRow, PageBar, PageTitle, Row, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { IconButton } from '@/features/quran-reader/components/ui/reader-chrome';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { formatList, formatNumber, t } from '@/i18n';
import { useHalaqa, useMembership } from './provider';
import { absent, activeStudents, currentAssignment, entryOf, heard, historyOf, monthStart, nextMeeting, scoresOf, sessionOn, type Halaqa, type Student } from './model';
import { photoOf } from './membership';
import { DoorPill, HalaqaDoor, HalaqaRing, RingCount, seatsOf } from './ring';
import { JoinedHalaqaScreen } from './joined-screen';
import { Scoreboard } from './scoreboard';
import { backOrHalaqat, GradeMark, portionLabel, studentNumber, useHalaqaIndex, displayName, halaqaFacts } from './shared';

/**
 * A halaqa: today's session through an arched window (or the way to start it), its students
 * with the portion each is on, their points, and its past sessions. A halaqa the user joined as a
 * member shows as they see it.
 */
export function HalaqaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette: p } = useReadingPreferences();
  const { halaqa, ready } = useHalaqa(id);
  const { membership } = useMembership();
  const joined = membership.joined.find((j) => j.halaqa.id === id);
  const back = { label: t('common.back'), onPress: backOrHalaqat };
  if (!halaqa && joined) return <JoinedHalaqaScreen joined={joined} />;
  if (!halaqa) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={back} palette={p} />
    <View style={page.content}>{ready && membership.loaded ? <Empty icon="users" palette={p} title={t('halaqat.notFound')} description={t('halaqat.notFoundDetail')} /> : <ActivityIndicator color={p.mutedForeground} />}</View>
  </SafeAreaView>;
  return <HalaqaDetail halaqa={halaqa} />;
}

function HalaqaDetail({ halaqa }: { halaqa: Halaqa }) {
  const { palette: p } = useReadingPreferences();
  const { today } = usePlans();
  const { index, shape, error, retry } = useHalaqaIndex(halaqa.riwayah);
  const { membership, people } = useMembership();
  // Who joined from their accounts, for their photos on the board.
  useEffect(() => { void people(halaqa.id).catch(() => {}); }, [halaqa.id, people]);
  const [showFormer, setShowFormer] = useState(false);
  const students = activeStudents(halaqa), former = halaqa.students.filter((s) => s.leftOn);
  const past = [...halaqa.sessions].filter((s) => s.date !== today).sort((a, b) => b.date.localeCompare(a.date));
  const todaySession = sessionOn(halaqa, today);
  const facts = halaqaFacts(halaqa);
  const invite = () => router.push({ pathname: '/halaqat/members', params: { halaqa: halaqa.id } });
  const avatarOf = (student: string) => membership.people[halaqa.id]?.find((x) => x.student === student)?.avatar;
  const board = scoresOf(halaqa, monthStart(today)).map((score) => {
    const student = students.find((x) => x.id === score.student)!, avatar = avatarOf(score.student);
    return { key: score.student, name: student.name, me: !!student.me, photo: photoOf(membership, avatar), cacheKey: avatar, total: score.total, recent: score.recent };
  });
  const openStudent = (student: Student) => router.push({ pathname: '/halaqat/student', params: { halaqa: halaqa.id, student: student.id } });
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: backOrHalaqat }} palette={p}
      actions={<>
        <IconButton name="users" label={t('halaqat.detail.people')} palette={p} onPress={invite} />
        <IconButton name="settings" label={t('halaqat.detail.settings')} palette={p} onPress={() => router.push({ pathname: '/halaqat/new', params: { id: halaqa.id } })} />
      </>} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      <PageTitle title={halaqa.name} subtitle={facts} palette={p} />
      {error && <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>}
      <TodayDoor halaqa={halaqa} today={today} />
      <Section title={t('halaqat.detail.students')} detail={students.length ? t('halaqat.studentCount', { count: students.length }) : undefined} palette={p}>
        {students.length ? <RowGroup palette={p}>
          {students.map((student) => {
            const assigned = currentAssignment(halaqa, student);
            const last = historyOf(halaqa, student.id).find((h) => h.entry.recitations.length)?.entry.recitations.find((r) => r.kind === 'new');
            // Heard today: their star filled with gold, as their seat in the ring.
            const heardToday = heard(entryOf(todaySession, student.id));
            return <Row key={student.id} palette={p} onPress={() => openStudent(student)} title={displayName(student)}
              leading={<Medallion value={studentNumber(halaqa.students, student.id)} size={40} palette={p} current={heardToday} />}
              detail={index && shape && assigned.new ? t('halaqat.detail.onPortion', { portion: portionLabel(index, shape, assigned.new) }) : t('halaqat.detail.noPortion')}
              trailing={last ? <View style={{ alignSelf: 'center' }}><GradeMark grade={last.grade} palette={p} /></View> : undefined} chevron />;
          })}
        </RowGroup> : <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('halaqat.detail.noStudents')}</Text>}
        <AddRow title={t('halaqat.detail.addStudent')} detail={t('halaqat.detail.addStudentDetail')} onPress={invite} palette={p} icon="user-plus" />
      </Section>
      {students.length > 0 && <Section title={t('halaqat.sharing.board')} palette={p}>
        <Scoreboard rows={board} palette={p} />
      </Section>}
      {!!past.length && <Section title={t('halaqat.detail.past')} palette={p}>
        <RowGroup palette={p}>
          {past.slice(0, 30).map((session) => {
            const came = session.entries.filter((e) => !absent(e)).length, recited = session.entries.filter((e) => heard(e)).length;
            // That day's ring: who was heard, who came, who was away.
            const seats = session.entries.map((e) => heard(e) ? 'heard' as const : absent(e) ? 'away' as const : 'present' as const);
            return <Row key={session.id} palette={p} title={weekdayDateLabel(session.date)} leading={<HalaqaRing seats={seats} size={44} palette={p} />}
              detail={t('halaqat.detail.pastSummary', { came, recited })}
              onPress={() => router.push({ pathname: '/halaqat/session', params: { halaqa: halaqa.id, date: session.date } })} />;
          })}
        </RowGroup>
      </Section>}
      {!!former.length && <Section title={t('halaqat.detail.former')} palette={p}
        action={<Button size="sm" variant="ghost" palette={p} onPress={() => setShowFormer((x) => !x)}>{showFormer ? t('halaqat.detail.hide') : t('halaqat.detail.show')}</Button>}>
        {showFormer && <RowGroup palette={p}>
          {former.map((student) => <Row key={student.id} palette={p} leading={<Medallion value={studentNumber(halaqa.students, student.id)} size={40} palette={p} tone={p.mutedForeground} />} title={student.name} detail={t('halaqat.detail.leftOn', { date: weekdayDateLabel(student.leftOn!) })} onPress={() => openStudent(student)} />)}
        </RowGroup>}
      </Section>}
    </ScrollView>
  </SafeAreaView>;
}

/**
 * Today's session through the halaqa's door: its ring (who has been heard, who is here, who is
 * away), how many have recited in its middle, and the way in. Without participants yet, the door
 * leads to inviting them.
 */
function TodayDoor({ halaqa, today }: { halaqa: Halaqa; today: string }) {
  const { palette: p } = useReadingPreferences();
  const students = activeStudents(halaqa);
  const session = sessionOn(halaqa, today);
  const meets = nextMeeting(halaqa, today);
  const done = students.filter((s) => heard(entryOf(session, s.id))).length;
  const away = students.filter((s) => absent(entryOf(session, s.id))).length;
  const heardOf = t('halaqat.detail.heardOf', { done, total: students.length });
  const open = () => router.push(students.length ? { pathname: '/halaqat/session', params: { halaqa: halaqa.id, date: today } } : { pathname: '/halaqat/members', params: { halaqa: halaqa.id } });
  const title = session ? t('halaqat.detail.todaySession') : meets === today ? t('halaqat.detail.meetsToday') : t('halaqat.detail.noSessionToday');
  const detail = !students.length ? t('halaqat.detail.addFirst')
    : session ? formatList([heardOf, ...(away ? [t('halaqat.detail.away', { count: away })] : [])])
    : meets && meets !== today ? t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) }) : t('halaqat.studentCount', { count: students.length });
  const action = !students.length ? t('halaqat.detail.addStudent') : session ? t('halaqat.detail.continue') : t('halaqat.detail.start');
  return <HalaqaDoor palette={p} seats={seatsOf(halaqa, session)} kicker={weekdayDateLabel(today)} title={title} detail={detail}
    ringLabel={session ? heardOf : t('halaqat.studentCount', { count: students.length })}
    center={session ? <RingCount tile palette={p} value={formatNumber(done)} caption={t('halaqat.detail.ofTotal', { total: students.length })} />
      : <RingCount tile palette={p} value={formatNumber(students.length)} caption={t('halaqat.detail.inCircle')} />}
    label={formatList([title, detail, action])} onPress={open}>
    <DoorPill palette={p} icon={!students.length ? 'user-plus' : session ? 'headphones' : 'play'} text={action} />
  </HalaqaDoor>;
}
