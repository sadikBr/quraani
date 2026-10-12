import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ArabicText } from '@/components/arabic-text';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { withAlpha } from '@/features/quran-reader/design';
import { TajweedSurface } from '@/features/quran-reader/components/reading/tajweed-surface';
import { useTajweedSurahs } from '@/features/quran-reader/hooks/use-tajweed';
import { loadedQuranDocumentFont, loadQuranDocumentFont } from '@/features/quran-reader/services/quran-document-font';
import { t } from '@/i18n';
import type { PracticePlace, PracticeSource } from './engine';
import { GhostLines } from '@/components/craft/lawh';
import { placeDocument, placeState } from './place-document';
import { placeView, type AyahView, type PlaceView } from './place-view';

/** The Quran text as the reader sets it: its font (in the letters chosen), size and spacing. */
export interface PlaceFont {
  fontFamily: string;
  /** The mushaf whose font draws the text (for the tajweed document). */
  fontMushafId: number;
  /** The text as that font draws it (see `quranScript`). */
  display: (text: string) => string;
  fontSize: number;
  lineHeight: number;
}

/**
 * The cue and what has been revealed, in the reader's font, size and spacing, and in the tajweed
 * colours when the reader shows them (`tajweed`). Ayahs shown to tell the cue apart sit beside
 * it, lighter, with a line saying why: above it, or below it in «ما قبلها», where what is
 * recited comes first. Hidden words are not drawn: the text grows as it is revealed, ending in
 * «…», or (`ghost`, an exam) dotted rules stand where the answer goes. See `placeView`.
 */
export function PlaceText({ source, place, revealed, markers, font, palette: p, background = p.card, ghost = false, marked = false, tajweed, onRecited }: {
  source: PracticeSource; place: PracticePlace; revealed: number; markers: boolean; font: PlaceFont; palette: ReaderPalette;
  /** The colour the text sits on (the card, or an exam's board). */
  background?: string;
  ghost?: boolean;
  marked?: boolean;
  /** The reader shows tajweed colours: those of `quran` (once loaded), on a dark or light page. */
  tajweed?: { quran: Quran | undefined; dark: boolean };
  /** «ما قبلها»: where the recited words end, from the top of this text, as they grow (above the cue, so a scroll can follow them). */
  onRecited?: (bottom: number) => void;
}) {
  const view = placeView(source, place, revealed, markers, marked);
  const previous = place.kind === 'previous';
  // The colours could not be drawn (their font or document failed): the plain text instead.
  const [failed, setFailed] = useState(false);
  const top = useRef(0), textTop = useRef(0), recitedEnd = useRef(0);
  const report = () => onRecited?.(top.current + textTop.current + recitedEnd.current);
  const onText = (bottom: number) => { recitedEnd.current = bottom; report(); };
  const why = (key: 'contextBefore' | 'contextAfter') => <ArabicText style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{t(`practice.session.${key}`)}</ArabicText>;
  return <View style={{ gap: 10 }} onLayout={(e) => { top.current = e.nativeEvent.layout.y; report(); }}>
    {view.before.length > 0 && why('contextBefore')}
    {ghost && previous && !view.shown && <GhostLines palette={p} />}
    <View onLayout={(e) => { textTop.current = e.nativeEvent.layout.y; report(); }}>
      {tajweed && !failed
        ? <TajweedPlace source={source} place={place} view={view} font={font} quran={tajweed.quran} dark={tajweed.dark} ghost={ghost} palette={p} background={background} onText={onText} onFail={() => setFailed(true)} />
        : <PlainPlace view={view} previous={previous} ghost={ghost} font={font} palette={p} onText={onText} />}
    </View>
    {ghost && !previous && view.more && <GhostLines palette={p} />}
    {view.after.length > 0 && why('contextAfter')}
  </View>;
}

/** The place as React Native text, each ayah's shown words in one run, so its letters join. */
function PlainPlace({ view, previous, ghost, font: { fontFamily, display, fontSize, lineHeight }, palette: p, onText }: {
  view: PlaceView; previous: boolean; ghost: boolean; font: PlaceFont; palette: ReaderPalette; onText: (bottom: number) => void;
}) {
  const quran = { fontFamily, fontSize, lineHeight, writingDirection: 'rtl' as const, textAlign: 'center' as const, fontWeight: '400' as const, includeFontPadding: true };
  const highlight = { backgroundColor: withAlpha(p.ornament, 0.2) };
  const ayahs = (list: AyahView[]) => list.map((a, i) => <Text key={i}>
    {a.marked > 0 && <Text style={highlight}>{display(a.words.slice(0, a.marked).join(''))}</Text>}
    {display(a.words.slice(a.marked, a.visible).join(''))}
    {a.visible === a.words.length && (a.marker ? <Text style={{ color: p.ornament }}>{`\u00A0${a.ayah.marker} `}</Text> : ' ')}
  </Text>);
  const context = (list: AyahView[]) => list.length > 0 && <Text accessibilityLabel={list.map((a) => a.ayah.text).join(' ')} style={[quran, { color: p.mutedForeground }]}>{ayahs(list)}</Text>;
  const ellipsis = <ArabicText style={{ color: p.mutedForeground, fontSize: Math.round(fontSize * 0.8) }}>{' …'}</ArabicText>;
  const text = <Text accessibilityLabel={view.label} style={[quran, { color: p.foreground }]}
    onLayout={previous ? (e) => onText(e.nativeEvent.layout.y + e.nativeEvent.layout.height) : undefined}>
    {ayahs(view.text)}{view.more && !ghost && ellipsis}
  </Text>;
  if (previous) return <View style={{ gap: 10 }}>
    {view.shown ? text : !ghost && <Text accessibilityLabel={t('practice.session.hidden')} style={[quran, { color: p.mutedForeground }]}>…</Text>}
    <Text accessibilityLabel={view.cue!.ayah.text} style={[quran, { color: p.foreground }]}>{ayahs([view.cue!])}</Text>
    {context(view.after)}
  </View>;
  return <View style={{ gap: 10 }}>{context(view.before)}{text}</View>;
}

/**
 * The place in the tajweed colours, in a web document as the reader draws them (see
 * `placeDocument`). It takes no touches: the page under it scrolls, and swipes to the next place.
 */
function TajweedPlace({ source, place, view, font, quran, dark, ghost, palette, background, onText, onFail }: {
  source: PracticeSource; place: PracticePlace; view: PlaceView; font: PlaceFont; quran: Quran | undefined; dark: boolean; ghost: boolean; palette: ReaderPalette; background: string;
  onText: (bottom: number) => void; onFail: () => void;
}) {
  const { fontMushafId, fontSize, lineHeight, display } = font;
  const surahs = [...view.before, ...view.text, ...view.cue ? [view.cue] : [], ...view.after].map((a) => a.ayah.surahNumber);
  const colours = useTajweedSurahs(surahs, quran, true);
  const [loaded, setLoaded] = useState<{ id: number; uri: string }>();
  const uri = loaded?.id === fontMushafId ? loaded.uri : loadedQuranDocumentFont(fontMushafId);
  const fail = useRef(onFail);
  useEffect(() => { fail.current = onFail; });
  useEffect(() => {
    let active = true;
    void loadQuranDocumentFont(fontMushafId).then((value) => { if (active) setLoaded({ id: fontMushafId, uri: value }); }).catch(() => { if (active) fail.current(); });
    return () => { active = false; };
  }, [fontMushafId]);
  // Built once for the place: revealing words changes only what `placeState` shows.
  const html = useMemo(() => uri ? placeDocument(placeView(source, place, 0, false, false), uri, fontSize, lineHeight, palette, background, display) : '',
    [source, place, uri, fontSize, lineHeight, palette, background, display]);
  const update = placeState(view, colours.data, dark, palette, ghost, display);
  const [height, setHeight] = useState(lineHeight * 2);
  if (!uri) return <View style={{ height: lineHeight * 2, justifyContent: 'center' }}><ActivityIndicator color={palette.mutedForeground} /></View>;
  return <View pointerEvents="none">
    <TajweedSurface key={fontMushafId} title={t('practice.session.textTitle')} pageNumber={source.ayahs[place.ayah].pageNumber} html={html} update={update} height={height}
      onError={onFail} onMessage={(raw) => {
        try {
          const message = JSON.parse(raw);
          if (message.source !== 'quranni-practice') return;
          if (message.type === 'layout' && Number.isFinite(message.height) && message.height > 0 && message.height < 100000) {
            setHeight(message.height);
            if (Number.isFinite(message.text) && message.text > 0) onText(message.text);
          } else if (message.type === 'error') onFail();
        } catch { /* Only layout and errors are read from the document. */ }
      }} />
  </View>;
}
