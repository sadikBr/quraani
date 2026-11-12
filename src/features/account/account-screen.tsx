import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchPanel } from '@/components/craft/panels';
import { PageBar, PageTitle, Row, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { ConfirmDialog } from '@/features/halaqat/confirm-dialog';
import { shortDate } from '@/features/plans/presentation';
import { localDate } from '@/features/plans/dates';
import { formatList, t } from '@/i18n';
import { Avatar } from './avatar';
import { clock, dayOf, DevicesSection } from './devices-section';
import { initialOf } from './profile';
import { useAccount } from './provider';
import type { SyncState } from './sync/engine';

/** What each synced document is, in the user's words. */
const datasetName = (key: string) => {
  if (key.startsWith('plans:')) return t('account.datasets.plans');
  if (key.startsWith('adhkar:')) return t('account.datasets.adhkar');
  if (key.startsWith('practice:')) return t('account.datasets.practice');
  if (key.startsWith('reader:warsh-bookmarks')) return t('account.datasets.bookmarksWarsh');
  if (key.startsWith('reader:hafs-bookmarks')) return t('account.datasets.bookmarksHafs');
  return t('account.datasets.preferences');
};

/**
 * The account: signed out, what it gives and the way in; signed in, how the sync stands (and a
 * choice when the phone's data and the account's differ), then signing out or deleting it.
 */
export function AccountScreen() {
  const { palette: p } = useReadingPreferences();
  const { user } = useAccount();
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar title={t('account.title')} back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
      {user === undefined ? null : user ? <SignedIn email={user.email} /> : <SignedOut />}
    </ScrollView>
  </SafeAreaView>;
}

function SignedOut() {
  const { palette: p } = useReadingPreferences();
  const items: [ReaderIconName, string][] = [
    ['calendar', t('account.signedOut.items.plans')], ['users', t('account.signedOut.items.halaqat')], ['beads', t('account.signedOut.items.adhkar')],
    ['practice', t('account.signedOut.items.practice')], ['bookmark', t('account.signedOut.items.bookmarks')], ['book', t('account.signedOut.items.preferences')],
  ];
  return <>
    <PageTitle subtitle={t('account.signedOut.lead')} palette={p} />
    <Section title={t('account.signedOut.what')} palette={p}>
      <View style={[s.list, { backgroundColor: p.card, borderColor: p.border }]}>
        {items.map(([icon, label]) => <View key={label} style={s.item}>
          <View style={[s.mark, { backgroundColor: withAlpha(p.ornament, 0.14) }]}><ReaderIcon name={icon} color={p.ornament} size={16} /></View>
          <Text style={{ flex: 1, color: p.foreground, fontSize: 15 }}>{label}</Text>
        </View>)}
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('account.signedOut.prayers')}</Text>
    </Section>
    <View style={{ gap: 10 }}>
      <Button size="lg" icon="user" palette={p} block onPress={() => router.push('/account/sign-in')}>{t('account.signedOut.signIn')}</Button>
      <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('account.signedOut.offline')}</Text>
    </View>
  </>;
}

function syncLine(sync: SyncState) {
  if (sync.syncing) return { icon: 'sync' as const, title: t('account.sync.syncing'), detail: undefined };
  if (sync.problem) return { icon: 'cloud-alert' as const, title: t(`account.sync.problems.${sync.problem}`), detail: undefined };
  if (!sync.lastSynced) return { icon: 'cloud' as const, title: t('account.sync.waiting'), detail: undefined };
  const detail = dayOf(sync.lastSynced) === localDate() ? t('account.sync.last', { time: clock(sync.lastSynced) }) : t('account.sync.lastOn', { date: shortDate(dayOf(sync.lastSynced)) });
  return { icon: 'cloud' as const, title: t('account.sync.inStep'), detail };
}

function SignedIn({ email }: { email: string }) {
  const { palette: p } = useReadingPreferences();
  const { sync, syncNow, signOut, deleteAccount } = useAccount();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const line = syncLine(sync);
  return <>
    <ProfileHero email={email} />
    {sync.conflicts.length > 0 && <Conflicts keys={sync.conflicts.map((c) => c.key)} palette={p} />}
    {sync.unreadable.length > 0 && <Alert icon="info" palette={p}>{t('account.unreadable')}</Alert>}
    <Section title={t('account.sync.title')} palette={p}>
      <RowGroup palette={p}>
        <Row icon={line.icon} title={line.title} detail={line.detail} palette={p} tone={sync.problem ? p.warning : undefined} />
        <Row icon="sync" title={t('account.sync.now')} disabled={sync.syncing} palette={p} onPress={() => void syncNow()} chevron={false} />
      </RowGroup>
    </Section>
    <DevicesSection />
    <Section title={t('account.manage.title')} palette={p}>
      <RowGroup palette={p}>
        <Row icon="pencil" title={t('account.manage.changePassword')} palette={p} onPress={() => router.push('/account/password')} />
        <Row icon="log-out" title={t('account.manage.signOut')} detail={t('account.manage.signOutDetail')} palette={p} chevron={false}
          onPress={() => void signOut()} />
        <Row icon="trash" title={t('account.manage.delete')} detail={t('account.manage.deleteDetail')} palette={p} tone={p.destructive} chevron={false}
          onPress={() => { setMessage(''); setDeleting(true); }} />
      </RowGroup>
      {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
    </Section>
    {deleting && <ConfirmDialog title={t('account.manage.deleteConfirmTitle')} body={t('account.manage.deleteConfirmBody')} confirm={t('account.manage.delete')}
      onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); deleteAccount().catch(() => setMessage(t('account.manage.deleteFailed'))); }} />}
  </>;
}

/**
 * Who is signed in, seen through an arched window: their photo in its star (or their name's first
 * letter), their name, their email, and the way to change them.
 */
function ProfileHero({ email }: { email: string }) {
  const { palette: p } = useReadingPreferences();
  const { profile: { profile } } = useAccount();
  const name = profile?.fullName.trim() ?? '';
  const edit = () => router.push('/account/profile');
  const empty = profile !== undefined && !name && !profile.avatar;
  return <ArchPanel palette={p} rise={46} contentStyle={s.hero}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('account.profile.edit')} onPress={edit} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Avatar size={128} photo={profile?.photo?.url} cacheKey={profile?.avatar ?? undefined} initial={initialOf(name, email)} palette={p} />
    </Pressable>
    <Text accessibilityRole="header" numberOfLines={2} style={{ color: p.foreground, fontSize: 26, lineHeight: 42, fontFamily: 'ReaderNaskhBold', textAlign: 'center', marginTop: 8 }}>
      {name || t('account.title')}
    </Text>
    <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{`⁦${email}⁩`}</Text>
    <Button variant="outline" size="sm" icon={empty ? 'user-plus' : 'pencil'} palette={p} onPress={edit} style={{ marginTop: 14 }}>
      {empty ? t('account.profile.addName') : t('account.profile.edit')}
    </Button>
  </ArchPanel>;
}

/** Data changed both here and in the account: the user keeps one copy, for all of it at once. */
function Conflicts({ keys, palette: p }: { keys: string[]; palette: ReaderPalette }) {
  const { settle } = useAccount();
  const [busy, setBusy] = useState(false);
  const choose = (keep: 'phone' | 'account') => { setBusy(true); void settle(keep).finally(() => setBusy(false)); };
  return <View style={[s.conflict, { borderColor: withAlpha(p.warning, 0.5), backgroundColor: withAlpha(p.warning, 0.08) }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <ReaderIcon name="cloud-alert" color={p.warning} size={20} />
      <Text accessibilityRole="header" style={{ flex: 1, color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{t('account.conflicts.title')}</Text>
    </View>
    <Text style={{ color: p.foreground, fontSize: 14, lineHeight: 23 }}>{t('account.conflicts.body', { list: formatList([...new Set(keys.map(datasetName))]) })}</Text>
    {busy ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('account.conflicts.settling')}</Text> : <View style={{ gap: 8 }}>
      <Choice icon="home" title={t('account.conflicts.phone')} detail={t('account.conflicts.phoneDetail')} palette={p} onPress={() => choose('phone')} />
      <Choice icon="cloud" title={t('account.conflicts.account')} detail={t('account.conflicts.accountDetail')} palette={p} onPress={() => choose('account')} />
    </View>}
  </View>;
}

function Choice({ icon, title, detail, palette: p, onPress }: { icon: ReaderIconName; title: string; detail: string; palette: ReaderPalette; onPress: () => void }) {
  return <RowGroup palette={p}><Row icon={icon} title={title} detail={detail} palette={p} onPress={onPress} chevron={false} /></RowGroup>;
}

const s = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: readerShape.card, paddingVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9 },
  mark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  conflict: { borderWidth: 1, borderRadius: readerShape.card, padding: 16, gap: 12 },
  hero: { alignItems: 'center', gap: 2, paddingTop: 54, paddingHorizontal: 18, paddingBottom: 20 },
});
