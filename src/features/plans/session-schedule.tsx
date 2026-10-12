import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { Medallion } from '@/components/craft/marks';
import { ayahRangeLabel, type PlanIndex } from './engine';
import { spanCount } from './memorization';
import { d } from './plan-detail-components';
import { weekdayDateLabel } from './presentation';
import { t } from '@/i18n';
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

/**
 * Sessions a calendar week at a time (Monday first) with a week pager, as a thread of stars: each
 * day of the month in a star, the current session's filled with gold; what each holds under it.
 */
export function WeeklySchedule({ index, sessions, today, labels, summary, footer }: { index: PlanIndex; sessions: ScheduleSession[]; today: string; labels: ScheduleLabels; summary: string; footer: string }) {
  const { palette: p } = useReadingPreferences();
  const [week, setWeek] = useState(0);
  const weeks = groupSessionsByWeek(sessions);
  const currentWeek = weeks[Math.min(week, weeks.length - 1)] ?? [];
  return <View style={[scheduleStyles.card, { backgroundColor: p.card, borderColor: p.border }]}>
    <View style={[scheduleStyles.heading, { borderColor: p.border }]}>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={t('goals.previousWeek')} accessibilityState={{ disabled: week === 0 }} disabled={week === 0} onPress={() => setWeek(value => Math.max(0, value - 1))} style={({ pressed }) => [scheduleStyles.navButton, { backgroundColor: pressed ? p.accent : 'transparent', opacity: week === 0 ? 0.28 : pressed ? 0.7 : 1 }]}><ReaderIcon name="back" color={p.foreground} size={20} /></Pressable>
      <View style={scheduleStyles.headingCenter}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{t('session.weekly.week', { week: week + 1, total: weeks.length })}</Text><Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{summary}</Text></View>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel={t('goals.nextWeek')} accessibilityState={{ disabled: week >= weeks.length - 1 }} disabled={week >= weeks.length - 1} onPress={() => setWeek(value => Math.min(weeks.length - 1, value + 1))} style={({ pressed }) => [scheduleStyles.navButton, { backgroundColor: pressed ? p.accent : 'transparent', opacity: week >= weeks.length - 1 ? 0.28 : pressed ? 0.7 : 1 }]}><View style={{ transform: [{ rotate: '180deg' }] }}><ReaderIcon name="back" color={p.foreground} size={20} /></View></Pressable>
    </View>
    <View style={scheduleStyles.list}>
      {currentWeek.map((session, i) => {
        const current = week === 0 && i === 0;
        const status = session.note ?? (current ? (session.date === today ? labels.today : labels.next) : week === 0 && i === 1 ? labels.following : labels.later);
        return <View key={session.date} style={[scheduleStyles.timelineRow, current && { backgroundColor: withAlpha(p.ornament, 0.08), borderRadius: readerShape.control }]}>
          <View style={scheduleStyles.markerColumn}>
            {i > 0 && <View style={[scheduleStyles.thread, scheduleStyles.threadUp, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />}
            {i < currentWeek.length - 1 && <View style={[scheduleStyles.thread, scheduleStyles.threadDown, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />}
            <Medallion value={Number(session.date.slice(8))} size={38} palette={p} current={current} />
          </View>
          <View style={scheduleStyles.sessionContent}>
            <View style={[d.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
              <View style={{ gap: 1, flex: 1 }}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '700' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: current ? p.foreground : p.mutedForeground, fontSize: 12 }}>{status}</Text></View>
              <Text style={{ color: current ? p.foreground : p.mutedForeground, fontSize: 12, fontWeight: current ? '700' : '400', marginTop: 2 }}>{ayahCountLabel(spanCount(session.ranges))}</Text>
            </View>
            <View style={scheduleStyles.ranges}>
              {session.ranges.map(range => <View key={range.start} style={scheduleStyles.range}><View style={[scheduleStyles.rangeDot, { backgroundColor: withAlpha(p.ornament, current ? 1 : 0.6) }]} /><Text style={{ color: p.mutedForeground, fontSize: 13, flex: 1 }}>{ayahRangeLabel(index, range.start, range.end)}</Text></View>)}
            </View>
          </View>
        </View>;
      })}
    </View>
    <View style={[scheduleStyles.footer, { borderColor: p.border }]}><ReaderIcon name="calendar" color={p.mutedForeground} size={16} /><Text style={{ color: p.mutedForeground, fontSize: 13, flex: 1 }}>{footer}</Text></View>
  </View>;
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
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  heading: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  headingCenter: { flex: 1, alignItems: 'center' },
  navButton: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 8, paddingVertical: 6 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, paddingHorizontal: 6 },
  markerColumn: { width: 40, alignItems: 'center', paddingTop: 10 },
  thread: { position: 'absolute', width: 1, left: 19.5 },
  // Each half of the thread stops at the star, which is drawn see-through.
  threadUp: { top: 0, height: 10 },
  threadDown: { top: 50, bottom: 0 },
  sessionContent: { flex: 1, minWidth: 0, gap: 6, paddingVertical: 12 },
  ranges: { gap: 4 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rangeDot: { width: 5, height: 5, borderRadius: readerShape.detail },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
