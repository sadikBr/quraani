import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { contentStorage } from '../storage/content-storage';
import type { ReaderContent } from '../types/reader';
import { restoreReadingPosition, type ReadingPosition } from '../utils/navigation';

import { RIWAYAT, readingPositionKey } from '../riwayat';
import { useReadingPreferences } from '../state/reading-preferences-provider';
export function useReadingPosition(content: ReaderContent | undefined) {
  const { preferences: { riwayah } } = useReadingPreferences();
  const mushafId = RIWAYAT[riwayah].mushafId;
  const KEY = readingPositionKey(mushafId);
  const [position, setPosition] = useState<ReadingPosition>({ mushafId, pageNumber: 1, ayah: null, scrollY: 0 });
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestScroll = useRef<number | null>(null);
  const latestPosition = useRef<ReadingPosition | null>(null);
  useEffect(() => {
    if (!content || ready) return;
    let active = true;
    contentStorage.getItem(KEY).catch(() => null).then((raw) => {
      if (active) { setPosition(restoreReadingPosition(raw, content)); setReady(true); }
    });
    return () => { active = false; };
  }, [content, ready, KEY]);
  useEffect(() => {
    latestPosition.current = ready ? position : null;
    if (ready) writes.current = writes.current.then(() => contentStorage.setItem(KEY, JSON.stringify(position))).catch(() => {});
  }, [position, ready, KEY]);
  useEffect(() => {
    const flush = () => {
      if (latestScroll.current !== null) {
        const y = latestScroll.current;
        latestScroll.current = null;
        setPosition((value) => ({ ...value, scrollY: y }));
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
    };
  }, [KEY]);
  const move = useCallback((next: ReadingPosition, preserveScroll = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (preserveScroll && latestScroll.current !== null) next = { ...next, scrollY: latestScroll.current };
    latestScroll.current = null;
    setPosition(next);
  }, []);
  const recordScroll = useCallback((y: number) => {
    latestScroll.current = Math.max(0, y);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const scrollY = latestScroll.current;
      latestScroll.current = null;
      if (scrollY !== null) setPosition((value) => value.scrollY === scrollY ? value : { ...value, scrollY });
    }, 250);
  }, []);
  return { position, ready, move, recordScroll };
}
