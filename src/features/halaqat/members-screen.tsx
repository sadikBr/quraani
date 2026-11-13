import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { artColors } from '@/components/craft/art';
import { AddRow, PageBar, PageTitle, Row, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button, Empty } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { PrayerSheet } from '@/features/prayers/sheet';
import { PersonPhoto } from '@/features/account/avatar';
import { initialOf } from '@/features/account/profile';
import { shortDate } from '@/features/plans/presentation';
import { formatNumber, t } from '@/i18n';
import { ConfirmDialog } from './confirm-dialog';
import { CodeTiles, copyText, formatCode, joinLink, shareText } from './invite';
import { photoOf, type Person } from './membership';
import { useHalaqa, useMembership } from './provider';
import { activeStudents, type Halaqa } from './model';
import { DoorPill, HalaqaDoor, RingCount, type Seat } from './ring';
import { pastHalaqa } from './shared';

/**
 * Who is in a halaqa, for its supervisors: the halaqa's door, its ring with a seat kept open and
 * the code that fills it, to share (and a new one when it has gone too far), its supervisors, and those who joined from their accounts. Its owner brings in a
 * co-teacher with a code of their own, and takes them out; any teacher takes a member out.
 */
export function MembersScreen() {
  const { halaqa: id } = useLocalSearchParams<{ halaqa: string }>();
  const { palette: p } = useReadingPreferences();
  const { halaqa, ready } = useHalaqa(id);
  if (!halaqa) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <View style={page.content}>{ready ? <Empty icon="users" palette={p} title={t('halaqat.notFound')} description={t('halaqat.notFoundDetail')} /> : <ActivityIndicator color={p.mutedForeground} />}</View>
  </SafeAreaView>;
  return <Members halaqa={halaqa} />;
}

type Sheet = { kind: 'teacher'; code: string; expiresAt: string | null };
type Confirm = { kind: 'renew' } | { kind: 'remove'; person: Person; name: string } | { kind: 'leave' };

function Members({ halaqa }: { halaqa: Halaqa }) {
  const { palette: p } = useReadingPreferences();
  const { membership, roleOf, invite, people, removePerson, leave } = useMembership();
  const owner = roleOf(halaqa.id) === 'owner';
  const [code, setCode] = useState<string | undefined>(undefined);
  const [codeFailed, setCodeFailed] = useState(false);
  const [peopleFailed, setPeopleFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<Sheet | undefined>(undefined);
  const [confirm, setConfirm] = useState<Confirm | undefined>(undefined);
  const [reads, setReads] = useState(0);
  const list = membership.people[halaqa.id];

  useEffect(() => {
    let active = true;
    invite(halaqa.id, 'member').then((c) => { if (active) { setCode(c.code); setCodeFailed(false); } }, () => { if (active) setCodeFailed(true); });
    people(halaqa.id).then(() => { if (active) setPeopleFailed(false); }, () => { if (active) setPeopleFailed(true); });
    return () => { active = false; };
  }, [halaqa.id, invite, people, reads]);
  const retry = () => { setCodeFailed(false); setPeopleFailed(false); setReads((n) => n + 1); };

  const message = (c: string, teacher = false) => t(teacher ? 'halaqat.sharing.teacherShareMessage' : 'halaqat.sharing.shareMessage', { name: halaqa.name, code: formatCode(c), link: joinLink(c) });
  const share = async (c: string, teacher = false) => {
    setNote('');
    if (await shareText(message(c, teacher)) === 'copied') setNote(t('halaqat.sharing.copied'));
  };
  const copy = async (c: string) => { await copyText(formatCode(c)); setNote(t('halaqat.sharing.copied')); };
  const act = useCallback(async (work: () => Promise<void>, failure: string) => {
    setBusy(true); setError(''); setNote('');
    try { await work(); } catch { setError(failure); } finally { setBusy(false); }
  }, []);

  // A member's name in the halaqa (the teachers' own) before their profile's.
  const nameOf = (person: Person) => (person.student && halaqa.students.find((s) => s.id === person.student)?.name) || person.name || t('halaqat.sharing.noName');
  const teachers = list?.filter((x) => x.role !== 'member') ?? [];
  const members = list?.filter((x) => x.role === 'member') ?? [];
  // The halaqa's ring: those who joined from their accounts in gold, those added by name empty,
  // and a seat kept open for whoever the code brings.
  const students = activeStudents(halaqa);
  const joinedIds = new Set(members.map((x) => x.student));
  const linked = students.filter((x) => x.account || joinedIds.has(x.id)).length;
  const seats: Seat[] = [...students.map((x): Seat => x.account || joinedIds.has(x.id) ? 'heard' : 'waiting'), 'open'];
  const ringLabel = t('halaqat.sharing.ringLabel', { count: students.length, linked });
  const colors = artColors(p);
  const personRow = (person: Person, detail: string, removable: boolean) => {
    const name = nameOf(person);
    return <Row key={person.user ?? person.student ?? name} palette={p} title={person.me ? t('halaqat.me.you', { name }) : name} detail={detail}
      leading={<PersonPhoto size={40} photo={photoOf(membership, person.avatar)} cacheKey={person.avatar} initial={initialOf(name, t('halaqat.sharing.noInitial'))} palette={p} />}
      trailing={removable && person.user ? <Button size="sm" variant="outline" palette={p} disabled={busy} label={t('halaqat.sharing.removeLabel', { name })}
        onPress={() => setConfirm({ kind: 'remove', person, name })}>{t('halaqat.sharing.remove')}</Button> : undefined} />;
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar title={t('halaqat.detail.people')} back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      <PageTitle subtitle={halaqa.name} palette={p} />
      {(codeFailed || peopleFailed) && <Alert variant="destructive" palette={p}
        action={<Button size="sm" variant="outline" icon="sync" palette={p} onPress={retry}>{t('common.retry')}</Button>}>
        {codeFailed ? t('halaqat.sharing.codeFailed') : t('halaqat.sharing.peopleFailed')}
      </Alert>}

      <HalaqaDoor palette={p} seats={seats} kicker={t('halaqat.sharing.code')} ringLabel={ringLabel}
        center={<RingCount tile palette={p} value={formatNumber(students.length)} caption={t('halaqat.detail.inCircle')} />}
        detail={<View style={{ marginTop: 6, minHeight: 40, justifyContent: 'center' }}>
          {code ? <CodeTiles code={code} palette={p} size="md" tile /> : !codeFailed && <ActivityIndicator color={colors.soft} />}
        </View>}>
        <Text style={{ color: colors.soft, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{t('halaqat.sharing.codeHint')}</Text>
        <View style={s.actions}>
          <DoorPill filled icon="share" palette={p} disabled={!code} text={t('halaqat.sharing.share')} onPress={() => code && void share(code)} />
          <DoorPill icon="copy" palette={p} disabled={!code} text={t('halaqat.sharing.copy')} onPress={() => code && void copy(code)} />
        </View>
        <Pressable accessibilityRole="button" disabled={!code || busy} onPress={() => setConfirm({ kind: 'renew' })} hitSlop={8}
          style={({ pressed }) => [s.renew, { opacity: !code || busy ? 0.5 : pressed ? 0.7 : 1 }]}>
          <ReaderIcon name="sync" color={colors.soft} size={13} />
          <Text style={{ color: colors.soft, fontSize: 12, fontWeight: '600' }}>{t('halaqat.sharing.renew')}</Text>
        </Pressable>
      </HalaqaDoor>
      {!!note && <Alert icon="check" palette={p}>{note}</Alert>}
      {!!error && <Alert variant="destructive" palette={p}>{error}</Alert>}

      <Section title={t('halaqat.sharing.teachers')} palette={p}>
        {list ? <RowGroup palette={p}>
          {teachers.map((person) => personRow(person, person.role === 'owner' ? t('halaqat.sharing.owner') : t('halaqat.sharing.coTeacher'), owner && person.role === 'teacher'))}
        </RowGroup> : !peopleFailed && <ActivityIndicator color={p.mutedForeground} />}
        {owner && <AddRow title={t('halaqat.sharing.inviteTeacher')} detail={t('halaqat.sharing.inviteTeacherDetail')} icon="user-plus" palette={p} disabled={busy}
          onPress={() => void act(async () => { const c = await invite(halaqa.id, 'teacher'); setSheet({ kind: 'teacher', code: c.code, expiresAt: c.expiresAt }); }, t('halaqat.sharing.codeFailed'))} />}
      </Section>

      <Section title={t('halaqat.sharing.members')} detail={t('halaqat.sharing.membersDetail')} palette={p}>
        {list && (members.length ? <RowGroup palette={p}>
          {members.map((person) => personRow(person, t('halaqat.sharing.linked'), true))}
        </RowGroup> : <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('halaqat.sharing.noMembers')}</Text>)}
      </Section>

      {!owner && <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" icon="log-out" tone={p.destructive} palette={p} disabled={busy} onPress={() => setConfirm({ kind: 'leave' })}>{t('halaqat.sharing.leave')}</Button>
      </View>}
    </ScrollView>

    {sheet && <PrayerSheet title={t('halaqat.sharing.teacherCode')} subtitle={halaqa.name} onClose={() => setSheet(undefined)}>
      <View style={{ gap: 14, paddingVertical: 8, alignItems: 'center' }}>
        <CodeTiles code={sheet.code} palette={p} />
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>
          {t('halaqat.sharing.teacherCodeHint', { date: sheet.expiresAt ? shortDate(sheet.expiresAt.slice(0, 10)) : '' })}
        </Text>
        <View style={s.actions}>
          <Button icon="share" palette={p} onPress={() => void share(sheet.code, true)}>{t('halaqat.sharing.share')}</Button>
          <Button variant="outline" icon="copy" palette={p} onPress={() => void copy(sheet.code)}>{t('halaqat.sharing.copy')}</Button>
        </View>
      </View>
    </PrayerSheet>}

    {confirm?.kind === 'renew' && <ConfirmDialog icon="sync" title={t('halaqat.sharing.renewTitle')} body={t('halaqat.sharing.renewBody')} confirm={t('halaqat.sharing.renew')}
      onClose={() => setConfirm(undefined)}
      onConfirm={() => { setConfirm(undefined); void act(async () => setCode((await invite(halaqa.id, 'member', true)).code), t('halaqat.sharing.codeFailed')); }} />}
    {confirm?.kind === 'remove' && <ConfirmDialog icon="log-out" confirm={t('halaqat.sharing.remove')}
      title={confirm.person.role === 'member' ? t('halaqat.sharing.removeMemberTitle') : t('halaqat.sharing.removeTeacherTitle')}
      body={t(confirm.person.role === 'member' ? 'halaqat.sharing.removeMemberBody' : 'halaqat.sharing.removeTeacherBody', { name: confirm.name })}
      onClose={() => setConfirm(undefined)}
      onConfirm={() => { const person = confirm.person; setConfirm(undefined); void act(async () => {
        await removePerson(halaqa.id, person.user!);
        // The code they joined with would let them back in: a member taken out, the halaqa gets a new one.
        if (person.role === 'member') await invite(halaqa.id, 'member', true).then((c) => setCode(c.code), () => {});
      }, t('halaqat.sharing.removeFailed')); }} />}
    {confirm?.kind === 'leave' && <ConfirmDialog icon="log-out" title={t('halaqat.sharing.leaveTitle')} body={t('halaqat.sharing.leaveTeacherBody', { name: halaqa.name })}
      confirm={t('halaqat.sharing.leave')} onClose={() => setConfirm(undefined)}
      onConfirm={() => { setConfirm(undefined); void act(async () => { await leave(halaqa.id); pastHalaqa(2); }, t('halaqat.sharing.leaveFailed')); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  renew: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 8 },
});
