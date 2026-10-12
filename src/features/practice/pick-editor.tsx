import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button, Tabs } from '@/components/ui';
import { withAlpha } from '@/features/quran-reader/colors';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import type { PlanIndex } from '@/features/plans/engine';
import { spanCount } from '@/features/plans/memorization';
import { MemorizedSelectionSheet } from '@/features/plans/memorized-selection-sheet';
import type { AyahSpan } from '@/features/plans/types';
import { t } from '@/i18n';
import { Emblem } from '@/components/craft/art';
import { SheetTitle } from '@/components/craft/page';
import { scopeLabel } from './content';
import { DIAL_KINDS, dialUnits, initialFocus, toggleUnit, unitState, type DialKind, type DialUnit } from './dial';
import { EMBLEMS, MAX_PICK_NAME, type Emblem as EmblemName, type PracticePick } from './progress';
import { createFocusStore, RangeDial, useFocus, type FocusStore } from './range-dial';

const newId = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/**
 * Choosing a saved selection, on the dial (`RangeDial`): turned and tapped, or swept with a long
 * press. The list of surahs, juz, hizbs and quarters, and an exact stretch of ayahs, stay a tap
 * away. Below, what is chosen, a name and a mark to know it by, and saving (or removing it).
 */
export function PickEditor({ index, pick, memorized, helper, used, palette: p, onSave, onDelete, onClose }: {
  index: PlanIndex; pick: PracticePick | null; memorized: AyahSpan[]; helper: boolean;
  /** Marks already given to other selections: a new one takes the first left. */
  used: EmblemName[];
  palette: ReaderPalette; onSave: (pick: PracticePick) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<AyahSpan[]>(pick?.ranges ?? []);
  const [name, setName] = useState(pick?.name ?? '');
  const [emblem, setEmblem] = useState<EmblemName>(pick?.emblem ?? EMBLEMS.find((e) => !used.includes(e)) ?? EMBLEMS[0]);
  const [kind, setKind] = useState<DialKind>('surah');
  // The unit at the pointer: kept apart, so that turning the wheel redraws only what names it.
  const [focus] = useState(() => createFocusStore(initialFocus(dialUnits(index, 'surah'), pick?.ranges ?? [], helper ? [] : memorized)));
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [listing, setListing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const units = useMemo(() => dialUnits(index, kind), [index, kind]);
  const juzStarts = useMemo(() => index.juzs.slice(0, -1), [index]);
  // One's own memorized portions, marked round the wheel; not when listening to someone else.
  const marks = useMemo(() => helper ? [] : memorized, [helper, memorized]);
  const ayahs = spanCount(draft);
  const summary = useMemo(() => ayahs ? `${scopeLabel(index, draft)} · ${t('practice.scope.ayahs', { count: ayahs })}` : t('practice.picks.empty'), [index, draft, ayahs]);
  const share = index.ayahs.length ? ayahs / index.ayahs.length : 0;
  const save = () => onSave({ id: pick?.id ?? newId(), name: name.trim().slice(0, MAX_PICK_NAME), emblem, ranges: draft });
  const openList = useCallback(() => setListing(true), []);
  // The wheel is laid out once the editor has slid in (its many parts would hold up the slide),
  // then fades in.
  const [shown, setShown] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const timer = setTimeout(() => {
      setShown(true);
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
    }, 260);
    return () => clearTimeout(timer);
  }, [fade]);

  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.background }} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        {/* The modal is drawn edge to edge, so the window does not shrink for the keyboard: the
            panel is lifted over it (where the window does shrink, there is no overlap to lift). */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Header editing={!!pick} palette={p} onClose={onClose} onList={openList} />
          <View style={s.kinds}>
            <Tabs role="radio" palette={p} label={t('practice.dial.kindsLabel')} value={kind}
              onChange={(next) => { focus.set(initialFocus(dialUnits(index, next), draft, marks)); setKind(next); }}
              options={DIAL_KINDS.map((value) => ({ value, label: t(`practice.dial.kinds.${value}`) }))} />
          </View>
          {/* Laid out left to right, as the wheel is: the ring stays in the left corner. */}
          <View style={{ flex: 1, direction: 'ltr' }} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; if (!size || Math.abs(size.width - width) > 1 || Math.abs(size.height - height) > 1) setSize({ width, height }); }}>
            {/* Kept while the keyboard squeezes it, so it stays at the unit named below it. */}
            {size && shown && <View style={{ opacity: size.height > 120 ? 1 : 0 }} pointerEvents={size.height > 120 ? 'auto' : 'none'}>
              <Animated.View style={{ opacity: fade }}>
                <RangeDial key={kind} units={units} kind={kind} selected={draft} memorized={marks} juzStarts={juzStarts} focus={focus}
                  width={size.width} height={Math.max(size.height, 1)} palette={p} onChange={setDraft} />
              </Animated.View>
            </View>}
            <ShareRing share={share} palette={p} />
          </View>
          <FocusRow units={units} draft={draft} focus={focus} palette={p} onChange={setDraft} />
          <View style={[s.panel, { backgroundColor: p.card, borderColor: p.border }]}>
            <Text accessibilityLiveRegion="polite" numberOfLines={2} style={{ color: ayahs ? p.foreground : p.mutedForeground, fontSize: 14, fontWeight: ayahs ? '600' : '400', lineHeight: 22 }}>
              {summary}
            </Text>
            <NameFields name={name} emblem={emblem} palette={p} onName={setName} onEmblem={setEmblem} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {pick && <Button variant={removing ? 'destructive' : 'outline'} palette={p} icon="trash" onPress={() => removing ? onDelete(pick.id) : setRemoving(true)}>
                {removing ? t('practice.picks.confirmDelete') : t('practice.picks.delete')}
              </Button>}
              <View style={{ flex: 1 }}><Button palette={p} icon="check" block disabled={!ayahs} onPress={save}>{t('practice.picks.save')}</Button></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {listing && <MemorizedSelectionSheet purpose={helper ? 'helper' : 'practice'} index={index} selected={draft}
        onClose={() => setListing(false)} onSave={(value) => { setDraft(value); setListing(false); }} />}
    </GestureHandlerRootView>
  </Modal>;
}

// The parts that do not change with what is chosen are drawn again only when their own props do:
// a choice on the wheel redraws the wheel and what counts it, not the whole editor.

const Header = memo(function Header({ editing, palette: p, onClose, onList }: { editing: boolean; palette: ReaderPalette; onClose: () => void; onList: () => void }) {
  return <View style={s.header}>
    <SheetTitle title={editing ? t('practice.picks.edit') : t('practice.picks.new')} subtitle={t('practice.dial.how')} palette={p} onClose={onClose} closeLabel={t('practice.picks.close')}
      actions={<Button variant="outline" size="sm" palette={p} icon="lines" label={t('practice.picks.listLabel')} onPress={onList}>{t('practice.picks.list')}</Button>} />
  </View>;
});

/** The name and the mark a selection is known by. */
const NameFields = memo(function NameFields({ name, emblem, palette: p, onName, onEmblem }: {
  name: string; emblem: EmblemName; palette: ReaderPalette; onName: (name: string) => void; onEmblem: (emblem: EmblemName) => void;
}) {
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[s.mark, { backgroundColor: withAlpha(p.ornament, 0.14) }]}><Emblem name={emblem} size={24} color={p.ornament} /></View>
      <TextInput accessibilityLabel={t('practice.picks.nameLabel')} value={name} onChangeText={onName} placeholder={t('practice.picks.namePlaceholder')}
        placeholderTextColor={p.mutedForeground} maxLength={MAX_PICK_NAME} selectionColor={p.primary} returnKeyType="done"
        style={[s.input, { color: p.foreground, backgroundColor: p.background, borderColor: p.input }]} />
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('practice.picks.emblemLabel')} style={s.emblems}>
      {EMBLEMS.map((e) => {
        const on = e === emblem;
        return <Pressable key={e} accessibilityRole="radio" accessibilityLabel={t(`practice.picks.emblems.${e}`)} accessibilityState={{ checked: on }} aria-checked={on}
          onPress={() => onEmblem(e)} hitSlop={3}
          style={({ pressed }) => [s.emblem, { borderColor: on ? p.ornament : 'transparent', backgroundColor: on ? withAlpha(p.ornament, 0.12) : pressed ? p.accent : 'transparent' }]}>
          <Emblem name={e} size={22} color={on ? p.ornament : p.mutedForeground} />
        </Pressable>;
      })}
    </View>
  </>;
});

/** The unit at the pointer, named, with a button to add or remove it. Drawn again alone as the wheel turns. */
function FocusRow({ units, draft, focus, palette: p, onChange }: { units: DialUnit[]; draft: AyahSpan[]; focus: FocusStore; palette: ReaderPalette; onChange: (draft: AyahSpan[]) => void }) {
  const at = useFocus(focus);
  const focused = units[at];
  if (!focused) return null;
  const state = unitState(draft, focused);
  return <View style={[s.focus, { borderColor: p.border }]}>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{focused.label}</Text>
      <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 12 }}>
        {t('practice.scope.ayahs', { count: focused.end - focused.start })}{state === 'part' ? ` · ${t('practice.dial.partly')}` : ''}
      </Text>
    </View>
    <Button variant={state === 'full' ? 'outline' : 'secondary'} size="sm" palette={p} icon={state === 'full' ? 'close' : 'check'}
      onPress={() => onChange(toggleUnit(draft, focused))}>{state === 'full' ? t('practice.dial.remove') : t('practice.dial.add')}</Button>
  </View>;
}

/** How much of the Quran is chosen, as a ring in the dial's corner. */
function ShareRing({ share, palette: p }: { share: number; palette: ReaderPalette }) {
  const r = 20, c = 26, a = Math.min(0.9999, share) * 2 * Math.PI;
  const end = `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`;
  return <View pointerEvents="none" style={s.share} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={c * 2} height={c * 2}>
      <Circle cx={c} cy={c} r={r} stroke={p.muted} strokeWidth={4} fill={p.background} />
      {share > 0 && <Path d={`M ${c} ${c - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${end}`} stroke={p.primary} strokeWidth={4} strokeLinecap="round" fill="none" />}
    </Svg>
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: p.foreground, fontSize: 11, fontWeight: '600' }}>{t('practice.dial.share', { value: Math.round(share * 100) })}</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  kinds: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  focus: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  panel: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet },
  mark: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 12, fontSize: 15, fontFamily: 'UiSans', writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right' },
  emblems: { flexDirection: 'row', justifyContent: 'space-between' },
  emblem: { width: 38, height: 38, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  share: { position: 'absolute', left: 12, bottom: 10, width: 52, height: 52 },
});
