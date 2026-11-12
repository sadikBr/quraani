import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useEmbedded } from '@/components/embedded';
import { Medallion } from '@/components/craft/marks';
import { AddRow, PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty } from '@/components/ui';
import { useBack } from '@/components/back';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { PlanLoading } from '@/features/plans/components';
import { GoalProgress } from '@/features/plans/goal-card';
import { formatList, t } from '@/i18n';
import { useHalaqat, useMembership } from './provider';
import type { JoinedHalaqa } from './membership';
import { HalaqaMark } from './ring';
import { halaqaFacts } from './shared';
import { absent, activeStudents, entryOf, heard, nextMeeting, sessionOn, type Halaqa } from './model';

/**
 * The user's halaqat, each a window onto its day: those they teach (its name, its riwayah and
 * days, and its students as beads on a thread, those heard today filled), then those they joined.
 * Halaqat are shared through the account: signed out, they wait. Shown alone, or in the home
 * screen's «الحلقات» tab without its own bar and title.
 */
export function HalaqatScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, ready, error, reminderError } = useHalaqat();
  const { signedIn, membership } = useMembership();
  const embedded = useEmbedded();
  const back = useBack();
  const create = () => router.push('/halaqat/new');
  const join = () => router.push('/halaqat/join');
  const Frame = embedded ? View : SafeAreaView;
  const halaqat = state.halaqat;
  const joined = membership.joined;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar title={t('halaqat.list.title')} palette={p} back={back}
      actions={signedIn && <Button icon="plus" palette={p} label={t('halaqat.list.createLabel')} disabled={!ready} onPress={create}>{t('halaqat.list.create')}</Button>} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 18 }, embedded && { paddingTop: 18 }]}>
      {!embedded && <PageTitle subtitle={t('halaqat.list.subtitle')} palette={p} />}
      {signedIn === false ? <Empty icon="users" motif="circle" palette={p} title={t('halaqat.sharing.signedOutTitle')} description={t('halaqat.sharing.signedOutBody')}>
        <Button size="lg" icon="user" palette={p} onPress={() => router.push('/account/sign-in')} block>{t('halaqat.sharing.signIn')}</Button>
      </Empty> : <>
        {error && <Alert variant="destructive" palette={p}>{t('halaqat.storage.error')}</Alert>}
        {reminderError && <Alert variant="destructive" palette={p}>{t('halaqat.reminders.syncFailed')}</Alert>}
        {!ready || signedIn === undefined || !membership.loaded ? <PlanLoading /> : !halaqat.length && !joined.length
          ? <Empty icon="users" motif="circle" palette={p} title={t('halaqat.list.empty.title')} description={t('halaqat.list.empty.description')}>
            <Button size="lg" icon="plus" palette={p} onPress={create} block>{t('halaqat.list.create')}</Button>
            <Button size="lg" variant="outline" icon="user-plus" palette={p} onPress={join} block>{t('halaqat.list.join')}</Button>
          </Empty> : <>
            {halaqat.length > 0 && (joined.length ? <Section title={t('halaqat.list.supervised')} palette={p}>
              {halaqat.map((halaqa) => <HalaqaCard key={halaqa.id} halaqa={halaqa} />)}
            </Section> : halaqat.map((halaqa) => <HalaqaCard key={halaqa.id} halaqa={halaqa} />))}
            {joined.length > 0 && (halaqat.length ? <Section title={t('halaqat.list.joined')} palette={p}>
              {joined.map((j) => <JoinedCard key={j.halaqa.id} joined={j} />)}
            </Section> : joined.map((j) => <JoinedCard key={j.halaqa.id} joined={j} />))}
            <AddRow title={t('halaqat.list.create')} detail={t('halaqat.list.createDetail')} onPress={create} palette={p} icon="users" />
            <AddRow title={t('halaqat.list.join')} detail={t('halaqat.list.joinDetail')} onPress={join} palette={p} icon="user-plus" />
          </>}
      </>}
    </ScrollView>
  </Frame>;
}

/**
 * A halaqa on the list, as a goal's card: its mark, its name and a line about it, how its
 * participants stand (`progress`), and at its foot when it next meets. The whole card opens the
 * halaqa; one meeting today also carries the way straight into its session (`start`).
 */
function HalaqaCardFrame({ id, name, summary, status, live, progress, start, label, palette: p }: {
  id: string; name: string; summary: string; status: string; live: boolean; progress?: ReactNode;
  start?: { label: string; icon: ReaderIconName; onPress: () => void }; label: string; palette: ReaderPalette;
}) {
  return <View style={[s.card, { backgroundColor: p.card, borderColor: live ? withAlpha(p.ornament, 0.5) : p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push({ pathname: '/halaqat/[id]', params: { id } })}
      style={({ pressed }) => [s.main, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={s.head}>
        <HalaqaMark palette={p} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{name}</Text>
          <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{summary}</Text>
        </View>
        {/* Room for the start button laid over the card's corner. */}
        {start && <View style={{ width: 44 }} />}
      </View>
      {progress}
      <View style={[s.foot, { borderColor: p.border }]}>
        {live ? <View style={[s.dot, { backgroundColor: p.ornament }]} /> : <ReaderIcon name="calendar" color={p.mutedForeground} size={14} />}
        <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: live ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: live ? '700' : '400' }}>{status}</Text>
        <ReaderIcon name="chevron" color={p.mutedForeground} size={15} />
      </View>
    </Pressable>
    {start && <Pressable accessibilityRole="button" accessibilityLabel={start.label} onPress={start.onPress} hitSlop={4}
      style={({ pressed }) => [s.play, { backgroundColor: p.primary, opacity: pressed ? 0.85 : 1 }]}>
      <ReaderIcon name={start.icon} color={p.primaryForeground} size={17} />
    </Pressable>}
  </View>;
}

/** A halaqa the user supervises: its participants as beads (those heard today filled), and today's session a tap away. */
function HalaqaCard({ halaqa }: { halaqa: Halaqa }) {
  const { palette: p } = useReadingPreferences();
  const { today } = usePlans();
  const { roleOf } = useMembership();
  const students = activeStudents(halaqa);
  const session = sessionOn(halaqa, today);
  const meets = nextMeeting(halaqa, today);
  const done = students.filter((s) => heard(entryOf(session, s.id))).length;
  const away = students.filter((s) => absent(entryOf(session, s.id))).length;
  const live = !!session || meets === today;
  const status = session ? formatList([t('halaqat.list.todayProgress', { done, total: students.length }), ...(away ? [t('halaqat.detail.away', { count: away })] : [])])
    : meets === today ? t('halaqat.list.meetsToday') : meets ? t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) }) : t('halaqat.list.noDays');
  const summary = roleOf(halaqa.id) === 'teacher' ? formatList([t('halaqat.list.coTeacher'), halaqaFacts(halaqa)]) : halaqaFacts(halaqa);
  return <HalaqaCardFrame palette={p} id={halaqa.id} name={halaqa.name} summary={summary} status={status} live={live}
    label={formatList([halaqa.name, t('halaqat.studentCount', { count: students.length }), status])}
    start={live && students.length ? { label: session ? t('halaqat.detail.continue') : t('halaqat.detail.start'), icon: session ? 'headphones' : 'play',
      onPress: () => router.push({ pathname: '/halaqat/session', params: { halaqa: halaqa.id, date: today } }) } : undefined}
    progress={students.length ? <GoalProgress count={students.length} done={session ? done : 0} max={40} label={t('halaqat.studentCount', { count: students.length })} />
      : <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('halaqat.list.noStudents')}</Text>} />;
}

/** A halaqa the user joined: who supervises it, their points this month and their place among the others. */
function JoinedCard({ joined }: { joined: JoinedHalaqa }) {
  const { palette: p } = useReadingPreferences();
  const { today } = usePlans();
  const { halaqa } = joined;
  const meets = nextMeeting(halaqa, today);
  const live = meets === today;
  const status = live ? t('halaqat.list.meetsToday') : meets ? t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) }) : t('halaqat.list.noDays');
  const supervisor = joined.teachers.find((x) => x.owner && x.name)?.name;
  const mine = joined.roster.find((r) => r.me);
  const rank = mine ? 1 + joined.roster.filter((r) => r.recent > mine.recent).length : undefined;
  return <HalaqaCardFrame palette={p} id={halaqa.id} name={halaqa.name} live={live} status={status}
    summary={formatList([t('halaqat.list.member'), ...(supervisor ? [t('halaqat.list.taughtBy', { name: supervisor })] : [])])}
    label={formatList([halaqa.name, t('halaqat.list.member'), status])}
    progress={<View style={s.points}>
      <Medallion value={rank ?? '–'} size={34} palette={p} current={rank === 1 && !!mine?.recent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600', lineHeight: 22 }}>{t('halaqat.list.myPoints', { count: mine?.recent ?? 0 })}</Text>
        {rank !== undefined && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('halaqat.list.myRank', { rank, total: joined.roster.length })}</Text>}
      </View>
    </View>} />;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  main: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 44, marginHorizontal: -14, paddingHorizontal: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  play: { position: 'absolute', top: 20, end: 12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
