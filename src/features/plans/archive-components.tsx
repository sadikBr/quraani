import { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerLayout, readerShape } from '../quran-reader/design';
import { RIWAYAT } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { ARCHIVE_RETENTION_DAYS, archiveDeletionDate, deleteArchivedGoal, restoreArchivedGoal } from './archive';
import { DuplicateGoalError } from './goal-limit';
import { arabicNumber, shortDate } from './presentation';
import { unitLabels } from './engine';
import { PlanNotice } from './components';
import { isRecurringPlan, type ReadingPlan } from './types';
import { completedOccurrences, weekdaysLabel } from './recurring';

export function ArchivedGoals({ plans, onOpen }: { plans: ReadingPlan[]; onOpen: (id: string) => void }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 14 }}>
    <View style={[s.notice, { backgroundColor: p.accentSoft }]}>
      <View style={[s.days, { borderColor: p.border }]}><Text style={{ color: p.accent, fontSize: 24, textAlign: 'center' }}>{arabicNumber(ARCHIVE_RETENTION_DAYS)}</Text><Text style={{ color: p.muted, fontSize: 11, textAlign: 'center' }}>يومًا</Text></View>
      <View style={s.grow}><Text style={{ color: p.text, fontSize: 17, fontWeight: '600' }}>أرشيف مؤقت</Text>
        <Text style={{ color: p.muted, fontSize: 12 }}>تُحذف الأهداف نهائيًا بعد أسبوعين من أرشفتها. استعد ما تريد الاحتفاظ به قبل موعد الحذف.</Text></View>
    </View>
    {plans.map(plan => <ArchivedGoalCard key={plan.id} plan={plan} onOpen={onOpen} />)}
  </View>;
}

function ArchivedGoalCard({ plan, onOpen }: { plan: ReadingPlan; onOpen: (id: string) => void }) {
  const { palette: p } = useReadingPreferences();
  const { commit } = usePlans();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflictId, setConflictId] = useState<string>();
  const deletionDate = archiveDeletionDate(plan);
  const completed = isRecurringPlan(plan) ? completedOccurrences(plan) : plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor).length;
  const restore = async () => {
    if (busy) return;
    setBusy(true); setError(''); setConflictId(undefined);
    try { await commit(items => items.map(item => item.id === plan.id ? restoreArchivedGoal(item) : item)); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذرت استعادة الهدف.'); if (e instanceof DuplicateGoalError) setConflictId(e.goalId); }
    finally { setBusy(false); }
  };
  return <View style={[s.card, { backgroundColor: p.paper, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`تفاصيل الهدف المؤرشف ${plan.name}`} onPress={() => onOpen(plan.id)} style={({ pressed }) => [s.cardBody, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={s.row}>
        <View style={[s.icon, { backgroundColor: p.background }]}><ReaderIcon name={plan.goal.type === 'khatma' ? 'calendar' : 'book'} color={p.muted} size={23} /></View>
        <View style={s.grow}><Text style={{ color: p.text, fontSize: 21, fontWeight: '600' }}>{plan.name}</Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>{isRecurringPlan(plan) ? `قراءة متكررة · ${weekdaysLabel(plan.weekdays)}` : plan.goal.type === 'khatma' ? `ختمة · ${arabicNumber(plan.goal.weeks)} أسابيع` : `ورد يومي · ${arabicNumber(plan.goal.amount)} ${unitLabels[plan.unit]}`} · {RIWAYAT[plan.riwayah].label}</Text></View>
        <ReaderIcon name="chevron" color={p.muted} size={18} />
      </View>
      <Text style={{ color: p.muted, fontSize: 12 }}>{isRecurringPlan(plan) ? `${arabicNumber(completed)} قراءة مكتملة` : `${arabicNumber(completed)} من ${arabicNumber(plan.cycle.sessions.length)} وردًا مكتملًا`}</Text>
      {deletionDate && <View style={[s.row, { gap: 7 }]}><ReaderIcon name="archive" color={p.ornament} size={16} />
        <Text style={{ color: p.muted, fontSize: 12, flexShrink: 1 }}>الحذف التلقائي: {shortDate(deletionDate)}</Text></View>}
    </Pressable>
    {!!error && <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}><PlanNotice message={error} />
      {conflictId && <Pressable accessibilityRole="button" onPress={() => onOpen(conflictId)} style={s.action}><Text style={{ color: p.accent, fontSize: 14 }}>عرض الهدف الحالي</Text></Pressable>}
    </View>}
    <View style={[s.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, padding: 6, gap: 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`استعادة ${plan.name}`} disabled={busy} onPress={() => void restore()}
        style={({ pressed }) => [s.action, s.grow, { backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: busy ? 0.5 : 1 }]}>
        <ReaderIcon name="restore" color={p.accent} size={18} /><Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>{busy ? 'جارٍ الاستعادة…' : 'استعادة'}</Text>
      </Pressable>
      <View style={{ width: 1, height: 22, backgroundColor: p.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`حذف ${plan.name}`} disabled={busy} onPress={() => setDeleting(true)}
        style={({ pressed }) => [s.action, s.grow, { backgroundColor: pressed ? p.background : 'transparent', opacity: busy ? 0.5 : 1 }]}>
        <ReaderIcon name="trash" color={p.warning} size={18} /><Text style={{ color: p.warning, fontSize: 14 }}>حذف</Text>
      </Pressable>
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
    <SafeAreaView style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إلغاء الحذف" disabled={busy} onPress={dismiss} />
      <View accessibilityViewIsModal onAccessibilityEscape={dismiss} style={[s.dialog, { backgroundColor: p.paper, borderColor: p.border }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }}>
          <View style={[s.icon, { backgroundColor: p.background }]}><ReaderIcon name="trash" color={p.warning} size={25} /></View>
          <Text accessibilityRole="header" style={{ color: p.text, fontSize: 24, fontWeight: '600' }}>حذف الهدف نهائيًا؟</Text>
          <Text style={{ color: p.muted, fontSize: 15 }}>سيُحذف «{plan.name}» مع سجل القراءة والإنجاز الخاص به. لا يمكن التراجع عن هذا الحذف.</Text>
          <PlanNotice message={error} />
          <View style={[s.row, { marginTop: 6 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="حذف نهائيًا" disabled={busy} onPress={() => void remove()}
              style={({ pressed }) => [s.action, s.grow, { backgroundColor: p.warning, opacity: busy || pressed ? 0.65 : 1 }]}>
              <Text style={{ color: p.paper, fontSize: 15, fontWeight: '600' }}>{busy ? 'جارٍ الحذف…' : 'حذف نهائيًا'}</Text>
            </Pressable>
            <Pressable ref={cancel} accessibilityRole="button" accessibilityLabel="الاحتفاظ بالهدف" disabled={busy} onPress={dismiss}
              style={({ pressed }) => [s.action, s.grow, { backgroundColor: pressed ? p.accentSoft : p.background }]}><Text style={{ color: p.text, fontSize: 15 }}>إلغاء</Text></Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: readerShape.card, padding: 16 },
  days: { minWidth: 48, borderEndWidth: 1, paddingEnd: 14 },
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  cardBody: { padding: 16, gap: 12 },
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: readerShape.control },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(7, 20, 15, 0.58)' },
  dialog: { width: '100%', maxWidth: Math.min(readerLayout.maxWidth, 420), maxHeight: '90%', borderWidth: 1, borderRadius: readerShape.sheet, overflow: 'hidden' },
});
