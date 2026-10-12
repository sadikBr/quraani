import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ArabicText as Text } from '@/components/arabic-text';
import { Emblem } from '@/components/craft/art';
import { Button } from '@/components/ui';
import type { AyahNote, Saying } from '@/lib/quranpedia/ayah-services';
import { formatList, t } from '@/i18n';
import { readerShape, withAlpha } from '../../../design';
import { quranpedia } from '../../../services/reader-service';
import type { ReaderPalette } from '../../../theme';
import { LongProse, openLink, Pill, StaleNote, Star, Status, useAyahService, type ScienceProps } from './shared';

const loadNotes = (surah: number, ayah: number) => quranpedia.getNotes(surah, ayah);
const loadSayings = (surah: number, ayah: number) => quranpedia.getSayings(surah, ayah);
/** Shown at first; the rest a touch away. */
const PAGE = 6;

/**
 * Reflections on the ayah, each as a note in the margin: a gold line beside it, its kind above,
 * its writer below signed with a leaf, its pictures and videos after it.
 */
export function NotesView({ ayah, palette: p }: ScienceProps) {
  const notes = useAyahService(ayah, 'notes', loadNotes);
  const [shown, setShown] = useState(PAGE);
  const list = notes.data ?? [];
  if (notes.status !== 'ready' || !list.length) return <Status loaded={notes} empty={!list.length} palette={p} />;
  return <View style={{ gap: 24 }}>
    {list.slice(0, shown).map((note) => <Note key={note.id} note={note} palette={p} />)}
    {list.length > shown && <Button variant="outline" palette={p} onPress={() => setShown(shown + PAGE)}>{t('reader.sciences.notes.more')}</Button>}
    {notes.stale && <StaleNote palette={p} />}
  </View>;
}

function Note({ note, palette: p }: { note: AyahNote; palette: ReaderPalette }) {
  return <View style={{ gap: 10 }}>
    {!!note.category && <Text style={{ color: p.ornament, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{note.category}</Text>}
    <View style={[s.margin, { borderColor: withAlpha(p.ornament, 0.5) }]}>
      <LongProse text={note.text} limit={380} size={17} palette={p} />
    </View>
    {!!note.author && <View style={s.signature}>
      <Emblem name="leaf" size={15} color={p.ornament} />
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{note.author}</Text>
    </View>}
    {!!note.images.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {note.images.map((url) => <Pressable key={url} accessibilityRole="imagebutton" accessibilityLabel={t('reader.sciences.notes.image')} onPress={() => openLink(url)}
        style={({ pressed }) => [s.image, { borderColor: p.border, opacity: pressed ? 0.7 : 1 }]}>
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      </Pressable>)}
    </ScrollView>}
    {note.videos.map((url) => <Pill key={url} icon="play" label={t('reader.sciences.notes.video')} palette={p} style={{ alignSelf: 'flex-start' }} onPress={() => openLink(url)} />)}
  </View>;
}

/**
 * What the companions and those after them narrated about the ayah: each narration under the
 * name of who said it, a star before it; when the narrations are of more than one kind (on its
 * meaning, on its revelation), a choice of kind above them.
 */
export function SayingsView({ ayah, palette: p }: ScienceProps) {
  const sayings = useAyahService(ayah, 'sayings', loadSayings);
  const [kind, setKind] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const list = sayings.data ?? [];
  if (sayings.status !== 'ready' || !list.length) return <Status loaded={sayings} empty={!list.length} palette={p} />;
  const kinds = [...new Set(list.map((saying) => saying.kind).filter(Boolean))];
  const chosen = kind && kinds.includes(kind) ? list.filter((saying) => saying.kind === kind) : list;
  return <View style={{ gap: 22 }}>
    {kinds.length > 1 && <View accessibilityRole="radiogroup" style={s.kinds}>
      {[null, ...kinds].map((option) => <Pill key={option ?? ''} label={option ?? t('reader.sciences.sayings.all')} selected={option === (kind && kinds.includes(kind) ? kind : null)} palette={p}
        onPress={() => { setKind(option); setShown(PAGE); }} />)}
    </View>}
    {chosen.slice(0, shown).map((saying, i) => <Fragment key={saying.id}>
      {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />}
      <Narration saying={saying} showKind={kinds.length > 1 && !kind} palette={p} />
    </Fragment>)}
    {chosen.length > shown && <Button variant="outline" palette={p} onPress={() => setShown(shown + PAGE)}>{t('reader.sciences.notes.more')}</Button>}
    {sayings.stale && <StaleNote palette={p} />}
  </View>;
}

function Narration({ saying, showKind, palette: p }: { saying: Saying; showKind: boolean; palette: ReaderPalette }) {
  return <View style={{ gap: 8 }}>
    <View style={s.narrator}>
      <Star size={13} palette={p} filled />
      <Text style={{ flex: 1, minWidth: 0, color: p.foreground, fontSize: 16, lineHeight: 27, fontFamily: 'ReaderNaskhBold' }}>
        {saying.narrators.length ? t('reader.sciences.sayings.from', { names: formatList(saying.narrators) }) : saying.title}
      </Text>
      {showKind && <Text style={[s.kind, { color: p.ornament, borderColor: withAlpha(p.ornament, 0.5) }]}>{saying.kind}</Text>}
    </View>
    <LongProse text={saying.text} limit={420} size={17} palette={p} />
  </View>;
}

const s = StyleSheet.create({
  margin: { borderStartWidth: 2, paddingStart: 14 },
  signature: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  image: { width: 88, height: 88, borderRadius: readerShape.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  narrator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kind: { fontSize: 11, lineHeight: 18, fontWeight: '600', borderWidth: 1, borderRadius: readerShape.pill, paddingHorizontal: 8 },
});
