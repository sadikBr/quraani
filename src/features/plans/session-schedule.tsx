import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { PlanCard } from './components';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { spanCount } from './memorization';
import { d } from './plan-detail-components';
import { weekdayDateLabel } from './presentation';
import { formatNumber, t } from '@/i18n';
import type { AyahSpan } from './types';

export interface ScheduleSession { date: string; ranges: AyahSpan[]; note?: string }
export interface ScheduleLabels { today: string; next: string; following: string; later: string }
export const MEMORIZATION_LABELS: ScheduleLabels = {
  get today() { return t('session.weekly.memorization.today'); }, get next() { return t('session.weekly.memorization.next'); },
  get following() { return t('session.weekly.memorization.following'); }, get later() { return t('session.weekly.memorization.later'); },
};
export const REVISION_LABELS: ScheduleLabels = {
  get today() { return t('session.weekly.revision.today'); }, get next() { return t('session.weekly.revision.next'); },
  get following() { return t('session.weekly.revision.following'); }, get later() { return t('session.weekly.revision.later'); },
};

/** Sessions grouped by calendar week (Monday first) with a week pager; the first session is the current one. */
export function WeeklySchedule({ index, sessions, today, labels, summary, footer }: { index: PlanIndex; sessions: ScheduleSession[]; today: string; labels: ScheduleLabels; summary: string; footer: string }) {
  const { palette: p } = useReadingPreferences();
  const [week, setWeek] = useState(0);
  const weeks = groupSessionsByWeek(sessions);
  const currentWeek = weeks[Math.min(week, weeks.length - 1)] ?? [];
  return <PlanCard>
    <View style={[scheduleStyles.heading, { borderColor: p.border }]}>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={t('goals.previousWeek')} accessibilityState={{ disabled: week === 0 }} disabled={week === 0} onPress={() => setWeek(value => Math.max(0, value - 1))} style={({ pressed }) => [scheduleStyles.navButton, scheduleStyles.previousNav, { backgroundColor: pressed ? p.accent : 'transparent', opacity: week === 0 ? 0.28 : pressed ? 0.7 : 1 }]}><ReaderIcon name="back" color={p.foreground} size={20} /></Pressable>
      <View style={scheduleStyles.headingCenter}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('session.weekly.week', { week: week + 1, total: weeks.length })}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{summary}</Text></View>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={t('goals.nextWeek')} accessibilityState={{ disabled: week >= weeks.length - 1 }} disabled={week >= weeks.length - 1} onPress={() => setWeek(value => Math.min(weeks.length - 1, value + 1))} style={({ pressed }) => [scheduleStyles.navButton, scheduleStyles.nextNav, { backgroundColor: pressed ? p.accent : 'transparent', opacity: week >= weeks.length - 1 ? 0.28 : pressed ? 0.7 : 1 }]}><View style={{ transform: [{ rotate: '180deg' }] }}><ReaderIcon name="back" color={p.foreground} size={20} /></View></Pressable>
    </View>
    <View style={scheduleStyles.list}>
      {currentWeek.map((session, i) => {
        const current = week === 0 && i === 0;
        const status = session.note ?? (current ? (session.date === today ? labels.today : labels.next) : week === 0 && i === 1 ? labels.following : labels.later);
        return <View key={session.date} style={scheduleStyles.timelineRow}>
        <View style={scheduleStyles.markerColumn}>
          <View style={[scheduleStyles.marker, { backgroundColor: current ? p.primary : 'transparent', borderColor: current ? p.primary : p.border }]}><Text style={{ color: current ? p.primaryForeground : p.mutedForeground, fontSize: 12, fontWeight: '600' }}>{formatNumber(i + 1)}</Text></View>
          {i < currentWeek.length - 1 && <View style={[scheduleStyles.connector, { backgroundColor: p.border }]} />}
        </View>
        <View style={[scheduleStyles.sessionContent, { borderColor: p.border, backgroundColor: current ? p.accent : 'transparent', borderRadius: current ? readerShape.control : 0, borderBottomWidth: current || i === currentWeek.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
          <View style={[d.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ gap: 2, flex: 1 }}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.mutedForeground, fontSize: 12 }}>{status}</Text></View>
            <Text style={{ color: current ? p.primary : p.mutedForeground, fontSize: 13, fontWeight: current ? '600' : '400' }}>{ayahCountLabel(spanCount(session.ranges))}</Text>
          </View>
          <View style={scheduleStyles.ranges}>
            {session.ranges.map(range => <View key={range.start} style={scheduleStyles.range}><View style={[scheduleStyles.rangeDot, { backgroundColor: current ? p.primary : p.mutedForeground }]} /><Text style={{ color: p.mutedForeground, fontSize: 13, flex: 1 }}>{ayahRangeLabel(index, range.start, range.end)}</Text></View>)}
          </View>
        </View>
      </View>;
      })}
    </View>
    <View style={[scheduleStyles.footer, { borderColor: p.border }]}><ReaderIcon name="calendar" color={p.mutedForeground} size={16} /><Text style={{ color: p.mutedForeground, fontSize: 13, flex: 1 }}>{footer}</Text></View>
  </PlanCard>;
}

export function ayahCountLabel(count: number) {
  return t('session.weekly.ayahCount', { count });
}

function groupSessionsByWeek(sessions: ScheduleSession[]) {
  const groups = new Map<string, ScheduleSession[]>();
  for (const session of sessions) {
    const date = new Date(`${session.date}T12:00:00Z`);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    const key = date.toISOString().slice(0, 10);
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([, group]) => group.sort((first, second) => first.date.localeCompare(second.date)));
}

const scheduleStyles = StyleSheet.create({
  heading: { position: 'relative', minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth, ...Platform.select({ native: { direction: 'ltr' as const }, web: { direction: 'ltr' as const } }) },
  headingCenter: { flex: 1, alignItems: 'center', gap: 2 },
  navButton: { position: 'absolute', top: 0, width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  previousNav: { right: 0 },
  nextNav: { left: 0 },
  list: { gap: 0 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 78 },
  markerColumn: { width: 38, alignItems: 'center' },
  marker: { width: 30, height: 30, borderRadius: readerShape.control - 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 1, flex: 1, marginVertical: 4 },
  sessionContent: { flex: 1, minWidth: 0, gap: 8, paddingHorizontal: 12, paddingVertical: 11, marginStart: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  ranges: { gap: 5, paddingTop: 4 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rangeDot: { width: 5, height: 5, borderRadius: readerShape.detail },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});

