import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text as NativeText, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';
import { quranpedia } from '../../services/reader-service';
import { useBookmarks } from '../../state/bookmarks-provider';
import { parseReaderNumber } from '../../utils/navigation';
import { ayahKey } from '../../utils/references';
import { ayahShareText, parallelAyahs, passageAyahs } from '../../utils/ayah-actions';
import type { ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { Segments } from '../ui/reader-chrome';

export function AyahActionSheet({ ayah, quran, palette, onClose, onHide }: { ayah: Ayah; quran: Quran; palette: ReaderPalette; onClose: () => void; onHide: (ayahs: Ayah[]) => void }) {
  const close = useRef<View>(null);
  const { bookmarks, toggle, ready, error: bookmarkError } = useBookmarks();
  const [message, setMessage] = useState('');
  const [range, setRange] = useState(false);
  const [endSurah, setEndSurah] = useState(String(ayah.surahNumber));
  const [endAyah, setEndAyah] = useState(String(ayah.ayahNumber));
  const [kind, setKind] = useState<'tafsir' | 'translation' | null>(null);
  const surahName = quran.surahs.find((s) => s.number === ayah.surahNumber)?.name ?? '';
  const perform = async (action: 'copy' | 'share') => {
    try {
      const text = ayahShareText(ayah, surahName);
      if (action === 'copy') { const ok = await Clipboard.setStringAsync(text); setMessage(ok ? 'تم نسخ الآية' : 'تعذر النسخ، حاول مرة أخرى'); }
      else await Share.share({ message: text });
    } catch (error) { if (error instanceof Error && error.name === 'AbortError') return; setMessage(action === 'copy' ? 'تعذر النسخ، حاول مرة أخرى' : 'تعذرت المشاركة، حاول مرة أخرى'); }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose} onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق إجراءات الآية" onPress={onClose} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet, { backgroundColor: palette.paper }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.heading}><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 18, fontWeight: '600', flex: 1 }}>{surahName} · الآية {ayah.ayahNumber}</Text><Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق إجراءات الآية" onPress={onClose} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: palette.background }}><Text style={{ color: palette.text }}>إغلاق</Text></Pressable></View>
          <Text style={{ color: palette.muted, fontSize: 12 }}>رواية ورش عن نافع · صفحة {ayah.pageNumber}</Text>
          <View style={styles.grid}>
            <ReaderButton palette={palette} disabled={!ready} selected={bookmarks.includes(ayahKey(ayah))} onPress={() => toggle(ayahKey(ayah))}>{bookmarks.includes(ayahKey(ayah)) ? 'إزالة العلامة' : 'حفظ علامة'}</ReaderButton>
            <ReaderButton palette={palette} onPress={() => void perform('copy')}>نسخ الآية</ReaderButton>
            <ReaderButton palette={palette} onPress={() => void perform('share')}>مشاركة</ReaderButton>
          </View>
          {!!message && <Text accessibilityLiveRegion="polite" style={{ color: palette.accent }}>{message}</Text>}
          {bookmarkError && <Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر حفظ العلامات على الجهاز. تبقى متاحة في هذه الجلسة.</Text>}
          <View style={styles.grid}>
            <ReaderButton palette={palette} onPress={() => onHide([ayah])}>إخفاء الآية</ReaderButton>
            <ReaderButton palette={palette} onPress={() => setRange((v) => !v)}>إخفاء مقطع</ReaderButton>
          </View>
          {range && <View style={[styles.range, { backgroundColor: palette.background }]}>
            <Text style={{ color: palette.text }}>من الآية المحددة إلى:</Text>
            <View style={styles.grid}>{[{ label: 'رقم سورة نهاية المقطع', value: endSurah, change: setEndSurah }, { label: 'رقم آية نهاية المقطع', value: endAyah, change: setEndAyah }].map((field) => <View key={field.label} style={{ flex: 1, gap: 6 }}><Text style={{ color: palette.muted, fontSize: 12 }}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} keyboardType="number-pad" maxLength={3} style={[styles.input, { color: palette.text, borderColor: palette.border }]} /></View>)}</View>
            <ReaderButton palette={palette} onPress={() => { const selected = passageAyahs(quran, ayah, parseReaderNumber(endSurah), parseReaderNumber(endAyah)); if (!selected.length) setMessage('اختر نهاية صحيحة بعد بداية المقطع أو مساوية لها'); else onHide(selected); }}>إخفاء المقطع المحدد</ReaderButton>
          </View>}
          <View style={styles.grid}><ReaderButton palette={palette} selected={kind === 'tafsir'} onPress={() => setKind('tafsir')}>التفسير</ReaderButton><ReaderButton palette={palette} selected={kind === 'translation'} onPress={() => setKind('translation')}>ترجمة المعاني</ReaderButton></View>
          {kind && <RelatedContent key={`${ayahKey(ayah)}:${kind}`} ayah={ayah} kind={kind} palette={palette} />}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
function RelatedContent({ ayah, kind, palette }: { ayah: Ayah; kind: 'tafsir' | 'translation'; palette: ReaderPalette }) {
  const [language, setLanguage] = useState<'en' | 'fr'>('fr');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ items: { number: number; content: RelatedText; stale: boolean }[]; error: boolean; loading: boolean }>({ items: [], error: false, loading: true });
  // Each request lifetime belongs to this panel. Closing/changing it prevents late results from reaching another ayah.
  useEffect(() => {
    let active = true;
    const numbers = parallelAyahs(ayah);
    void Promise.all(numbers.map(async (number) => {
      if (kind === 'tafsir') { const response = await quranpedia.getBookContent(ayah.surahNumber, number, 2012); return [{ number, content: response.data, stale: response.stale }]; }
      const response = await quranpedia.getTranslations(ayah.surahNumber, number, language);
      return response.data.map((content) => ({ number, content, stale: response.stale }));
    })).then((rows) => { if (active) setResult({ items: rows.flat(), error: false, loading: false }); }).catch(() => { if (active) setResult({ items: [], error: true, loading: false }); });
    return () => { active = false; };
  }, [ayah, kind, language, revision]);
  return <View style={{ gap: 12 }}>
    {kind === 'translation' && <Segments palette={palette} options={[{ value: 'fr', label: 'الفرنسية' }, { value: 'en', label: 'الإنجليزية' }]} value={language} onChange={(v) => { setResult({ items: [], error: false, loading: true }); setLanguage(v); }} />}
    <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 22 }}>المراجع الموازية حسب ترقيم حفص: {parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`).join('، ')}. المصدر: الموسوعة القرآنية.</Text>
    {result.loading ? <ActivityIndicator accessibilityLabel="جارٍ تحميل المحتوى" color={palette.accent} /> : result.error ? <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={{ color: palette.warning }}>تعذر تحميل المحتوى. تحقق من الاتصال ثم أعد المحاولة.</Text><ReaderButton palette={palette} onPress={() => { setResult({ items: [], error: false, loading: true }); setRevision((v) => v + 1); }}>إعادة المحاولة</ReaderButton></View> : !result.items.length ? <Text style={{ color: palette.muted }}>لا يتوفر محتوى لهذا الموضع.</Text> : result.items.map((item, i) => <View key={`${item.number}:${item.content.book.id}:${i}`} style={[styles.range, { backgroundColor: palette.background }]}>
      <Text accessibilityRole="header" style={{ color: palette.accent, fontWeight: '600' }}>{item.content.book.name}</Text>
      {!!item.content.book.author && <Text style={{ color: palette.muted, fontSize: 12 }}>{item.content.book.author}</Text>}
      <Text style={{ color: palette.muted, fontSize: 11 }}>المرجع الموازي {ayah.surahNumber}:{item.number}{item.stale ? ' · نسخة محفوظة دون تحديث' : ''}</Text>
      {item.content.texts.filter(Boolean).map((text, index) => <NativeText key={index} selectable style={{ color: palette.text, fontSize: 17, lineHeight: 30, writingDirection: item.content.direction, textAlign: item.content.direction === 'ltr' ? 'left' : 'auto', fontFamily: item.content.direction === 'rtl' ? 'ReaderNaskh' : undefined }}>{relatedPlainText(text)}</NativeText>)}
      <ReaderButton palette={palette} onPress={() => void Linking.openURL(kind === 'tafsir' ? `https://api.quranpedia.net/v1/ayah/${ayah.surahNumber}/${item.number}/book/${item.content.book.id}` : `https://api.quranpedia.net/v1/translations/${ayah.surahNumber}/${item.number}/${language}`).catch(() => {})}>فتح المصدر</ReaderButton>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7,20,15,0.48)' }, sheet: { width: '100%', maxWidth: 700, alignSelf: 'center', maxHeight: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28, ...Platform.select({ native: { direction: 'rtl' as const } }) }, content: { padding: 20, paddingBottom: 28, gap: 16 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, range: { padding: 16, borderRadius: 16, gap: 12 }, input: { height: 48, borderWidth: 1, borderRadius: 12, fontFamily: 'ReaderNaskh', textAlign: 'center', writingDirection: 'ltr', fontSize: 18 } });
