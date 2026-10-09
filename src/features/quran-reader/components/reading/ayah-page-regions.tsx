import { printedPageAyah } from '../../utils/printed-page-ayahs';
import { ayahKey } from '../../utils/references';
import { StyleSheet } from 'react-native';
import Svg, { Path, Rect, Defs, Mask } from 'react-native-svg';
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
  hiddenAyahs: ReadonlySet<string>;
  paperColor: string;
}

export function AyahPageRegions({ artwork, page, selectedAyah, selectionColor, onTap, onSelect, hiddenAyahs, paperColor }: RegionProps) {
  return <Svg viewBox={artwork.viewBox} width="100%" height="100%" style={StyleSheet.absoluteFill}>
    <Defs><Mask id={`verse-mask-${page.number}`} maskUnits="userSpaceOnUse" x={Number(artwork.viewBox.split(' ')[0])} y={0} width={artwork.width} height={artwork.height}>
      <Rect x={Number(artwork.viewBox.split(' ')[0])} y={0} width={artwork.width} height={artwork.height} fill="white" />
      {artwork.markers.map((marker) => <Rect key={`${marker.surah}:${marker.ayah}`} x={marker.x} y={marker.y} width={marker.width} height={marker.height} fill="black" />)}
    </Mask></Defs>
    {artwork.regions.map((region) => {
      const ayah = printedPageAyah(page, { surahNumber: region.surah, ayahNumber: region.ayah })!;
      const hidden = hiddenAyahs.has(ayahKey(ayah));
      const selected = selectedAyah?.surahNumber === region.surah && selectedAyah?.ayahNumber === region.ayah;
      return <Path key={`${region.surah}:${region.ayah}`} d={region.path} mask={hidden ? `url(#verse-mask-${page.number})` : undefined}
        fill={hidden ? paperColor : selected ? selectionColor : 'transparent'} fillOpacity={hidden ? 1 : selected ? 0.14 : 0}
        stroke={hidden ? selectionColor : 'none'} strokeOpacity={0.2} strokeWidth={0.5} strokeDasharray={hidden ? '3 3' : undefined}
        onPress={(event) => { event.stopPropagation(); onTap(ayah); }}
        onLongPress={(event) => { event.stopPropagation(); onSelect(ayah); }} accessible
        accessibilityLabel={hidden ? `آية مخفية، السورة ${region.surah}، الآية ${region.ayah}. اضغط للإظهار` : `السورة ${String(region.surah)}، الآية ${String(region.ayah)}. ${ayah.text}. اضغط لإظهار أدوات القراءة، واضغط رقم الآية أو اضغط مطولاً لفتح إجراءاتها`} />;
    })}
    {artwork.markers.map((marker) => {
      const ayah = printedPageAyah(page, { surahNumber: marker.surah, ayahNumber: marker.ayah })!;
      return <Rect key={`marker:${marker.surah}:${marker.ayah}`} x={marker.x} y={marker.y} width={marker.width} height={marker.height}
        fill="transparent" accessible accessibilityLabel={`إجراءات الآية ${marker.ayah}، السورة ${marker.surah}`}
        onPress={(event) => { event.stopPropagation(); onSelect(ayah); }} />;
    })}
  </Svg>;
}
