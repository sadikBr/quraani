import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { SwitchMark } from '@/components/ui';
import type { Ayah } from '@/lib/quranpedia/types';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { quranpedia } from '../../services/reader-service';
import { prepareAyahCard, type PreparedAyahCard } from '../../services/ayah-card-export';
import { parallelAyahs } from '../../utils/ayah-actions';
import { ayahCardThemes, cardColors, cardMinimumHeight, cardTranslation, type AyahCardFormat, type AyahCardTheme, type CardTranslation } from '../../utils/ayah-card';
import { IconButton, ReaderIcon, Segments } from '../ui/reader-chrome';
import { ReaderButton } from '../reading/reader-button';
import { AyahShareCard } from './ayah-share-card';
import { readerElevation, readerLayout, readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';

export function ShareAyahScreen() {
  const { surah, ayah: number } = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const { content, loading, error, refresh } = useReaderContent();
  const { loaded: fontsLoaded, error: fontError } = useQuranFont();
  const { palette, dark } = useReadingPreferences();
  const chapter = content?.data.quran.surahs.find((item) => item.number === Number(surah));
  const ayah = chapter?.ayahs.find((item) => item.ayahNumber === Number(number));
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} hidden={false} />
    <View style={[styles.header, { borderColor: palette.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}><Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 24, fontWeight: '600' }}>بطاقة آية</Text>
        <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>آية تتأملها، وأثر تشاركه</Text></View>
      <IconButton name="close" label="العودة إلى القراءة" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} palette={palette} />
    </View>
    {loading || (!fontsLoaded && !fontError) ? <View style={styles.center}><ActivityIndicator color={palette.primary} accessibilityLabel="جارٍ تجهيز البطاقة" /></View>
      : error || fontError || !ayah || !chapter ? <View style={[styles.center, { gap: 16, padding: 24 }]}>
        <Text accessibilityRole="alert" style={{ color: palette.destructive }}>{!error && !fontError ? 'لم نعثر على هذه الآية.' : 'تعذر تجهيز البطاقة. أعد المحاولة.'}</Text>
        {error && <ReaderButton palette={palette} onPress={refresh}>إعادة المحاولة</ReaderButton>}
      </View>
      : <CardDesigner key={`${ayah.surahNumber}:${ayah.ayahNumber}`} ayah={ayah} surahName={chapter.name} palette={palette} />}
  </SafeAreaView>;
}

function CardDesigner({ ayah, surahName, palette }: { ayah: Ayah; surahName: string; palette: ReaderPalette }) {
  const { width: windowWidth } = useWindowDimensions();
  const [theme, setTheme] = useState<AyahCardTheme>('app');
  const [format, setFormat] = useState<AyahCardFormat>('status');
  const [showBrand, setShowBrand] = useState(true);
  const [brandReady, setBrandReady] = useState(false);
  const [language, setLanguage] = useState<'none' | 'fr' | 'en'>('none');
  const [revision, setRevision] = useState(0);
  const [translation, setTranslation] = useState<{ key: string; value: CardTranslation | null; error: boolean } | null>(null);
  const translationKey = `${language}:${revision}`;
  const translating = language !== 'none' && translation?.key !== translationKey;
  const translationError = language !== 'none' && translation?.key === translationKey && translation.error;
  const displayedTranslation = language !== 'none' && translation?.key === translationKey ? translation.value : null;
  const width = Math.min(Math.max(180, windowWidth - 72), format === 'status' ? 248 : 320);
  const [height, setHeight] = useState(0);
  const card = useRef<View>(null);
  const [prepared, setPrepared] = useState<{ key: string; image: PreparedAyahCard } | null>(null);
  const [exportError, setExportError] = useState<{ message: string; retry: boolean } | null>(null);
  const [exportRevision, setExportRevision] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
  const exportKey = `${theme}${theme === 'app' ? palette.background : ''}:${format}:${showBrand}:${translationKey}:${width}:${height}:${exportRevision}`;
  const ready = prepared?.key === exportKey && !translating && !translationError && (!showBrand || brandReady);
  const busy = useRef(false);

  useEffect(() => {
    if (language === 'none') return;
    let active = true;
    void Promise.all(parallelAyahs(ayah).map((number) => quranpedia.getTranslations(ayah.surahNumber, number, language)))
      .then((responses) => {
        const value = cardTranslation(responses.map((response) => response.data));
        if (active) setTranslation({ key: translationKey, value, error: !value });
      }).catch(() => { if (active) setTranslation({ key: translationKey, value: null, error: true }); });
    return () => { active = false; };
  }, [ayah, language, translationKey]);

  useEffect(() => {
    if (!height || translating || translationError || (showBrand && !brandReady)) return;
    let active = true;
    let image: PreparedAyahCard | undefined;
    // Let the latest font and layout commit before capturing, and coalesce edits.
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (!active || !card.current) return;
        setExportError(null); setMessage('');
        void prepareAyahCard(card.current, width, height, `qarani-${ayah.surahNumber}-${ayah.ayahNumber}`)
          .then((result) => {
            if (!active) { result.dispose(); return; }
            image = result; setPrepared({ key: exportKey, image: result });
          }).catch(async () => {
            // Native export refuses to capture when the system cannot share files.
            // Retrying cannot change that, so say so instead of offering a retry.
            const unavailable = Platform.OS !== 'web' && !(await Sharing.isAvailableAsync().catch(() => true));
            if (!active) return;
            setExportError(unavailable ? { message: 'المشاركة غير متاحة على هذا الجهاز، لذا لا يمكن إنشاء صورة البطاقة.', retry: false }
              : { message: 'تعذر إنشاء الصورة. أعد المحاولة.', retry: true });
          });
      });
    }, 200);
    return () => { active = false; clearTimeout(timer); image?.dispose(); };
  }, [exportKey, height, width, translating, translationError, ayah, showBrand, brandReady]);

  const share = async () => {
    if (!ready || !prepared || busy.current) return;
    busy.current = true; setSharing(true); setMessage('');
    try {
      const result = await prepared.image.share();
      if (result === 'downloaded') setMessage('تم تنزيل البطاقة. يمكنك مشاركتها من الصور أو الملفات.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setMessage('تعذرت المشاركة. حاول مرة أخرى.');
    } finally { busy.current = false; setSharing(false); }
  };

  return <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View pointerEvents={sharing ? 'none' : 'auto'} style={{ gap: 18 }}>
        <Segments palette={palette} value={format} onChange={setFormat} options={[{ value: 'status', label: 'حالة واتساب · 9:16' }, { value: 'square', label: 'منشور مربع · 1:1' }]} />
        <View style={[styles.preview, { backgroundColor: palette.muted, borderColor: palette.border }]}>
          <View style={styles.previewLabel}><Text style={{ color: palette.mutedForeground, fontSize: 13 }}>معاينة البطاقة</Text>
            <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{height ? `1080 × ${Math.round(1080 * height / width)}` : ''}</Text></View>
          <View style={readerElevation(2, palette)}>
            <AyahShareCard cardRef={card} ayah={ayah} surahName={surahName} colors={cardColors(theme, palette)} format={format}
              brandRevision={exportRevision} onBrandReady={() => setBrandReady(true)} onBrandError={() => { setBrandReady(false); setExportError({ message: 'تعذر تحميل شعار التطبيق. أعد المحاولة.', retry: true }); }}
              showBrand={showBrand} translation={displayedTranslation} width={width} onLayout={(event) => setHeight(event.nativeEvent.layout.height)} />
            {ready && <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image testID="exported-ayah-card" source={{ uri: prepared.image.uri }} resizeMode="contain" accessible={false} style={StyleSheet.absoluteFill} /></View>}
          </View>
          {height > cardMinimumHeight(width, format) + 2 && <Text style={{ color: palette.mutedForeground, fontSize: 12, textAlign: 'center' }}>امتدت البطاقة لإظهار النص كاملًا.</Text>}
        </View>
        <View style={{ gap: 10 }}>
          <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600' }}>لون البطاقة</Text>
          <View style={styles.themes}>
            {([['app', { label: 'مثل التطبيق', ...cardColors('app', palette) }], ...Object.entries(ayahCardThemes)] as [AyahCardTheme, { label: string; background: string; border: string; accent: string }][]).map(([id, colors]) => <Pressable key={id} accessibilityRole="button" accessibilityLabel={colors.label} accessibilityState={{ selected: theme === id }} aria-pressed={theme === id} onPress={() => setTheme(id)}
              style={({ pressed }) => [styles.theme, { borderColor: theme === id ? palette.primary : palette.input, backgroundColor: pressed ? palette.accent : palette.background }]}>
              <View style={[styles.swatch, { backgroundColor: colors.background, borderColor: colors.border }]}>{theme === id && <ReaderIcon name="check" color={colors.accent} size={16} />}</View>
              <Text style={{ color: palette.foreground, fontSize: 14, fontWeight: '500' }}>{colors.label}</Text>
            </Pressable>)}
          </View>
        </View>
        <View style={[styles.options, { borderColor: palette.border }]}>
          <Toggle label="إظهار شعار قرآني" value={showBrand} onChange={() => { setBrandReady(false); setShowBrand(!showBrand); }} palette={palette} />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
          <Toggle label="إضافة ترجمة المعاني" value={language !== 'none'} onChange={() => setLanguage(language === 'none' ? 'fr' : 'none')} palette={palette} />
          {language !== 'none' && <View style={{ gap: 10, paddingTop: 6 }}>
            <Segments palette={palette} value={language} onChange={setLanguage} options={[{ value: 'fr', label: 'الفرنسية' }, { value: 'en', label: 'الإنجليزية' }]} />
            {translating ? <ActivityIndicator color={palette.primary} accessibilityLabel="جارٍ تحميل الترجمة" />
              : translationError ? <><Text accessibilityRole="alert" style={{ color: palette.destructive, fontSize: 12 }}>تعذر تحميل ترجمة كاملة لهذه الآية. أعد المحاولة أو أوقف الترجمة.</Text><ReaderButton palette={palette} onPress={() => setRevision((value) => value + 1)}>إعادة تحميل الترجمة</ReaderButton></>
              : <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>المصدر: {displayedTranslation?.source} · المراجع الموازية حسب ترقيم حفص: {parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`).join('، ')}</Text>}
          </View>}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {!!message && <Text accessibilityLiveRegion="polite" style={{ color: palette.foreground, fontSize: 13, textAlign: 'center' }}>{message}</Text>}
      {exportError ? <><Text accessibilityRole="alert" style={{ color: palette.destructive, fontSize: 13 }}>{exportError.message}</Text>{exportError.retry && <ReaderButton palette={palette} onPress={() => setExportRevision((value) => value + 1)}>إعادة تجهيز الصورة</ReaderButton>}</>
        : <Pressable accessibilityRole="button" accessibilityLabel={prepared?.image.action === 'download' ? 'تنزيل الصورة' : 'مشاركة الصورة'} accessibilityState={{ disabled: !ready || sharing }} disabled={!ready || sharing} onPress={() => void share()}
          style={({ pressed }) => [styles.share, { backgroundColor: palette.primary, opacity: !ready || sharing ? 0.5 : pressed ? 0.9 : 1 }]}>
          {(!ready && !translationError) || sharing ? <ActivityIndicator color={palette.primaryForeground} /> : <ReaderIcon name="share" color={palette.primaryForeground} size={18} />}
          <Text style={{ color: palette.primaryForeground, fontSize: 14, fontWeight: '500' }}>{sharing ? 'جارٍ المشاركة…' : !ready && !translationError ? 'جارٍ تجهيز الصورة…' : prepared?.image.action === 'download' ? 'تنزيل الصورة' : 'مشاركة الصورة'}</Text>
        </Pressable>}
    </View>
  </>;
}

function Toggle({ label, value, onChange, palette }: { label: string; value: boolean; onChange: () => void; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} aria-checked={value} onPress={onChange} style={styles.toggle}>
    <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '500' }}>{label}</Text>
    <SwitchMark checked={value} palette={palette} />
  </Pressable>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: readerLayout.gutter, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 16, paddingBottom: 24 },
  preview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, alignItems: 'center', padding: 16, gap: 12 },
  previewLabel: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Option tiles: a constant 1.5 border keeps the layout still when the accent colour marks the selection.
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, theme: { flexGrow: 1, flexBasis: '45%', borderWidth: 1.5, borderRadius: readerShape.control, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 48, paddingVertical: 8, gap: 8 },
  swatch: { width: 24, height: 24, borderRadius: readerShape.detail, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  options: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4 }, toggle: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: readerShape.detail, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  share: { minHeight: 48, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
});
