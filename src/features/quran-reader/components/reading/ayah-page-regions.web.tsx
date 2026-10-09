import { printedPageAyah } from '../../utils/printed-page-ayahs';
import { ayahKey } from '../../utils/references';
import type { RegionProps } from './ayah-page-regions';
import { useEffect, useState } from 'react';
import { createAyahPointerPress } from '../../utils/ayah-pointer-press';

// DOM events avoid the native SVG responder props being forwarded to web paths.
export function AyahPageRegions({ artwork, page, selectedAyah, selectionColor, onTap, onSelect, hiddenAyahs, paperColor }: RegionProps) {
  const [press] = useState(() => createAyahPointerPress());
  useEffect(() => () => press.cancel(), [press, page.number]);
  return <svg role="group" aria-label={`صفحة المصحف ${String(page.number)}`} viewBox={artwork.viewBox} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
    <style>{'.reader-ayah-region:focus:not(:focus-visible) { outline: none; }'}</style>
    <defs><mask id={`verse-mask-${page.number}`} maskUnits="userSpaceOnUse" x={Number(artwork.viewBox.split(' ')[0])} y={0} width={artwork.width} height={artwork.height}>
      <rect x={Number(artwork.viewBox.split(' ')[0])} y={0} width={artwork.width} height={artwork.height} fill="white" />
      {artwork.markers.map((marker) => <rect key={`${marker.surah}:${marker.ayah}`} x={marker.x} y={marker.y} width={marker.width} height={marker.height} fill="black" />)}
    </mask></defs>
    {artwork.regions.map((region) => {
      const ayah = printedPageAyah(page, { surahNumber: region.surah, ayahNumber: region.ayah })!;
      const hidden = hiddenAyahs.has(ayahKey(ayah));
      const selected = selectedAyah?.surahNumber === region.surah && selectedAyah?.ayahNumber === region.ayah;
      return <path key={`${region.surah}:${region.ayah}`} className="reader-ayah-region" d={region.path} mask={hidden ? `url(#verse-mask-${page.number})` : undefined}
        fill={hidden ? paperColor : selected ? selectionColor : 'transparent'} fillOpacity={hidden ? 1 : selected ? 0.14 : 0}
        stroke={hidden ? selectionColor : 'none'} strokeOpacity={0.2} strokeWidth={0.5} strokeDasharray={hidden ? '3 3' : undefined}
        role="button" tabIndex={0} aria-label={hidden ? `آية مخفية، السورة ${region.surah}، الآية ${region.ayah}. اضغط للإظهار` : `السورة ${String(region.surah)}، الآية ${String(region.ayah)}. ${ayah.text}`}
        aria-description={hidden ? 'اضغط لإظهار الآية' : 'اضغط لإظهار أدوات القراءة. اضغط رقم الآية أو اضغط مطولاً لفتح إجراءاتها.'}
        style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
        onPointerDown={(event) => { if (event.button === 0 && event.isPrimary) press.start(event.clientX, event.clientY, () => onSelect(ayah)); else press.cancel(); }}
        onPointerMove={(event) => press.move(event.clientX, event.clientY)}
        onPointerUp={press.end} onPointerCancel={press.cancel} onPointerLeave={press.cancel}
        onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); press.cancel(); onSelect(ayah); }}
        aria-pressed={selected} onClick={(event) => { event.stopPropagation(); if (!press.consumeClick()) onTap(ayah); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onTap(ayah); } }} />;
    })}
    {artwork.markers.map((marker) => {
      const ayah = printedPageAyah(page, { surahNumber: marker.surah, ayahNumber: marker.ayah })!;
      return <rect key={`marker:${marker.surah}:${marker.ayah}`} className="reader-ayah-region" x={marker.x} y={marker.y} width={marker.width} height={marker.height}
        fill="transparent" role="button" tabIndex={0} aria-label={`إجراءات الآية ${marker.ayah}، السورة ${marker.surah}`}
        style={{ cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' }}
        onPointerDown={(event) => { if (event.button === 0 && event.isPrimary) press.start(event.clientX, event.clientY); else press.cancel(); }}
        onPointerMove={(event) => press.move(event.clientX, event.clientY)} onPointerUp={press.end} onPointerCancel={press.cancel} onPointerLeave={press.cancel}
        onClick={(event) => { event.stopPropagation(); if (!press.consumeClick()) onSelect(ayah); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(ayah); } }} />;
    })}
  </svg>;
}
