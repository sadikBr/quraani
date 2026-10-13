import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useEmbedded } from '@/components/embedded';
import { ArchPanel } from '@/components/craft/panels';
import { Beads } from '@/components/craft/marks';
import { AddRow, PageBar, PageTitle, page } from '@/components/craft/page';
import { Alert, Button, Empty } from '@/components/ui';
import { useBack } from '@/components/back';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { usePlans } from '@/features/plans/provider';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { PlanLoading } from '@/features/plans/components';
import { formatList, t } from '@/i18n';
import { useHalaqat } from './provider';
import { halaqaFacts } from './shared';
import { absent, activeStudents, entryOf, heard, nextMeeting, sessionOn, type Halaqa } from './model';

/**
 * The teacher's halaqat, each a window onto its day: its name, its riwayah and days, and its
 * students as beads on a thread, those heard today filled. Shown alone, or in the home screen's
 * «الحلقات» tab without its own bar and title.
 */
export function HalaqatScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, ready, error, reminderError } = useHalaqat();
  const embedded = useEmbedded();
  const back = useBack();
  const create = () => router.push('/halaqat/new');
  const Frame = embedded ? View : SafeAreaView;
  const halaqat = state.halaqat;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar palette={p} back={back}
      actions={<Button icon="plus" palette={p} label={t('halaqat.list.createLabel')} disabled={!ready} onPress={create}>{t('halaqat.list.create')}</Button>} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 18 }, embedded && { paddingTop: 18 }]}>
      {!embedded && <PageTitle title={t('halaqat.list.title')} subtitle={t('halaqat.list.subtitle')} palette={p} />}
      {error && <Alert variant="destructive" palette={p}>{t('halaqat.storage.error')}</Alert>}
      {reminderError && <Alert variant="destructive" palette={p}>{t('halaqat.reminders.syncFailed')}</Alert>}
      {!ready ? <PlanLoading /> : !halaqat.length ? <Empty icon="users" motif="arches" palette={p} title={t('halaqat.list.empty.title')} description={t('halaqat.list.empty.description')}>
        <Button size="lg" icon="plus" palette={p} onPress={create} block>{t('halaqat.list.create')}</Button>
      </Empty> : <>
        {halaqat.map((halaqa) => <HalaqaCard key={halaqa.id} halaqa={halaqa} />)}
        <AddRow title={t('halaqat.list.create')} detail={t('halaqat.list.createDetail')} onPress={create} palette={p} icon="users" />
      </>}
    </ScrollView>
  </Frame>;
}

/** A halaqa through an arched window: today's session (or the next), and its students as beads. */
function HalaqaCard({ halaqa }: { halaqa: Halaqa }) {
  const { palette: p } = useReadingPreferences();
  const { today } = usePlans();
  const students = activeStudents(halaqa);
  const session = sessionOn(halaqa, today);
  const meets = nextMeeting(halaqa, today);
  const done = students.filter((s) => heard(entryOf(session, s.id))).length;
  const away = students.filter((s) => absent(entryOf(session, s.id))).length;
  const status = session ? formatList([t('halaqat.list.todayProgress', { done, total: students.length }), ...(away ? [t('halaqat.detail.away', { count: away })] : [])])
    : meets === today ? t('halaqat.list.meetsToday') : meets ? t('halaqat.list.nextMeeting', { date: weekdayDateLabel(meets) }) : t('halaqat.list.noDays');
  const facts = halaqaFacts(halaqa);
  const live = !!session || meets === today;
  return <Pressable accessibilityRole="button" accessibilityLabel={formatList([halaqa.name, t('halaqat.studentCount', { count: students.length }), status])}
    onPress={() => router.push({ pathname: '/halaqat/[id]', params: { id: halaqa.id } })}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}>
    <ArchPanel palette={p} rise={38} tone={live ? withAlpha(p.ornament, 0.85) : undefined} contentStyle={s.panel}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: withAlpha(p.ornament, 0.14) }]}><ReaderIcon name="users" color={p.ornament} size={20} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{halaqa.name}</Text>
          <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{facts}</Text>
        </View>
        <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </View>
      {students.length ? <View style={{ gap: 8 }}>
        <Beads count={students.length} done={session ? done : 0} palette={p} size={9} max={40} tone={p.ornament}
          label={t('halaqat.studentCount', { count: students.length })} />
        <View style={s.foot}>
          <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('halaqat.studentCount', { count: students.length })}</Text>
          <Text numberOfLines={1} style={{ flexShrink: 1, color: live ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: live ? '600' : '400' }}>{status}</Text>
        </View>
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('halaqat.list.noStudents')}</Text>}
    </ArchPanel>
  </Pressable>;
}

const s = StyleSheet.create({
  panel: { paddingHorizontal: 18, paddingBottom: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
