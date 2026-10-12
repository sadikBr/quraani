import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { BrushStroke } from '@/components/craft/marks';
import type { TranslationLanguage } from '@/lib/quranpedia/ayah-services';
import { relatedPlainText } from '@/lib/quranpedia/related-content';
import { t } from '@/i18n';
import { quranpedia } from '../../../services/reader-service';
import type { ReaderPalette } from '../../../theme';
import { ayahKey } from '../../../utils/references';
import { chooseLanguage, useSheetChoices } from './choices';
import { hafsNumbers } from './sciences';
import { Prose, settled, StaleNote, Status, useRequest, type ScienceProps } from './shared';

/** Read first, before any choice: French, then English. */
const FIRST = ['fr', 'en'];

/**
 * The ayah's meanings in the languages of the world: their names, each in its own script, along
 * a ribbon (the chosen one underlined in gold), then every translation in that language.
 */
export function TranslationsView({ ayah, palette: p }: ScienceProps) {
  const { language: saved } = useSheetChoices();
  const first = hafsNumbers(ayah)[0];
  const languages = useRequest(`languages:${ayahKey(ayah)}`, async () => first ? quranpedia.getTranslationLanguages(ayah.surahNumber, first) : { data: [], stale: false });
  const list = languages.data ?? [];
  const language = list.find((entry) => entry.code === saved) ?? FIRST.map((code) => list.find((entry) => entry.code === code)).find(Boolean) ?? list[0];
  if (languages.status !== 'ready' || !language) return <Status loaded={languages} empty={!list.length} palette={p} />;
  const ordered = [...FIRST.flatMap((code) => list.filter((entry) => entry.code === code)), ...list.filter((entry) => !FIRST.includes(entry.code))];
  return <View style={{ gap: 18 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={t('reader.sciences.translations.languages')}
      contentContainerStyle={s.ribbon} style={s.strip}>
      {ordered.map((entry) => <Language key={entry.code} language={entry} on={entry.code === language.code} palette={p} onPress={() => chooseLanguage(entry.code)} />)}
    </ScrollView>
    <Translations key={language.code} ayah={ayah} language={language} palette={p} />
  </View>;
}

function Language({ language, on, palette: p, onPress }: { language: TranslationLanguage; on: boolean; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityLabel={language.name} accessibilityState={{ selected: on }} aria-selected={on} onPress={onPress} hitSlop={{ top: 6, bottom: 6 }}
    style={({ pressed }) => [s.language, { opacity: pressed && !on ? 0.6 : 1 }]}>
    <NativeText numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 16, lineHeight: 26, fontWeight: on ? '700' : '500' }}>{language.localName}</NativeText>
    <BrushStroke on={on} width={36} color={p.ornament} />
  </Pressable>;
}

function Translations({ ayah, language, palette: p }: { ayah: ScienceProps['ayah']; language: TranslationLanguage; palette: ReaderPalette }) {
  const numbers = hafsNumbers(ayah);
  const translations = useRequest(`translations:${language.code}:${ayahKey(ayah)}`, async () => {
    const answers = await settled(numbers.map(async (hafs) => ({ hafs, answer: await quranpedia.getTranslations(ayah.surahNumber, hafs, language.code) })));
    return {
      data: answers.flatMap(({ hafs, answer }) => answer.data.map((text) => ({ hafs, text, prose: text.texts.map(relatedPlainText).filter(Boolean).join('\n') }))).filter((entry) => entry.prose),
      stale: answers.some(({ answer }) => answer.stale),
    };
  });
  const list = translations.data ?? [];
  if (translations.status !== 'ready' || !list.length) return <Status loaded={translations} empty={!list.length} palette={p} />;
  return <View style={{ gap: 20 }}>
    {list.map((entry, i) => <Fragment key={`${entry.hafs}:${entry.text.book.id}:${i}`}>
      {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />}
      <View style={{ gap: 8 }}>
        <View>
          <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{entry.text.book.name}</Text>
          {!!entry.text.book.author && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{entry.text.book.author}</Text>}
          {numbers.length > 1 && <Text style={{ color: p.mutedForeground, fontSize: 11, lineHeight: 18 }}>{t('reader.related.parallelReference', { surah: ayah.surahNumber, ayah: entry.hafs })}</Text>}
        </View>
        <Prose text={entry.prose} direction={language.direction} size={language.direction === 'rtl' ? 18 : 17} palette={p} />
      </View>
    </Fragment>)}
    {translations.stale && <StaleNote palette={p} />}
  </View>;
}

const s = StyleSheet.create({
  strip: { marginHorizontal: -16 },
  ribbon: { paddingHorizontal: 16, gap: 18, alignItems: 'flex-end' },
  language: { alignItems: 'center', gap: 2 },
});
