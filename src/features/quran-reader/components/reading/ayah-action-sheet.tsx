import { readerShape } from '../../design';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';
import { quranpedia } from '../../services/reader-service';
import { useBookmarks } from '../../state/bookmarks-provider';
import { ayahKey } from '../../utils/references';
import { ayahShareText, parallelAyahs } from '../../utils/ayah-actions';
import type { ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { ReaderIcon, type ReaderIconName, Segments } from '../ui/reader-chrome';
import { SURAH_NAME_FONT_FAMILY } from '../../config';

export function AyahActionSheet({ ayah, quran, palette, onClose }: { ayah: Ayah; quran: Quran; palette: ReaderPalette; onClose: () => void }) {
  const close = useRef<View>(null);
  const { bookmarks, toggle, ready, error: bookmarkError } = useBookmarks();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'tafsir' | 'translation' | null>(null);
  const surahName = quran.surahs.find((s) => s.number === ayah.surahNumber)?.name ?? '';
  const bookmarked = bookmarks.includes(ayahKey(ayah));
  const copy = async () => {
    try {
      const text = ayahShareText(ayah, surahName);
      const ok = await Clipboard.setStringAsync(text); setMessage(ok ? 'تم نسخ الآية' : 'تعذر النسخ، حاول مرة أخرى');
    } catch { setMessage('تعذر النسخ، حاول مرة أخرى'); }
  };
  const share = () => {
    onClose();
    router.push({ pathname: '/share-ayah', params: { surah: ayah.surahNumber, ayah: ayah.ayahNumber } });
  };
  // Cover the system bars with the backdrop; SafeAreaView keeps controls inset.
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose} onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.body}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق إجراءات الآية" onPress={onClose} />
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose}
        style={[styles.sheet, { backgroundColor: palette.paper, borderColor: palette.border }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <View style={styles.heading}>
          <View style={styles.title}>
            <Text accessibilityRole="header" accessibilityLabel={`${surahName} · الآية ${ayah.ayahNumber}`}
              style={[styles.surah, { color: palette.text }]}>
              {String(ayah.surahNumber).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])}
            </Text>
            <Text style={[styles.reference, { color: palette.muted }]}>الآية {ayah.ayahNumber} · صفحة {ayah.pageNumber}</Text>
          </View>
          <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق إجراءات الآية" onPress={onClose}
            style={({ pressed }) => [styles.close, { backgroundColor: pressed ? palette.accentSoft : palette.background }]}>
            <ReaderIcon name="close" color={palette.muted} size={20} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={[styles.quickActions, { backgroundColor: palette.background }]}>
            <QuickAction palette={palette} icon={bookmarked ? 'check' : 'bookmark'} disabled={!ready} selected={bookmarked}
              label={bookmarked ? 'محفوظة' : 'حفظ علامة'} accessibilityLabel={bookmarked ? 'إزالة العلامة' : 'حفظ علامة'} onPress={() => toggle(ayahKey(ayah))} />
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <QuickAction palette={palette} icon="copy" label="نسخ الآية" onPress={() => void copy()} />
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <QuickAction palette={palette} icon="share" label="مشاركة" onPress={share} />
          </View>
          {!!message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: palette.accent }]}>{message}</Text>}
          {bookmarkError && <Text accessibilityRole="alert" style={[styles.feedback, { color: palette.warning }]}>تعذر حفظ العلامات على الجهاز. تبقى متاحة في هذه الجلسة.</Text>}
          <View style={styles.relatedActions}>
            <RelatedAction palette={palette} icon="book" label="التفسير" detail="شرح الآية ومعانيها" expanded={kind === 'tafsir'} onPress={() => setKind(kind === 'tafsir' ? null : 'tafsir')} />
            {kind === 'tafsir' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="tafsir" palette={palette} /></View>}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
            <RelatedAction palette={palette} icon="translate" label="ترجمة المعاني" detail="بالفرنسية والإنجليزية" expanded={kind === 'translation'} onPress={() => setKind(kind === 'translation' ? null : 'translation')} />
            {kind === 'translation' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="translation" palette={palette} /></View>}
          </View>
          <Text style={[styles.edition, { color: palette.muted }]}>رواية ورش عن نافع</Text>
        </ScrollView>
      </SafeAreaView>
      </View>
    </SafeAreaView>
  </Modal>;
}

function QuickAction({ palette, icon, label, accessibilityLabel, onPress, selected = false, disabled = false }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; accessibilityLabel?: string;
  onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.quickAction, { backgroundColor: selected || pressed ? palette.accentSoft : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
    <ReaderIcon name={icon} color={palette.accent} size={23} />
    <Text style={[styles.actionLabel, { color: selected ? palette.accent : palette.text }]}>{label}</Text>
  </Pressable>;
}

function RelatedAction({ palette, icon, label, detail, expanded, onPress }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; detail: string; expanded: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded }} onPress={onPress}
    style={({ pressed }) => [styles.relatedAction, { backgroundColor: pressed || expanded ? palette.accentSoft : 'transparent' }]}>
    <View style={[styles.relatedIcon, { backgroundColor: palette.accentSoft }]}><ReaderIcon name={icon} color={palette.accent} size={22} /></View>
    <View style={styles.relatedCopy}>
      <Text style={[styles.relatedLabel, { color: palette.text }]}>{label}</Text>
      <Text style={[styles.relatedDetail, { color: palette.muted }]}>{detail}</Text>
    </View>
    <View style={expanded ? { transform: [{ rotate: '-90deg' }] } : undefined}><ReaderIcon name="chevron" color={palette.muted} size={17} /></View>
  </Pressable>;
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
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(7,20,15,0.48)' },
  body: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '85%', borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet,
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  title: { flex: 1, minWidth: 0, gap: 2 },
  surah: { fontFamily: SURAH_NAME_FONT_FAMILY, fontSize: 38, lineHeight: 40, includeFontPadding: false },
  reference: { fontSize: 12 },
  close: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 18 },
  quickActions: { flexDirection: 'row', alignItems: 'center', borderRadius: readerShape.card, overflow: 'hidden' },
  quickAction: { flex: 1, minHeight: 82, paddingHorizontal: 4, paddingVertical: 12, gap: 7, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  separator: { width: StyleSheet.hairlineWidth, height: 32 },
  feedback: { fontSize: 12, marginTop: 10, textAlign: 'center' },
  relatedActions: { marginTop: 16 },
  relatedAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10, paddingHorizontal: 8, borderRadius: readerShape.control },
  relatedIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  relatedCopy: { flex: 1, minWidth: 0 },
  relatedLabel: { fontSize: 15, fontWeight: '600' },
  relatedDetail: { fontSize: 11 },
  relatedContent: { paddingTop: 8, paddingBottom: 18 },
  edition: { fontSize: 10, textAlign: 'center', marginTop: 12 },
  range: { padding: 16, borderRadius: readerShape.card, gap: 12 },
});
