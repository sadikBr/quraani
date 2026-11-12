import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PageBar, PageTitle, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { PASSWORD_MIN } from './auth-client';
import { useAccount } from './provider';
import { PasswordField, problemText } from './sign-in-screen';

/** Choosing a new password: after a reset link (`?reset=1`), or from the account. */
export function PasswordScreen() {
  const { palette: p } = useReadingPreferences();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const { updatePassword } = useAccount();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const leave = () => router.replace('/account');
  const submit = async () => {
    setBusy(true); setError('');
    try {
      // After a reset link the account doesn't ask for the old password (it was forgotten).
      await updatePassword(password, reset ? undefined : current);
      setDone(true);
    } catch (e) {
      setError(problemText(e));
    } finally {
      setBusy(false);
    }
  };
  const ready = password.length >= PASSWORD_MIN && (!!reset || !!current) && !busy && !done;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar title={t('account.password.title')} back={{ label: t('common.back'), onPress: leave }} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 20 }]}>
        <PageTitle subtitle={reset ? t('account.password.resetLead') : t('account.password.lead')} palette={p} />
        {!reset && <PasswordField label={t('account.password.current')} value={current} onChange={setCurrent} isNew={false} />}
        <PasswordField label={t('account.password.new')} value={password} onChange={setPassword} isNew onSubmit={() => { if (ready) void submit(); }} />
        {!!error && <Alert variant="destructive" palette={p}>{error}</Alert>}
        {done ? <>
          <Alert icon="check" palette={p}>{t('account.password.done')}</Alert>
          <Button size="lg" icon="user" palette={p} block onPress={leave}>{t('account.callback.toAccount')}</Button>
        </> : <Button size="lg" icon="check" palette={p} block disabled={!ready} onPress={() => void submit()}>
          {busy ? t('account.password.submitting') : t('account.password.submit')}
        </Button>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
