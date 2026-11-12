import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { ReaderTextLayout } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import type { TajweedSurah } from '../../utils/tajweed';
import { loadedQuranDocumentFont, loadQuranDocumentFont } from '../../services/quran-document-font';
import { editionForMushaf } from '../../riwayat';
import { tajweedTextDocument, tajweedTextState } from '../../utils/tajweed-text-document';
import { ayahKey } from '../../utils/references';
import { tajweedRuleKey } from '../../utils/tajweed-rules';
import { TajweedSurface } from './tajweed-surface';
import { ArabicText } from '@/components/arabic-text';
import { ReaderButton } from './reader-button';
import { readerTextLineHeight } from '../../utils/reader-typography';
import { tajweedTextUpdate, withTajweedTextStyleBridge } from './tajweed-bridge';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { quranScriptForMushaf } from '../../utils/quran-script';
import { t } from '@/i18n';

// The document is generated once at this size; the reader's size and spacing
// are applied through the state bridge so changing them never reloads the font.
const DOCUMENT_FONT_SIZE = 32;

interface Props {
  ayahs: Ayah[]; pageNumber: number; layout: ReaderTextLayout; fontSize: number; spacious: boolean; palette: ReaderPalette; dark: boolean;
  runs?: TajweedSurah; selectedAyah: AyahReference | null; visibleWords?: ReadonlyMap<string, number>;
  preview?: boolean;
  /** A coloured part was tapped: its rule, and the word it is in (by its place in the ayah). */
  onRule?: (ayah: Ayah, rule: string, word: number) => void;
  onTap?: (ayah: Ayah) => void; onSelect?: (ayah: Ayah) => void; onOffset?: (ayah: Ayah, y: number) => void; onNavigate?: (page: number) => void;
}

export const TajweedTextSection = memo(function TajweedTextSection({ ayahs, pageNumber, layout, fontSize, spacious, palette, dark, runs, selectedAyah, visibleWords, preview = false, onRule, onTap, onSelect, onOffset, onNavigate }: Props) {
  const mushafId = ayahs[0].mushafId;
  const edition = editionForMushaf(mushafId);
  // The font follows the chosen letters (the Warsh text can be drawn with the Madinah font).
  const { preferences: { warshScript } } = useReadingPreferences();
  const { fontMushafId, display } = quranScriptForMushaf(mushafId, warshScript);
  const [loadedFont, setFont] = useState<{ mushafId: number; uri: string }>();
  // A font loaded before (the other letter style, chosen again) is used at once, without a spinner.
  const font = loadedFont?.mushafId === fontMushafId ? loadedFont.uri : loadedQuranDocumentFont(fontMushafId);
  const [height, setHeight] = useState(() => preview ? readerTextLineHeight(fontSize, spacious) * 3 : 600);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void loadQuranDocumentFont(fontMushafId).then((uri) => { if (active) setFont({ mushafId: fontMushafId, uri }); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt, fontMushafId]);
  const html = useMemo(() => font ? withTajweedTextStyleBridge(tajweedTextDocument(ayahs, layout, font, DOCUMENT_FONT_SIZE, false, palette, preview, display)) : '', [ayahs, layout, font, palette, preview, display]);
  const ayahState = useMemo(() => tajweedTextState(ayahs, runs, dark, palette, selectedAyah, visibleWords, display), [ayahs, runs, dark, palette, selectedAyah, visibleWords, display]);
  const update = useMemo(() => tajweedTextUpdate(ayahState, { fontSize, lineHeight: readerTextLineHeight(fontSize, spacious) }), [ayahState, fontSize, spacious]);
  if (error) return <View style={{ padding: 24, gap: 12 }}><ArabicText style={{ color: palette.mutedForeground }}>{t('reader.tajweed.textError')}</ArabicText><ReaderButton palette={palette} onPress={() => { setError(false); setAttempt((n) => n + 1); }}>{t('common.retry')}</ReaderButton></View>;
  if (!font) return <ActivityIndicator color={palette.primary} accessibilityLabel={t('reader.tajweed.fontLoading')} style={{ marginVertical: 40 }} />;
  return <TajweedSurface key={`${mushafId}:${fontMushafId}:${attempt}`} title={preview ? t('reader.tajweed.previewTitle', { riwayah: edition.name }) : t('reader.tajweed.textTitle', { riwayah: edition.name, page: pageNumber, surah: ayahs[0].surahNumber })} pageNumber={pageNumber} html={html} update={update} height={height} onError={() => setError(true)} onMessage={(raw) => {
    try {
      const message = JSON.parse(raw);
      if (message.source !== 'quranni-tajweed-text') return;
      if (message.type === 'layout' && Number.isFinite(message.height) && message.height > 0 && message.height < 100000) {
        setHeight(message.height);
        for (const offset of message.ayahs ?? []) {
          const ayah = ayahs.find((a) => ayahKey(a) === offset.key);
          if (ayah && Number.isFinite(offset.y) && offset.y >= 0 && offset.y <= message.height) onOffset?.(ayah, offset.y);
        }
      } else if (message.type === 'error') setError(true);
      else if (message.type === 'tap') onTap?.(ayahs[0]);
      else if (message.type === 'rule') {
        // The rule is one the app knows, and the word one of the ayah's: nothing else is taken from the message.
        const ayah = ayahs.find((a) => a.surahNumber === message.surah && a.ayahNumber === message.ayah);
        if (ayah && onRule && !visibleWords && tajweedRuleKey(message.rule) && Number.isInteger(message.word) && message.word >= 0) onRule(ayah, message.rule, message.word);
        else onTap?.(ayahs[0]);
      }
      else if (message.type === 'swipe' && [1, -1].includes(message.delta)) onNavigate?.(pageNumber + message.delta);
      else if (message.type === 'select') {
        const ayah = ayahs.find((a) => a.surahNumber === message.surah && a.ayahNumber === message.ayah);
        if (ayah) onSelect?.(ayah);
      }
    } catch { /* Messages cannot supply Quran text or arbitrary references. */ }
  }} />;
});
