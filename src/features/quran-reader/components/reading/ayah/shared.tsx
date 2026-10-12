import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text as NativeText, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { khatam, Niche } from '@/components/craft/art';
import { GhostLines } from '@/components/craft/lawh';
import { Button } from '@/components/ui';
import { watchLink } from '@/lib/quranpedia/ayah-services';
import { rtlTextAlignment } from '@/lib/ui-text-alignment';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { t } from '@/i18n';
import { readerShape, withAlpha } from '../../../design';
import type { ReaderPalette } from '../../../theme';
import { ayahKey } from '../../../utils/references';
import { ReaderIcon, type ReaderIconName } from '../../ui/reader-icon';
import { hafsNumbers } from './sciences';

/** What a science view needs from the sheet: the ayah, the palette, and the way to another ayah. */
export interface ScienceProps {
  ayah: Ayah;
  quran: Quran;
  palette: ReaderPalette;
  /** Opens another ayah of the mushaf (closing the sheet); absent where the reading is bounded. */
  onOpenAyah?: (ayah: Ayah) => void;
}

/**
 * A view's own step back (a list of books open over the text) answers the sheet's back first:
 * the view sets it while it has one, and clears it after.
 */
export const InnerBack = createContext<(back: (() => void) | null) => void>(() => {});
export function useInnerBack(back: (() => void) | null) {
  const set = useContext(InnerBack);
  useEffect(() => { set(back); return () => set(null); }, [set, back]);
}

export interface Loaded<T> { status: 'loading' | 'error' | 'ready'; data: T | null; stale: boolean; retry: () => void }

/**
 * Runs a request identified by `key` (null: none yet) and keeps its answer for that key only, so
 * a late answer never shows under another ayah, book or language.
 */
export function useRequest<T>(key: string | null, run: () => Promise<{ data: T; stale: boolean }>): Loaded<T> {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; stale: boolean; error: boolean } | null>(null);
  const current = key === null ? null : `${key}#${revision}`;
  useEffect(() => {
    if (current === null) return;
    let active = true;
    run().then((answer) => { if (active) setResult({ key: current, data: answer.data, stale: answer.stale, error: false }); })
      .catch(() => { if (active) setResult({ key: current, data: null, stale: false, error: true }); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the request is named by its key
  }, [current]);
  const mine = result && result.key === current ? result : null;
  return { status: !mine ? 'loading' : mine.error ? 'error' : 'ready', data: mine?.data ?? null, stale: !!mine?.stale, retry: () => setRevision((value) => value + 1) };
}

/**
 * A service's answer for the ayah: asked for each Hafs number it spans and merged in order, an
 * entry with the same id kept once.
 */
export function useAyahService<T>(ayah: Ayah, name: string, load: (surah: number, hafs: number) => Promise<{ data: T[]; stale: boolean }>): Loaded<T[]> {
  return useRequest(`${name}:${ayahKey(ayah)}`, async () => {
    const answers = await settled(hafsNumbers(ayah).map((hafs) => load(ayah.surahNumber, hafs)));
    const seen = new Set<unknown>();
    const data = answers.flatMap((answer) => answer.data).filter((item) => {
      const id = (item as { id?: unknown }).id;
      if (id === undefined) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return { data, stale: answers.some((answer) => answer.stale) };
  });
}

/**
 * The answers for the Hafs ayahs an ayah spans, those that came: a source may have content for
 * one of them only. Fails only when none came.
 */
export async function settled<T>(requests: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(requests);
  const answers = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (!answers.length && results.length) throw (results[0] as PromiseRejectedResult).reason;
  return answers;
}

/** Waiting (dotted lines where the text will be), failed (and a way to try again), or empty. */
export function Status({ loaded, empty, palette: p }: { loaded: Loaded<unknown>; empty: boolean; palette: ReaderPalette }) {
  if (loaded.status === 'loading') return <View accessible accessibilityRole="progressbar" accessibilityLabel={t('reader.related.loading')} style={{ paddingVertical: 8 }}>
    <GhostLines lines={4} palette={p} />
  </View>;
  if (loaded.status === 'error') return <View style={s.status}>
    <Text accessibilityRole="alert" style={[s.statusText, { color: p.destructive }]}>{t('reader.related.loadError')}</Text>
    <Button variant="outline" icon="restore" palette={p} onPress={loaded.retry}>{t('common.retry')}</Button>
  </View>;
  if (empty) return <View style={s.status}>
    <Niche palette={p} motif="khatam" w={52} h={64}><ReaderIcon name="book" color={p.ornament} size={18} /></Niche>
    <Text style={[s.statusText, { color: p.mutedForeground }]}>{t('reader.related.empty')}</Text>
  </View>;
  return null;
}

/** The note under content kept on the phone, shown while offline. */
export function StaleNote({ palette: p }: { palette: ReaderPalette }) {
  return <View style={s.stale}>
    <ReaderIcon name="clock" color={p.mutedForeground} size={13} />
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('reader.related.stale')}</Text>
  </View>;
}

/** The reading edge of a right-to-left paragraph in a plain Text (Android reads `right` as the far edge). */
export const RIGHT = rtlTextAlignment('right', Platform.OS);

/** Paragraphs of Arabic prose in Naskh (or of a translation, in its own direction). */
export function Prose({ text, palette: p, direction = 'rtl', size = 18, style }: { text: string; palette: ReaderPalette; direction?: 'rtl' | 'ltr'; size?: number; style?: StyleProp<TextStyle> }) {
  const paragraphs = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  return <View style={{ gap: 10 }}>
    {paragraphs.map((paragraph, i) => direction === 'rtl'
      ? <NativeText key={i} selectable style={[{ color: p.foreground, fontSize: size, lineHeight: Math.round(size * 1.85), fontFamily: 'ReaderNaskh', writingDirection: 'rtl', textAlign: RIGHT }, style]}>{paragraph}</NativeText>
      : <NativeText key={i} selectable style={[{ color: p.foreground, fontSize: size - 2, lineHeight: Math.round((size - 2) * 1.6), writingDirection: 'ltr', textAlign: 'left' }, style]}>{paragraph}</NativeText>)}
  </View>;
}

/**
 * Long prose shown in part, with a way to read the rest (`limit` characters: the cut falls at
 * the end of a word).
 */
export function LongProse({ text, limit = 420, palette: p, size, direction }: { text: string; limit?: number; palette: ReaderPalette; size?: number; direction?: 'rtl' | 'ltr' }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit * 1.25;
  const shown = !long || open ? text : `${text.slice(0, text.lastIndexOf(' ', limit) > limit * 0.6 ? text.lastIndexOf(' ', limit) : limit).trim()}…`;
  return <View style={{ gap: 6 }}>
    <Prose text={shown} palette={p} size={size} direction={direction} />
    {long && <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} hitSlop={6} style={({ pressed }) => [s.more, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={{ color: p.primary, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{open ? t('reader.sciences.less') : t('reader.sciences.more')}</Text>
      <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron-down" color={p.primary} size={14} /></View>
    </Pressable>}
  </View>;
}

/** A small eight-pointed star, the mark of an entry in a list or a node on a thread. */
export function Star({ size = 12, palette: p, filled = false, color }: { size?: number; palette: ReaderPalette; filled?: boolean; color?: string }) {
  const c = size / 2, tone = color ?? p.ornament;
  return <Svg width={size} height={size} aria-hidden>
    <Path d={khatam(c, c, size * 0.3)} fill={filled ? tone : withAlpha(tone, 0.12)} stroke={tone} strokeWidth={1} strokeLinejoin="round" />
  </Svg>;
}

/** A rounded word to press: a choice among a few (`selected`), a link, a sound. */
export function Pill({ label, accessibilityLabel, hint, icon, selected = false, accent = false, radio = false, onPress, palette: p, style }: {
  label: string; accessibilityLabel?: string; hint?: string; icon?: ReaderIconName; selected?: boolean;
  /** One of a group of choices (in a radiogroup). */
  radio?: boolean;
  /** Ringed in gold: the reader's own (riwayah, ayah). */
  accent?: boolean; onPress?: () => void; palette: ReaderPalette; style?: StyleProp<ViewStyle>;
}) {
  const body = <>
    {icon && <ReaderIcon name={icon} color={selected ? p.primaryForeground : accent ? p.ornament : p.mutedForeground} size={14} />}
    <Text numberOfLines={1} style={{ flexShrink: 1, color: selected ? p.primaryForeground : p.foreground, fontSize: 13, lineHeight: 20, fontWeight: selected || accent ? '600' : '500' }}>{label}</Text>
  </>;
  const look = { borderColor: selected ? p.primary : accent ? withAlpha(p.ornament, 0.8) : p.border, backgroundColor: selected ? p.primary : accent ? withAlpha(p.ornament, 0.12) : p.background };
  if (!onPress) return <View style={[s.pill, look, style]}>{body}</View>;
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={hint} accessibilityState={radio ? { checked: selected } : { selected }}
    aria-checked={radio ? selected : undefined} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.pill, look, pressed && !selected && { backgroundColor: p.accent }, style]}>{body}</Pressable>;
}

/** A heading inside a view: Naskh, with a short gold rule after it. */
export function Heading({ children, palette: p, size = 17 }: { children: ReactNode; palette: ReaderPalette; size?: number }) {
  return <View style={s.heading}>
    <Text accessibilityRole="header" style={{ flexShrink: 1, color: p.foreground, fontSize: size, lineHeight: Math.round(size * 1.7), fontFamily: 'ReaderNaskhBold' }}>{children}</Text>
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(p.ornament, 0.45) }} />
  </View>;
}

/** Opens a link outside the app; a video at its watch page. */
export function openLink(url: string) {
  void Linking.openURL(watchLink(url)).catch(() => {});
}

const s = StyleSheet.create({
  status: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  statusText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  stale: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: readerShape.pill, borderWidth: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
