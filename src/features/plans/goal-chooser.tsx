import { Pressable, View, Text as Glyph } from 'react-native';
import { router } from 'expo-router';
import { useFonts } from 'expo-font';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../quran-reader/utils/reader-typography';
import { PlanScreen, Copy } from './components';
import { usePlans } from './provider';
import { currentGoal } from './goal-limit';
import { RECURRING_PRESETS } from './recurring';
import { SURAH_NAME_FONT_FAMILY } from '../quran-reader/config';

export function GoalChooser() {
  const { palette: p } = useReadingPreferences();
  const { plans } = usePlans();
  const [calligraphyReady] = useFonts({ [SURAH_NAME_FONT_FAMILY]: require('@/assets/fonts/surah_name.ttf') });
  const existing = currentGoal(plans);
  return <PlanScreen title="هدف جديد" subtitle="اختر ما تحب أن تواظب عليه." onBack={() => router.dismissTo('/plans')}>
    <View style={{ backgroundColor: p.hero, borderRadius: readerShape.card, padding: 20, gap: 8 }}>
      <ReaderIcon name="calendar" color={p.heroMuted} size={28} />
      <Text style={{ color: p.onHero, fontSize: 27, fontWeight: '600' }}>مواعيد تتجدد مع القرآن</Text>
      <Text style={{ color: p.heroMuted, fontSize: 13 }}>سور تختارها، في أيام تناسبك. ابدأ باقتراح جاهز أو اصنع موعدك الخاص.</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {(Object.entries(RECURRING_PRESETS) as [keyof typeof RECURRING_PRESETS, typeof RECURRING_PRESETS[keyof typeof RECURRING_PRESETS]][]).map(([key, preset]) => <Pressable key={key}
        accessibilityRole="button" accessibilityLabel={preset.name} onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring', preset: key } })}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.paper, opacity: pressed ? 0.7 : 1, gap: 8 })}>
        <ReaderIcon name={preset.icon} color={p.ornament} size={23} />
        {calligraphyReady ? <Glyph accessibilityLabel={`سورة ${key === 'kahf' ? 'الكهف' : 'الملك'}`} style={[calligraphyStyle(35), { color: p.ornament, textAlign: 'center' }]}>{surahNameGlyph(preset.surahs[0])}</Glyph>
          : <Text style={{ color: p.ornament, fontSize: 23, textAlign: 'center' }}>سورة {key === 'kahf' ? 'الكهف' : 'الملك'}</Text>}
        <Text style={{ color: p.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{key === 'kahf' ? 'كل جمعة' : 'كل ليلة'}</Text>
        <Text style={{ color: p.muted, fontSize: 11, textAlign: 'center' }}>راجع الموعد وابدأ</Text>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="إنشاء قراءة متكررة مخصصة" onPress={() => router.push({ pathname: '/plans/new', params: { type: 'recurring' } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: readerShape.card, borderWidth: 1, borderColor: p.accent, backgroundColor: p.accentSoft, opacity: pressed ? 0.7 : 1 })}>
      <ReaderIcon name="restore" color={p.accent} size={27} /><View style={{ flex: 1 }}><Text style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>قراءة متكررة من اختيارك</Text><Text style={{ color: p.muted, fontSize: 12 }}>سورة أو أكثر · أيام تختارها</Text></View><ReaderIcon name="chevron" color={p.accent} size={20} />
    </Pressable>
    <View style={{ gap: 12, marginTop: 8 }}><Copy title>رحلتك عبر المصحف</Copy>
      <View style={{ flexDirection: 'row', gap: 12 }}>{([{ type: 'khatma', title: 'ختمة', detail: 'ورد محسوب لإتمام القراءة', icon: 'calendar' }, { type: 'wird', title: 'ورد يومي', detail: 'مقدار ثابت، بلا موعد إتمام', icon: 'book' }] as const).map(option => <Pressable key={option.type}
        accessibilityRole="button" accessibilityLabel={`إنشاء ${option.title}`} accessibilityState={{ disabled: !!existing }} disabled={!!existing}
        onPress={() => router.push({ pathname: '/plans/new', params: { type: option.type } })}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, padding: 16, borderRadius: readerShape.card, borderWidth: 1, borderColor: p.border, backgroundColor: p.paper, gap: 5, opacity: existing ? 0.45 : pressed ? 0.7 : 1 })}>
        <ReaderIcon name={option.icon} color={p.accent} size={22} /><Text style={{ color: p.text, fontSize: 19, fontWeight: '600' }}>{option.title}</Text><Text style={{ color: p.muted, fontSize: 11 }}>{option.detail}</Text>
      </Pressable>)}</View>
      {existing ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plans/[id]', params: { id: existing.id } })} style={{ minHeight: 44, justifyContent: 'center', gap: 3 }}>
        <Text style={{ color: p.muted, fontSize: 12 }}>لديك هدف قراءة جارٍ. القراءات المتكررة متاحة بجانبه.</Text><Text style={{ color: p.accent, fontSize: 13 }}>عرض «{existing.name}» ←</Text>
      </Pressable> : <Copy muted>ختمة أو ورد يومي واحد، وقراءات متكررة ترافقه.</Copy>}
    </View>
  </PlanScreen>;
}
