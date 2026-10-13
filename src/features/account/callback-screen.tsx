import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { PageTitle, page } from '@/components/craft/page';
import { Alert, Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { useAccount } from './provider';
import { problemText } from './sign-in-screen';

/**
 * Where the links in account emails open the app (`quranmobile://account/callback#…`): the tokens
 * after `#` sign in. A confirmed email goes on to the account; a password reset to choosing a new
 * password.
 */
export function CallbackScreen() {
  const { palette: p } = useReadingPreferences();
  const { adopt } = useAccount();
  const params = useLocalSearchParams<{ '#'?: string }>();
  const url = Linking.useLinkingURL();
  // Expo Router hands the part after `#` as a param; the link itself has it too.
  const fragment = params['#'] ?? (url?.includes('#') ? url.slice(url.indexOf('#') + 1) : undefined);
  const [error, setError] = useState('');
  const used = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!fragment || used.current === fragment) return;
    used.current = fragment;
    adopt(fragment).then((type) => router.replace(type === 'recovery' ? { pathname: '/account/password', params: { reset: '1' } } : '/account'),
      (e) => setError(problemText(e)));
  }, [fragment, adopt]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={[page.content, { gap: 20, paddingTop: 40 }]}>
      {error ? <>
        <PageTitle title={t('account.callback.failedTitle')} palette={p} />
        <Alert variant="destructive" palette={p}>{error}</Alert>
        <Button size="lg" icon="user" palette={p} block onPress={() => router.replace('/account')}>{t('account.callback.toAccount')}</Button>
      </> : <>
        <PageTitle title={t('account.callback.title')} palette={p} />
        <ActivityIndicator color={p.mutedForeground} />
      </>}
    </View>
  </SafeAreaView>;
}
