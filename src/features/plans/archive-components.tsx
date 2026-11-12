import { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { mixColor, readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { Medallion } from '@/components/craft/marks';
import { Button } from '@/components/ui';
import { GoalMark, goalKind } from './goal-card';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { ARCHIVE_RETENTION_DAYS, archiveDeletionDate, deleteArchivedGoal, keptInArchive, restoreArchivedGoal } from './archive';
import { DuplicateGoalError } from './goal-limit';
import { shortDate } from './presentation';
import { formatNumber, t } from '@/i18n';
import { buildPlanIndex, unitAmount } from './engine';
import { PlanNotice } from './components';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, type ReadingPlan } from './types';
import { memorizationReplanDate, memoryFor, quarterLabel, reviseMemorization } from './memorization';
import { loadReaderContent } from '../quran-reader/services/reader-service';
import { completedOccurrences, weekdaysLabel } from './recurring';

/**
 * The archive: how long a goal stays here (the days in a star), then each archived goal with the
 * way to restore it or delete it for good.
 */
export function ArchivedGoals({ plans, onOpen }: { plans: ReadingPlan[]; onOpen: (id: string) => void }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 16 }}>
    <View style={[s.notice, { backgroundColor: mixColor(p.card, p.ornament, 0.05), borderColor: withAlpha(p.ornament, 0.35) }]}>
      <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${formatNumber(ARCHIVE_RETENTION_DAYS)} ${t('plans.archive.notice.days', { count: ARCHIVE_RETENTION_DAYS })}`}>
        <Medallion value={ARCHIVE_RETENTION_DAYS} size={50} palette={p} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('plans.archive.notice.days', { count: ARCHIVE_RETENTION_DAYS })}</Text>
      </View>
      <View style={s.grow}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{t('plans.archive.notice.title')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('plans.archive.notice.description')}</Text></View>
    </View>
    <View style={[s.list, { backgroundColor: p.card, borderColor: p.border }]}>
      {plans.map((plan, i) => <View key={plan.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border } : undefined}><ArchivedGoalCard plan={plan} onOpen={onOpen} /></View>)}
    </View>
  </View>;
}

function ArchivedGoalCard({ plan, onOpen }: { plan: ReadingPlan; onOpen: (id: string) => void }) {
  const { palette: p } = useReadingPreferences();
  const { commit, memorization, today } = usePlans();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflictId, setConflictId] = useState<string>();
  const deletionDate = archiveDeletionDate(plan);
  const completed = isMemorizationPlan(plan) ? plan.progress.filter(log => log.finished).length : isRecurringPlan(plan) ? completedOccurrences(plan) : isRevisionPlan(plan) ? plan.log.length : plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const restore = async () => {
    if (busy) return;
    setBusy(true); setError(''); setConflictId(undefined);
    try {
      const index = isMemorizationPlan(plan) ? buildPlanIndex((await loadReaderContent(plan.riwayah)).data) : undefined;
      await commit(items => items.map(item => item.id === plan.id ? restoreArchivedGoal(isMemorizationPlan(item) && index ? reviseMemorization(item, index, memoryFor(memorization, item.riwayah, index), memorizationReplanDate(item, today)) : item) : item));
    }
    catch (e) { setError(e instanceof Error ? e.message : t('plans.archive.errors.restore')); if (e instanceof DuplicateGoalError) setConflictId(e.goalId); }
    finally { setBusy(false); }
  };
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('plans.archive.card.openLabel', { name: plan.name })} onPress={() => onOpen(plan.id)} style={({ pressed }) => [s.cardBody, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={s.row}>
        <GoalMark kind={goalKind(plan)} width={40} muted />
        <View style={s.grow}><Text style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{plan.name}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{isMemorizationPlan(plan) ? t('plans.summary.memorization', { amount: quarterLabel(plan.goal.weeklyQuarters) }) : isRecurringPlan(plan) ? t('plans.summary.recurring', { days: weekdaysLabel(plan.weekdays) }) : isRevisionPlan(plan) ? t('plans.summary.revision', { amount: quarterLabel(plan.goal.dailyQuarters) }) : plan.goal.type === 'khatma' ? t('plans.summary.khatma', { count: plan.goal.weeks }) : t('plans.summary.wird', { amount: unitAmount(plan.unit, plan.goal.amount) })} · {RIWAYAT[plan.riwayah].label}</Text></View>
        <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </View>
      <View style={{ gap: 4 }}>
        <View style={[s.row, { gap: 7 }]}><ReaderIcon name="check" color={p.ornament} size={15} />
          <Text style={{ color: p.foreground, fontSize: 13, flexShrink: 1 }}>{isMemorizationPlan(plan) ? t('plans.archive.card.memorizationDone', { count: completed }) : isRecurringPlan(plan) ? t('plans.archive.card.recurringDone', { count: completed }) : isRevisionPlan(plan) ? t('plans.archive.card.revisionDone', { count: completed }) : t('plans.progress.completedOfTotal', { completed, count: plan.cycle.sessions.length })}</Text></View>
        {deletionDate && <View style={[s.row, { gap: 7 }]}><ReaderIcon name="archive" color={p.mutedForeground} size={15} />
          <Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{t('plans.archive.card.autoDelete', { date: shortDate(deletionDate) })}</Text></View>}
        {keptInArchive(plan) && <View style={[s.row, { gap: 7 }]}><ReaderIcon name="archive" color={p.mutedForeground} size={15} />
          <Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{t('plans.archive.card.kept')}</Text></View>}
      </View>
    </Pressable>
    {!!error && <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}><PlanNotice message={error} />
      {conflictId && <Button variant="link" onPress={() => onOpen(conflictId)}>{t('goals.viewCurrent')}</Button>}
    </View>}
    <View style={[s.row, { paddingHorizontal: 14, paddingBottom: 14, gap: 8 }]}>
      <Button variant="outline" icon="restore" label={t('plans.archive.card.restoreLabel', { name: plan.name })} disabled={busy} onPress={() => void restore()} style={s.grow}>{busy ? t('plans.archive.card.restoring') : t('plans.archive.card.restore')}</Button>
      <Button variant="ghost" icon="trash" tone={p.destructive} label={t('plans.archive.card.deleteLabel', { name: plan.name })} disabled={busy} onPress={() => setDeleting(true)} style={s.grow}>{t('plans.archive.card.delete')}</Button>
    </View>
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} />}
  </View>;
}

export function DeleteArchivedGoalDialog({ plan, onClose, onDeleted }: { plan: ReadingPlan; onClose: () => void; onDeleted?: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { commit } = usePlans();
  const cancel = useRef<View>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dismiss = () => { if (!saving.current) onClose(); };
  const remove = async () => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await commit(items => deleteArchivedGoal(items, plan.id)); onDeleted?.(); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : t('plans.archive.errors.delete')); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}
    onShow={() => { if (Platform.OS === 'web') cancel.current?.focus(); else if (cancel.current) AccessibilityInfo.sendAccessibilityEvent(cancel.current, 'focus'); }}>
    <SafeAreaView style={[s.backdrop, { backgroundColor: p.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('plans.archive.dialog.dismiss')} disabled={busy} onPress={dismiss} />
      <View accessibilityViewIsModal onAccessibilityEscape={dismiss} style={[s.dialog, { backgroundColor: p.background, borderColor: withAlpha(p.destructive, 0.35) }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 10 }}>
          <View style={[s.warn, { backgroundColor: withAlpha(p.destructive, 0.1) }]}><ReaderIcon name="trash" color={p.destructive} size={20} /></View>
          <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{t('plans.archive.dialog.title')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{isMemorizationPlan(plan) ? t('plans.archive.dialog.bodyMemorization', { name: plan.name }) : t('plans.archive.dialog.body', { name: plan.name })}</Text>
          <PlanNotice message={error} />
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button variant="destructive" size="lg" icon="trash" label={t('plans.archive.dialog.confirm')} disabled={busy} onPress={() => void remove()} block>{busy ? t('plans.archive.dialog.deleting') : t('plans.archive.dialog.confirm')}</Button>
            <Button ref={cancel} variant="outline" size="lg" label={t('plans.archive.dialog.keep')} disabled={busy} onPress={dismiss} block>{t('common.cancel')}</Button>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: readerShape.card, padding: 14 },
  list: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  cardBody: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  warn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: Math.min(readerLayout.maxWidth, 512), maxHeight: '90%', borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
});
