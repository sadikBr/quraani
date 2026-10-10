import { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerLayout, readerShape } from '../quran-reader/design';
import { Button, IconTile } from '@/components/ui';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { ARCHIVE_RETENTION_DAYS, archiveDeletionDate, deleteArchivedGoal, restoreArchivedGoal } from './archive';
import { DuplicateGoalError } from './goal-limit';
import { arabicNumber, shortDate } from './presentation';
import { buildPlanIndex, unitLabels } from './engine';
import { PlanNotice } from './components';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, type ReadingPlan } from './types';
import { memorizationReplanDate, memoryFor, quarterLabel, reviseMemorization } from './memorization';
import { loadReaderContent } from '../quran-reader/services/reader-service';
import { completedOccurrences, weekdaysLabel } from './recurring';

export function ArchivedGoals({ plans, onOpen }: { plans: ReadingPlan[]; onOpen: (id: string) => void }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 16 }}>
    <View style={[s.notice, { borderColor: p.border }]}>
      <View style={[s.days, { borderColor: p.border }]}><Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>{arabicNumber(ARCHIVE_RETENTION_DAYS)}</Text><Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>يومًا</Text></View>
      <View style={s.grow}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>أرشيف مؤقت</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>تُحذف الأهداف نهائيًا بعد أسبوعين من أرشفتها. استعد ما تريد الاحتفاظ به قبل موعد الحذف.</Text></View>
    </View>
    <View style={[s.list, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
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
      const index = isMemorizationPlan(plan) ? buildPlanIndex((await loadReaderContent(undefined, plan.riwayah)).data) : undefined;
      await commit(items => items.map(item => item.id === plan.id ? restoreArchivedGoal(isMemorizationPlan(item) && index ? reviseMemorization(item, index, memoryFor(memorization, item.riwayah, index), memorizationReplanDate(item, today)) : item) : item));
    }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذرت استعادة الهدف.'); if (e instanceof DuplicateGoalError) setConflictId(e.goalId); }
    finally { setBusy(false); }
  };
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`تفاصيل الهدف المؤرشف ${plan.name}`} onPress={() => onOpen(plan.id)} style={({ pressed }) => [s.cardBody, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={s.row}>
        <IconTile name={plan.goal.type === 'khatma' ? 'calendar' : plan.goal.type === 'revision' ? 'loop' : 'book'} tone={p.mutedForeground} />
        <View style={s.grow}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{plan.name}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{isMemorizationPlan(plan) ? `حفظ القرآن · ${quarterLabel(plan.goal.weeklyQuarters)} أسبوعيًا` : isRecurringPlan(plan) ? `قراءة متكررة · ${weekdaysLabel(plan.weekdays)}` : isRevisionPlan(plan) ? `مراجعة · ${quarterLabel(plan.goal.dailyQuarters)} في الجلسة` : plan.goal.type === 'khatma' ? `ختمة · ${arabicNumber(plan.goal.weeks)} أسابيع` : `ورد يومي · ${arabicNumber(plan.goal.amount)} ${unitLabels[plan.unit]}`} · {RIWAYAT[plan.riwayah].label}</Text></View>
        <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{isMemorizationPlan(plan) ? `${arabicNumber(completed)} جلسة حفظ مكتملة · محفوظك باقٍ` : isRecurringPlan(plan) ? `${arabicNumber(completed)} قراءة مكتملة` : isRevisionPlan(plan) ? `أيام المراجعة المكتملة: ${arabicNumber(completed)} · محفوظك باقٍ` : `${arabicNumber(completed)} من ${arabicNumber(plan.cycle.sessions.length)} وردًا مكتملًا`}</Text>
      {deletionDate && <View style={[s.row, { gap: 7 }]}><ReaderIcon name="archive" color={p.mutedForeground} size={16} />
        <Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>الحذف التلقائي: {shortDate(deletionDate)}</Text></View>}
    </Pressable>
    {!!error && <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}><PlanNotice message={error} />
      {conflictId && <Button variant="link" onPress={() => onOpen(conflictId)}>عرض الهدف الحالي</Button>}
    </View>}
    <View style={[s.row, { paddingHorizontal: 16, paddingBottom: 16, gap: 8 }]}>
      <Button variant="outline" icon="restore" label={`استعادة ${plan.name}`} disabled={busy} onPress={() => void restore()} style={s.grow}>{busy ? 'جارٍ الاستعادة…' : 'استعادة'}</Button>
      <Button variant="ghost" icon="trash" tone={p.destructive} label={`حذف ${plan.name}`} disabled={busy} onPress={() => setDeleting(true)} style={s.grow}>حذف</Button>
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
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حذف الهدف. حاول مرة أخرى.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}
    onShow={() => { if (Platform.OS === 'web') cancel.current?.focus(); else if (cancel.current) AccessibilityInfo.sendAccessibilityEvent(cancel.current, 'focus'); }}>
    <SafeAreaView style={[s.backdrop, { backgroundColor: p.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إلغاء الحذف" disabled={busy} onPress={dismiss} />
      <View accessibilityViewIsModal onAccessibilityEscape={dismiss} style={[s.dialog, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
          <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>حذف الهدف نهائيًا؟</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>سيُحذف «{plan.name}» مع سجل الإنجاز الخاص بهذا الهدف. {isMemorizationPlan(plan) ? 'يبقى محفوظك من القرآن في سجل الحفظ. ' : ''}لا يمكن التراجع عن هذا الحذف.</Text>
          <PlanNotice message={error} />
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button variant="destructive" size="lg" icon="trash" label="حذف نهائيًا" disabled={busy} onPress={() => void remove()} block>{busy ? 'جارٍ الحذف…' : 'حذف نهائيًا'}</Button>
            <Button ref={cancel} variant="outline" size="lg" label="الاحتفاظ بالهدف" disabled={busy} onPress={dismiss} block>إلغاء</Button>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg, padding: 16 },
  days: { minWidth: 48, borderEndWidth: StyleSheet.hairlineWidth, paddingEnd: 14 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  cardBody: { padding: 16, gap: 10 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: readerShape.control },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: Math.min(readerLayout.maxWidth, 512), maxHeight: '90%', borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg, overflow: 'hidden' },
});
