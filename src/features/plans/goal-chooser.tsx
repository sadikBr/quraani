import { Card, CardHeader, IconTile } from '@/components/ui';
import { Pressable, StyleSheet, View, Text as Glyph } from 'react-native';
import { router } from 'expo-router';
import { useFonts } from 'expo-font';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../quran-reader/utils/reader-typography';
import { PlanScreen, Copy } from './components';
import { usePlans } from './provider';
import { currentGoal, currentMemorizationGoal, currentRevisionGoal } from './goal-limit';
import { RECURRING_PRESETS } from './recurring';
import { SURAH_NAME_FONT_FAMILY } from '../quran-reader/config';
import { t } from '@/i18n';

export function GoalChooser() {
  const { palette: p, preferences } = useReadingPreferences();
  const { plans } = usePlans();
  const [calligraphyReady] = useFonts({ [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf') });
  const existing = currentGoal(plans);
  const memorization = currentMemorizationGoal(plans);
  const revision = currentRevisionGoal(plans, preferences.riwayah);
  return <PlanScreen title={t('goals.newGoal')} subtitle={t('plans.chooser.subtitle')} onBack={() => router.dismissTo('/plans')}>
    <Card style={{ padding: 16, gap: 0 }}>
      <CardHeader icon="calendar" title={t('plans.chooser.recurring.title')} description={t('plans.chooser.recurring.description')} />
    </Card>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {(Object.entries(RECURRING_PRESETS) as [keyof typeof RECURRING_PRESETS, typeof RECURRING_PRESETS[keyof typeof RECURRING_PRESETS]][]).map(([key, preset]) => <Pressable key={key}
        accessibilityRole="button" accessibilityLabel={preset.name} onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring', preset: key } })}
        style={({ pressed }) => [{ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border, backgroundColor: pressed ? p.accent : p.card, gap: 4, alignItems: 'center' }, readerElevation(2, p)]}>
        {calligraphyReady ? <Glyph accessibilityLabel={t(`plans.chooser.presets.${key}.surah`)} style={[calligraphyStyle(36), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(preset.surahs[0])}</Glyph>
          : <Text style={{ color: p.ornament, fontSize: 22, textAlign: 'center' }}>{t(`plans.chooser.presets.${key}.surah`)}</Text>}
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{t(`plans.chooser.presets.${key}.when`)}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('plans.chooser.presets.review')}</Text>
      </Pressable>)}
    </View>
    <View style={[s.list, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('plans.chooser.recurring.customLabel')} onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <IconTile name="restore" palette={p} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('plans.chooser.recurring.customTitle')}</Text><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('plans.chooser.recurring.customDetail')}</Text></View><ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </Pressable>
      <View style={[s.separator, { backgroundColor: p.border }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={memorization ? t('plans.chooser.memorization.continueLabel') : t('plans.chooser.memorization.createLabel')} onPress={() => memorization ? router.push({ pathname: '/plans/[id]', params: { id: memorization.id } }) : router.push({ pathname: '/plans/new', params: { type: 'memorization' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <IconTile name="book" palette={p} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('plans.chooser.memorization.title')}</Text><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{memorization ? t('plans.chooser.continueGoal', { name: memorization.name }) : t('plans.chooser.memorization.detail')}</Text></View><ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </Pressable>
      <View style={[s.separator, { backgroundColor: p.border }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={revision ? t('plans.chooser.revision.continueLabel') : t('plans.chooser.revision.createLabel')} onPress={() => revision ? router.push({ pathname: '/plans/[id]', params: { id: revision.id } }) : router.push({ pathname: '/plans/new', params: { type: 'revision' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <IconTile name="loop" palette={p} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('plans.chooser.revision.title')}</Text><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{revision ? t('plans.chooser.continueGoal', { name: revision.name }) : t('plans.chooser.revision.detail')}</Text></View><ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
      </Pressable>
    </View>
    <View style={{ gap: 12, marginTop: 4 }}><Copy title>{t('plans.chooser.reading.title')}</Copy>
      <View style={{ flexDirection: 'row', gap: 12 }}>{([{ type: 'khatma', title: t('goals.types.khatma'), detail: t('plans.chooser.reading.khatmaDetail'), icon: 'calendar' }, { type: 'wird', title: t('goals.types.wird'), detail: t('plans.chooser.reading.wirdDetail'), icon: 'book' }] as const).map(option => <Pressable key={option.type}
        accessibilityRole="button" accessibilityLabel={t('plans.chooser.reading.create', { goal: option.title })} accessibilityState={{ disabled: !!existing }} disabled={!!existing}
        onPress={() => router.push({ pathname: '/plans/new', params: { type: option.type } })}
        style={({ pressed }) => [{ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border, backgroundColor: pressed ? p.accent : p.card, gap: 4, opacity: existing ? 0.5 : 1 }, readerElevation(2, p)]}>
        <IconTile name={option.icon} size={36} /><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600', marginTop: 8 }}>{option.title}</Text><Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{option.detail}</Text>
      </Pressable>)}</View>
      {existing ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plans/[id]', params: { id: existing.id } })} style={{ minHeight: 44, justifyContent: 'center', gap: 3 }}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('plans.chooser.reading.existing')}</Text><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' }}>{t('plans.chooser.reading.viewExisting', { name: existing.name })}</Text>
      </Pressable> : <Copy muted>{t('plans.chooser.reading.hint')}</Copy>}
    </View>
  </PlanScreen>;
}

const s = StyleSheet.create({
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 16, paddingVertical: 12 },
  listIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginStart: 68 },
});
