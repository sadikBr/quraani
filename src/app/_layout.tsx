import { BookmarksProvider } from '@/features/quran-reader/state/bookmarks-provider';
import { DarkTheme, DefaultTheme, LocaleProvider, Stack, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { ReadingPreferencesProvider, useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

// Native builds also force RTL through the expo-localization config plugin.
// Expo Go applies these persisted preferences on the next full app launch.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return <>
    {Platform.OS === 'web' && <Head><title>قراني</title></Head>}
    <ReadingPreferencesProvider><BookmarksProvider><RootNavigator /></BookmarksProvider></ReadingPreferencesProvider>
  </>;
}

function RootNavigator() {
  const { dark, palette } = useReadingPreferences();
  const baseTheme = dark ? DarkTheme : DefaultTheme;
  const [fontsLoaded, fontError] = useFonts({
    ReaderNaskh: require('@/assets/fonts/NotoNaskhArabic-Regular.ttf'),
    ReaderNaskhSemibold: require('@/assets/fonts/NotoNaskhArabic-SemiBold.ttf'),
    ReaderNaskhBold: require('@/assets/fonts/NotoNaskhArabic-Bold.ttf'),
  });
  useEffect(() => { if (fontsLoaded || fontError) void SplashScreen.hideAsync(); }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <LocaleProvider direction="rtl">
      <View style={{ flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) }} {...(Platform.OS === 'web' ? { dir: 'rtl', lang: 'ar' } : {})}>
        <StatusBar style={dark ? 'light' : 'dark'} hidden={false} />
        <ThemeProvider value={{ ...baseTheme, colors: { ...baseTheme.colors, background: palette.background, card: palette.paper, text: palette.text, border: palette.border, primary: palette.accent } }}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </View>
    </LocaleProvider>
  );
}
