import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { AyahReference } from '@/lib/quranpedia/types';
import type { ReaderContent } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { ayahDestination, parseReaderNumber } from '../../utils/navigation';
import { ReaderButton } from './reader-button';
import { Segments } from '../ui/reader-chrome';

export function ReaderJump({ content, currentPage, palette, onJump }: {
  content: ReaderContent; currentPage: number; palette: ReaderPalette; onJump: (page: number, ayah?: AyahReference) => void;
}) {
  const [kind, setKind] = useState<'page' | 'ayah'>('page');
  const [page, setPage] = useState(String(currentPage));
  const [surah, setSurah] = useState('1');
  const [ayah, setAyah] = useState('1');
  const [error, setError] = useState('');
  const selectedSurah = content.quran.surahs.find((value) => value.number === parseReaderNumber(surah));
  const submit = () => {
    if (kind === 'page') {
      const number = parseReaderNumber(page);
      if (!content.pages.some((value) => value.number === number)) { setError(`أدخل رقم صفحة بين 1 و${content.pages.length}.`); return; }
      onJump(number);
    } else {
      const target = ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
      if (!target) { setError('تحقق من رقم السورة والآية في مصحف ورش.'); return; }
      onJump(target.pageNumber, target);
    }
  };
  const input = (label: string, value: string, change: (value: string) => void) => <View style={styles.field}>
    <Text style={{ color: palette.muted }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={(text) => { change(text); setError(''); }}
      keyboardType="number-pad" inputMode="numeric" maxLength={6} onSubmitEditing={submit}
      style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.paper }]} />
  </View>;
  return <View style={styles.form}>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>إلى أين تحب أن تنتقل؟</Text>
    <Segments palette={palette} options={[{ value: 'page', label: 'صفحة' }, { value: 'ayah', label: 'آية' }]} value={kind} onChange={(value) => { setKind(value); setError(''); }} />
    {kind === 'page' ? <>{input('رقم الصفحة', page, setPage)}<Text style={{ color: palette.muted, fontSize: 12 }}>اختر صفحة من 1 إلى {content.pages.length}</Text></> : <>
      <View style={styles.row}>{input('رقم السورة', surah, setSurah)}{input('رقم الآية', ayah, setAyah)}</View>
      <Text style={{ color: palette.muted }}>{selectedSurah ? `${selectedSurah.name} · ${selectedSurah.ayahs.length} آية` : 'رقم السورة من 1 إلى 114'}</Text>
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: palette.warning }}>{error}</Text>}
    <ReaderButton palette={palette} selected onPress={submit}>الانتقال إلى الموضع</ReaderButton>
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, field: { flexGrow: 1, gap: 8 },
  input: { minHeight: 56, borderWidth: 1, borderRadius: 14, padding: 12, fontFamily: 'ReaderNaskh', fontSize: 22, textAlign: 'center', writingDirection: 'ltr' },
});
