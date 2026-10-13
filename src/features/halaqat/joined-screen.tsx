import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { artColors } from '@/components/craft/art';
import { PageBar, Section, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { IconButton } from '@/features/quran-reader/components/ui/reader-chrome';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { PersonPhoto } from '@/features/account/avatar';
import { initialOf } from '@/features/account/profile';
import { formatList, formatNumber, t } from '@/i18n';
import { ConfirmDialog } from './confirm-dialog';
import { currentAssignment, nextMeeting } from './model';
import { photoOf, type JoinedHalaqa } from './membership';
import { useMembership } from './provider';
import { DoorPill, HalaqaDoor, RingCount, type Seat } from './ring';
import { Scoreboard } from './scoreboard';
import { backOrHalaqat, halaqaFacts, LawhBoard, useHalaqaIndex } from './shared';
import { StudentRecord } from './student-screen';

/**
 * A halaqa as one of its members sees it, from their own phone: its door (its ring with their
 * own seat in gold and their points this month in the middle, who supervises it, when it meets),
 * their lawh, everyone's points, and their own record. Nothing here changes it: its teachers do.
 */
export function JoinedHalaqaScreen({ joined }: { joined: JoinedHalaqa }) {
  const { palette: p } = useReadingPreferences();
  const { today } = usePlans();
  const { membership, refresh, leave } = useMembership();
  const { index, shape, error, retry } = useHalaqaIndex(joined.halaqa.riwayah);
  const [leaving, setLeaving] = useState(false);
  const [leaveFailed, setLeaveFailed] = useState(false);
  const { halaqa } = joined;
  const student = halaqa.students[0];
  const assigned = currentAssignment(halaqa, student);
  const meets = nextMeeting(halaqa, today);
  const teachers = joined.teachers.filter((x) => x.name);
  const colors = artColors(p);
  // Round the ring from the top, by this month's points: the member's own seat in gold.
  const ranked = [...joined.roster].sort((a, b) => b.recent - a.recent);
  const mine = ranked.find((r) => r.me);
  const rank = mine ? 1 + ranked.filter((r) => r.recent > mine.recent).length : undefined;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: backOrHalaqat }} palette={p}
      actions={membership.refreshing ? <ActivityIndicator color={p.mutedForeground} /> : <IconButton name="sync" label={t('halaqat.sharing.refresh')} palette={p} onPress={() => void refresh()} />} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      {membership.problem && <Alert icon="cloud-alert" palette={p}>{t('halaqat.sharing.offline')}</Alert>}
      <HalaqaDoor palette={p} kicker={halaqaFacts(halaqa)} title={halaqa.name}
        seats={ranked.map((r): Seat => r.me ? 'me' : 'waiting')} ringLabel={mine ? formatList([t('halaqat.list.myPoints', { count: mine.recent }), t('halaqat.list.myRank', { rank: rank!, total: ranked.length })]) : undefined}
        center={<RingCount tile palette={p} value={formatNumber(mine?.recent ?? 0)} caption={t('halaqat.sharing.myPointsShort')} />}
        detail={teachers.length ? <View style={s.teachers}>
          <View style={s.faces}>
            {teachers.slice(0, 3).map((x, i) => <View key={i} style={[s.face, { borderColor: colors.edge }, i > 0 && { marginStart: -10 }]}>
              <PersonPhoto size={28} photo={photoOf(membership, x.avatar)} cacheKey={x.avatar} initial={initialOf(x.name, t('halaqat.sharing.noInitial'))} palette={p} />
            </View>)}
          </View>
          <Text style={{ flexShrink: 1, color: colors.soft, fontSize: 13, lineHeight: 20 }}>{t('halaqat.list.taughtBy', { name: formatList(teachers.map((x) => x.name)) })}</Text>
        </View> : undefined}>
        {meets && <DoorPill palette={p} filled={meets === today} icon="calendar"
          text={meets === today ? t('halaqat.list.meetsToday') : t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) })} />}
      </HalaqaDoor>

      {error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>
        : !index || !shape ? <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
          <Section title={t('halaqat.sharing.myLawh')} palette={p}>
            <LawhBoard index={index} shape={shape} palette={p} lines={[
              { title: t('halaqat.lawh.new'), portion: assigned.new, emptyText: t('halaqat.sharing.noNew') },
              ...(assigned.revision ? [{ title: t('halaqat.lawh.revision'), portion: assigned.revision, emptyText: t('halaqat.sharing.noRevision') }] : []),
            ]} />
          </Section>
          {joined.roster.length > 0 && <Section title={t('halaqat.sharing.board')} palette={p}>
            <Scoreboard palette={p} rows={joined.roster.map((r) => ({ key: r.student, name: r.name, photo: photoOf(membership, r.avatar), cacheKey: r.avatar, total: r.total, recent: r.recent, me: r.me }))} />
          </Section>}
          <StudentRecord halaqa={halaqa} student={student} index={index} shape={shape} self />
        </>}

      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" icon="log-out" tone={p.destructive} palette={p} onPress={() => { setLeaveFailed(false); setLeaving(true); }}>{t('halaqat.sharing.leave')}</Button>
      </View>
      {leaveFailed && <Alert variant="destructive" palette={p}>{t('halaqat.sharing.leaveFailed')}</Alert>}
    </ScrollView>
    {leaving && <ConfirmDialog icon="log-out" title={t('halaqat.sharing.leaveTitle')} body={t('halaqat.sharing.leaveMemberBody', { name: halaqa.name })}
      confirm={t('halaqat.sharing.leave')} onClose={() => setLeaving(false)}
      onConfirm={() => { setLeaving(false); leave(halaqa.id).then(backOrHalaqat, () => setLeaveFailed(true)); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  teachers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  faces: { flexDirection: 'row', alignItems: 'center' },
  face: { borderWidth: 1.5, borderRadius: 16 },
});
