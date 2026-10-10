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
import { arabicNumber, weekdayDateLabel } from './presentation';
import type { AyahSpan } from './types';

export interface ScheduleSession { date: string; ranges: AyahSpan[]; note?: string }
export interface ScheduleLabels { today: string; next: string; following: string; later: string }
export const MEMORIZATION_LABELS: ScheduleLabels = { today: 'ورد اليوم', next: 'الورد القادم', following: 'الورد التالي', later: 'ورد لاحق' };
export const REVISION_LABELS: ScheduleLabels = { today: 'مراجعة اليوم', next: 'المراجعة القادمة', following: 'المراجعة التالية', later: 'مراجعة لاحقة' };

/** Sessions grouped by calendar week (Monday first) with a week pager; the first session is the current one. */
export function WeeklySchedule({ index, sessions, today, labels, summary, footer }: { index: PlanIndex; sessions: ScheduleSession[]; today: string; labels: ScheduleLabels; summary: string; footer: string }) {
  const { palette: p } = useReadingPreferences();
  const [week, setWeek] = useState(0);
  const weeks = groupSessionsByWeek(sessions);
  const currentWeek = weeks[Math.min(week, weeks.length - 1)] ?? [];
  return <PlanCard>
    <View style={[scheduleStyles.heading, { borderColor: p.border }]}>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel="الأسبوع السابق" accessibilityState={{ disabled: week === 0 }} disabled={week === 0} onPress={() => setWeek(value => Math.max(0, value - 1))} style={({ pressed }) => [scheduleStyles.navButton, scheduleStyles.previousNav, { backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: week === 0 ? 0.28 : pressed ? 0.7 : 1 }]}><ReaderIcon name="back" color={week === 0 ? p.muted : p.accent} size={22} strokeWidth={2.05} /></Pressable>
      <View style={scheduleStyles.headingCenter}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>الأسبوع {arabicNumber(week + 1)} من {arabicNumber(weeks.length)}</Text><Text style={{ color: p.muted, fontSize: 13 }}>{summary}</Text></View>
      <Pressable hitSlop={6} accessibilityRole="button" accessibilityLabel="الأسبوع التالي" accessibilityState={{ disabled: week >= weeks.length - 1 }} disabled={week >= weeks.length - 1} onPress={() => setWeek(value => Math.min(weeks.length - 1, value + 1))} style={({ pressed }) => [scheduleStyles.navButton, scheduleStyles.nextNav, { backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: week >= weeks.length - 1 ? 0.28 : pressed ? 0.7 : 1 }]}><View style={{ transform: [{ rotate: '180deg' }] }}><ReaderIcon name="back" color={week >= weeks.length - 1 ? p.muted : p.accent} size={22} strokeWidth={2.05} /></View></Pressable>
    </View>
    <View style={scheduleStyles.list}>
      {currentWeek.map((session, i) => {
        const current = week === 0 && i === 0;
        const status = session.note ?? (current ? (session.date === today ? labels.today : labels.next) : week === 0 && i === 1 ? labels.following : labels.later);
        return <View key={session.date} style={scheduleStyles.timelineRow}>
        <View style={scheduleStyles.markerColumn}>
          <View style={[scheduleStyles.marker, { backgroundColor: current ? p.accent : 'transparent', borderColor: current ? p.accent : p.border }]}><Text style={{ color: current ? p.paper : p.muted, fontSize: 12, fontWeight: '600' }}>{arabicNumber(i + 1)}</Text></View>
          {i < currentWeek.length - 1 && <View style={[scheduleStyles.connector, { backgroundColor: p.border }]} />}
        </View>
        <View style={[scheduleStyles.sessionContent, { borderColor: p.border, backgroundColor: current ? p.accentSoft : 'transparent', borderRadius: current ? readerShape.control : 0, borderBottomWidth: current || i === currentWeek.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
          <View style={[d.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ gap: 2, flex: 1 }}><Text style={{ color: current ? p.accent : p.text, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{status}</Text></View>
            <Text style={{ color: current ? p.accent : p.muted, fontSize: 13, fontWeight: current ? '600' : '400' }}>{ayahCountLabel(spanCount(session.ranges))}</Text>
          </View>
          <View style={scheduleStyles.ranges}>
            {session.ranges.map(range => <View key={range.start} style={scheduleStyles.range}><View style={[scheduleStyles.rangeDot, { backgroundColor: current ? p.accent : p.muted }]} /><Text style={{ color: p.muted, fontSize: 13, flex: 1 }}>{ayahRangeLabel(index, range.start, range.end)}</Text></View>)}
          </View>
        </View>
      </View>;
      })}
    </View>
    <View style={[scheduleStyles.footer, { borderColor: p.border }]}><ReaderIcon name="calendar" color={p.muted} size={16} /><Text style={{ color: p.muted, fontSize: 13, flex: 1 }}>{footer}</Text></View>
  </PlanCard>;
}

export function ayahCountLabel(count: number) {
  if (count === 1) return 'آية واحدة';
  if (count === 2) return 'آيتان';
  if (count >= 3 && count <= 10) return `${arabicNumber(count)} آيات`;
  return `${arabicNumber(count)} آية`;
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

