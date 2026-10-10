import { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Ayah, AyahReference, Quran } from '@/lib/quranpedia/types';
import type { QuranPage } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { loadTajweedFont, loadTajweedPrintedSurah } from '../../services/tajweed-service';
import { tajweedDocument, type TajweedBlock } from '../../utils/tajweed-document';
import { printedPageAyah } from '../../utils/printed-page-ayahs';
import { ReaderButton } from './reader-button';
import { TajweedSurface } from './tajweed-surface';
import { SurahOpening } from './surah-opening';
import { withTajweedPageBridge, type TajweedPageState } from './tajweed-bridge';
interface Props {
  page: QuranPage; quran: Quran; palette: ReaderPalette; dark: boolean; selectedAyah: AyahReference | null;
  onTap: () => void; onSelect: (ayah: Ayah) => void; onNavigate: (page: number) => void; onTargetOffset?: (y: number) => void;
}
export const TajweedQuranPage = memo(function TajweedQuranPage({ page, quran, palette, dark, selectedAyah, onTap, onSelect, onNavigate, onTargetOffset }: Props) {
  const [data, setData] = useState<{ blocks: TajweedBlock[]; font: string }>();
  const [height, setHeight] = useState(650);
  const [bodySize, setBodySize] = useState(32);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [openingHeights, setOpeningHeights] = useState<Record<number, number>>({});
  const [openingOffsets, setOpeningOffsets] = useState<Record<number, number>>({});
  useEffect(() => {
    let active = true;
    const required = new Set(page.ayahs.map((a) => a.surahNumber));
    const numbers = [...new Set([...required, ...(page.previousAyah ? [page.previousAyah.surahNumber] : [])])];
    void Promise.all([Promise.all(numbers.map(async (n) => {
      const surah = quran.surahs.find((s) => s.number === n)!;
      const source = await loadTajweedPrintedSurah(surah, quran.id);
      const lines = source[page.number];
      if (!lines?.length) {
        if (required.has(n)) throw new Error('Missing tajweed page');
        return null;
      }
      return { surah: n, title: surah.name, opens: lines.some((l) => l.words.some((w) => w.ayah === 1)), lines };
    })), loadTajweedFont(page.number)]).then(([loaded, font]) => {
      const blocks = loaded.filter((block): block is TajweedBlock => block !== null).sort((a, b) => a.surah - b.surah);
      for (const ayah of page.ayahs) if (!blocks.some((b) => b.lines.some((l) => l.words.some((w) => w.surah === ayah.surahNumber && w.ayah === ayah.ayahNumber)))) throw new Error('Incomplete tajweed page');
      if (active) setData({ blocks, font });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [page, quran, retry]);
  const selected = selectedAyah ? `${selectedAyah.surahNumber}:${selectedAyah.ayahNumber}` : null;
  // The document embeds the page font, so only its content and theme rebuild it.
  // Selection and measured opening heights are applied in place (see tajweed-bridge).
  const html = useMemo(() => data ? withTajweedPageBridge(tajweedDocument(data.blocks, data.font, palette, dark, null)) : '', [data, palette, dark]);
  const update = useMemo(() => JSON.stringify({ selected, openings: openingHeights } satisfies TajweedPageState), [selected, openingHeights]);
  if (error) return <View style={{ padding: 30, gap: 16 }}><Text style={{ color: palette.muted }}>تعذر تحميل مصحف التجويد.</Text><ReaderButton palette={palette} onPress={() => { setError(false); setRetry((n) => n + 1); }}>إعادة المحاولة</ReaderButton></View>;
  if (!data) return <ActivityIndicator color={palette.accent} accessibilityLabel="جارٍ تحميل مصحف التجويد" style={{ marginVertical: 60 }} />;
  return <View><TajweedSurface pageNumber={page.number} html={html} update={update} height={height} onError={() => setError(true)} onMessage={(raw) => {
    try {
      const message = JSON.parse(raw);
      if (message.source !== 'quranni-tajweed') return;
      if (message.type === 'layout' && Number.isFinite(message.height) && message.height > 0 && message.height < 10000) {
        setHeight(message.height); if (Number.isFinite(message.target)) onTargetOffset?.(message.target);
        if (Number.isFinite(message.fontSize) && message.fontSize > 0 && message.fontSize <= 46) setBodySize(Math.round(message.fontSize * 10) / 10);
        const positions: Record<number, number> = {};
        for (const opening of message.openings ?? []) if (data.blocks.some((b) => b.opens && b.surah === opening.surah) && Number.isFinite(opening.y) && opening.y >= 0 && opening.y < message.height) positions[opening.surah] = opening.y;
        setOpeningOffsets((current) => JSON.stringify(current) === JSON.stringify(positions) ? current : positions);
      } else if (message.type === 'tap') onTap();
      else if (message.type === 'swipe' && [1, -1].includes(message.delta)) onNavigate(page.number + message.delta);
      else if (message.type === 'error') setError(true);
      else if (message.type === 'select') {
        const ayah = printedPageAyah(page, { surahNumber: message.surah, ayahNumber: message.ayah });
        if (ayah) onSelect(ayah);
      }
    } catch { /* Ignore malformed messages, never infer an ayah reference. */ }
  }} />{data.blocks.filter((block) => block.opens).map((block) => <View key={block.surah} pointerEvents="none"
    onLayout={(event) => { const h = Math.ceil(event.nativeEvent.layout.height); setOpeningHeights((current) => current[block.surah] === h ? current : { ...current, [block.surah]: h }); }}
    style={{ position: 'absolute', left: 0, right: 0, top: openingOffsets[block.surah] ?? 0, opacity: openingOffsets[block.surah] === undefined ? 0 : 1 }}>
    <SurahOpening number={block.surah} name={block.title} fontSize={bodySize} palette={palette}
      bismillah={block.surah !== 1 && block.surah !== 9 ? quran.bismillah : undefined} />
  </View>)}</View>;
});
