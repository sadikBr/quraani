import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { AyahReference } from '@/lib/quranpedia/types';
import { contentStorage } from '../storage/content-storage';
import type { ReaderContent } from '../types/reader';
import { restoreReadingPosition, type ReadingPosition } from '../utils/navigation';

import { RIWAYAT, readingPositionKey } from '../riwayat';
import { useReadingPreferences } from '../state/reading-preferences-provider';

/** Pure position updates; exported for tests. */
export function withSelectedAyah(position: ReadingPosition, ayah: AyahReference, scrollY?: number): ReadingPosition {
  return { ...position, ayah: { mushafId: position.mushafId, surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber }, ...(scrollY !== undefined && { scrollY }) };
}

/** Takes a pending (debounced) scroll offset, cancelling its timer. */
function takeScroll(timer: { current: ReturnType<typeof setTimeout> | null }, latest: { current: number | null }) {
  if (timer.current) clearTimeout(timer.current);
  const y = latest.current;
  latest.current = null;
  return y;
}

export function useReadingPosition(content: ReaderContent | undefined) {
  const { preferences: { riwayah } } = useReadingPreferences();
  const mushafId = RIWAYAT[riwayah].mushafId;
  const KEY = readingPositionKey(mushafId);
  // The loaded position is tagged with its storage key: after a riwayah switch
  // nothing is written (or shown) until the new key's position has been read.
  const [saved, setSaved] = useState<{ key: string; position: ReadingPosition } | null>(null);
  const ready = saved?.key === KEY;
  const initial = useMemo<ReadingPosition>(() => ({ mushafId, pageNumber: 1, ayah: null, scrollY: 0 }), [mushafId]);
  const position = ready ? saved.position : initial;
  const writes = useRef(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestScroll = useRef<number | null>(null);
  const latestPosition = useRef<ReadingPosition | null>(null);
  useEffect(() => {
    if (!content || ready || content.quran.id !== mushafId) return;
    let active = true;
    contentStorage.getItem(KEY).catch(() => null).then((raw) => {
      if (active) setSaved({ key: KEY, position: restoreReadingPosition(raw, content) });
    });
    return () => { active = false; };
  }, [content, ready, KEY, mushafId]);
  useEffect(() => {
    latestPosition.current = ready ? position : null;
    if (ready) writes.current = writes.current.then(() => contentStorage.setItem(KEY, JSON.stringify(position))).catch(() => {});
  }, [position, ready, KEY]);
  /** Functional update of the current key's position; a stale callback cannot touch another key. */
  const update = useCallback((change: (position: ReadingPosition) => ReadingPosition) => {
    setSaved((value) => value?.key === KEY ? { key: KEY, position: change(value.position) } : value);
  }, [KEY]);
  useEffect(() => {
    const flush = () => {
      if (latestScroll.current !== null) {
        const y = latestScroll.current;
        latestScroll.current = null;
        update((value) => ({ ...value, scrollY: y }));
      }
    };
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') flush(); });
    return () => {
      subscription.remove();
      if (timer.current) clearTimeout(timer.current);
      if (latestScroll.current !== null && latestPosition.current) {
        const saved = { ...latestPosition.current, scrollY: latestScroll.current };
        writes.current = writes.current.then(() => contentStorage.setItem(KEY, JSON.stringify(saved))).catch(() => {});
      }
      latestScroll.current = null;
    };
  }, [KEY, update]);
  const move = useCallback((next: ReadingPosition, preserveScroll = false) => {
    const y = takeScroll(timer, latestScroll);
    if (preserveScroll && y !== null) next = { ...next, scrollY: y };
    update(() => next);
  }, [update]);
  /**
   * Stable: select an ayah on the current page, keeping the latest scroll
   * offset. Unlike move({ ...position, ayah }), callers need not depend on position.
   */
  const selectAyah = useCallback((ayah: AyahReference) => {
    const y = takeScroll(timer, latestScroll);
    update((value) => withSelectedAyah(value, ayah, y ?? undefined));
  }, [update]);
  /** Stable: record a scroll offset immediately (no debounce). */
  const setScroll = useCallback((scrollY: number) => {
    takeScroll(timer, latestScroll);
    const y = Math.max(0, scrollY);
    update((value) => value.scrollY === y ? value : { ...value, scrollY: y });
  }, [update]);
  const recordScroll = useCallback((y: number) => {
    latestScroll.current = Math.max(0, y);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const scrollY = latestScroll.current;
      latestScroll.current = null;
      if (scrollY !== null) update((value) => value.scrollY === scrollY ? value : { ...value, scrollY });
    }, 250);
  }, [update]);
  return { position, ready, move, selectAyah, setScroll, update, recordScroll };
}
