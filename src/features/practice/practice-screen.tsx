import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { useEmbedded } from '@/components/embedded';
import { HorizontalControl } from '@/components/swipe-tabs';
import { Alert, Button, Tabs } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { calligraphyStyle, surahNameGlyph } from '@/features/quran-reader/utils/reader-typography';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import { usePlans } from '@/features/plans/provider';
import { memoryFor, spanCount } from '@/features/plans/memorization';
import { shortDate } from '@/features/plans/presentation';
import type { PlanIndex } from '@/features/plans/engine';
import type { AyahSpan } from '@/features/plans/types';
import { formatList, t } from '@/i18n';
import { ayahOf, chooseExam, choosePlaces, CUE_MODES, EXAM_COUNTS, EXAM_KINDS, examScore, PLACE_COUNTS, placesAt, REACHES, recites, surahQuestionFits, type CueMode, type PracticeOptions } from './engine';
import { scopeLabel, usePracticeContent } from './content';
import { MAX_PICKS, placesToReview, placeWeight, type ExamResult, type PracticePick, type PracticeSettings } from './progress';
import { usePractice, useRiwayahPractice } from './provider';
import { gradeTone, placeLabel, useOpenInMushaf } from './session-screen';
import { Lawh } from '@/components/craft/lawh';
import { PageBar, PageTitle, Section } from '@/components/craft/page';
import { ModeDiagram } from './mode-diagram';
import { ArchTile, artColors, Emblem } from '@/components/craft/art';
import { presetsFor, type Motif, type Preset } from './presets';
import { PickEditor } from './pick-editor';

const isRiwayah = (value: unknown): value is Riwayah => typeof value === 'string' && Object.prototype.hasOwnProperty.call(RIWAYAT, value);
/** Places to review taken into one session. */
const REVIEW_LIMIT = 20;
/** Where a start was asked from, so a message about it shows there. */
type From = 'presets' | 'picks' | 'review';

/**
 * Choosing a tasmee'. On the lawh at the top, how it goes: a tasmee' (the kind of question, how
 * far to recite, how many places) or «اختبار الحفظ» (how many questions). Below, what to recite,
 * each started with a tap: portions offered ready («مقترح لك»), the selections one has saved
 * («مختاراتك»), and the places that need review.
 */
export function PracticeScreen() {
  const params = useLocalSearchParams<{ riwayah?: string; scope?: string }>();
  const { palette: p, preferences } = useReadingPreferences();
  const embedded = useEmbedded();
  const riwayah = isRiwayah(params.riwayah) ? params.riwayah : preferences.riwayah;
  const { state, ready, error: storageError, setSettings, savePick, deletePick, begin } = usePractice();
  const record = useRiwayahPractice(riwayah);
  const { memorization, plans, today } = usePlans();
  const { index, error, retry } = usePracticeContent(riwayah);
  const { loaded: fontsLoaded } = useQuranFont(riwayah);
  const settings = state.settings;
  // A goal's «سمّع محفوظك» opens on one's own memorized portions, recited (not the exam).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !ready) return;
    opened.current = true;
    if (params.scope === 'memorized' && (settings.helper || settings.exam)) setSettings({ ...settings, helper: false, exam: false });
  }, [ready, params.scope, settings, setSettings]);
  const [editing, setEditing] = useState<PracticePick | 'new' | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ from: From; text: string } | null>(null);
  let memorized: AyahSpan[] = [];
  if (index) { try { memorized = memoryFor(memorization, riwayah, index); } catch { memorized = []; } }
  // Listening to someone else: one's own record (memorized portions, places missed) says nothing of them.
  const helper = settings.helper;
  const picks = index && record.total === index.ayahs.length ? record.picks : [];
  const review = helper ? [] : placesToReview(record);
  const presets = index ? presetsFor({ index, memorized, plans, riwayah, review: review.length, helper, today }) : [];
  const options: PracticeOptions = { cue: settings.cue, reach: settings.reach, count: settings.count };
  const change = (value: Partial<PracticeSettings>) => { setMessage(null); setSettings({ ...settings, ...value }); };

  // One's own record favours what one missed; it says nothing of someone else.
  const weight = (i: PlanIndex) => helper ? () => 1 : (ayah: number) => placeWeight(record.places[`${i.ayahs[ayah].surahNumber}:${i.ayahs[ayah].ayahNumber}`], record.sessions);
  const run = (id: string, from: From, pick: (index: PlanIndex) => ReturnType<typeof choosePlaces>, exam: boolean) => {
    if (!index || preparing) return;
    setMessage(null);
    setPreparing(id);
    // Let the card show it is preparing: a large portion takes a moment to search for repeated openings.
    setTimeout(() => {
      const places = pick(index);
      setPreparing(null);
      if (!places.length) { setMessage({ from, text: t('practice.noPlaces') }); return; }
      begin(riwayah, exam ? { ...options, reach: 'ayah', count: places.length } : options, places, index.ayahs.length, { exam, helper });
      router.push('/practice/session');
    }, 30);
  };
  const start = (id: string, from: From, ranges: AyahSpan[]) => {
    if (!index) return;
    // The surah question needs a few surahs to choose among.
    if (!settings.exam && settings.cue === 'surah' && !surahQuestionFits(index, ranges)) { setMessage({ from, text: t('practice.cue.surahScopeStart') }); return; }
    run(id, from, (i) => settings.exam ? chooseExam(i, ranges, settings.examCount, weight(i)) : choosePlaces(i, ranges, options, weight(i)), settings.exam);
  };
  // Places to review were missed in recitation: they are recited again, not asked about.
  const startReview = (from: From) => run('review', from, (i) => placesAt(i, review.slice(0, REVIEW_LIMIT).map(({ key }) => ayahOf(i, key)), { ...options, cue: recites(settings.cue) ? settings.cue : 'complete' }), false);
  const notice = (from: From) => message?.from === from ? <Alert variant="destructive" palette={p}>{message.text}</Alert> : null;

  const Frame = embedded ? View : SafeAreaView;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar title={t('practice.title')} back={{ label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.dismissTo('/') }} palette={p} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, embedded && { paddingTop: 16 }]}>
      {!embedded && <PageTitle palette={p} />}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('practice.helper.title')}</Text>
          <View style={{ flex: 1 }}>
            <Tabs role="radio" palette={p} label={t('practice.helper.title')} value={helper ? 'other' : 'self'} onChange={(value) => change({ helper: value === 'other' })}
              options={[{ value: 'self', label: t('practice.helper.self'), icon: 'practice' }, { value: 'other', label: t('practice.helper.other'), icon: 'headphones' }] as const} />
          </View>
        </View>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{helper ? t('practice.helper.otherDetail') : t('practice.helper.selfDetail')}</Text>
      </View>
      {storageError && <Alert variant="destructive" palette={p}>{t('practice.storageError')}</Alert>}
      {error && <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>}
      {!index ? !error && <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
        <SessionBoard settings={settings} helper={helper} exams={helper ? [] : record.exams} palette={p} onChange={change} />

        <Section title={t('practice.presets.title')} detail={t('practice.riwayah', { riwayah: RIWAYAT[riwayah].label })} palette={p}>
          {notice('presets')}
          <Presets presets={presets} index={index} review={review.length} exam={settings.exam} helper={helper} calligraphy={fontsLoaded}
            preparing={preparing} palette={p} onStart={(preset) => preset.kind === 'review' ? startReview('presets') : start(preset.id, 'presets', preset.ranges)} />
        </Section>

        <Section title={t('practice.picks.title')} detail={picks.length ? t('practice.picks.count', { count: picks.length }) : undefined} palette={p}>
          {notice('picks')}
          <View style={{ gap: 10 }}>
            {picks.map((pick) => <PickRow key={pick.id} pick={pick} index={index} exam={settings.exam} helper={helper} preparing={preparing === pick.id} disabled={!!preparing}
              palette={p} onStart={() => start(pick.id, 'picks', pick.ranges)} onEdit={() => setEditing(pick)} />)}
            <NewPick full={picks.length >= MAX_PICKS} first={!picks.length} palette={p} onPress={() => setEditing('new')} />
          </View>
        </Section>

        {!!review.length && <ReviewList index={index} riwayah={riwayah} review={review} palette={p} disabled={!!preparing}
          notice={notice('review')} onStart={() => startReview('review')} />}
      </>}
    </ScrollView>
    {editing && index && <PickEditor index={index} pick={editing === 'new' ? null : editing} memorized={memorized} helper={helper} used={picks.map((x) => x.emblem)} palette={p}
      onClose={() => setEditing(null)}
      onSave={(pick) => { savePick(riwayah, pick, index.ayahs.length); setEditing(null); }}
      onDelete={(id) => { deletePick(riwayah, id); setEditing(null); }} />}
  </Frame>;
}

/**
 * The lawh: how the session goes. Two words written at its head choose a tasmee' or the exam;
 * under them, the tasmee's kind of question (each drawn as what it shows and hides), how far to
 * recite and how many places; or the exam's questions, and its latest results.
 */
function SessionBoard({ settings, helper, exams, palette: p, onChange }: {
  settings: PracticeSettings; helper: boolean; exams: ExamResult[]; palette: ReaderPalette; onChange: (value: Partial<PracticeSettings>) => void;
}) {
  const exam = settings.exam;
  return <Lawh palette={p} contentStyle={{ gap: 16, paddingTop: 44 }}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('practice.board.typeLabel')} style={s.types}>
      {([false, true] as const).map((value) => {
        const on = value === exam;
        const title = value ? t('practice.exam.title') : t('practice.board.tasmee');
        return <Pressable key={String(value)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={title}
          onPress={() => onChange({ exam: value })} hitSlop={6} style={({ pressed }) => [s.type, { opacity: pressed && !on ? 0.7 : 1 }]}>
          <Text style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 22, lineHeight: 40, fontFamily: on ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold', textAlign: 'center' }}>{title}</Text>
          <Stroke on={on} palette={p} />
        </Pressable>;
      })}
    </View>
    {exam ? <ExamPart exams={exams} helper={helper} count={settings.examCount} palette={p} onCount={(examCount) => onChange({ examCount })} />
      : <TasmeePart settings={settings} helper={helper} palette={p} onChange={onChange} />}
    <View style={s.then}>
      <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{helper ? t('practice.board.thenHelper') : t('practice.board.then')}</Text>
      <View style={{ transform: [{ rotate: '-90deg' }] }}><ReaderIcon name="chevron" color={p.mutedForeground} size={14} /></View>
    </View>
  </Lawh>;
}

/** A brushed stroke under the chosen word, as a teacher underlines on the lawh. */
function Stroke({ on, palette: p }: { on: boolean; palette: ReaderPalette }) {
  return <Svg width={64} height={8} aria-hidden>
    {on && <Path d="M 4 5 C 18 2.5 40 2 60 4.2" stroke={p.ornament} strokeWidth={3} strokeLinecap="round" fill="none" />}
  </Svg>;
}

function BoardLabel({ children, palette: p }: { children: string; palette: ReaderPalette }) {
  return <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{children}</Text>;
}

function TasmeePart({ settings, helper, palette: p, onChange }: { settings: PracticeSettings; helper: boolean; palette: ReaderPalette; onChange: (value: Partial<PracticeSettings>) => void }) {
  const cue = settings.cue;
  const detail = (mode: CueMode) => helper ? t(`practice.helper.cue.${mode}Detail`) : t(`practice.cue.${mode}Detail`);
  return <>
    <View style={{ gap: 10 }}>
      <BoardLabel palette={p}>{t('practice.cue.title')}</BoardLabel>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('practice.cue.title')} style={s.kinds}>
        {CUE_MODES.map((mode) => {
          const on = mode === cue;
          return <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t(`practice.cue.${mode}`)}
            accessibilityHint={mode === 'surah' ? `${detail(mode)}. ${t('practice.cue.surahScope')}` : detail(mode)} onPress={() => onChange({ cue: mode })}
            style={({ pressed }) => [s.kind, { backgroundColor: on ? withAlpha(p.ornament, 0.12) : pressed ? withAlpha(p.foreground, 0.05) : 'transparent', borderColor: on ? withAlpha(p.ornament, 0.6) : 'transparent' }]}>
            <ModeDiagram mode={mode} palette={p} active={on} width={54} />
            <Text numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 12, fontWeight: on ? '600' : '400', textAlign: 'center' }}>{t(`practice.cue.${mode}`)}</Text>
          </Pressable>;
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
        {detail(cue)}{cue === 'surah' ? ` (${t('practice.cue.surahScope')})` : ''}
      </Text>
    </View>
    {recites(cue) && <View style={{ gap: 8 }}>
      <BoardLabel palette={p}>{helper ? t('practice.helper.reach') : t('practice.reach.title')}</BoardLabel>
      <Tabs role="radio" palette={p} label={t('practice.reach.title')} value={settings.reach} onChange={(reach) => onChange({ reach })}
        options={REACHES.map((value) => ({ value, label: t(`practice.reach.${value}`) }))} />
    </View>}
    <View style={{ gap: 8 }}>
      <BoardLabel palette={p}>{t('practice.count.title')}</BoardLabel>
      <Tabs role="radio" palette={p} label={t('practice.count.title')} value={String(settings.count)} onChange={(count) => onChange({ count: Number(count) })}
        options={PLACE_COUNTS.map((value) => ({ value: String(value), label: t('practice.count.label', { count: value }) }))} />
    </View>
  </>;
}

/** Results kept on the board: the latest as bars, the last one darker. */
const HISTORY = 8;

function ExamPart({ exams, helper, count, palette: p, onCount }: { exams: ExamResult[]; helper: boolean; count: number; palette: ReaderPalette; onCount: (count: number) => void }) {
  const latest = exams.slice(-HISTORY);
  const last = latest[latest.length - 1];
  const score = last && examScore(last, last.total);
  return <>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', alignSelf: 'center', maxWidth: 260 }}>{helper ? t('practice.helper.examDescription') : t('practice.exam.description')}</Text>
    {last && score ? <View style={{ alignItems: 'center', gap: 8 }}>
      <View accessible accessibilityLabel={t('practice.exam.historyLabel', { count: latest.length })} style={[s.history, { borderColor: withAlpha(p.ornament, 0.45) }]}>
        {latest.map((exam, i) => {
          const share = examScore(exam, exam.total).share;
          return <View key={i} style={[s.bar, { height: 6 + share * 42, backgroundColor: i === latest.length - 1 ? p.ornament : withAlpha(p.ornament, 0.38) }]} />;
        })}
      </View>
      <Text style={{ color: p.foreground, fontSize: 13, textAlign: 'center' }}>
        {t('practice.exam.last', { points: score.points, total: last.total, grade: t(`practice.exam.grades.${score.grade}`) })}
      </Text>
    </View> : <View style={s.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
      {EXAM_KINDS.map((kind) => <View key={kind} style={{ alignItems: 'center', gap: 4 }}>
        <ModeDiagram mode={kind} palette={p} active width={54} />
        <Text style={{ color: p.mutedForeground, fontSize: 11 }}>{t(`practice.cue.${kind}`)}</Text>
      </View>)}
    </View>}
    <View style={{ gap: 8 }}>
      <BoardLabel palette={p}>{t('practice.exam.countLabel')}</BoardLabel>
      <Tabs role="radio" palette={p} label={t('practice.exam.countLabel')} value={String(count)} onChange={(value) => onCount(Number(value))}
        options={EXAM_COUNTS.map((value) => ({ value: String(value), label: t('practice.exam.questions', { count: value }) }))} />
    </View>
  </>;
}

/** What a start says on a card: a tasmee', the exam, or (listening to someone else) just «ابدأ». */
const action = (exam: boolean, helper: boolean) => exam ? t('practice.presets.exam') : helper ? t('practice.presets.begin') : t('practice.presets.recite');

/** The portions offered ready, as arched cards in a row that scrolls across. */
function Presets({ presets, index, review, exam, helper, calligraphy, preparing, palette: p, onStart }: {
  presets: Preset[]; index: PlanIndex; review: number; exam: boolean; helper: boolean; calligraphy: boolean; preparing: string | null; palette: ReaderPalette; onStart: (preset: Preset) => void;
}) {
  const { width } = useWindowDimensions();
  const card = Math.round(Math.min(184, Math.min(width, readerLayout.maxWidth) * 0.46));
  return <HorizontalControl><ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={card + 12} decelerationRate="fast"
    style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
    {presets.map((preset) => <PresetCard key={preset.id} preset={preset} index={index} review={review} width={card} exam={exam} helper={helper} calligraphy={calligraphy}
      preparing={preparing === preset.id} disabled={!!preparing} palette={p} onPress={() => onStart(preset)} />)}
  </ScrollView></HorizontalControl>;
}

function presetText(preset: Preset, index: PlanIndex, review: number) {
  const ayahs = t('practice.scope.ayahs', { count: spanCount(preset.ranges) });
  switch (preset.kind) {
    case 'review': return { title: t('practice.presets.review'), detail: t('practice.presets.reviewDetail', { count: review }) };
    case 'memorized': return { title: t('practice.presets.memorized'), detail: ayahs };
    case 'recent': return { title: t('practice.presets.recent'), detail: scopeLabel(index, preset.ranges) };
    case 'old': return { title: t('practice.presets.old'), detail: scopeLabel(index, preset.ranges) };
    case 'juz': {
      const surahs = new Set(index.ayahs.slice(preset.ranges[0].start, preset.ranges[0].end).map((a) => a.surahNumber)).size;
      return { title: preset.number === 30 ? t('practice.presets.juz30') : t('practice.presets.juz29'), detail: `${t('practice.scope.juz', { juz: preset.number! })} · ${t('practice.presets.surahs', { count: surahs })}` };
    }
    default: return { title: index.surahNames[preset.number!] ?? '', detail: ayahs };
  }
}

function PresetCard({ preset, index, review, width, exam, helper, calligraphy, preparing, disabled, palette: p, onPress }: {
  preset: Preset; index: PlanIndex; review: number; width: number; exam: boolean; helper: boolean; calligraphy: boolean; preparing: boolean; disabled: boolean; palette: ReaderPalette; onPress: () => void;
}) {
  const height = Math.round(width * 1.42), rise = Math.round(width * 0.5);
  const colors = artColors(p);
  const { title, detail } = presetText(preset, index, review);
  // The review recites its own places, whatever the board says.
  const verb = preset.kind === 'review' ? t('practice.presets.reviewStart') : action(exam, helper);
  // The figure in the arch: the juz' number or the places waiting on a medallion, the surah's
  // name in calligraphy in a surah title's frame; the other portions are their pattern alone.
  const focus = Math.round(rise * 0.74 + 8), medallion = Math.round(width * 0.2);
  const number = preset.kind === 'juz' ? preset.number! : preset.kind === 'review' ? review : null;
  const surah = preset.kind === 'surah' && calligraphy;
  const frame = { width: Math.round(width * 0.8), height: 46 };
  return <Pressable accessibilityRole="button" accessibilityLabel={t('practice.presets.label', { action: verb, title, detail })} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ width, height, opacity: disabled && !preparing ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    <ArchTile w={width} h={height} rise={rise} motif={preset.motif} palette={p} focus={focus} medallion={number !== null ? medallion : undefined} cartouche={surah ? frame : undefined} />
    {number !== null && <View style={[s.figure, { top: focus - medallion, height: medallion * 2 }]}>
      <Text style={{ color: p.ornament, fontSize: number > 99 ? 24 : 32, lineHeight: medallion * 2, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{surahNameGlyph(number)}</Text>
    </View>}
    {surah && <View style={[s.figure, { top: focus - frame.height / 2, height: frame.height }]}>
      <Text style={[calligraphyStyle(Math.round(frame.height * 0.78)), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(preset.number!)}</Text>
    </View>}
    <View style={[StyleSheet.absoluteFill, s.cardBody]}>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: colors.soft, fontSize: 12, lineHeight: 18 }}>{detail}</Text>
        <View style={[s.pill, { borderColor: colors.edge }]}>
          {preparing ? <ActivityIndicator size="small" color={colors.ink} /> : <ReaderIcon name="play" color={colors.ink} size={13} />}
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{preparing ? t('practice.presets.preparing') : verb}</Text>
        </View>
      </View>
    </View>
  </Pressable>;
}

const motifs: Motif[] = ['khatam', 'lattice', 'rosette', 'arches', 'crescent', 'ripple'];

/** A saved selection: its mark on a small arch, its name and what it holds; a tap starts it. */
function PickRow({ pick, index, exam, helper, preparing, disabled, palette: p, onStart, onEdit }: {
  pick: PracticePick; index: PlanIndex; exam: boolean; helper: boolean; preparing: boolean; disabled: boolean; palette: ReaderPalette; onStart: () => void; onEdit: () => void;
}) {
  const colors = artColors(p);
  const label = scopeLabel(index, pick.ranges);
  const name = pick.name || label;
  const motif = motifs[[...pick.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % motifs.length];
  return <View style={[s.pick, { backgroundColor: p.card, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('practice.picks.startLabel', { action: action(exam, helper), name })} accessibilityHint={pick.name ? label : undefined}
      disabled={disabled} onPress={onStart} onLongPress={onEdit} style={({ pressed }) => [s.pickMain, { opacity: pressed ? 0.75 : disabled && !preparing ? 0.6 : 1 }]}>
      <View style={{ width: 46, height: 56 }}>
        <ArchTile w={46} h={56} rise={22} motif={motif} palette={p} faded={0.9} />
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: 10 }]}><Emblem name={pick.emblem} size={22} color={colors.ink} /></View>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{name}</Text>
        <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12 }}>
          {pick.name ? `${label} · ${t('practice.scope.ayahs', { count: spanCount(pick.ranges) })}` : t('practice.scope.ayahs', { count: spanCount(pick.ranges) })}
        </Text>
      </View>
      <View style={[s.play, { backgroundColor: p.primary }]}>
        {preparing ? <ActivityIndicator size="small" color={p.primaryForeground} /> : <ReaderIcon name="play" color={p.primaryForeground} size={16} />}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t('practice.picks.editLabel', { name })} onPress={onEdit} hitSlop={6}
      style={({ pressed }) => [s.edit, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <ReaderIcon name="pencil" color={p.mutedForeground} size={17} />
    </Pressable>
  </View>;
}

/** A new selection: a dashed outline waiting to be filled. */
function NewPick({ full, first, palette: p, onPress }: { full: boolean; first: boolean; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={t('practice.picks.new')} accessibilityHint={full ? t('practice.picks.full') : t('practice.picks.newDetail')} disabled={full} onPress={onPress}
    style={({ pressed }) => [s.newPick, { borderColor: withAlpha(p.ornament, 0.7), backgroundColor: pressed ? withAlpha(p.ornament, 0.08) : 'transparent', opacity: full ? 0.6 : 1 }]}>
    <View style={[s.plus, { backgroundColor: withAlpha(p.ornament, 0.16) }]}><ReaderIcon name="plus" color={p.ornament} size={20} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('practice.picks.new')}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{full ? t('practice.picks.full') : first ? t('practice.picks.firstDetail') : t('practice.picks.newDetail')}</Text>
    </View>
  </Pressable>;
}

/** The places last missed or hesitated over, to open in the mushaf, or to recite again. */
function ReviewList({ index, riwayah, review, palette: p, disabled, notice, onStart }: {
  index: PlanIndex; riwayah: Riwayah; review: ReturnType<typeof placesToReview>; palette: ReaderPalette; disabled: boolean; notice: ReactNode; onStart: () => void;
}) {
  const open = useOpenInMushaf(riwayah);
  const shown = review.slice(0, 5).map((item) => ({ ...item, ayah: ayahOf(index, item.key) })).filter((item) => item.ayah >= 0);
  const more = review.length - shown.length;
  return <Section title={t('practice.review.title')} palette={p}>
    <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('practice.review.description')}</Text>
    {notice}
    <View>
      {shown.map(({ key, stat, ayah }, i) => {
        const label = placeLabel(index, ayah);
        const last = t(stat.last === 'wrong' ? 'practice.review.wrong' : 'practice.review.hesitant', { date: shortDate(stat.date) });
        return <Pressable key={key} accessibilityRole="link" accessibilityLabel={formatList([label, last])} accessibilityHint={t('practice.session.open')}
          onPress={() => open(index, ayah)}
          style={({ pressed }) => [s.place, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
          <View style={[s.grade, { backgroundColor: withAlpha(gradeTone(stat.last, p), 0.14) }]}><ReaderIcon name={stat.last === 'wrong' ? 'wrong' : 'alert'} color={gradeTone(stat.last, p)} size={16} /></View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: p.foreground, fontSize: 15 }}>{label}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{last}</Text>
          </View>
          <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
        </Pressable>;
      })}
    </View>
    {more > 0 && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.review.more', { count: more })}</Text>}
    <Button variant="outline" palette={p} icon="restore" block disabled={disabled} onPress={onStart}>{t('practice.review.start')}</Button>
  </Section>;
}

const s = StyleSheet.create({
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 26 },
  types: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  type: { alignItems: 'center' },
  kinds: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  kind: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: readerShape.lg, borderWidth: 1 },
  then: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 },
  history: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 50, paddingHorizontal: 6, borderBottomWidth: 1.5 },
  bar: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, height: 30, borderRadius: readerShape.pill, borderWidth: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: readerShape.card, paddingEnd: 6 },
  pickMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingStart: 12, paddingEnd: 6 },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  edit: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  newPick: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: readerShape.card, paddingVertical: 14, paddingHorizontal: 14 },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  place: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, minHeight: 60 },
  grade: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
