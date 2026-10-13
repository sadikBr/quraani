import { BookmarksProvider } from '@/features/quran-reader/state/bookmarks-provider';
import { DarkTheme, DefaultTheme, LocaleProvider, Stack, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { ReadingPreferencesProvider, useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { I18nManager, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { PlansProvider, PlanNotificationObserver } from '@/features/plans/provider';
import { AdhkarNotificationObserver, AdhkarProvider } from '@/features/adhkar/provider';
import { PracticeProvider } from '@/features/practice/provider';
import { HalaqaNotificationObserver, HalaqatProvider } from '@/features/halaqat/provider';
import { PrayerNotificationObserver, PrayersProvider } from '@/features/prayers/provider';
import { readerThemes } from '@/features/quran-reader/theme';
import { readerShape } from '@/features/quran-reader/design';
import { localeInfo, t } from '@/i18n';

SplashScreen.preventAutoHideAsync();

// Native builds also force RTL through the expo-localization config plugin.
// Expo Go applies these persisted preferences on the next full app launch.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return <>
    {Platform.OS === 'web' && <Head><title>{t('common.appName')}</title></Head>}
    <ReadingPreferencesProvider><BookmarksProvider><PlansProvider><AdhkarProvider><PracticeProvider><HalaqatProvider><PrayersProvider><RootNavigator /></PrayersProvider></HalaqatProvider></PracticeProvider></AdhkarProvider></PlansProvider></BookmarksProvider></ReadingPreferencesProvider>
  </>;
}

function RootNavigator() {
  const { dark, palette } = useReadingPreferences();
  const baseTheme = dark ? DarkTheme : DefaultTheme;
  const [fontsLoaded, fontError] = useFonts({
    ReaderNaskh: require('@/assets/fonts/NotoNaskhArabic-Regular.ttf'),
    ReaderNaskhSemibold: require('@/assets/fonts/NotoNaskhArabic-SemiBold.ttf'),
    ReaderNaskhBold: require('@/assets/fonts/NotoNaskhArabic-Bold.ttf'),
    // Interface text: IBM Plex Sans Arabic; standalone numbers: Geist (Universal UI).
    UiSans: require('@expo-google-fonts/ibm-plex-sans-arabic/400Regular/IBMPlexSansArabic_400Regular.ttf'),
    UiSansMedium: require('@expo-google-fonts/ibm-plex-sans-arabic/500Medium/IBMPlexSansArabic_500Medium.ttf'),
    UiSansSemiBold: require('@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold/IBMPlexSansArabic_600SemiBold.ttf'),
    UiSansBold: require('@expo-google-fonts/ibm-plex-sans-arabic/700Bold/IBMPlexSansArabic_700Bold.ttf'),
    UiNumeric: require('@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf'),
    UiNumericMedium: require('@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf'),
    UiNumericSemiBold: require('@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf'),
    UiNumericBold: require('@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf'),
  });
  useEffect(() => { if (fontsLoaded || fontError) void SplashScreen.hideAsync(); }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <LocaleProvider direction="rtl">
      <View style={{ flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) }} {...(Platform.OS === 'web' ? { dir: 'rtl', lang: localeInfo().tag } : {})}>
        <StatusBar style={dark ? 'light' : 'dark'} hidden={false} />
        <ThemeProvider value={{ ...baseTheme, colors: { ...baseTheme.colors, background: palette.background, card: palette.card, text: palette.foreground, border: palette.border, primary: palette.primary } }}>
          <Stack screenOptions={{ headerShown: false }} />
          <PlanNotificationObserver />
          <AdhkarNotificationObserver />
          <HalaqaNotificationObserver />
          <PrayerNotificationObserver />
        </ThemeProvider>
      </View>
    </LocaleProvider>
  );
}

/**
 * Last line of defence: in a release build an uncaught render error would
 * close the app. Show what happened and let the reader try again instead.
 * It renders outside every provider, so it uses only plain components and
 * the static light/dark palettes rather than the reader's preference.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = readerThemes[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, gap: 14 }}>
    <Text accessibilityRole="header" style={{ color: c.foreground, fontSize: 24, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' }}>{t('app.error.title')}</Text>
    <Text style={{ color: c.mutedForeground, fontSize: 15, lineHeight: 26, textAlign: 'center', writingDirection: 'rtl' }}>{t('app.error.message')}</Text>
    <Text selectable style={{ color: c.mutedForeground, fontSize: 12, lineHeight: 20, padding: 12, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, backgroundColor: c.card, textAlign: 'left', writingDirection: 'ltr', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{String(error?.message ?? error)}</Text>
    <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 48, paddingHorizontal: 28, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 })}>
      <Text style={{ color: c.primaryForeground, fontSize: 15, fontWeight: "600" }}>{t('common.retry')}</Text>
    </Pressable>
  </ScrollView>;
}
