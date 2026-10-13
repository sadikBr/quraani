import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '@/features/quran-reader/components/ui/reader-chrome';
import { fieldElevation, readerShape } from '@/features/quran-reader/design';
import { t } from '@/i18n';
import { AccountError, normalizeEmail, PASSWORD_MIN, plausibleEmail } from './auth-client';
import { useAccount } from './provider';

/** Links can be asked for again after this long (the account allows one a minute). */
const RESEND_SECONDS = 60;
export const problemText = (error: unknown) => t(`account.signIn.errors.${error instanceof AccountError ? error.kind : 'failed'}`);

/**
 * Signing in, or making an account: an email and a password. A new account confirms its email by
 * a link that opens the app signed in; a forgotten password is reset by an emailed link too.
 */
export function SignInScreen() {
  const { palette: p } = useReadingPreferences();
  const { signIn, signUp, resendConfirmation, requestReset } = useAccount();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; unconfirmed?: boolean } | undefined>();
  const [note, setNote] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const attempt = async (action: () => Promise<void>) => {
    setBusy(true); setError(undefined); setNote('');
    try {
      await action();
    } catch (e) {
      setError({ text: problemText(e), unconfirmed: e instanceof AccountError && e.kind === 'email_not_confirmed' });
    } finally {
      setBusy(false);
    }
  };
  const address = normalizeEmail(email);
  const done = () => { if (router.canGoBack()) router.back(); else router.replace('/account'); };
  const submit = () => attempt(async () => {
    if (mode === 'signIn') { await signIn(address, password); done(); return; }
    if (await signUp(address, password)) { done(); return; }
    setConfirming(address); setWait(RESEND_SECONDS);
  });
  const resend = (to: string) => attempt(async () => { await resendConfirmation(to); setNote(t('account.signIn.resent')); setWait(RESEND_SECONDS); });
  const forgot = () => {
    if (!plausibleEmail(email)) { setError({ text: t('account.signIn.forgotNeedsEmail') }); return; }
    void attempt(async () => { await requestReset(address); setNote(t('account.signIn.resetSent', { email: address })); });
  };

  const ready = plausibleEmail(email) && password.length >= (mode === 'signUp' ? PASSWORD_MIN : 1) && !busy;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 20 }]}>
        {confirming ? <>
          <PageTitle title={t('account.signIn.confirmTitle')} subtitle={t('account.signIn.confirmLead', { email: confirming })} palette={p} />
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('account.signIn.confirmElsewhere')}</Text>
          {!!error && <Alert variant="destructive" palette={p}>{error.text}</Alert>}
          {!!note && !error && <Alert icon="check" palette={p}>{note}</Alert>}
          <Button size="lg" icon="user" palette={p} block onPress={() => { setConfirming(undefined); setMode('signIn'); setPassword(''); setError(undefined); setNote(''); }}>
            {t('account.signIn.toSignIn')}
          </Button>
          <View style={s.links}>
            <Link label={wait ? t('account.signIn.resendIn', { count: wait }) : t('account.signIn.resendConfirm')} disabled={!!wait || busy} onPress={() => void resend(confirming)} />
          </View>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{t('account.signIn.spam')}</Text>
        </> : <>
          <PageTitle title={mode === 'signIn' ? t('account.signIn.title') : t('account.signIn.newTitle')}
            subtitle={mode === 'signIn' ? t('account.signIn.lead') : t('account.signIn.newLead')} palette={p} />
          <Segments palette={p} value={mode} onChange={(value) => { setMode(value); setError(undefined); setNote(''); }}
            options={[{ value: 'signIn', label: t('account.signIn.modes.signIn') }, { value: 'signUp', label: t('account.signIn.modes.signUp') }]} />
          <Field label={t('account.signIn.email')}>
            {(field) => <TextInput {...field} value={email} onChangeText={setEmail} placeholder="name@example.com"
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
              textContentType={mode === 'signIn' ? 'username' : 'emailAddress'} inputMode="email" />}
          </Field>
          <PasswordField value={password} onChange={setPassword} isNew={mode === 'signUp'} onSubmit={() => { if (ready) void submit(); }} />
          {!!error && <Alert variant="destructive" palette={p}
            action={error.unconfirmed ? <Button size="sm" variant="outline" palette={p} disabled={busy || !!wait} onPress={() => void resend(address)}>{t('account.signIn.resendConfirm')}</Button> : undefined}>
            {error.text}
          </Alert>}
          {!!note && !error && <Alert icon="mail" palette={p}>{note}</Alert>}
          <Button size="lg" icon={mode === 'signIn' ? 'user' : 'user-plus'} palette={p} block disabled={!ready} onPress={() => void submit()}>
            {mode === 'signIn' ? (busy ? t('account.signIn.submitting') : t('account.signIn.submit')) : (busy ? t('account.signIn.creating') : t('account.signIn.create'))}
          </Button>
          {mode === 'signIn' && <View style={s.links}><Link label={t('account.signIn.forgot')} disabled={busy} onPress={forgot} /></View>}
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

type FieldProps = Pick<ComponentProps<typeof TextInput>, 'accessibilityLabel' | 'onFocus' | 'onBlur' | 'style' | 'placeholderTextColor' | 'selectionColor'>;
/** A labelled text field: at the right as every field is, its characters left to right (emails, passwords). */
export function Field({ label, children, hint }: { label: string; hint?: string; children: (field: FieldProps) => ReactNode }) {
  const { palette: p } = useReadingPreferences();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}>
    <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    {children({
      accessibilityLabel: label, onFocus: () => setFocused(true), onBlur: () => setFocused(false), placeholderTextColor: p.mutedForeground, selectionColor: p.primary,
      style: [s.input, { color: p.foreground, backgroundColor: p.background, borderColor: focused ? p.ring : p.input }, fieldElevation(focused, p)],
    })}
    {!!hint && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{hint}</Text>}
  </View>;
}

/** A password, hidden unless shown; a new one says how long it must be. */
export function PasswordField({ value, onChange, isNew, onSubmit, label = t('account.signIn.password') }: {
  value: string; onChange: (value: string) => void; isNew: boolean; onSubmit?: () => void; label?: string;
}) {
  const { palette: p } = useReadingPreferences();
  const [shown, setShown] = useState(false);
  return <Field label={label} hint={isNew ? t('account.signIn.passwordHint', { count: PASSWORD_MIN }) : undefined}>
    {(field) => <View>
      <TextInput {...field} style={[field.style, s.password]} value={value} onChangeText={onChange} secureTextEntry={!shown}
        autoCapitalize="none" autoCorrect={false} autoComplete={isNew ? 'new-password' : 'current-password'} textContentType={isNew ? 'newPassword' : 'password'}
        returnKeyType="go" onSubmitEditing={onSubmit} />
      <Pressable accessibilityRole="button" accessibilityLabel={shown ? t('account.signIn.hide') : t('account.signIn.show')} onPress={() => setShown((v) => !v)} hitSlop={6}
        style={({ pressed }) => [s.eye, { opacity: pressed ? 0.6 : 1 }]}>
        <ReaderIcon name={shown ? 'eye-off' : 'eye'} color={p.mutedForeground} size={20} />
      </Pressable>
    </View>}
  </Field>;
}

export function Link({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={8}
    style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.6 : 1, paddingVertical: 6 })}>
    <Text style={{ color: disabled ? p.mutedForeground : p.primary, fontSize: 14, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 14, fontSize: 16, fontFamily: 'UiSans', textAlign: 'right', writingDirection: 'ltr' },
  password: { paddingHorizontal: 48 },
  eye: { position: 'absolute', end: 4, top: 0, bottom: 0, width: 40, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 },
});
