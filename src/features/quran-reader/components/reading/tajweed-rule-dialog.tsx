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
import { tajweedColor, type TajweedRun } from '../../utils/tajweed';
import { tajweedWordDocument } from '../../utils/tajweed-text-document';
import { quranScriptForMushaf } from '../../utils/quran-script';
import { loadedQuranDocumentFont } from '../../services/quran-document-font';
import { TajweedSurface } from './tajweed-surface';
import { tajweedRuleKey, toldByRiwayah } from '../../utils/tajweed-rules';
import { t } from '@/i18n';

/** The room the word takes, drawn at 42px on a line twice as tall. */
const WORD_HEIGHT = 92;
const ignore = () => {};

/**
 * A tajweed rule in plain words, opened by a tap on a coloured part of the text: its colour and
 * name, the word it was tapped in (in its colours, the tapped part on a ground of its own when the
 * word has several), what the rule is, and the ayah to listen to (in the chosen
 * reciter's voice) to hear it applied.
 */
export function TajweedRuleDialog({ ayah, rule, runs, tapped, onListen, onClose }: {
  ayah: Ayah; rule: string;
  /** The word as the page coloured it, and which of its parts was tapped. */
  runs: TajweedRun[]; tapped: number;
  onListen?: () => void; onClose: () => void;
}) {
  const { palette: p, dark, preferences: { warshScript } } = useReadingPreferences();
  const riwayah = editionForMushaf(ayah.mushafId).pageSource;
  const font = useQuranFont(riwayah);
  const close = useRef<View>(null);
  const key = tajweedRuleKey(rule);
  if (!key) return null;
  const color = tajweedColor(rule, dark, p.foreground);
  const name = t(`reader.tajweedRules.${key}.name`);
  const text = riwayah === 'warsh' && toldByRiwayah(key) ? t(`reader.tajweedRules.${key}.warsh`) : t(`reader.tajweedRules.${key}.text`);
  const shown = runs.map((run) => run.text).join('').trim();
  // Drawn by the browser, as the text is, so the letters join across the colours (the font is the one the page loaded).
  const script = quranScriptForMushaf(ayah.mushafId, warshScript);
  const documentFont = loadedQuranDocumentFont(script.fontMushafId);
  const html = documentFont ? tajweedWordDocument(runs, tapped, documentFont, 42, dark, p, script.display) : '';
  const several = runs.filter((run) => run.rule).length > 1;
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
          {!!shown && (html || font.loaded) && <View style={[s.word, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.tajweedRules.inWord')}</Text>
            {html ? <View accessible accessibilityLabel={shown} style={{ alignSelf: 'stretch' }}>
              <TajweedSurface html={html} height={WORD_HEIGHT} pageNumber={ayah.pageNumber} title={shown} onMessage={ignore} onError={ignore} />
            </View> : <NativeText style={{ fontFamily: font.fontFamily, fontSize: 32, lineHeight: 64, color: p.foreground, textAlign: 'center', writingDirection: 'rtl' }}>{font.display(shown)}</NativeText>}
            {several && !!html && <View style={s.key}>
              <View aria-hidden style={[s.keyMark, { backgroundColor: withAlpha(color, 0.18), borderColor: withAlpha(color, 0.5) }]} />
              <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.tajweedRules.tapped')}</Text>
            </View>}
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
  key: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  keyMark: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  word: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
});
