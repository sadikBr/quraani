import { Pressable, StyleSheet, View, Text as Glyph, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useFonts } from 'expo-font';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchTile, artColors, Emblem, type EmblemName, type Motif } from '@/components/craft/art';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { readerLayout } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { calligraphyStyle, surahNameGlyph } from '../quran-reader/utils/reader-typography';
import { PlanScreen } from './components';
import { usePlans } from './provider';
import { currentGoal, currentMemorizationGoal, currentRevisionGoal } from './goal-limit';
import { RECURRING_PRESETS } from './recurring';
import { goalEmblems, goalMotifs } from './goal-card';
import { SURAH_NAME_FONT_FAMILY } from '../quran-reader/config';
import { t } from '@/i18n';

/** What an arch of the chooser holds: a goal's mark on a medallion, or a surah's name in calligraphy in its frame. */
type Figure = { emblem: EmblemName } | { surah: number; name: string };

/**
 * Choosing a new goal: each kind is a door, an arch drawn with its own pattern. The surahs one
 * returns to come first (al-Kahf on Fridays under arches as of a cave, al-Mulk each night under
 * the crescent, each name in calligraphy in its frame) and a reading of one's own choosing; then
 * memorizing and revising; then reading the whole mushaf, a khatma or a daily wird.
 */
export function GoalChooser() {
  const { palette: p, preferences } = useReadingPreferences();
  const { plans } = usePlans();
  const { width } = useWindowDimensions();
  const [calligraphyReady] = useFonts({ [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf') });
  const existing = currentGoal(plans);
  const memorization = currentMemorizationGoal(plans);
  const revision = currentRevisionGoal(plans, preferences.riwayah);
  const tile = Math.min(210, Math.floor((Math.min(width, readerLayout.maxWidth) - 32 - 12) / 2));
  const presets = Object.entries(RECURRING_PRESETS) as [keyof typeof RECURRING_PRESETS, typeof RECURRING_PRESETS[keyof typeof RECURRING_PRESETS]][];
  return <PlanScreen title={t('goals.newGoal')} subtitle={t('plans.chooser.subtitle')} onBack={() => router.dismissTo('/plans')}>
    <Section title={t('plans.chooser.recurring.title')} palette={p}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, marginTop: -6 }}>{t('plans.chooser.recurring.description')}</Text>
      <View style={s.pair}>
        {presets.map(([key, preset]) => <ChoiceArch key={key} width={tile} motif={key === 'mulk' ? 'crescent' : 'arches'} calligraphy={calligraphyReady}
          figure={{ surah: preset.surahs[0], name: t(`plans.chooser.presets.${key}.surah`) }} title={t(`plans.chooser.presets.${key}.when`)} detail={t('plans.chooser.presets.review')}
          label={preset.name} onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring', preset: key } })} />)}
      </View>
      <RowGroup palette={p}>
        <Row icon="restore" palette={p} title={t('plans.chooser.recurring.customTitle')} detail={t('plans.chooser.recurring.customDetail')} label={t('plans.chooser.recurring.customLabel')}
          onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring' } })} />
      </RowGroup>
    </Section>
    <Section title={t('plans.chooser.memory')} palette={p}>
      <View style={s.pair}>
        <ChoiceArch width={tile} motif={goalMotifs.memorization} figure={{ emblem: goalEmblems.memorization }} title={t('plans.chooser.memorization.title')}
          detail={memorization ? t('plans.chooser.continueGoal', { name: memorization.name }) : t('plans.chooser.memorization.detail')}
          label={memorization ? t('plans.chooser.memorization.continueLabel') : t('plans.chooser.memorization.createLabel')}
          onPress={() => memorization ? router.push({ pathname: '/plans/[id]', params: { id: memorization.id } }) : router.push({ pathname: '/plans/new', params: { type: 'memorization' } })} />
        <ChoiceArch width={tile} motif={goalMotifs.revision} figure={{ emblem: goalEmblems.revision }} title={t('plans.chooser.revision.title')}
          detail={revision ? t('plans.chooser.continueGoal', { name: revision.name }) : t('plans.chooser.revision.detail')}
          label={revision ? t('plans.chooser.revision.continueLabel') : t('plans.chooser.revision.createLabel')}
          onPress={() => revision ? router.push({ pathname: '/plans/[id]', params: { id: revision.id } }) : router.push({ pathname: '/plans/new', params: { type: 'revision' } })} />
      </View>
    </Section>
    <Section title={t('plans.chooser.reading.title')} palette={p}>
      <View style={s.pair}>
        {(['khatma', 'wird'] as const).map(type => <ChoiceArch key={type} width={tile} motif={goalMotifs[type]} figure={{ emblem: goalEmblems[type] }} title={t(`goals.types.${type}`)}
          detail={type === 'khatma' ? t('plans.chooser.reading.khatmaDetail') : t('plans.chooser.reading.wirdDetail')} disabled={!!existing}
          label={t('plans.chooser.reading.create', { goal: t(`goals.types.${type}`) })} onPress={() => router.push({ pathname: '/plans/new', params: { type } })} />)}
      </View>
      {existing ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plans/[id]', params: { id: existing.id } })} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', gap: 3, opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('plans.chooser.reading.existing')}</Text><Text style={{ color: p.primary, fontSize: 14, fontWeight: '600' }}>{t('plans.chooser.reading.viewExisting', { name: existing.name })}</Text>
      </Pressable> : <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('plans.chooser.reading.hint')}</Text>}
    </Section>
  </PlanScreen>;
}

/** A kind of goal as an arched door: its pattern, its figure in the arch, then its name and a line. */
function ChoiceArch({ width, motif, figure, title, detail, label, disabled = false, calligraphy = false, onPress }: {
  width: number; motif: Motif; figure: Figure; title: string; detail: string; label: string; disabled?: boolean; calligraphy?: boolean; onPress: () => void;
}) {
  const { palette: p } = useReadingPreferences();
  const height = Math.round(width * 1.24), rise = Math.round(width * 0.5);
  const colors = artColors(p);
  const focus = Math.round(rise * 0.74 + 8), medallion = Math.round(width * 0.19);
  const surah = 'surah' in figure;
  const frame = { width: Math.round(width * 0.8), height: 46 };
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [{ width, height, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    <ArchTile w={width} h={height} rise={rise} motif={motif} palette={p} focus={focus} medallion={surah ? undefined : medallion} cartouche={surah ? frame : undefined} />
    <View style={[s.figure, { top: focus - (surah ? frame.height / 2 : medallion), height: surah ? frame.height : medallion * 2 }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {'surah' in figure
        ? calligraphy ? <Glyph style={[calligraphyStyle(Math.round(frame.height * 0.78)), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(figure.surah)}</Glyph>
          : <Text style={{ color: p.ornament, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{figure.name}</Text>
        : <Emblem name={figure.emblem} size={Math.round(medallion * 1.05)} color={p.ornament} />}
    </View>
    <View style={[StyleSheet.absoluteFill, s.body]}>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: colors.soft, fontSize: 12, lineHeight: 18 }}>{detail}</Text>
      </View>
    </View>
  </Pressable>;
}

const s = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 14, paddingBottom: 16 },
});
