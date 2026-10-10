import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { ReaderTextLayout } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import type { TajweedSurah } from '../../utils/tajweed';
import { loadQuranDocumentFont } from '../../services/quran-document-font';
import { editionForMushaf } from '../../riwayat';
import { tajweedTextDocument, tajweedTextState } from '../../utils/tajweed-text-document';
import { ayahKey } from '../../utils/references';
import { TajweedSurface } from './tajweed-surface';
import { ArabicText } from '@/components/arabic-text';
import { ReaderButton } from './reader-button';
import { readerTextLineHeight } from '../../utils/reader-typography';
import { tajweedTextUpdate, withTajweedTextStyleBridge } from './tajweed-bridge';

// The document is generated once at this size; the reader's size and spacing
// are applied through the state bridge so changing them never reloads the font.
const DOCUMENT_FONT_SIZE = 32;

interface Props {
  ayahs: Ayah[]; pageNumber: number; layout: ReaderTextLayout; fontSize: number; spacious: boolean; palette: ReaderPalette; dark: boolean;
  runs?: TajweedSurah; selectedAyah: AyahReference | null; visibleWords?: ReadonlyMap<string, number>;
  preview?: boolean;
  onTap?: (ayah: Ayah) => void; onSelect?: (ayah: Ayah) => void; onOffset?: (ayah: Ayah, y: number) => void; onNavigate?: (page: number) => void;
}

export const TajweedTextSection = memo(function TajweedTextSection({ ayahs, pageNumber, layout, fontSize, spacious, palette, dark, runs, selectedAyah, visibleWords, preview = false, onTap, onSelect, onOffset, onNavigate }: Props) {
  const mushafId = ayahs[0].mushafId;
  const edition = editionForMushaf(mushafId);
  const [loadedFont, setFont] = useState<{ mushafId: number; uri: string }>();
  const font = loadedFont?.mushafId === mushafId ? loadedFont.uri : undefined;
  const [height, setHeight] = useState(() => preview ? readerTextLineHeight(fontSize, spacious) * 3 : 600);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void loadQuranDocumentFont(mushafId).then((uri) => { if (active) setFont({ mushafId, uri }); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt, mushafId]);
  const html = useMemo(() => font ? withTajweedTextStyleBridge(tajweedTextDocument(ayahs, layout, font, DOCUMENT_FONT_SIZE, false, palette, preview)) : '', [ayahs, layout, font, palette, preview]);
  const ayahState = useMemo(() => tajweedTextState(ayahs, runs, dark, palette, selectedAyah, visibleWords), [ayahs, runs, dark, palette, selectedAyah, visibleWords]);
  const update = useMemo(() => tajweedTextUpdate(ayahState, { fontSize, lineHeight: readerTextLineHeight(fontSize, spacious) }), [ayahState, fontSize, spacious]);
  if (error) return <View style={{ padding: 24, gap: 12 }}><ArabicText style={{ color: palette.mutedForeground }}>تعذر عرض النص القرآني.</ArabicText><ReaderButton palette={palette} onPress={() => { setError(false); setAttempt((n) => n + 1); }}>إعادة المحاولة</ReaderButton></View>;
  if (!font) return <ActivityIndicator color={palette.primary} accessibilityLabel="جارٍ تحميل خط القرآن" style={{ marginVertical: 40 }} />;
  return <TajweedSurface key={`${mushafId}:${attempt}`} title={preview ? `معاينة نص ${edition.name} بألوان التجويد` : `نص ${edition.name} بألوان التجويد · صفحة ${pageNumber} · سورة ${ayahs[0].surahNumber}`} pageNumber={pageNumber} html={html} update={update} height={height} onError={() => setError(true)} onMessage={(raw) => {
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
      else if (message.type === 'swipe' && [1, -1].includes(message.delta)) onNavigate?.(pageNumber + message.delta);
      else if (message.type === 'select') {
        const ayah = ayahs.find((a) => a.surahNumber === message.surah && a.ayahNumber === message.ayah);
        if (ayah) onSelect?.(ayah);
      }
    } catch { /* Messages cannot supply Quran text or arbitrary references. */ }
  }} />;
});
