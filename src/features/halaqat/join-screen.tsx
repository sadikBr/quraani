import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { artColors } from '@/components/craft/art';
import { PageBar, PageTitle, page } from '@/components/craft/page';
import { Alert, Button, Empty } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { fieldElevation, readerShape } from '@/features/quran-reader/design';
import { useAccount } from '@/features/account/provider';
import { AccountError } from '@/features/account/auth-client';
import type { InvitePreview } from '@/features/account/api';
import { Field } from '@/features/account/sign-in-screen';
import { formatNumber, t } from '@/i18n';
import { clampName, NAME_LIMIT, type Halaqa } from './model';
import { cleanCode, formatCode } from './invite';
import { useMembership } from './provider';
import { DoorPill, HalaqaDoor, RingCount, type Seat } from './ring';
import { halaqaFacts } from './shared';
import { rtlInput } from '@/lib/ui-text-alignment';

/** A failure in words: a code tried too often, a halaqa deleted, or no connection. */
function problemOf(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('too_many_attempts')) return t('halaqat.sharing.tooMany');
  if (message.includes('halaqa_deleted')) return t('halaqat.sharing.deleted');
  return t('halaqat.sharing.joinFailed');
}

/**
 * Joining a halaqa with the code its teacher sent (`?code=` from a link fills it in): what it
 * opens first (the halaqa, who teaches it, whether to learn or to teach), then one's name in it.
 */
export function JoinScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { palette: p } = useReadingPreferences();
  const { profile: { profile } } = useAccount();
  const { signedIn, preview, join } = useMembership();
  const [code, setCode] = useState(() => cleanCode(params.code ?? ''));
  // What a code opens, and the code it was asked for (joined with that one).
  const [found, setFound] = useState<(InvitePreview & { code: string }) | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState<'finding' | 'joining' | undefined>(undefined);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const asked = useRef('');

  const find = async (value = code) => {
    if (value.length !== 8 || busy === 'joining') return;
    asked.current = value;
    setBusy('finding'); setError(''); setFound(undefined);
    try {
      const result = await preview(value);
      // A code changed meanwhile: its own answer counts.
      if (asked.current !== value) return;
      if (!result) setError(t('halaqat.sharing.notFound'));
      else if (result.deleted) setError(t('halaqat.sharing.deleted'));
      else setFound({ ...result, code: value });
    } catch (e) {
      if (asked.current === value) setError(problemOf(e));
    } finally {
      if (asked.current === value) setBusy(undefined);
    }
  };
  // A code from a link is looked up at once, once signed in.
  useEffect(() => {
    if (signedIn && code.length === 8 && !asked.current) void find(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const shownName = name ?? clampName(profile?.fullName ?? '');
  const submit = async () => {
    if (!found || busy) return;
    setBusy('joining'); setError('');
    try {
      const joined = await join(found.code, clampName(shownName));
      if (!joined) { setFound(undefined); setError(t('halaqat.sharing.notFound')); return; }
      router.replace({ pathname: '/halaqat/[id]', params: { id: joined.halaqa } });
    } catch (e) {
      setError(e instanceof AccountError && e.message.includes('name_required') ? t('halaqat.sharing.yourNameHint') : problemOf(e));
    } finally {
      setBusy(undefined);
    }
  };

  const back = { label: t('common.back'), onPress: () => router.canGoBack() ? router.back() : router.replace('/halaqat') };
  if (signedIn === false) return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={back} palette={p} />
    <View style={page.content}>
      <Empty icon="users" motif="circle" palette={p} title={t('halaqat.sharing.signedOutTitle')} description={t('halaqat.sharing.signedOutBody')}>
        <Button size="lg" icon="user" palette={p} block onPress={() => router.push('/account/sign-in')}>{t('halaqat.sharing.signIn')}</Button>
      </Empty>
    </View>
  </SafeAreaView>;

  const teacher = found?.kind === 'teacher';
  const ready = !!found && !found.role && (teacher || !!shownName.trim()) && !busy;
  const facts = found?.data ? halaqaFacts({ riwayah: found.data.riwayah === 'hafs' ? 'hafs' : 'warsh', weekdays: found.data.weekdays ?? [] } as unknown as Halaqa) : '';
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar back={back} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 20 }]}>
        <PageTitle title={t('halaqat.sharing.joinTitle')} subtitle={t('halaqat.sharing.joinLead')} palette={p} />
        <View style={{ gap: 8 }}>
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('halaqat.sharing.codeField')}</Text>
          <TextInput accessibilityLabel={t('halaqat.sharing.codeField')} value={formatCode(code)} placeholder="XXXX-XXXX" placeholderTextColor={p.mutedForeground}
            onChangeText={(text) => { const next = cleanCode(text); setCode(next); setError(''); if (next !== asked.current) setFound(undefined); if (next.length === 8 && next !== asked.current) void find(next); }}
            autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={9} returnKeyType="go" onSubmitEditing={() => void find()}
            selectionColor={p.primary} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={[s.code, { color: p.foreground, backgroundColor: p.background, borderColor: focused ? p.ring : p.input }, fieldElevation(focused, p)]} />
        </View>
        {!found && <Button size="lg" icon="search" palette={p} block disabled={code.length !== 8 || !!busy} onPress={() => void find()}>
          {busy === 'finding' ? t('halaqat.sharing.finding') : t('halaqat.sharing.find')}
        </Button>}
        {!!error && <Alert variant="destructive" palette={p}>{error}</Alert>}

        {found && <>
          <HalaqaDoor palette={p} seats={[...Array.from({ length: Math.min(found.members, 40) }, (): Seat => 'waiting'), ...(teacher ? [] : ['me' as const])]}
            ringLabel={t('halaqat.sharing.memberCount', { count: found.members })}
            center={<RingCount tile palette={p} value={formatNumber(found.members)} caption={t('halaqat.detail.inCircle')} />}
            kicker={facts || undefined} title={found.data?.name ?? ''}
            detail={found.teacher ? t('halaqat.list.taughtBy', { name: found.teacher }) : undefined}>
            {found.role ? <DoorPill palette={p} icon="check" text={t('halaqat.sharing.already')} />
              : <Text style={{ color: artColors(p).ink, fontSize: 14, lineHeight: 23, textAlign: 'center' }}>{teacher ? t('halaqat.sharing.asTeacher') : t('halaqat.sharing.asMember')}</Text>}
          </HalaqaDoor>
          {found.role ? <Button size="lg" icon="users" palette={p} block onPress={() => router.replace({ pathname: '/halaqat/[id]', params: { id: found.halaqa } })}>{t('halaqat.sharing.open')}</Button> : <>
            {!teacher && <Field label={t('halaqat.sharing.yourName')} hint={t('halaqat.sharing.yourNameHint')}>
              {(field) => <TextInput {...field} style={[field.style, s.name]} value={shownName} onChangeText={setName} maxLength={NAME_LIMIT}
                autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="done" onSubmitEditing={() => { if (ready) void submit(); }} />}
            </Field>}
            <Button size="lg" icon={teacher ? 'users' : 'user-plus'} palette={p} block disabled={!ready} onPress={() => void submit()}>
              {busy === 'joining' ? t('halaqat.sharing.joining') : t('halaqat.sharing.join')}
            </Button>
          </>}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  code: {
    minHeight: 60, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 14, fontSize: 26, fontFamily: 'UiSans', fontWeight: '700',
    letterSpacing: 4, writingDirection: 'ltr', textAlign: 'center',
  },
  name: rtlInput,
});
