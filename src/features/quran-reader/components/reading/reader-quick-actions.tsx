import { readerShape } from '../../design';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { useQuranFont } from '../../hooks/use-quran-font';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import { pageDivisions } from '../../utils/page-divisions';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';

interface Props {
  page: QuranPage;
  surahName: string;
  palette: ReaderPalette;
  onMenu: () => void;
}

export function ReaderQuickActions({ page, surahName, palette, onMenu }: Props) {
  const font = useQuranFont();
  const surahNumber = page.ayahs[0]?.surahNumber;
  const calligraphy = font.loaded && !!surahNumber;
  const divisions = pageDivisions(page);
  const hizbs = [...new Set(divisions.quarters.map((quarter) => quarter.hizb))];
  const location = [divisions.juz.length ? `الجزء ${divisions.juz.join('–')}` : '', hizbs.length ? `الحزب ${hizbs.join('–')}` : ''].filter(Boolean).join(' · ');
  const iconLink = (href: '/search' | '/settings', icon: ReaderIconName, label: string) => (
    <Link href={href} asChild style={styles.iconLink}>
      <Pressable accessibilityRole="link" accessibilityLabel={label}>
        {({ pressed }) => <View style={[styles.icon, { backgroundColor: pressed ? palette.accent : 'transparent' }]}>
          <ReaderIcon name={icon} color={palette.foreground} size={20} />
        </View>}
      </Pressable>
    </Link>
  );
  return <View accessibilityLabel="أدوات القراءة" style={styles.toolbar} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
    {iconLink('/settings', 'settings', 'إعدادات القراءة')}
    {iconLink('/search', 'search', 'البحث في القرآن')}
    <Link href="/quran-index" asChild style={styles.location}>
      <Pressable accessibilityRole="link" accessibilityLabel={`${surahName}، ${location}، فتح الفهرس`}>
        {({ pressed }) => <View style={[styles.locationContent, {
          backgroundColor: pressed ? palette.accent : palette.muted,
          borderColor: pressed ? palette.ring : 'transparent',
        }]}>
          <View style={styles.locationText}>
            <Text accessibilityLabel={surahName} numberOfLines={1}
              style={[styles.surah, calligraphy && styles.surahCalligraphy, { color: palette.foreground }]}>
              {calligraphy ? surahNameGlyph(surahNumber!) : surahName}
            </Text>
            <Text numberOfLines={1} style={[styles.divisions, { color: palette.mutedForeground }]}>{location}</Text>
          </View>
        </View>}
      </Pressable>
    </Link>
    <Pressable accessibilityRole="button" accessibilityLabel="فتح قائمة التطبيق" onPress={onMenu}
      style={({ pressed }) => [styles.icon, { backgroundColor: pressed ? palette.accent : 'transparent' }]}>
      <ReaderIcon name="menu" color={palette.foreground} size={20} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { ...Platform.select({ native: { direction: 'ltr' as const } }), flexDirection: 'row', alignItems: 'center',
    width: '100%', maxWidth: 420, alignSelf: 'center', paddingHorizontal: 4, paddingVertical: 4, gap: 4 },
  iconLink: { width: 44, minHeight: 44, justifyContent: 'center' },
  icon: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  location: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  locationContent: { width: '100%', maxWidth: 260, minHeight: 44, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 2, borderWidth: 1, borderRadius: readerShape.lg },
  locationText: { flex: 1, minWidth: 0, alignItems: 'center' },
  surah: { fontSize: 13, lineHeight: 21, fontWeight: '600' },
  surahCalligraphy: { ...calligraphyStyle(28), lineHeight: 28 },
  divisions: { fontSize: 12, lineHeight: 17, writingDirection: 'rtl' },
});
