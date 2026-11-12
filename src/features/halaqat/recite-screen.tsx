import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, TextInput, View, type AccessibilityActionEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwakeWhileShown } from '@/hooks/use-keep-awake-while-shown';
import { ArabicText as Text } from '@/components/arabic-text';
import { JustifiedText } from '@/components/justified-text';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty, Tabs } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import { readerTextLineHeight } from '@/features/quran-reader/utils/reader-typography';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { CreationFooter } from '@/features/plans/goal-creation-components';
import { validDate } from '@/features/plans/dates';
import { weekdayDateLabel } from '@/features/plans/presentation';
import type { PlanIndex } from '@/features/plans/engine';
import { formatList, formatNumber, t } from '@/i18n';
import { useHalaqa, useHalaqat } from './provider';
import {
  assignmentFor, entryOf, GRADES, MARK_LIMIT, markCount, newId, NOTE_LIMIT, ordinal, RECITATION_KINDS, samePortion, sessionOn, spanOf, suggestGrade, suggestNext, validPortion,
  type Assignment, type Attendance, type Grade, type Halaqa, type Mark, type MarkKind, type Portion, type QuranShape, type Recitation, type RecitationKind, type Student,
} from './model';
import { AttendancePicker, gradeTone, LawhBoard, useHalaqaIndex, useLinkedStudent, displayName } from './shared';
import { usePlans } from '@/features/plans/provider';
import { PortionSheet } from './portion-sheet';
import { rtlInput } from '@/lib/ui-text-alignment';

/** What the teacher has of one recitation so far: the portion, the marks, and the grade once given. */
interface Draft { portion: Portion | undefined; marks: Mark[]; grade: Grade | null }

/**
 * Hearing one student in a session: whether they came; their new portion and their revision, each
 * with its text to mark the mistakes and prompts on as they recite, and a grade; then the portions
 * to give them next (suggested from what they recited) and a note.
 */
export function ReciteScreen() {
  useKeepAwakeWhileShown('halaqa-recite');
  const params = useLocalSearchParams<{ halaqa: string; date: string; student: string; session?: string }>();
  const { palette: p } = useReadingPreferences();
  const { halaqa, ready } = useHalaqa(params.halaqa);
  const student = halaqa?.students.find((s) => s.id === params.student);
  if (!halaqa || !student || !validDate(params.date)) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <View style={page.content}>{ready ? <Empty icon="users" palette={p} title={t('halaqat.notFound')} description={t('halaqat.notFoundDetail')} /> : <ActivityIndicator color={p.mutedForeground} />}</View>
  </SafeAreaView>;
  return <Recite halaqa={halaqa} student={student} date={params.date} sessionId={params.session} />;
}
const validSession = (id: string | undefined) => !!id && /^session-[a-z0-9-]+$/.test(id);
/** Two assignments name the same portions. */
const sameAssignment = (a: Assignment, b: Assignment) => samePortion(a.new, b.new) && samePortion(a.revision, b.revision);

function Recite({ halaqa, student: participant, date, sessionId: given }: { halaqa: Halaqa; student: Student; date: string; sessionId: string | undefined }) {
  const { palette: p } = useReadingPreferences();
  const { change } = useHalaqat();
  const { remember } = usePlans();
  const { index, shape, error, retry } = useHalaqaIndex(halaqa.riwayah);
  // The phone's owner is judged with what their own record holds.
  const student = useLinkedStudent(participant, halaqa.riwayah, index, shape);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  const session = sessionOn(halaqa, date);
  // The day's session, or the id it is to be made with.
  const [fallbackSession] = useState(() => newId('session'));
  const sessionId = session?.id ?? (validSession(given) ? given! : fallbackSession);
  const entry = entryOf(session, student.id);
  const assigned = assignmentFor(halaqa, student, date);
  const [attendance, setAttendance] = useState<Attendance>(entry?.attendance === 'absent' || entry?.attendance === 'excused' ? entry.attendance : entry?.attendance ?? 'present');
  const [kind, setKind] = useState<RecitationKind>('new');
  const [drafts, setDrafts] = useState<Record<RecitationKind, Draft>>(() => Object.fromEntries(RECITATION_KINDS.map((k) => {
    const saved = entry?.recitations.find((r) => r.kind === k);
    return [k, saved ? { portion: saved.portion, marks: saved.marks, grade: saved.grade } : { portion: assigned[k], marks: [], grade: null }];
  })) as Record<RecitationKind, Draft>);
  // The next portions follow what is recited until the teacher chooses one (`undefined` for none);
  // reopened, those the teacher had chosen stand, while suggestions follow the recitations.
  const [chosen, setChosen] = useState<Partial<Record<RecitationKind, Portion | undefined>>>({});
  const [keepSaved, setKeepSaved] = useState(true);
  const [note, setNote] = useState(entry?.note ?? '');
  const [choosing, setChoosing] = useState<{ what: 'recited' | 'next'; kind: RecitationKind } | null>(null);
  const present = attendance === 'present' || attendance === 'late';
  const recitations: Recitation[] = present && shape ? RECITATION_KINDS.flatMap((k) => {
    const d = drafts[k];
    return d.grade && validPortion(shape, d.portion) ? [{ kind: k, portion: d.portion, grade: d.grade, marks: d.marks }] : [];
  }) : [];
  const suggested = shape ? suggestNext(shape, halaqa, student, date, recitations) : assigned;
  // What was recorded, when it was the teacher's own choice rather than what was suggested then.
  const savedChoice = keepSaved && entry?.next && shape && !sameAssignment(entry.next, suggestNext(shape, halaqa, student, date, entry.recitations)) ? entry.next : undefined;
  const pick = (k: RecitationKind) => k in chosen ? chosen[k] : savedChoice ? savedChoice[k] : suggested[k];
  const next: Assignment = { new: pick('new'), revision: pick('revision') };
  const ownChoice = Object.keys(chosen).length > 0 || !!savedChoice;
  const draft = drafts[kind];
  const update = (k: RecitationKind, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [k]: { ...all[k], ...patch } }));
  // Which mark a tap on the text adds; it stays as chosen from one recitation to the other.
  const [brush, setBrush] = useState<MarkKind>('mistake');
  const addMark = (mark: Mark) => { if (draft.marks.length < MARK_LIMIT) update(kind, { marks: [...draft.marks, mark] }); };
  // Recitations are read with the edition: until it is there, what was recorded is not touched.
  const saveable = (!present || !!shape) && !saving;
  const save = async () => {
    if (!saveable) return;
    Keyboard.dismiss();
    const text = note.trim().slice(0, NOTE_LIMIT);
    change({ type: 'saveEntries', halaqa: halaqa.id, date, session: sessionId, entries: [{
      student: student.id, attendance, recitations,
      // Someone absent keeps the portions they had: none are given in their name. Someone present
      // is given what is chosen, even nothing (having finished, say).
      ...(present ? { next: { ...(next.new ? { new: next.new } : {}), ...(next.revision ? { revision: next.revision } : {}) } } : {}),
      ...(text ? { note: text } : {}),
    }] });
    // The phone's owner: a new portion passed joins their own record too.
    const passed = recitations.find((r) => r.kind === 'new' && r.grade !== 'repeat');
    if (student.me && passed && index && shape) {
      setSaving(true); setMessage('');
      try { await remember(index, halaqa.riwayah, [spanOf(shape, passed.portion)]); }
      catch { setMessage(t('halaqat.me.rememberFailed')); setSaving(false); return; }
      setSaving(false);
    }
    router.back();
  };
  const back = { label: t('common.back'), onPress: () => router.back() };
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar back={back} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
        <PageTitle title={displayName(student)} subtitle={formatList([weekdayDateLabel(date), halaqa.name])} palette={p} />
        <AttendancePicker name={student.name} value={attendance} onChange={setAttendance} palette={p} />
        {error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>
          : !index || !shape ? <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} />
          : !present ? <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('halaqat.recite.absentNote')}</Text> : <>
          <Tabs palette={p} label={t('halaqat.recite.kindsLabel')} value={kind} onChange={setKind}
            options={RECITATION_KINDS.map((k) => ({ value: k, label: t(`halaqat.kinds.${k}`), icon: drafts[k].grade ? 'done' as const : undefined }))} />
          <LawhBoard index={index} shape={shape} palette={p} tone={draft.grade ? gradeTone(p, draft.grade) : undefined} lines={[{
            title: kind === 'new' ? t('halaqat.lawh.new') : t('halaqat.lawh.revision'), portion: draft.portion,
            emptyText: kind === 'new' ? t('halaqat.recite.noNew') : t('halaqat.recite.noRevision'), onChange: () => setChoosing({ what: 'recited', kind }),
          }]} />
          {validPortion(shape, draft.portion) && <>
            <MarkTools marks={draft.marks} full={draft.marks.length >= MARK_LIMIT} palette={p} onAdd={(k) => addMark({ kind: k })}
              onRemove={(k) => { const i = draft.marks.map((m) => m.kind).lastIndexOf(k); if (i >= 0) update(kind, { marks: draft.marks.filter((_, j) => j !== i) }); }}
              onUndo={() => update(kind, { marks: draft.marks.slice(0, -1) })} />
            <PortionText portion={draft.portion} index={index} shape={shape} riwayah={halaqa.riwayah} marks={draft.marks} palette={p} kind={brush} onKind={setBrush} onMark={addMark} />
            <GradePicker grade={draft.grade} suggested={suggestGrade(draft.marks)} palette={p} onChange={(grade) => update(kind, { grade })}
              onClear={draft.grade ? () => update(kind, { grade: null }) : undefined} />
          </>}
          <Section title={t('halaqat.recite.nextTitle')} detail={ownChoice ? undefined : t('halaqat.recite.nextSuggested')} palette={p}>
            <View style={{ gap: 12 }}>
              <LawhBoard index={index} shape={shape} palette={p} lines={[
                { title: t('halaqat.lawh.new'), portion: next.new, emptyText: t('halaqat.recite.noNextNew'),
                  onChange: () => setChoosing({ what: 'next', kind: 'new' }), onClear: () => setChosen((c) => ({ ...c, new: undefined })) },
                { title: t('halaqat.lawh.revision'), portion: next.revision, emptyText: t('halaqat.recite.noNextRevision'),
                  onChange: () => setChoosing({ what: 'next', kind: 'revision' }), onClear: () => setChosen((c) => ({ ...c, revision: undefined })) },
              ]} />
              {ownChoice && <Button size="sm" variant="ghost" icon="restore" palette={p} onPress={() => { setKeepSaved(false); setChosen({}); }}>{t('halaqat.recite.useSuggested')}</Button>}
            </View>
          </Section>
        </>}
        <View style={{ gap: 8 }}>
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('halaqat.recite.note')}</Text>
          <TextInput accessibilityLabel={t('halaqat.recite.note')} value={note} onChangeText={setNote} placeholder={t('halaqat.recite.notePlaceholder')} placeholderTextColor={p.mutedForeground}
            multiline maxLength={NOTE_LIMIT} selectionColor={p.primary} textAlignVertical="top"
            style={[s.note, { color: p.foreground, backgroundColor: p.background, borderColor: p.input }]} />
        </View>
      </ScrollView>
      <CreationFooter>
        {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
        <ReaderButton palette={p} selected disabled={!saveable} onPress={() => void save()}>{present && recitations.length ? t('halaqat.recite.saveHeard') : t('halaqat.recite.save')}</ReaderButton>
      </CreationFooter>
    </KeyboardAvoidingView>
    {choosing && index && shape && <PortionSheet index={index} shape={shape} fallbackSurah={student.direction === 'forward' ? 1 : 114}
      value={choosing.what === 'recited' ? drafts[choosing.kind].portion : next[choosing.kind]}
      title={choosing.what === 'recited' ? t(`halaqat.kinds.${choosing.kind}`) : t('halaqat.recite.nextSheet', { kind: t(`halaqat.kinds.${choosing.kind}`) })}
      onClose={() => setChoosing(null)}
      onSave={(portion) => {
        // A recited portion changed is a new recitation: its marks were for the other.
        if (choosing.what === 'recited') update(choosing.kind, { portion, marks: [], grade: null });
        else setChosen((c) => ({ ...c, [choosing.kind]: portion }));
        setChoosing(null);
      }} />}
  </SafeAreaView>;
}

/** The counts of mistakes and prompts, each a step down or up, and undoing the last mark. */
function MarkTools({ marks, full, palette: p, onAdd, onRemove, onUndo }: { marks: Mark[]; full: boolean; palette: ReaderPalette; onAdd: (kind: MarkKind) => void; onRemove: (kind: MarkKind) => void; onUndo: () => void }) {
  return <View style={[s.tools, { backgroundColor: p.card, borderColor: p.border }]}>
    {(['mistake', 'hesitation'] as const).map((kind) => {
      const count = markCount(marks, kind), tone = kind === 'mistake' ? p.destructive : p.warning;
      return <View key={kind} style={s.counter}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('halaqat.marks.remove', { kind: t(`halaqat.marks.${kind}`) })} disabled={!count} onPress={() => onRemove(kind)} hitSlop={4}
          style={({ pressed }) => [s.count, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: count ? 1 : 0.4 }]}>
          <ReaderIcon name="minus" color={p.foreground} size={14} />
        </Pressable>
        <View accessible accessibilityLabel={t(`halaqat.marks.${kind}Count`, { count })} style={{ alignItems: 'center', minWidth: 52 }}>
          <NativeText style={{ color: count ? tone : p.mutedForeground, fontSize: 22, fontFamily: 'UiNumericSemiBold' }}>{formatNumber(count)}</NativeText>
          <Text style={{ color: p.mutedForeground, fontSize: 11 }}>{t(`halaqat.marks.${kind}Plural`)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('halaqat.marks.add', { kind: t(`halaqat.marks.${kind}`) })} disabled={full} onPress={() => onAdd(kind)} hitSlop={4}
          style={({ pressed }) => [s.count, { borderColor: withAlpha(tone, 0.5), backgroundColor: pressed ? withAlpha(tone, 0.2) : withAlpha(tone, 0.08), opacity: full ? 0.4 : 1 }]}>
          <ReaderIcon name="plus" color={tone} size={14} />
        </Pressable>
      </View>;
    })}
    <Pressable accessibilityRole="button" accessibilityLabel={t('halaqat.marks.undo')} disabled={!marks.length} onPress={onUndo} hitSlop={4}
      style={({ pressed }) => [s.undo, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: marks.length ? 1 : 0.4 }]}>
      <ReaderIcon name="undo" color={p.foreground} size={16} />
    </Pressable>
  </View>;
}

/**
 * The portion's text in the mushaf's script, to follow the recitation: a tap on an ayah marks a
 * mistake or a prompt there (the chosen kind), and each ayah shows what was marked on it.
 */
function PortionText({ portion, index, shape, riwayah, marks, palette: p, kind, onKind, onMark }: {
  portion: Portion; index: PlanIndex; shape: QuranShape; riwayah: Halaqa['riwayah']; marks: Mark[]; palette: ReaderPalette;
  kind: MarkKind; onKind: (kind: MarkKind) => void; onMark: (mark: Mark) => void;
}) {
  const { loaded, fontFamily, display } = useQuranFont(riwayah);
  const ayahs = index.ayahs.slice(ordinal(shape, portion.from), ordinal(shape, portion.to) + 1);
  const at = (surah: number, ayah: number, k: MarkKind) => marks.reduce((n, m) => n + (m.kind === k && m.at?.surah === surah && m.at.ayah === ayah ? 1 : 0), 0);
  const groups = ayahs.reduce<{ surah: number; ayahs: typeof ayahs }[]>((all, ayah) => {
    const last = all[all.length - 1];
    if (last?.surah === ayah.surahNumber) last.ayahs.push(ayah); else all.push({ surah: ayah.surahNumber, ayahs: [ayah] });
    return all;
  }, []);
  const size = 23;
  return <View style={[s.text, { backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.35) }, readerElevation(1, p)]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ flex: 1, color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('halaqat.marks.hint')}</Text>
      <View style={{ width: 170 }}>
        <Tabs role="radio" palette={p} label={t('halaqat.marks.brushLabel')} value={kind} onChange={onKind}
          options={[{ value: 'mistake', label: t('halaqat.marks.mistake') }, { value: 'hesitation', label: t('halaqat.marks.hesitation') }] as const} />
      </View>
    </View>
    {!loaded ? <ActivityIndicator color={p.mutedForeground} /> : groups.map((group) => <View key={group.surah} style={{ gap: 4 }}>
      {(groups.length > 1 || group.ayahs[0].ayahNumber === 1) && <Text accessibilityRole="header" style={{ color: p.ornament, fontSize: 15, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{index.surahNames[group.surah]}</Text>}
      {/* iOS reads nested text buttons as plain text: the group offers each ayah's mark as an action. */}
      <View {...(Platform.OS === 'ios' ? {
        accessible: true, accessibilityLabel: group.ayahs.map((ayah) => ayah.text).join(' '),
        accessibilityActions: group.ayahs.map((ayah) => ({ name: `ayah:${ayah.ayahNumber}`, label: t('halaqat.marks.ayahAction', { kind: t(`halaqat.marks.${kind}`), ayah: ayah.ayahNumber }) })),
        onAccessibilityAction: (event: AccessibilityActionEvent) => {
          const ayah = Number(event.nativeEvent.actionName.split(':')[1]);
          if (ayah) onMark({ kind, at: { surah: group.surah, ayah } });
        },
      } : {})}>
      <JustifiedText hiddenColor={p.card} style={{ fontFamily, fontSize: size, lineHeight: readerTextLineHeight(size, false), color: p.foreground, fontWeight: '400', writingDirection: 'rtl', includeFontPadding: true }}>
        {group.ayahs.map((ayah) => {
          const mistakes = at(ayah.surahNumber, ayah.ayahNumber, 'mistake'), prompts = at(ayah.surahNumber, ayah.ayahNumber, 'hesitation');
          const tone = mistakes ? p.destructive : prompts ? p.warning : undefined;
          const label = formatList([t('halaqat.marks.ayahLabel', { ayah: ayah.ayahNumber }), ...(mistakes ? [t('halaqat.marks.mistakeCount', { count: mistakes })] : []), ...(prompts ? [t('halaqat.marks.hesitationCount', { count: prompts })] : [])]);
          return <NativeText key={ayah.ayahNumber} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t('halaqat.marks.ayahHint', { kind: t(`halaqat.marks.${kind}`) })}
            onPress={(event) => { event.stopPropagation(); onMark({ kind, at: { surah: ayah.surahNumber, ayah: ayah.ayahNumber } }); }}
            style={tone ? { backgroundColor: withAlpha(tone, Math.min(0.4, 0.14 + 0.08 * (mistakes + prompts))) } : undefined}>
            {display(ayah.text)}{' '}<NativeText style={{ color: tone ?? p.ornament }}>{ayah.marker}</NativeText>{' '}
          </NativeText>;
        })}
      </JustifiedText>
      </View>
    </View>)}
  </View>;
}

/** The grade, one of four in their colours; the one the marks suggest is named so. */
function GradePicker({ grade, suggested, palette: p, onChange, onClear }: { grade: Grade | null; suggested: Grade; palette: ReaderPalette; onChange: (grade: Grade) => void; onClear?: () => void }) {
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      <Text style={{ flex: 1, color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('halaqat.recite.grade')}</Text>
      {onClear && <Button size="sm" variant="ghost" palette={p} onPress={onClear}>{t('halaqat.recite.notHeard')}</Button>}
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('halaqat.recite.grade')} style={s.gradeRow}>
      {GRADES.map((g) => {
        const selected = g === grade, tone = gradeTone(p, g), hinted = !grade && g === suggested;
        return <Pressable key={g} accessibilityRole="radio" accessibilityLabel={hinted ? formatList([t(`halaqat.grades.${g}`), t('halaqat.recite.suggested')]) : t(`halaqat.grades.${g}`)}
          accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => onChange(g)} hitSlop={{ top: 4, bottom: 4 }}
          style={({ pressed }) => [s.gradeOption, { borderColor: selected || hinted ? tone : p.input, borderStyle: hinted ? 'dashed' : 'solid',
            backgroundColor: selected ? tone : pressed ? withAlpha(tone, 0.12) : p.background }, !selected && readerElevation(1, p)]}>
          <Text numberOfLines={1} style={{ color: selected ? p.background : tone, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{t(`halaqat.grades.${g}`)}</Text>
          {hinted && <Text style={{ color: tone, fontSize: 10, textAlign: 'center' }}>{t('halaqat.recite.suggested')}</Text>}
        </Pressable>;
      })}
    </View>
  </View>;
}

const s = StyleSheet.create({
  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 10, paddingVertical: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  undo: { width: 36, height: 36, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 10 },
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeOption: { flex: 1, minWidth: 0, minHeight: 48, borderWidth: 1.5, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  note: { minHeight: 76, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, ...rtlInput },
});
