import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { SwitchMark } from '@/components/ui';
import { archPath, cartoucheFrame } from '@/components/craft/art';
import { page, PageBar, PageTitle, Row, RowGroup, Section } from '@/components/craft/page';
import type { Ayah } from '@/lib/quranpedia/types';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { quranpedia } from '../../services/reader-service';
import { prepareAyahCard, type PreparedAyahCard } from '../../services/ayah-card-export';
import { parallelAyahs } from '../../utils/ayah-actions';
import { ayahCardThemes, cardColors, cardMinimumHeight, cardTranslation, type AyahCardColors, type AyahCardFormat, type AyahCardTheme, type CardTranslation } from '../../utils/ayah-card';
import { ReaderIcon, Segments } from '../ui/reader-chrome';
import { ReaderButton } from '../reading/reader-button';
import { AyahShareCard } from './ayah-share-card';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../../design';
import type { ReaderPalette } from '../../theme';
import { formatList, t } from '@/i18n';
import { useBack } from '@/components/back';

/**
 * «بطاقة آية»: an ayah made into an image to send. The card is shown as it will be sent, on a
 * quiet stage; under it its shape, its colours (each swatch a small copy of the card) and what it
 * shows besides the ayah; the button to share stays at the foot.
 */
export function ShareAyahScreen() {
  const { surah, ayah: number } = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const { content, loading, error, refresh } = useReaderContent();
  const { loaded: fontsLoaded, error: fontError } = useQuranFont();
  const { palette, dark } = useReadingPreferences();
  const back = useBack();
  const chapter = content?.data.quran.surahs.find((item) => item.number === Number(surah));
  const ayah = chapter?.ayahs.find((item) => item.ayahNumber === Number(number));
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
    <StatusBar style={dark ? 'light' : 'dark'} hidden={false} />
    <PageBar title={t('share.title')} back={back} palette={palette} />
    {loading || (!fontsLoaded && !fontError) ? <View style={styles.center}><ActivityIndicator color={palette.primary} accessibilityLabel={t('share.preparing')} /></View>
      : error || fontError || !ayah || !chapter ? <View style={[styles.center, { gap: 16, padding: 24 }]}>
        <Text accessibilityRole="alert" style={{ color: palette.destructive, textAlign: 'center' }}>{!error && !fontError ? t('share.notFound') : t('share.loadError')}</Text>
        {error && <ReaderButton palette={palette} onPress={refresh}>{t('common.retry')}</ReaderButton>}
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
            setExportError(unavailable ? { message: t('share.errors.unavailable'), retry: false }
              : { message: t('share.errors.image'), retry: true });
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
      if (result === 'downloaded') setMessage(t('share.downloaded'));
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setMessage(t('share.errors.share'));
    } finally { busy.current = false; setSharing(false); }
  };
  const swatches = [['app', { label: t('share.color.app'), ...cardColors('app', palette) }], ...Object.entries(ayahCardThemes)] as [AyahCardTheme, AyahCardColors & { label: string }][];

  return <>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
      <PageTitle subtitle={t('share.subtitle')} palette={palette} />
      {/* Always a native view: blocking touches while sharing makes it one, and unblocking
          would flatten it away again, which, with the content changing at the same time,
          crashed Android's renderer (a view inserted while it still had a parent). */}
      <View collapsable={false} pointerEvents={sharing ? 'none' : 'auto'} style={{ gap: 26 }}>
        {/* The stage: the card as it will be sent. */}
        <View style={[styles.stage, { backgroundColor: palette.muted, borderColor: palette.border }]}>
          <View style={styles.stageLabel}>
            <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('share.preview.title')}</Text>
            {/* Width by height, isolated left to right inside the page's right-to-left line. */}
            <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{height ? `\u20661080 × ${Math.round(1080 * height / width)}\u2069` : ''}</Text>
          </View>
          <View style={readerElevation(3, palette)}>
            <AyahShareCard cardRef={card} ayah={ayah} surahName={surahName} colors={cardColors(theme, palette)} format={format}
              brandRevision={exportRevision} onBrandReady={() => setBrandReady(true)} onBrandError={() => { setBrandReady(false); setExportError({ message: t('share.errors.brand'), retry: true }); }}
              showBrand={showBrand} translation={displayedTranslation} width={width} onLayout={(event) => setHeight(event.nativeEvent.layout.height)} />
            {ready && <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image testID="exported-ayah-card" source={{ uri: prepared.image.uri }} resizeMode="contain" accessible={false} style={StyleSheet.absoluteFill} /></View>}
          </View>
          {height > cardMinimumHeight(width, format) + 2 && <Text style={{ color: palette.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('share.preview.extended')}</Text>}
        </View>

        <Section title={t('share.format.title')} palette={palette}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('share.format.title')} style={styles.formats}>
            {(['status', 'square'] as const).map((value) => {
              const on = value === format;
              return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t(`share.format.${value}`)} onPress={() => setFormat(value)}
                style={({ pressed }) => [styles.format, { borderColor: on ? withAlpha(palette.ornament, 0.75) : palette.border, backgroundColor: on ? withAlpha(palette.ornament, 0.1) : pressed ? palette.accent : palette.card }]}>
                <FormatShape format={value} on={on} palette={palette} />
                <Text numberOfLines={2} style={{ color: on ? palette.foreground : palette.mutedForeground, fontSize: 13, lineHeight: 20, fontWeight: on ? '600' : '500', textAlign: 'center' }}>{t(`share.format.${value}`)}</Text>
              </Pressable>;
            })}
          </View>
        </Section>

        <Section title={t('share.color.title')} palette={palette}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('share.color.title')} style={styles.swatches}>
            {swatches.map(([id, colors]) => <Swatch key={id} colors={colors} selected={theme === id} palette={palette} onPress={() => setTheme(id)} />)}
          </View>
        </Section>

        <RowGroup palette={palette}>
          <Row title={t('share.showBrand')} role="switch" selected={showBrand} palette={palette} trailing={<SwitchMark checked={showBrand} palette={palette} />}
            onPress={() => { setBrandReady(false); setShowBrand(!showBrand); }} />
          <Row title={t('share.translation.add')} role="switch" selected={language !== 'none'} palette={palette} trailing={<SwitchMark checked={language !== 'none'} palette={palette} />}
            onPress={() => setLanguage(language === 'none' ? 'fr' : 'none')} />
          {language !== 'none' && <View style={styles.translation}>
            <Segments palette={palette} value={language} onChange={setLanguage} options={[{ value: 'fr', label: t('common.languages.french') }, { value: 'en', label: t('common.languages.english') }]} />
            {translating ? <ActivityIndicator color={palette.primary} accessibilityLabel={t('share.translation.loading')} />
              : translationError ? <><Text accessibilityRole="alert" style={{ color: palette.destructive, fontSize: 12, lineHeight: 18 }}>{t('share.translation.error')}</Text><ReaderButton palette={palette} onPress={() => setRevision((value) => value + 1)}>{t('share.translation.reload')}</ReaderButton></>
              : <Text style={{ color: palette.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('share.translation.source', { source: displayedTranslation?.source ?? '' })} · {t('share.translation.parallel', { refs: formatList(parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`)) })}</Text>}
          </View>}
        </RowGroup>
      </View>
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: palette.background, borderColor: palette.border }]}>
      {!!message && <Text accessibilityLiveRegion="polite" style={{ color: palette.foreground, fontSize: 13, textAlign: 'center' }}>{message}</Text>}
      {exportError ? <><Text accessibilityRole="alert" style={{ color: palette.destructive, fontSize: 13, textAlign: 'center' }}>{exportError.message}</Text>{exportError.retry && <ReaderButton palette={palette} onPress={() => setExportRevision((value) => value + 1)}>{t('share.retryImage')}</ReaderButton>}</>
        : <Pressable accessibilityRole="button" accessibilityLabel={prepared?.image.action === 'download' ? t('share.downloadImage') : t('share.shareImage')} accessibilityState={{ disabled: !ready || sharing }} disabled={!ready || sharing} onPress={() => void share()}
          style={({ pressed }) => [styles.share, { backgroundColor: palette.primary, opacity: !ready || sharing ? 0.5 : pressed ? 0.9 : 1 }]}>
          {(!ready && !translationError) || sharing ? <ActivityIndicator color={palette.primaryForeground} /> : <ReaderIcon name="share" color={palette.primaryForeground} size={18} />}
          <Text style={{ color: palette.primaryForeground, fontSize: 15, fontWeight: '600' }}>{sharing ? t('share.sharing') : !ready && !translationError ? t('share.preparingImage') : prepared?.image.action === 'download' ? t('share.downloadImage') : t('share.shareImage')}</Text>
        </Pressable>}
    </View>
  </>;
}

/** A format drawn as the card's own shape at its proportions: a tall door, or a square one. */
function FormatShape({ format, on, palette: p }: { format: AyahCardFormat; on: boolean; palette: ReaderPalette }) {
  const w = format === 'status' ? 20 : 30, h = format === 'status' ? 36 : 30, x = (32 - w) / 2, y = (38 - h) / 2;
  const color = on ? p.ornament : p.mutedForeground;
  return <Svg width={32} height={38} aria-hidden>
    <Rect x={x} y={y} width={w} height={h} rx={2} fill={on ? withAlpha(p.ornament, 0.12) : 'none'} stroke={color} strokeWidth={1.2} />
    <Path d={archPath(w - 6, h - 6, format === 'status' ? 8 : 6, x + 3, y + 3, 1)} fill="none" stroke={color} strokeWidth={0.9} />
  </Svg>;
}

/** A colour, shown as a small copy of the card in it: the frame, the arch, the title, the lines. */
function Swatch({ colors, selected, palette: p, onPress }: { colors: AyahCardColors & { label: string }; selected: boolean; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={colors.label} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [styles.swatch, { opacity: pressed && !selected ? 0.75 : 1 }]}>
    <View style={[styles.swatchRing, { borderColor: selected ? p.primary : 'transparent' }]}>
      <Svg width={48} height={64} aria-hidden>
        <Rect x={0.5} y={0.5} width={47} height={63} rx={4} fill={colors.background} stroke={colors.border} strokeWidth={1} />
        <Path d={archPath(38, 54, 17, 5, 5, 2)} fill={colors.surface} stroke={colors.accent} strokeWidth={1} />
        <Path d={cartoucheFrame(22, 7)} transform="translate(13 20)" fill={withAlpha(colors.accent, 0.15)} stroke={colors.accent} strokeWidth={0.8} />
        <Path d="M 13 36 H 35 M 15 42 H 33 M 18 48 H 30" stroke={withAlpha(colors.text, 0.6)} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      {selected && <View style={[styles.check, { backgroundColor: p.primary, borderColor: p.background }]}><ReaderIcon name="check" color={p.primaryForeground} size={11} /></View>}
    </View>
    <Text numberOfLines={2} style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 12, lineHeight: 17, fontWeight: selected ? '600' : '400', textAlign: 'center' }}>{colors.label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 12 },
  stageLabel: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formats: { flexDirection: 'row', gap: 10 },
  format: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8, borderWidth: 1, borderRadius: readerShape.card },
  swatches: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  swatch: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  swatchRing: { padding: 3, borderWidth: 2, borderRadius: 9 },
  check: { position: 'absolute', top: -7, end: -7, width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  translation: { gap: 10, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 },
  footer: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  share: { minHeight: 50, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
});
