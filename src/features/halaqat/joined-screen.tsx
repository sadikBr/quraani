import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchPanel } from '@/components/craft/panels';
import { PageBar, Section, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { IconButton } from '@/features/quran-reader/components/ui/reader-chrome';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { PersonPhoto } from '@/features/account/avatar';
import { initialOf } from '@/features/account/profile';
import { formatList, t } from '@/i18n';
import { ConfirmDialog } from './confirm-dialog';
import { currentAssignment, nextMeeting } from './model';
import { photoOf, type JoinedHalaqa } from './membership';
import { useMembership } from './provider';
import { Scoreboard } from './scoreboard';
import { backOrHalaqat, halaqaFacts, LawhPortion, useHalaqaIndex } from './shared';
import { StudentRecord } from './student-screen';

/**
 * A halaqa as one of its members sees it, from their own phone: who teaches it and when it meets,
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
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: backOrHalaqat }} palette={p}
      actions={membership.refreshing ? <ActivityIndicator color={p.mutedForeground} /> : <IconButton name="sync" label={t('halaqat.sharing.refresh')} palette={p} onPress={() => void refresh()} />} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      {membership.problem && <Alert icon="cloud-alert" palette={p}>{t('halaqat.sharing.offline')}</Alert>}
      <ArchPanel palette={p} rise={46} tone={meets === today ? p.ornament : undefined} contentStyle={s.hero}>
        <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{halaqaFacts(halaqa)}</Text>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 26, lineHeight: 42, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{halaqa.name}</Text>
        {!!teachers.length && <View style={s.teachers}>
          <View style={s.faces}>
            {teachers.slice(0, 3).map((x, i) => <View key={i} style={i > 0 && { marginStart: -10 }}>
              <PersonPhoto size={30} photo={photoOf(membership, x.avatar)} cacheKey={x.avatar} initial={initialOf(x.name, t('halaqat.sharing.noInitial'))} palette={p} />
            </View>)}
          </View>
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('halaqat.list.taughtBy', { name: formatList(teachers.map((x) => x.name)) })}</Text>
        </View>}
        {meets && <Text style={{ color: meets === today ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: meets === today ? '600' : '400', textAlign: 'center' }}>
          {meets === today ? t('halaqat.list.meetsToday') : t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) })}
        </Text>}
      </ArchPanel>

      {error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>
        : !index || !shape ? <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
          <Section title={t('halaqat.sharing.myLawh')} palette={p}>
            <View style={{ gap: 12 }}>
              <LawhPortion title={t('halaqat.lawh.new')} portion={assigned.new} index={index} shape={shape} palette={p} emptyText={t('halaqat.sharing.noNew')} />
              {assigned.revision && <LawhPortion title={t('halaqat.lawh.revision')} portion={assigned.revision} index={index} shape={shape} palette={p} emptyText={t('halaqat.sharing.noRevision')} />}
            </View>
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
  hero: { alignItems: 'center', gap: 6, paddingTop: 52, paddingHorizontal: 18, paddingBottom: 20 },
  teachers: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  faces: { flexDirection: 'row', alignItems: 'center' },
});
