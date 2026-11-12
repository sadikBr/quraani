import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import type { Ayah } from '@/lib/quranpedia/types';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../../design';
import { editionForMushaf } from '../../riwayat';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ayahWords } from '../../utils/page-practice';
import { tajweedColor } from '../../utils/tajweed';
import { tajweedRuleKey, toldByRiwayah } from '../../utils/tajweed-rules';
import { t } from '@/i18n';

/**
 * A tajweed rule in plain words, opened by a tap on a coloured part of the text: its colour and
 * name, the word it was tapped in, what the rule is, and the ayah to listen to (in the chosen
 * reciter's voice) to hear it applied.
 */
export function TajweedRuleDialog({ ayah, rule, word, onListen, onClose }: {
  ayah: Ayah; rule: string; word: number; onListen?: () => void; onClose: () => void;
}) {
  const { palette: p, dark } = useReadingPreferences();
  const riwayah = editionForMushaf(ayah.mushafId).pageSource;
  const font = useQuranFont(riwayah);
  const close = useRef<View>(null);
  const key = tajweedRuleKey(rule);
  if (!key) return null;
  const color = tajweedColor(rule, dark, p.foreground);
  const name = t(`reader.tajweedRules.${key}.name`);
  const text = riwayah === 'warsh' && toldByRiwayah(key) ? t(`reader.tajweedRules.${key}.warsh`) : t(`reader.tajweedRules.${key}.text`);
  const shown = ayahWords(ayah.text)[word]?.trim();
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView style={[s.backdrop, { backgroundColor: p.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.dialog, { backgroundColor: p.background, borderColor: withAlpha(color, 0.5) }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }}>
          <View style={s.head}>
            <View aria-hidden style={[s.swatch, { backgroundColor: color }]} />
            <Text accessibilityRole="header" accessibilityLabel={t('reader.tajweedRules.spoken', { rule: name })} style={{ flex: 1, color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{name}</Text>
          </View>
          {font.loaded && !!shown && <View style={[s.word, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.tajweedRules.inWord')}</Text>
            <NativeText style={{ fontFamily: font.fontFamily, fontSize: 32, lineHeight: 64, color: p.foreground, textAlign: 'center', writingDirection: 'rtl' }}>{font.display(shown)}</NativeText>
          </View>}
          <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 28 }}>{text}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19 }}>{t('reader.tajweedRules.note')}</Text>
          <View style={{ gap: 8, marginTop: 6 }}>
            {onListen && <Button size="lg" icon="headphones" palette={p} onPress={onListen} block>{t('reader.tajweedRules.listen')}</Button>}
            <Button ref={close} variant="outline" size="lg" palette={p} onPress={onClose} block>{t('common.close')}</Button>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: Math.min(420, readerLayout.maxWidth), maxHeight: '90%', borderRadius: readerShape.sheet, borderWidth: 1, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  word: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
});
