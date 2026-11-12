import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Row, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button, Tabs } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { usePlans } from '@/features/plans/provider';
import { PlanField, SwitchRow } from '@/features/plans/components';
import type { AyahSpan } from '@/features/plans/types';
import { CreationFooter } from '@/features/plans/goal-creation-components';
import { MemorizedSelectionSheet } from '@/features/plans/memorized-selection-sheet';
import { memoryFor, mergeSpans, spanCount } from '@/features/plans/memorization';
import { t } from '@/i18n';
import { useHalaqat, useMembership } from './provider';
import { memorizedBy, NAME_LIMIT, newId, portionOf, spanOf, validPortion, type Direction, type Portion, type Student } from './model';
import { LawhBoard, useHalaqaIndex } from './shared';
import { PortionSheet } from './portion-sheet';
import { ConfirmDialog } from './confirm-dialog';

/**
 * Adding a student to a halaqa, or changing one (`?student=`): their name, the order they
 * memorize in, their first portion, and what they had memorized before; and, for one already in
 * the halaqa, their leaving or coming back, or their removal with their history.
 */
export function StudentFormScreen() {
  const params = useLocalSearchParams<{ halaqa: string; student?: string }>();
  const { palette: p } = useReadingPreferences();
  const { state, change } = useHalaqat();
  const { membership } = useMembership();
  const { today, memorization, remember } = usePlans();
  const halaqa = state.halaqat.find((h) => h.id === params.halaqa);
  const existing = halaqa?.students.find((s) => s.id === params.student);
  const { index, shape, error, retry } = useHalaqaIndex(halaqa?.riwayah ?? 'warsh');
  const [name, setName] = useState(existing?.name ?? '');
  const [direction, setDirection] = useState<Direction>(existing?.direction ?? 'backward');
  const [first, setFirst] = useState<Portion | undefined>(existing?.first?.new);
  const [known, setKnown] = useState<Portion[]>(existing?.known ?? []);
  const [choosing, setChoosing] = useState<'first' | 'known' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [me, setMe] = useState(!!existing?.me);
  const [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  const back = { label: t('common.back'), onPress: () => router.back() };
  if (!halaqa) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={back} palette={p} /><View style={page.content}><Text style={{ color: p.mutedForeground }}>{t('halaqat.notFound')}</Text></View>
  </SafeAreaView>;
  const valid = !!name.trim() && name.trim().length <= NAME_LIMIT && !saving;
  const knownAyahs = shape ? spanCount(mergeSpans(known.filter((k) => validPortion(shape, k)).map((k) => spanOf(shape, k)))) : 0;
  // The phone's owner: their own record (محفوظك) of the halaqa's riwayah.
  let record: AyahSpan[] = [];
  if (me && index) { try { record = memoryFor(memorization, halaqa.riwayah, index); } catch { record = []; } }
  const ownerElsewhere = halaqa.students.find((s) => s.me && s.id !== existing?.id);
  // Someone else's participant (another supervisor's, or a member who joined) can't be the phone's owner.
  const someoneElse = !!existing && !existing.me && (!!existing.account || !!membership.people[halaqa.id]?.some((x) => x.student === existing.id));
  const save = async (leftOn = existing?.leftOn) => {
    if (!valid) return;
    Keyboard.dismiss();
    const student: Student = {
      id: existing?.id ?? newId('student'), name: name.trim(), joinedOn: existing?.joinedOn ?? today, direction, known,
      ...(first || existing?.first?.revision ? { first: { ...(first ? { new: first } : {}), ...(existing?.first?.revision ? { revision: existing.first.revision } : {}) } } : {}),
      ...(leftOn ? { leftOn } : {}),
      ...(me ? { me: true as const } : {}),
      // Someone else's own participant (another supervisor's) stays theirs.
      ...(existing?.account && !me ? { account: existing.account } : {}),
    };
    change({ type: 'saveStudent', halaqa: halaqa.id, student });
    // Linked now: what they knew and passed here joins their own record.
    if (me && !existing?.me && index && shape) {
      const spans = memorizedBy(shape, halaqa, student);
      if (spans.length) {
        setSaving(true); setMessage('');
        try { await remember(index, halaqa.riwayah, spans); }
        catch { setMessage(t('halaqat.me.linkFailed')); setSaving(false); return; }
        setSaving(false);
      }
    }
    router.back();
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar title={existing ? t('halaqat.studentForm.editTitle') : t('halaqat.studentForm.newTitle')} back={back} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
        <PageTitle subtitle={halaqa.name} palette={p} />
        <PlanField label={t('halaqat.studentForm.name')} value={name} onChange={setName} placeholder={t('halaqat.studentForm.namePlaceholder')} />
        <Section title={t('halaqat.studentForm.direction')} palette={p}>
          <Tabs role="radio" palette={p} label={t('halaqat.studentForm.direction')} value={direction} onChange={setDirection}
            options={[{ value: 'backward', label: t('halaqat.directions.backward') }, { value: 'forward', label: t('halaqat.directions.forward') }] as const} />
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t(`halaqat.directions.${direction}Detail`)}</Text>
        </Section>
        {error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>
          : !index || !shape ? <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
          {!someoneElse && <RowGroup palette={p}>
            <SwitchRow icon="bookmark" label={t('halaqat.me.switch')} checked={me} onChange={setMe}
              detail={ownerElsewhere && me ? t('halaqat.me.moves', { name: ownerElsewhere.name }) : t('halaqat.me.switchDetail')} />
          </RowGroup>}
          <Section title={existing ? t('halaqat.studentForm.firstTitleExisting') : t('halaqat.studentForm.firstTitle')} palette={p}>
            <LawhBoard index={index} shape={shape} palette={p} lines={[
              { title: t('halaqat.lawh.new'), portion: first, emptyText: t('halaqat.studentForm.firstEmpty'), onChange: () => setChoosing('first'), onClear: () => setFirst(undefined) },
            ]} />
          </Section>
          <Section title={t('halaqat.studentForm.known')} palette={p}>
            <RowGroup palette={p}>
              {me && <Row icon="practice" palette={p} title={t('halaqat.me.record', { count: spanCount(record) })} detail={t('halaqat.me.recordDetail')} />}
              <Row icon="book" palette={p} title={knownAyahs ? t('halaqat.known.total', { count: knownAyahs }) : t('halaqat.studentForm.knownNone')}
                detail={me ? t('halaqat.me.knownDetail') : t('halaqat.studentForm.knownDetail')} onPress={() => setChoosing('known')} />
            </RowGroup>
          </Section>
        </>}
        {existing && <Section title={t('halaqat.studentForm.membership')} palette={p}>
          <View style={{ gap: 10 }}>
            {existing.leftOn
              ? <Button variant="outline" icon="restore" palette={p} disabled={!valid} onPress={() => void save(undefined)} block>{t('halaqat.studentForm.rejoin')}</Button>
              : <Button variant="outline" icon="archive" palette={p} disabled={!valid} onPress={() => void save(today)} block>{t('halaqat.studentForm.leave')}</Button>}
            <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{existing.leftOn ? t('halaqat.studentForm.rejoinDetail') : t('halaqat.studentForm.leaveDetail')}</Text>
            <Button variant="outline" icon="trash" tone={p.destructive} palette={p} onPress={() => setDeleting(true)} block>{t('halaqat.studentForm.delete')}</Button>
          </View>
        </Section>}
      </ScrollView>
      <CreationFooter>
        {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
        {!valid && !saving && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('halaqat.studentForm.nameNeeded')}</Text>}
        <ReaderButton palette={p} selected disabled={!valid} onPress={() => void save()}>{existing ? t('halaqat.studentForm.saveChanges') : t('halaqat.studentForm.add')}</ReaderButton>
      </CreationFooter>
    </KeyboardAvoidingView>
    {choosing === 'first' && index && shape && <PortionSheet index={index} shape={shape} value={first} fallbackSurah={direction === 'forward' ? 1 : 114} title={t('halaqat.lawh.new')} subtitle={t('halaqat.studentForm.firstSheet')}
      onClose={() => setChoosing(null)} onSave={(portion) => { setFirst(portion); setChoosing(null); }} />}
    {choosing === 'known' && index && shape && <MemorizedSelectionSheet purpose="student" index={index}
      selected={mergeSpans(known.filter((k) => validPortion(shape, k)).map((k) => spanOf(shape, k)))}
      onClose={() => setChoosing(null)} onSave={(ranges) => { setKnown(mergeSpans(ranges).map((r) => portionOf(shape, r))); setChoosing(null); }} />}
    {deleting && existing && <ConfirmDialog title={t('halaqat.studentForm.deleteConfirmTitle')} body={t('halaqat.studentForm.deleteConfirmBody', { name: existing.name })}
      confirm={t('halaqat.studentForm.delete')} onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); change({ type: 'deleteStudent', halaqa: halaqa.id, student: existing.id }); router.dismiss(params.student ? 2 : 1); }} />}
  </SafeAreaView>;
}
