import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Lozenge } from '@/components/craft/lawh';
import { Rule } from '@/components/craft/marks';
import { page, PageBar } from '@/components/craft/page';
import { withAlpha } from '@/features/quran-reader/design';
import { QuranniLogo } from '@/features/quran-reader/components/ui/quranni-logo';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import { CREDIT_SECTIONS } from './credits';

type SectionId = typeof CREDIT_SECTIONS[number]['id'];
type ItemId = typeof CREDIT_SECTIONS[number]['items'][number]['id'];

/**
 * «المصادر والتراخيص», set as the colophon on the last page of a manuscript: the title and the
 * thanks centred under a rule, each part headed between two rules, its works one after another
 * with their sources and licences, and at the end the app's seal.
 */
export function CreditsScreen() {
  const { palette: p } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar back={{ label: t('common.back'), onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/settings'); } }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 30 }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 28, lineHeight: 46, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{t('credits.title')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 16, lineHeight: 30, fontFamily: 'ReaderNaskhSemibold', textAlign: 'center', maxWidth: 330 }}>{t('credits.subtitle')}</Text>
        <Rule palette={p} style={{ alignSelf: 'stretch', marginTop: 10, marginHorizontal: 40 }} />
      </View>
      {CREDIT_SECTIONS.map((section) => <View key={section.id} style={{ gap: 6 }}>
        <Heading title={t(`credits.sections.${section.id as SectionId}`)} palette={p} />
        {section.items.map((item, i) => {
          const title = t(`credits.items.${item.id as ItemId}.title`);
          return <View key={item.id} style={[s.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
            <View style={s.title}>
              <View style={{ paddingTop: 9 }}><Lozenge size={8} fill={withAlpha(p.ornament, 0.25)} stroke={p.ornament} /></View>
              <Text style={{ flex: 1, color: p.foreground, fontSize: 15, lineHeight: 26, fontWeight: '600' }}>{title}</Text>
            </View>
            <View style={s.body}>
              {/* The work's own title and author, as published. */}
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, writingDirection: 'ltr' }}>{item.work}</Text>
              <Text style={{ color: p.foreground, fontSize: 13, lineHeight: 21, opacity: 0.85 }}>{t(`credits.items.${item.id as ItemId}.detail`)}</Text>
              <View style={s.links}>
                <CreditLink label={t('credits.sourceLabel', { title })} url={item.source} palette={p}>{t('credits.source')}</CreditLink>
                {'licenceUrl' in item && <CreditLink label={t('credits.licenceLabel', { licence: item.licence })} url={item.licenceUrl} palette={p}>{item.licence}</CreditLink>}
                {'terms' in item && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`credits.terms.${item.terms}`)}</Text>}
              </View>
            </View>
          </View>;
        })}
      </View>)}
      {/* The seal at the end of the book. */}
      <View style={s.seal}>
        <Rule palette={p} style={{ alignSelf: 'stretch', marginHorizontal: 40 }} />
        <QuranniLogo color={p.ornament} size={40} />
        <Text style={{ color: p.foreground, fontSize: 20, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{t('common.appName')}</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

/** A part's title between two short gold rules, as a manuscript heads its chapters. */
function Heading({ title, palette: p }: { title: string; palette: ReaderPalette }) {
  const line = { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(p.ornament, 0.5) };
  return <View style={s.heading}>
    <View style={line} />
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold', textAlign: 'center', flexShrink: 1 }}>{title}</Text>
    <View style={line} />
  </View>;
}

/** An external link, underlined so it reads as one. */
function CreditLink({ label, url, palette: p, children }: { label: string; url: string; palette: ReaderPalette; children: string }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} hitSlop={6} onPress={() => void Linking.openURL(url)} style={({ pressed }) => [s.link, pressed && { opacity: 0.6 }]}>
    <Text style={{ color: p.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>{children}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, paddingTop: 4 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  item: { paddingVertical: 12, gap: 2 },
  title: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  body: { paddingStart: 18, gap: 3 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4, marginTop: 2 },
  link: { minHeight: 32, justifyContent: 'center' },
  seal: { alignItems: 'center', gap: 10, paddingTop: 6 },
});
