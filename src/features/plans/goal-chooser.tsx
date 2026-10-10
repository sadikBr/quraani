import { Pressable, StyleSheet, View, Text as Glyph } from 'react-native';
import { router } from 'expo-router';
import { useFonts } from 'expo-font';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerShape, withAlpha } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../quran-reader/utils/reader-typography';
import { PlanScreen, Copy } from './components';
import { usePlans } from './provider';
import { currentGoal, currentMemorizationGoal, currentRevisionGoal } from './goal-limit';
import { RECURRING_PRESETS } from './recurring';
import { SURAH_NAME_FONT_FAMILY } from '../quran-reader/config';

export function GoalChooser() {
  const { palette: p, preferences } = useReadingPreferences();
  const { plans } = usePlans();
  const [calligraphyReady] = useFonts({ [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf') });
  const existing = currentGoal(plans);
  const memorization = currentMemorizationGoal(plans);
  const revision = currentRevisionGoal(plans, preferences.riwayah);
  return <PlanScreen title="هدف جديد" subtitle="اختر ما تحب أن تواظب عليه." onBack={() => router.dismissTo('/plans')}>
    <View style={[{ backgroundColor: p.hero, borderRadius: readerShape.hero, padding: 22, gap: 6 }, readerElevation(2, p)]}>
      <ReaderIcon name="calendar" color={p.heroMuted} size={24} />
      <Text style={{ color: p.onHero, fontSize: 22, fontWeight: '600', marginTop: 6 }}>مواعيد تتجدد مع القرآن</Text>
      <Text style={{ color: p.heroMuted, fontSize: 13, lineHeight: 22 }}>سور تختارها، في أيام تناسبك. ابدأ باقتراح جاهز أو اصنع موعدك الخاص.</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {(Object.entries(RECURRING_PRESETS) as [keyof typeof RECURRING_PRESETS, typeof RECURRING_PRESETS[keyof typeof RECURRING_PRESETS]][]).map(([key, preset]) => <Pressable key={key}
        accessibilityRole="button" accessibilityLabel={preset.name} onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring', preset: key } })}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: 1, borderColor: pressed ? withAlpha(p.accent, 0.5) : p.border, backgroundColor: pressed ? p.accentSoft : p.paper, gap: 6, alignItems: 'center' })}>
        {calligraphyReady ? <Glyph accessibilityLabel={`سورة ${key === 'kahf' ? 'الكهف' : 'الملك'}`} style={[calligraphyStyle(36), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(preset.surahs[0])}</Glyph>
          : <Text style={{ color: p.ornament, fontSize: 22, textAlign: 'center' }}>سورة {key === 'kahf' ? 'الكهف' : 'الملك'}</Text>}
        <Text style={{ color: p.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{key === 'kahf' ? 'كل جمعة' : 'كل ليلة'}</Text>
        <Text style={{ color: p.muted, fontSize: 12, textAlign: 'center' }}>راجع الموعد وابدأ</Text>
      </Pressable>)}
    </View>
    <View style={[s.list, { backgroundColor: p.paper, borderColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="إنشاء قراءة متكررة مخصصة" onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
        <View style={[s.listIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name="restore" color={p.accent} size={20} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>قراءة متكررة من اختيارك</Text><Text style={{ color: p.muted, fontSize: 13 }}>سورة أو أكثر · أيام تختارها</Text></View><ReaderIcon name="chevron" color={p.muted} size={18} />
      </Pressable>
      <View style={[s.separator, { backgroundColor: p.border }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={memorization ? 'متابعة هدف الحفظ' : 'إنشاء هدف حفظ القرآن'} onPress={() => memorization ? router.push({ pathname: '/plans/[id]', params: { id: memorization.id } }) : router.push({ pathname: '/plans/new', params: { type: 'memorization' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
        <View style={[s.listIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name="book" color={p.accent} size={20} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>القرآن في صدرك</Text><Text style={{ color: p.muted, fontSize: 13 }}>{memorization ? `تابع ${memorization.name}` : 'حفظ متدرّج، يبدأ من ربع حزب أسبوعيًا'}</Text></View><ReaderIcon name="chevron" color={p.muted} size={18} />
      </Pressable>
      <View style={[s.separator, { backgroundColor: p.border }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={revision ? 'متابعة هدف المراجعة' : 'إنشاء هدف مراجعة المحفوظ'} onPress={() => revision ? router.push({ pathname: '/plans/[id]', params: { id: revision.id } }) : router.push({ pathname: '/plans/new', params: { type: 'revision' } })}
        style={({ pressed }) => [s.listRow, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
        <View style={[s.listIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name="loop" color={p.accent} size={20} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>ثبّت محفوظك</Text><Text style={{ color: p.muted, fontSize: 13 }}>{revision ? `تابع ${revision.name}` : 'مراجعة دورية تمر على كل ما تحفظه'}</Text></View><ReaderIcon name="chevron" color={p.muted} size={18} />
      </Pressable>
    </View>
    <View style={{ gap: 12, marginTop: 4 }}><Copy title>رحلتك عبر المصحف</Copy>
      <View style={{ flexDirection: 'row', gap: 12 }}>{([{ type: 'khatma', title: 'ختمة', detail: 'ورد محسوب لإتمام القراءة', icon: 'calendar' }, { type: 'wird', title: 'ورد يومي', detail: 'مقدار ثابت، بلا موعد إتمام', icon: 'book' }] as const).map(option => <Pressable key={option.type}
        accessibilityRole="button" accessibilityLabel={`إنشاء ${option.title}`} accessibilityState={{ disabled: !!existing }} disabled={!!existing}
        onPress={() => router.push({ pathname: '/plans/new', params: { type: option.type } })}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: 1, borderColor: pressed ? withAlpha(p.accent, 0.5) : p.border, backgroundColor: pressed ? p.accentSoft : p.paper, gap: 6, opacity: existing ? 0.45 : 1 })}>
        <ReaderIcon name={option.icon} color={p.accent} size={20} /><Text style={{ color: p.text, fontSize: 18, fontWeight: '600', marginTop: 4 }}>{option.title}</Text><Text style={{ color: p.muted, fontSize: 12, lineHeight: 18 }}>{option.detail}</Text>
      </Pressable>)}</View>
      {existing ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plans/[id]', params: { id: existing.id } })} style={{ minHeight: 44, justifyContent: 'center', gap: 3 }}>
        <Text style={{ color: p.muted, fontSize: 13 }}>لديك هدف قراءة جارٍ. القراءات المتكررة متاحة بجانبه.</Text><Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>عرض «{existing.name}» ←</Text>
      </Pressable> : <Copy muted>ختمة أو ورد يومي واحد، وقراءات متكررة ترافقه.</Copy>}
    </View>
  </PlanScreen>;
}

const s = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: 16, paddingVertical: 14 },
  listIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginStart: 70 },
});
