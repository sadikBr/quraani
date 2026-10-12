import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Topic } from '@/lib/quranpedia/ayah-services';
import { t } from '@/i18n';
import { quranpedia } from '../../../services/reader-service';
import { ayahKey } from '../../../utils/references';
import { ReaderIcon } from '../../ui/reader-icon';
import { editionAyah } from './sciences';
import { Heading, Pill, StaleNote, Star, Status, useAyahService, type ScienceProps } from './shared';

const load = (surah: number, ayah: number) => quranpedia.getTopics(surah, ayah);

/** "ألوان من البر [من البرّ التزام ما أمر الله به]": the topic's name, and its gloss in brackets. */
function split(name: string) {
  const match = /^(.*?)\s*\[([^\]]+)\]\s*$/.exec(name);
  return match && match[1] ? { name: match[1], gloss: match[2] } : { name, gloss: '' };
}

/**
 * The topics of the Quran the ayah belongs to, as an index of subjects: each under its heading
 * (the broader topic), marked with a star; a topic opens on the other ayahs that speak of it.
 */
export function TopicsView({ ayah, quran, palette: p, onOpenAyah }: ScienceProps) {
  const topics = useAyahService(ayah, 'topics', load);
  const list = topics.data ?? [];
  if (topics.status !== 'ready' || !list.length) return <Status loaded={topics} empty={!list.length} palette={p} />;
  // Under each broader topic, its topics; a topic without one stands under its own name.
  const groups: { id: number; title: string; topics: Topic[] }[] = [];
  for (const topic of list) {
    const head = topic.parent ?? { id: topic.id, name: split(topic.name).name };
    const group = groups.find((entry) => entry.id === head.id);
    if (group) group.topics.push(topic); else groups.push({ id: head.id, title: split(head.name).name, topics: [topic] });
  }
  return <View style={{ gap: 22 }}>
    {groups.map((group) => <View key={group.id} style={{ gap: 10 }}>
      <Heading palette={p}>{group.title}</Heading>
      {group.topics.map((topic) => <TopicEntry key={topic.id} topic={topic} alone={topic.parent === null} ayah={ayah} quran={quran} palette={p} onOpenAyah={onOpenAyah} />)}
    </View>)}
    {topics.stale && <StaleNote palette={p} />}
  </View>;
}

function TopicEntry({ topic, alone, ayah, quran, palette: p, onOpenAyah }: { topic: Topic; alone: boolean } & ScienceProps) {
  const [open, setOpen] = useState(false);
  const { name, gloss } = split(topic.name);
  const others = topic.ayahs.length - 1;
  return <View style={s.topic}>
    <View style={{ paddingTop: 7 }}><Star size={12} palette={p} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      {!alone && <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontWeight: '600' }}>{name}</Text>}
      {!!gloss && <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{gloss}</Text>}
      {others > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} hitSlop={6} style={({ pressed }) => [s.toggle, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={{ color: p.primary, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{t('reader.sciences.topics.ayahs', { count: topic.ayahs.length })}</Text>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron-down" color={p.primary} size={14} /></View>
      </Pressable>}
      {open && <View style={s.ayahs}>
        {topic.ayahs.map((reference) => {
          const target = editionAyah(quran, reference);
          if (!target) return null;
          const here = ayahKey(target) === ayahKey(ayah);
          const surah = quran.surahs.find((entry) => entry.number === reference.surah)?.name ?? '';
          return <Pill key={`${reference.surah}:${reference.ayah}`} label={t('reader.ayah.reference', { surah, ayah: target.ayahNumber })} accent={here} palette={p}
            hint={here ? t('reader.sciences.similar.here') : t('reader.sciences.open')} onPress={here || !onOpenAyah ? undefined : () => onOpenAyah(target)} />;
        })}
      </View>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  topic: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingStart: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  ayahs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
});
