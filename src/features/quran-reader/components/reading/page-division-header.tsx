import { readerShape } from '../../design';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { QuranPage } from '../../types/reader';
import type { ReaderPalette } from '../../theme';
import { pageDivisions, quarterLabel, quarterSummary } from '../../utils/page-divisions';

interface Props {
  page: QuranPage;
  previous?: QuranPage;
  next?: QuranPage;
  palette: ReaderPalette;
  onNavigate: (page: number) => void;
}

export function PageDivisionHeader({ page, previous, next, palette, onNavigate }: Props) {
  const current = pageDivisions(page);
  const neighbor = (value: QuranPage | undefined, following: boolean) => {
    const quarters = value ? pageDivisions(value).quarters : [];
    const label = following ? 'الصفحة التالية' : 'الصفحة السابقة';
    const description = value
      ? quarters.length ? quarterSummary(quarters) : 'معلومات التقسيم غير متوفرة'
      : following ? 'نهاية المصحف' : 'بداية المصحف';
    const accessibleDescription = quarters.length ? quarters.map(quarterLabel).join('، ') : description;
    return <Pressable style={[styles.neighbor, { alignItems: following ? 'flex-start' : 'flex-end' }]} disabled={!value} onPress={(event) => { event.stopPropagation(); if (value) onNavigate(value.number); }}
      accessibilityRole={value ? 'button' : 'text'} accessibilityLabel={`${label}. ${accessibleDescription}`}
      accessibilityHint={value ? `انتقل إلى الصفحة ${String(value.number)}` : undefined}>
      <Text numberOfLines={1} style={[styles.caption, { color: palette.muted, textAlign: following ? 'left' : 'right' }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
        style={[styles.division, { color: palette.muted, textAlign: following ? 'left' : 'right' }]}>{description}</Text>
    </Pressable>;
  };
  return <View style={styles.header} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
    {neighbor(next, true)}
    <View style={[styles.current, { backgroundColor: palette.goldSoft }]}>
      <Text style={[styles.juz, { color: palette.ornament }]} accessibilityLiveRegion="polite">
        {current.juz.length ? `الجزء ${current.juz.map(String).join('–')}` : 'الجزء —'}
      </Text>
    </View>
    {neighbor(previous, false)}
  </View>;
}

const styles = StyleSheet.create({
  // Keep physical page positions independent of the device's RTL swapping.
  header: { ...Platform.select({ native: { direction: 'ltr' as const } }), width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  neighbor: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', gap: 3 },
  current: { flex: 0.55, borderRadius: readerShape.control, paddingVertical: 5, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  caption: { width: '100%', fontSize: 10, lineHeight: 17, writingDirection: 'rtl' },
  division: { width: '100%', fontSize: 10, lineHeight: 18, writingDirection: 'rtl' },
  juz: { textAlign: 'center', fontSize: 12, lineHeight: 22, fontWeight: '600', writingDirection: 'rtl' },
});
