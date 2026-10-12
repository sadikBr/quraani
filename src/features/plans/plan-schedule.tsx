import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { Section } from '@/components/craft/page';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { addDays, dateLabel } from './dates';
import { ayahRangeLabel, nextPortion, rangeLabel, type PlanIndex } from './engine';
import { d } from './plan-detail-components';
import { shortDate } from './presentation';
import { formatList, t } from '@/i18n';
import { tRich } from '@/i18n/rich';
import type { SequentialPlan } from './types';

export function PlanSchedule({ plan, index, today }: { plan: SequentialPlan; index: PlanIndex; today: string }) {
  const current = plan.cycle.sessions.findIndex(s => s.end > plan.cycle.cursor);
  // Follow progress to the current week, while keeping manual week navigation local.
  return <WeeklySchedule key={`${plan.cycle.number}:${current}`} plan={plan} index={index} today={today} current={current} />;
}

/**
 * The round's portions a week at a time, as a thread of stars: each portion's number in a star,
 * filled with gold once read, the current one ringed; a tap shows the portion's ayahs.
 */
function WeeklySchedule({ plan, index, today, current }: { plan: SequentialPlan; index: PlanIndex; today: string; current: number }) {
  const { palette: p } = useReadingPreferences();
  const weeks = Math.ceil(plan.cycle.sessions.length / 7);
  const [week, setWeek] = useState(current < 0 ? weeks - 1 : Math.floor(current / 7));
  const [expanded, setExpanded] = useState<number | null>(current < 0 ? null : current);
  const next = nextPortion(plan, today);
  const navigate = (offset: number) => { setWeek(w => w + offset); setExpanded(null); };
  return <Section title={plan.goal.type === 'khatma' ? t('session.plan.khatmaTitle') : t('session.plan.wirdTitle')} detail={t('session.plan.total', { count: plan.cycle.sessions.length })} palette={p}>
    {plan.goal.type === 'wird' && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, marginTop: -4 }}>{t('session.plan.wirdNote')}</Text>}
    <View style={[styles.calendar, { backgroundColor: p.card, borderColor: p.border }]}>
      <View style={[styles.week, { borderColor: p.border }]}>
        <WeekButton previous disabled={week === 0} onPress={() => navigate(-1)} />
        <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold', flex: 1, textAlign: 'center' }}>{tRich('session.plan.week', { week: week + 1, of: <Text style={{ color: p.mutedForeground, fontSize: 13, fontFamily: 'UiSans' }}>{t('session.plan.weekOf', { total: weeks })}</Text> })}</Text>
        <WeekButton disabled={week === weeks - 1} onPress={() => navigate(1)} />
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
        {plan.cycle.sessions.slice(week * 7, week * 7 + 7).map((session, offset, visible) => {
          const slot = week * 7 + offset;
          const done = session.end <= plan.cycle.cursor;
          const active = slot === current && plan.status === 'active';
          const actual = plan.cycle.progress.find(log => log.to === session.end)?.date;
          const date = actual ?? (plan.goal.type === 'wird' && next && slot >= next.slot ? addDays(next.date, slot - next.slot) : session.date);
          const isExpanded = expanded === slot;
          const status = done ? t('session.plan.status.done') : active ? date <= today ? t('session.plan.status.current') : t('session.plan.status.upcoming') : '';
          return <Pressable key={`${slot}:${session.end}`} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={formatList([t('session.plan.sessionNumber', { number: slot + 1 }), rangeLabel(index, session.start, session.end), dateLabel(date), ...(status ? [status] : [])])}
            onPress={() => setExpanded(isExpanded ? null : slot)}
            style={({ pressed }) => [styles.session, { backgroundColor: active ? withAlpha(p.ornament, 0.08) : pressed ? p.accent : 'transparent' }]}>
            <View style={styles.marker}>
              {offset > 0 && <View style={[styles.thread, styles.threadUp, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />}
              {offset < visible.length - 1 && <View style={[styles.thread, styles.threadDown, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />}
              <Medallion value={slot + 1} size={36} palette={p} current={done} tone={active ? p.primary : undefined} />
            </View>
            <View style={[d.grow, { paddingVertical: 6 }]}>
              <View style={[d.row, { justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 0 }]}>
                <Text style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 12, fontWeight: active ? '600' : '400' }}>{date === today ? t('common.today') : shortDate(date)}</Text>
                {!!status && <Text style={{ color: active ? p.primary : p.mutedForeground, fontSize: 12, fontWeight: active ? '700' : '400' }}>{status}</Text>}
              </View>
              <Text style={{ color: done ? p.mutedForeground : p.foreground, fontSize: 15, fontWeight: active ? '700' : '500' }}>{rangeLabel(index, session.start, session.end)}</Text>
              {isExpanded && <Text style={{ color: p.mutedForeground, fontSize: 13, marginTop: 4 }}>{ayahRangeLabel(index, session.start, session.end)}</Text>}
            </View>
            <View style={{ transform: [{ rotate: isExpanded ? '-90deg' : '0deg' }] }}><ReaderIcon name="chevron" color={p.mutedForeground} size={15} /></View>
          </Pressable>;
        })}
      </View>
    </View>
  </Section>;
}
function WeekButton({ previous = false, disabled, onPress }: { previous?: boolean; disabled: boolean; onPress: () => void }) {
  const { palette } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={previous ? t('goals.previousWeek') : t('goals.nextWeek')} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.weekButton, { opacity: disabled ? 0.25 : pressed ? 0.6 : 1, backgroundColor: pressed ? palette.accent : 'transparent' }]}>
    <View style={{ transform: [{ rotate: previous ? '180deg' : '0deg' }] }}><ReaderIcon name="chevron" color={palette.foreground} size={20} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  calendar: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  week: { flexDirection: 'row', alignItems: 'center', padding: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  weekButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  session: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, borderRadius: readerShape.control, minHeight: 58 },
  marker: { width: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', width: 1, left: 19.5 },
  // Each half of the thread stops at the star, which is drawn see-through.
  threadUp: { top: 0, bottom: '50%', marginBottom: 17 },
  threadDown: { top: '50%', bottom: 0, marginTop: 17 },
});
