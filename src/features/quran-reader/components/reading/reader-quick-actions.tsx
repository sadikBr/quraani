import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
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
        {({ pressed }) => <View style={[styles.locationContent, { opacity: pressed ? 0.55 : 1 }]}>
          <View style={styles.locationText}>
            <Text numberOfLines={1} style={[styles.surah, { color: palette.text }]}>{surahName}</Text>
            <Text numberOfLines={1} style={[styles.divisions, { color: palette.muted }]}>{location}</Text>
          </View>
          <View style={{ transform: [{ rotate: '-90deg' }] }}><ReaderIcon name="chevron" color={palette.ornament} size={13} /></View>
        </View>}
      </Pressable>
    </Link>
    {iconLink('/search', 'search', 'البحث في القرآن')}
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 2 },
  iconLink: { width: 44, minHeight: 44, justifyContent: 'center' },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  location: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  locationContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  locationText: { flexShrink: 1, alignItems: 'center' },
  surah: { fontSize: 13, lineHeight: 21, fontWeight: '600' },
  divisions: { fontSize: 10, lineHeight: 17 },
});
