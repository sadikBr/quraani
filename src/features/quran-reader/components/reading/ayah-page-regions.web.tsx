import { printedPageAyah } from '../../utils/printed-page-ayahs';
import type { RegionProps } from './ayah-page-regions';
import { useEffect, useState } from 'react';
import { createAyahPointerPress } from '../../utils/ayah-pointer-press';
import { t } from '@/i18n';

// DOM events avoid the native SVG responder props being forwarded to web paths.
export function AyahPageRegions({ artwork, page, selectedAyah, selectionColor, onTap, onSelect }: RegionProps) {
  const [press] = useState(() => createAyahPointerPress());
  useEffect(() => () => press.cancel(), [press, page.number]);
  return <svg role="group" aria-label={t('reader.printed.pageLabel', { page: String(page.number) })} viewBox={artwork.viewBox} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
    <style>{'.reader-ayah-region:focus:not(:focus-visible) { outline: none; }'}</style>
    {artwork.regions.map((region) => {
      const ayah = printedPageAyah(page, { surahNumber: region.surah, ayahNumber: region.ayah })!;
      const selected = selectedAyah?.surahNumber === region.surah && selectedAyah?.ayahNumber === region.ayah;
      return <path key={`${region.surah}:${region.ayah}`} className="reader-ayah-region" d={region.path}
        fill={selected ? selectionColor : 'transparent'} fillOpacity={selected ? 0.14 : 0}
        role="button" tabIndex={0} aria-label={t('reader.ayah.spokenLabel', { surah: String(region.surah), ayah: String(region.ayah), text: ayah.text })}
        aria-description={t('reader.printed.regionHint')}
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
        fill="transparent" role="button" tabIndex={0} aria-label={t('reader.ayah.actions', { ayah: marker.ayah, surah: marker.surah })}
        style={{ cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' }}
        onPointerDown={(event) => { if (event.button === 0 && event.isPrimary) press.start(event.clientX, event.clientY); else press.cancel(); }}
        onPointerMove={(event) => press.move(event.clientX, event.clientY)} onPointerUp={press.end} onPointerCancel={press.cancel} onPointerLeave={press.cancel}
        onClick={(event) => { event.stopPropagation(); if (!press.consumeClick()) onSelect(ayah); }}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(ayah); } }} />;
    })}
  </svg>;
}
