import { printedPageAyah } from '../../utils/printed-page-ayahs';
import { StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { QuranPage } from '../../types/reader';
import type { PrintedPage } from '../../utils/printed-page';

export interface RegionProps {
  artwork: PrintedPage;
  page: QuranPage;
  selectedAyah: AyahReference | null;
  selectionColor: string;
  onTap: (ayah: Ayah) => void;
  onSelect: (ayah: Ayah) => void;
}

export function AyahPageRegions({ artwork, page, selectedAyah, selectionColor, onTap, onSelect }: RegionProps) {
  return <Svg viewBox={artwork.viewBox} width="100%" height="100%" style={StyleSheet.absoluteFill}>
    {artwork.regions.map((region) => {
      const ayah = printedPageAyah(page, { surahNumber: region.surah, ayahNumber: region.ayah })!;
      const selected = selectedAyah?.surahNumber === region.surah && selectedAyah?.ayahNumber === region.ayah;
      return <Path key={`${region.surah}:${region.ayah}`} d={region.path}
        fill={selected ? selectionColor : 'transparent'} fillOpacity={selected ? 0.14 : 0}
        onPress={(event) => { event.stopPropagation(); onTap(ayah); }}
        onLongPress={(event) => { event.stopPropagation(); onSelect(ayah); }} accessible
        accessibilityLabel={`السورة ${String(region.surah)}، الآية ${String(region.ayah)}. ${ayah.text}. اضغط لإظهار أدوات القراءة، واضغط رقم الآية أو اضغط مطولاً لفتح إجراءاتها`} />;
    })}
    {artwork.markers.map((marker) => {
      const ayah = printedPageAyah(page, { surahNumber: marker.surah, ayahNumber: marker.ayah })!;
      return <Rect key={`marker:${marker.surah}:${marker.ayah}`} x={marker.x} y={marker.y} width={marker.width} height={marker.height}
        fill="transparent" accessible accessibilityLabel={`إجراءات الآية ${marker.ayah}، السورة ${marker.surah}`}
        onPress={(event) => { event.stopPropagation(); onSelect(ayah); }} />;
    })}
  </Svg>;
}
