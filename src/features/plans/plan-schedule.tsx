import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { addDays, dateLabel } from './dates';
import { ayahRangeLabel, nextPortion, rangeLabel, type PlanIndex } from './engine';
import { d } from './plan-detail-components';
import { arabicNumber, shortDate } from './presentation';
import type { SequentialPlan } from './types';

export function PlanSchedule({ plan, index, today }: { plan: SequentialPlan; index: PlanIndex; today: string }) {
  const current = plan.cycle.sessions.findIndex(s => s.end > plan.cycle.cursor);
  // Follow progress to the current week, while keeping manual week navigation local.
  return <WeeklySchedule key={`${plan.cycle.number}:${current}`} plan={plan} index={index} today={today} current={current} />;
}

function WeeklySchedule({ plan, index, today, current }: { plan: SequentialPlan; index: PlanIndex; today: string; current: number }) {
  const { palette: p } = useReadingPreferences();
  const weeks = Math.ceil(plan.cycle.sessions.length / 7);
  const [week, setWeek] = useState(current < 0 ? weeks - 1 : Math.floor(current / 7));
  const [expanded, setExpanded] = useState<number | null>(current < 0 ? null : current);
  const next = nextPortion(plan, today);
  const navigate = (offset: number) => { setWeek(w => w + offset); setExpanded(null); };
  return <View style={{ gap: 12 }}>
    <View style={[d.row, { justifyContent: 'space-between' }]}>
      <Text accessibilityRole="header" style={{ color: p.text, fontSize: 21, fontWeight: '600' }}>{plan.goal.type === 'khatma' ? 'جدول الختمة' : 'مسار القراءة'}</Text>
      <Text style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(plan.cycle.sessions.length)} وردًا</Text>
    </View>
    {plan.goal.type === 'wird' && <Text style={{ color: p.muted, fontSize: 12 }}>المواعيد القادمة تقديرية، وتتبع آخر ورد أكملته.</Text>}
    <View style={[styles.calendar, { backgroundColor: p.paper, borderColor: p.border }]}>
      <View style={[styles.week, { borderColor: p.border }]}>
        <WeekButton previous disabled={week === 0} onPress={() => navigate(-1)} />
        <Text accessibilityLiveRegion="polite" style={{ color: p.text, fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' }}>الأسبوع {arabicNumber(week + 1)} <Text style={{ color: p.muted, fontSize: 12 }}>من {arabicNumber(weeks)}</Text></Text>
        <WeekButton disabled={week === weeks - 1} onPress={() => navigate(1)} />
      </View>
      <View style={{ padding: 8 }}>
        {plan.cycle.sessions.slice(week * 7, week * 7 + 7).map((session, offset, visible) => {
          const slot = week * 7 + offset;
          const done = session.end <= plan.cycle.cursor;
          const active = slot === current && plan.status === 'active';
          const actual = plan.cycle.progress.find(log => log.to === session.end)?.date;
          const date = actual ?? (plan.goal.type === 'wird' && next && slot >= next.slot ? addDays(next.date, slot - next.slot) : session.date);
          const isExpanded = expanded === slot;
          const status = done ? 'مكتمل' : active ? date <= today ? 'وردك الحالي' : 'القادم' : '';
          return <View key={`${slot}:${session.end}`}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`الورد ${slot + 1}، ${rangeLabel(index, session.start, session.end)}، ${dateLabel(date)}${status ? `، ${status}` : ''}`}
              onPress={() => setExpanded(isExpanded ? null : slot)}
              style={({ pressed }) => [styles.session, { backgroundColor: active || pressed ? p.accentSoft : 'transparent' }]}>
              <View style={{ alignSelf: 'stretch', alignItems: 'center', paddingTop: 9, width: 28 }}>
                <View style={[styles.marker, { backgroundColor: done ? p.accent : active ? p.paper : 'transparent', borderColor: done || active ? p.accent : p.border }]}>
                  {done ? <ReaderIcon name="check" color={p.paper} size={14} /> : <Text style={{ color: active ? p.accent : p.muted, fontSize: 11, textAlign: 'center' }}>{arabicNumber(slot + 1)}</Text>}
                </View>
                {offset < visible.length - 1 && <View style={[styles.connector, { backgroundColor: p.border }]} />}
              </View>
              <View style={d.grow}>
                <View style={[d.row, { justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 0 }]}>
                  <Text style={{ color: active ? p.accent : p.muted, fontSize: 11 }}>{date === today ? 'اليوم' : shortDate(date)}</Text>
                  {!!status && <Text style={{ color: active ? p.accent : p.muted, fontSize: 11, fontWeight: active ? '600' : '400' }}>{status}</Text>}
                </View>
                <Text style={{ color: p.text, fontSize: 16, fontWeight: active ? '600' : '400' }}>{rangeLabel(index, session.start, session.end)}</Text>
                {isExpanded && <Text style={{ color: p.muted, fontSize: 12, marginTop: 4 }}>{ayahRangeLabel(index, session.start, session.end)}</Text>}
              </View>
              <View style={{ transform: [{ rotate: isExpanded ? '-90deg' : '0deg' }], marginTop: 15 }}><ReaderIcon name="chevron" color={p.muted} size={15} /></View>
            </Pressable>
          </View>;
        })}
      </View>
    </View>
  </View>;
}
function WeekButton({ previous = false, disabled, onPress }: { previous?: boolean; disabled: boolean; onPress: () => void }) {
  const { palette } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={previous ? 'الأسبوع السابق' : 'الأسبوع التالي'} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.weekButton, { opacity: disabled ? 0.25 : pressed ? 0.6 : 1, backgroundColor: pressed ? palette.accentSoft : 'transparent' }]}>
    <View style={{ transform: [{ rotate: previous ? '180deg' : '0deg' }] }}><ReaderIcon name="chevron" color={palette.text} size={20} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  calendar: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  week: { flexDirection: 'row', alignItems: 'center', padding: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  weekButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  session: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: readerShape.control },
  marker: { width: 26, minHeight: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  connector: { position: 'absolute', top: 39, bottom: -12, width: 1 },
});
