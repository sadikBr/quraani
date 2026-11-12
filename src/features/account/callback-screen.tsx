import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { PageTitle, page } from '@/components/craft/page';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { useAccount } from './provider';
import { problemText } from './sign-in-screen';

/**
 * Where the links in account emails open the app (`quranmobile://account/callback#…`): the tokens
 * after `#` sign in. Anyone can send such a link (one carrying their own account's tokens would
 * have this phone's data synced to them), so the screen first shows whose account it opens and
 * signs in only when the user agrees; a link to the account already signed in needs no asking.
 * A confirmed email goes on to the account; a password reset to choosing a new password.
 */
export function CallbackScreen() {
  const { palette: p } = useReadingPreferences();
  const { user, peek, adopt } = useAccount();
  const params = useLocalSearchParams<{ '#'?: string }>();
  const url = Linking.useLinkingURL();
  // Expo Router hands the part after `#` as a param; the link itself has it too.
  const fragment = params['#'] ?? (url?.includes('#') ? url.slice(url.indexOf('#') + 1) : undefined);
  const [error, setError] = useState('');
  /** The account the link opens, once known and while the user is asked. */
  const [asked, setAsked] = useState<{ fragment: string; email: string }>();
  const [signingIn, setSigningIn] = useState(false);
  const used = useRef<string | undefined>(undefined);
  const signIn = useCallback((link: string) => {
    setSigningIn(true);
    adopt(link).then((type) => router.replace(type === 'recovery' ? { pathname: '/account/password', params: { reset: '1' } } : '/account'),
      (e) => { setSigningIn(false); setAsked(undefined); setError(problemText(e)); });
  }, [adopt]);
  // (Once the saved session is read: who is signed in decides whether to ask.)
  const loaded = user !== undefined, signedIn = user?.id;
  useEffect(() => {
    if (!fragment || !loaded || used.current === fragment) return;
    used.current = fragment;
    peek(fragment).then((account) => {
      if (account.id === signedIn) signIn(fragment);
      else setAsked({ fragment, email: account.email });
    }, (e) => setError(problemText(e)));
  }, [fragment, loaded, signedIn, peek, signIn]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={[page.content, { gap: 20, paddingTop: 40 }]}>
      {error ? <>
        <PageTitle title={t('account.callback.failedTitle')} palette={p} />
        <Alert variant="destructive" palette={p}>{error}</Alert>
        <Button size="lg" icon="user" palette={p} block onPress={() => router.replace('/account')}>{t('account.callback.toAccount')}</Button>
      </> : asked && !signingIn ? <>
        <PageTitle title={t('account.callback.confirmTitle')} palette={p} />
        <View style={{ gap: 6 }}>
          <Text style={{ color: p.mutedForeground, fontSize: 15, lineHeight: 26 }}>{t('account.callback.confirmLead')}</Text>
          <Text testID="callback-email" style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontWeight: '600' }}>{`\u2066${asked.email}\u2069`}</Text>
        </View>
        <Alert palette={p}>{user ? `${t('account.callback.confirmOther', { email: user.email })} ${t('account.callback.confirmDetail')}` : t('account.callback.confirmDetail')}</Alert>
        <View style={{ gap: 10 }}>
          <Button size="lg" icon="user" palette={p} block onPress={() => signIn(asked.fragment)}>{t('account.callback.confirm')}</Button>
          <Button size="lg" variant="outline" palette={p} block onPress={() => router.replace('/account')}>{t('common.cancel')}</Button>
        </View>
      </> : <>
        <PageTitle title={t(signingIn ? 'account.callback.title' : 'account.callback.checking')} palette={p} />
        <ActivityIndicator color={p.mutedForeground} />
      </>}
    </View>
  </SafeAreaView>;
}
