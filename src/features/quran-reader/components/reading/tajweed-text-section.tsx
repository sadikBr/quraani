import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { ReaderTextLayout } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import type { TajweedSurah } from '../../utils/tajweed';
import { loadHafsDocumentFont } from '../../services/hafs-document-font';
import { tajweedTextDocument, tajweedTextState } from '../../utils/tajweed-text-document';
import { ayahKey } from '../../utils/references';
import { TajweedSurface } from './tajweed-surface';
import { ArabicText } from '@/components/arabic-text';
import { ReaderButton } from './reader-button';
import { readerTextLineHeight } from '../../utils/reader-typography';

interface Props {
  ayahs: Ayah[]; pageNumber: number; layout: ReaderTextLayout; fontSize: number; spacious: boolean; palette: ReaderPalette; dark: boolean;
  runs?: TajweedSurah; selectedAyah: AyahReference | null; visibleWords?: ReadonlyMap<string, number>;
  preview?: boolean;
  onTap?: (ayah: Ayah) => void; onSelect?: (ayah: Ayah) => void; onOffset?: (ayah: Ayah, y: number) => void; onNavigate?: (page: number) => void;
}

export const TajweedTextSection = memo(function TajweedTextSection({ ayahs, pageNumber, layout, fontSize, spacious, palette, dark, runs, selectedAyah, visibleWords, preview = false, onTap, onSelect, onOffset, onNavigate }: Props) {
  const [font, setFont] = useState<string>();
  const [height, setHeight] = useState(() => preview ? readerTextLineHeight(fontSize, spacious) * 3 : 600);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void loadHafsDocumentFont().then((value) => { if (active) setFont(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  const html = useMemo(() => font ? tajweedTextDocument(ayahs, layout, font, fontSize, spacious, palette, preview) : '', [ayahs, layout, font, fontSize, spacious, palette, preview]);
  const update = useMemo(() => tajweedTextState(ayahs, runs, dark, palette, selectedAyah, visibleWords), [ayahs, runs, dark, palette, selectedAyah, visibleWords]);
  if (error) return <View style={{ padding: 24, gap: 12 }}><ArabicText style={{ color: palette.muted }}>تعذر عرض النص القرآني.</ArabicText><ReaderButton palette={palette} onPress={() => { setError(false); setAttempt((n) => n + 1); }}>إعادة المحاولة</ReaderButton></View>;
  if (!font) return <ActivityIndicator color={palette.accent} accessibilityLabel="جارٍ تحميل خط القرآن" style={{ marginVertical: 40 }} />;
  return <TajweedSurface key={attempt} title={preview ? 'معاينة نص حفص بألوان التجويد' : `نص حفص بألوان التجويد · صفحة ${pageNumber} · سورة ${ayahs[0].surahNumber}`} pageNumber={pageNumber} html={html} update={update} height={height} onError={() => setError(true)} onMessage={(raw) => {
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
