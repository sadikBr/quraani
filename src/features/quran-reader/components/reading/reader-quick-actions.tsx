import { readerShape } from '../../design';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { SURAH_NAME_FONT_FAMILY } from '../../config';
import { useWarshFont } from '../../hooks/use-warsh-font';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import { pageDivisions } from '../../utils/page-divisions';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';

interface Props {
  page: QuranPage;
  surahName: string;
  palette: ReaderPalette;
}

export function ReaderQuickActions({ page, surahName, palette }: Props) {
  const font = useWarshFont();
  const surahNumber = page.ayahs[0]?.surahNumber;
  const calligraphy = font.loaded && !!surahNumber;
  const divisions = pageDivisions(page);
  const hizbs = [...new Set(divisions.quarters.map((quarter) => quarter.hizb))];
  const location = [divisions.juz.length ? `الجزء ${divisions.juz.join('–')}` : '', hizbs.length ? `الحزب ${hizbs.join('–')}` : ''].filter(Boolean).join(' · ');
  const iconLink = (href: '/search' | '/settings', icon: ReaderIconName, label: string) => (
    <Link href={href} asChild style={styles.iconLink}>
      <Pressable accessibilityRole="link" accessibilityLabel={label}>
        {({ pressed }) => <View style={[styles.icon, { backgroundColor: pressed ? palette.accentSoft : 'transparent' }]}>
          <ReaderIcon name={icon} color={palette.text} size={20} />
        </View>}
      </Pressable>
    </Link>
  );
  return <View accessibilityLabel="أدوات القراءة" style={styles.toolbar}>
    {iconLink('/settings', 'settings', 'إعدادات القراءة')}
    <Link href="/quran-index" asChild style={styles.location}>
      <Pressable accessibilityRole="link" accessibilityLabel={`${surahName}، ${location}، فتح الفهرس`}>
        {({ pressed }) => <View style={[styles.locationContent, {
          backgroundColor: pressed ? palette.selected : palette.accentSoft,
          borderColor: pressed ? palette.accent : palette.border,
        }]}>
          <View style={styles.locationText}>
            <Text accessibilityLabel={surahName} numberOfLines={1}
              style={[styles.surah, calligraphy && styles.surahCalligraphy, { color: palette.text }]}>
              {calligraphy ? String(surahNumber).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : surahName}
            </Text>
            <Text numberOfLines={1} style={[styles.divisions, { color: palette.muted }]}>{location}</Text>
          </View>
        </View>}
      </Pressable>
    </Link>
    {iconLink('/search', 'search', 'البحث في القرآن')}
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 6 },
  iconLink: { width: 44, minHeight: 44, justifyContent: 'center' },
  icon: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  location: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  locationContent: { width: '100%', maxWidth: 260, minHeight: 44, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, borderWidth: 1, borderRadius: readerShape.control },
  locationText: { flex: 1, minWidth: 0, alignItems: 'center' },
  surah: { fontSize: 13, lineHeight: 21, fontWeight: '600' },
  surahCalligraphy: { fontFamily: SURAH_NAME_FONT_FAMILY, fontSize: 28, lineHeight: 28, fontWeight: '400', includeFontPadding: false },
  divisions: { fontSize: 10, lineHeight: 17 },
});
