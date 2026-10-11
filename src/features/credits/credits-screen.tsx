import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { readerElevation, readerLayout, readerShape } from '@/features/quran-reader/design';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { CREDIT_SECTIONS } from './credits';

type SectionId = typeof CREDIT_SECTIONS[number]['id'];
type ItemId = typeof CREDIT_SECTIONS[number]['items'][number]['id'];

/** «المصادر والتراخيص»: who made what the app uses, with sources and licences. */
export function CreditsScreen() {
  const { palette: p } = useReadingPreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.back')} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/settings'); }} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('credits.title')}</Text>
        <Text style={{ fontSize: 15, lineHeight: 24, color: p.mutedForeground }}>{t('credits.subtitle')}</Text>
      </View>
      {CREDIT_SECTIONS.map((section) => <View key={section.id} style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t(`credits.sections.${section.id as SectionId}`)}</Text>
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
          {section.items.map((item, i) => {
            const title = t(`credits.items.${item.id as ItemId}.title`);
            return <View key={item.id} style={[s.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
              <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
              {/* The work's own title and author, as published. */}
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, writingDirection: 'ltr' }}>{item.work}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t(`credits.items.${item.id as ItemId}.detail`)}</Text>
              <View style={s.links}>
                <CreditLink label={t('credits.sourceLabel', { title })} url={item.source}>{t('credits.source')}</CreditLink>
                {'licenceUrl' in item && <CreditLink label={t('credits.licenceLabel', { licence: item.licence })} url={item.licenceUrl}>{item.licence}</CreditLink>}
                {'terms' in item && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`credits.terms.${item.terms}`)}</Text>}
              </View>
            </View>;
          })}
        </View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

/** An external link, underlined so it reads as one. */
function CreditLink({ label, url, children }: { label: string; url: string; children: string }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="link" accessibilityLabel={label} hitSlop={6} onPress={() => void Linking.openURL(url)} style={({ pressed }) => [s.link, pressed && { opacity: 0.6 }]}>
    <Text style={{ color: p.primary, fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' }}>{children}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 24 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  item: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 3 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4, marginTop: 4 },
  link: { minHeight: 32, justifyContent: 'center' },
});
