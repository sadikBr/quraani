import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { AyahReference } from '@/lib/quranpedia/types';
import { readerShape } from '../../design';
import type { ReaderContent } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { ayahDestination, parseReaderNumber } from '../../utils/navigation';
import { pageDivisions } from '../../utils/page-divisions';
import { ReaderIcon } from '../ui/reader-chrome';

export function ReaderJump({ content, currentPage, palette: p, onJump, limited = false }: {
  content: ReaderContent; currentPage: number; palette: ReaderPalette; onJump: (page: number, ayah?: AyahReference) => void; limited?: boolean;
}) {
  const initialAyah = (content.pages.find(value => value.number === currentPage) ?? content.pages[0]).ayahs[0] ?? content.quran.surahs[0].ayahs[0];
  const [kind, setKind] = useState<'page' | 'ayah'>('page');
  const [page, setPage] = useState(String(currentPage));
  const [surah, setSurah] = useState(String(initialAyah.surahNumber));
  const [ayah, setAyah] = useState(String(initialAyah.ayahNumber));
  const [error, setError] = useState('');
  const firstPage = content.pages[0].number, lastPage = content.pages.at(-1)!.number;
  const pageIndex = content.pages.findIndex(value => value.number === parseReaderNumber(page));
  const selectedSurah = content.quran.surahs.find(value => value.number === parseReaderNumber(surah));
  const targetAyah = ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
  const destinationPage = kind === 'page' ? content.pages[pageIndex] : content.pages.find(value => value.number === targetAyah?.pageNumber);
  const surahNumbers = kind === 'ayah' ? [targetAyah?.surahNumber] : [...new Set(destinationPage?.ayahs.map(value => value.surahNumber) ?? [])];
  const destinationName = content.quran.surahs.filter(value => surahNumbers.includes(value.number)).map(value => value.name).join('، ');
  const divisions = destinationPage ? pageDivisions(destinationPage) : undefined;
  const previewDetail = kind === 'ayah' && targetAyah ? `الآية ${targetAyah.ayahNumber} · صفحة ${targetAyah.pageNumber}`
    : [divisions?.juz.length ? `الجزء ${divisions.juz.join('، ')}` : '', divisions?.quarters.length ? `الحزب ${[...new Set(divisions.quarters.map(value => value.hizb))].join('، ')}` : ''].filter(Boolean).join(' · ');
  const pageHint = `${limited ? 'صفحات الورد: من' : 'من'} ${firstPage} إلى ${lastPage}`;
  const ayahHint = selectedSurah ? `من ${selectedSurah.ayahs[0].ayahNumber} إلى ${selectedSurah.ayahs.at(-1)!.ayahNumber}` : 'اختر السورة أولًا';
  const change = (setter: (value: string) => void) => (value: string) => { setter(value); setError(''); };
  const submit = () => {
    if (kind === 'page') {
      if (!destinationPage) { setError(`اختر صفحة بين ${firstPage} و${lastPage}.`); return; }
      Keyboard.dismiss(); onJump(destinationPage.number);
    } else {
      if (!targetAyah) { setError(limited ? 'اختر آية ضمن الورد المحدد.' : 'تحقق من رقم السورة والآية في الرواية المختارة.'); return; }
      Keyboard.dismiss(); onJump(targetAyah.pageNumber, targetAyah);
    }
  };
  const stepPage = (delta: number) => {
    const next = pageIndex >= 0 ? content.pages[pageIndex + delta] : undefined;
    if (next) change(setPage)(String(next.number));
  };
  const actionLabel = destinationPage ? kind === 'page' ? `انتقل إلى الصفحة ${destinationPage.number}` : `انتقل إلى الآية ${targetAyah!.ayahNumber}` : 'الانتقال إلى الموضع';
  return <View style={s.form}>
    <View accessibilityRole="tablist" accessibilityLabel="طريقة الانتقال" style={[s.tabs, { borderColor: p.border }]}>
      {([{ value: 'page', label: 'بالصفحة', icon: 'book' }, { value: 'ayah', label: 'بالآية', icon: 'lines' }] as const).map(option => {
        const selected = kind === option.value;
        return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected }} aria-selected={selected}
          onPress={() => { Keyboard.dismiss(); setKind(option.value); setError(''); }}
          style={({ pressed }) => [s.tab, { borderColor: selected ? p.accent : 'transparent', opacity: pressed ? 0.65 : 1 }]}>
          <ReaderIcon name={option.icon} size={19} color={selected ? p.accent : p.muted} />
          <Text style={{ color: selected ? p.accent : p.muted, fontSize: 15, fontWeight: selected ? '600' : '400' }}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    {kind === 'page' ? <View style={s.pagePicker}>
      <PageStep label="زيادة رقم الصفحة" plus disabled={pageIndex < 0 || pageIndex === content.pages.length - 1} palette={p} onPress={() => stepPage(1)} />
      <NumberField label="رقم الصفحة" value={page} onChange={change(setPage)} hint={pageHint} palette={p} onSubmit={submit} large />
      <PageStep label="تقليل رقم الصفحة" disabled={pageIndex <= 0} palette={p} onPress={() => stepPage(-1)} />
    </View> : <View style={s.ayahFields}>
      <NumberField label="رقم السورة" value={surah} onChange={change(setSurah)} hint={limited ? 'ضمن الورد' : 'من 1 إلى 114'} palette={p} onSubmit={submit} />
      <NumberField label="رقم الآية" value={ayah} onChange={change(setAyah)} hint={ayahHint} palette={p} onSubmit={submit} />
    </View>}
    <View accessibilityLiveRegion="polite" style={[s.preview, { backgroundColor: p.accentSoft }]}>
      <ReaderIcon name="book" color={p.accent} size={26} />
      <View style={s.grow}>
        <Text style={{ color: p.muted, fontSize: 12 }}>وجهتك {limited ? 'داخل الورد' : 'في المصحف'}</Text>
        <Text style={{ color: p.text, fontSize: 19, fontWeight: '600' }}>{destinationName || 'اختر موضعًا للانتقال'}</Text>
        {!!previewDetail && <Text style={{ color: p.muted, fontSize: 13 }}>{previewDetail}</Text>}
      </View>
      {destinationPage && <View style={[s.pageBadge, { borderColor: p.border }]}><Text style={{ color: p.muted, fontSize: 12, textAlign: 'center' }}>صفحة</Text><Text style={{ color: p.text, fontSize: 21, textAlign: 'center' }}>{destinationPage.number}</Text></View>}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ color: p.warning, fontSize: 13 }}>{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={submit}
      style={({ pressed }) => [s.submit, { backgroundColor: p.accent, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={{ color: p.paper, fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' }}>{actionLabel}</Text><ReaderIcon name="chevron" color={p.paper} size={21} />
    </Pressable>
  </View>;
}

function NumberField({ label, value, onChange, hint, palette: p, onSubmit, large = false }: {
  label: string; value: string; onChange: (value: string) => void; hint: string; palette: ReaderPalette; onSubmit: () => void; large?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={s.field}>
    <Text style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      keyboardType="number-pad" inputMode="numeric" maxLength={3} selectTextOnFocus selectionColor={p.accent} onSubmitEditing={onSubmit} returnKeyType="go"
      style={[s.input, large && s.largeInput, { color: p.text, borderColor: focused ? p.accent : p.border, backgroundColor: p.background }]} />
    <Text style={{ color: p.muted, fontSize: 12, textAlign: 'center' }}>{hint}</Text>
  </View>;
}
function PageStep({ label, onPress, disabled, plus = false, palette: p }: { label: string; onPress: () => void; disabled: boolean; plus?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.step, { borderColor: p.border, backgroundColor: pressed ? p.accentSoft : p.paper, opacity: disabled ? 0.3 : 1 }]}>
    <View style={{ width: 16, height: 2, backgroundColor: p.accent }} />
    {plus && <View style={{ position: 'absolute', width: 2, height: 16, backgroundColor: p.accent }} />}
  </Pressable>;
}
const s = StyleSheet.create({
  form: { gap: 20 }, grow: { flex: 1, minWidth: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, gap: 20 },
  tab: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingBottom: 8, borderBottomWidth: 2, marginBottom: -1 },
  pagePicker: { flexDirection: 'row', gap: 18, alignItems: 'center', paddingVertical: 2 },
  ayahFields: { flexDirection: 'row', gap: 16 }, field: { flex: 1, minWidth: 0, gap: 6 },
  input: { minHeight: 64, borderWidth: 1, borderRadius: readerShape.control, paddingHorizontal: 8, paddingVertical: 4, fontFamily: 'ReaderNaskh', fontSize: 30, textAlign: 'center', writingDirection: 'ltr', includeFontPadding: false },
  largeInput: { minHeight: 80, fontSize: 42 },
  step: { width: 44, height: 44, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: readerShape.card },
  pageBadge: { minWidth: 46, borderStartWidth: StyleSheet.hairlineWidth, paddingStart: 12 },
  submit: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: readerShape.control },
});
