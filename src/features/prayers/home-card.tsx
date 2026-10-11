import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { readerElevation, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { placeName } from './place';
import { usePrayers, useNow } from './provider';
import { clock, countdown, prayerWindow } from './times';

/** The home screen's prayer section: the next time and how long until it, or an invitation to set the place. */
export function PrayerHomeSection() {
  const { palette: p } = useReadingPreferences();
  const { state, ready } = usePrayers();
  const now = useNow(15_000);
  if (!ready) return null;
  const next = state.location ? prayerWindow(state.location, now, state).next : undefined;
  const open = () => router.push('/prayers');
  return <View style={s.section}>
    <View style={s.head}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600', flex: 1 }}>{t('prayers.home.title')}</Text>
      <Pressable accessibilityRole="link" accessibilityLabel={t('prayers.home.all')} onPress={open} style={({ pressed }) => [s.link, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('prayers.home.all')}</Text><ReaderIcon name="chevron" color={p.primary} size={16} />
      </Pressable>
    </View>
    {!state.location || !next
      ? <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.home.setup')} onPress={open} style={({ pressed }) => [s.empty, { borderColor: p.border, opacity: pressed ? 0.7 : 1 }]}>
        <ReaderIcon name="map-pin" color={p.primary} size={18} />
        <Text style={{ flex: 1, color: p.foreground, fontSize: 15 }}>{t('prayers.home.setup')}</Text>
      </Pressable>
      : <Pressable accessibilityRole="link" accessibilityLabel={t('prayers.home.openLabel', { prayer: t(`prayers.names.${next.prayer}`), time: clock(next.at) })} onPress={open}
        style={({ pressed }) => [s.card, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.card }, readerElevation(2, p)]}>
        <IconTile name="mosque" palette={p} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('prayers.home.next', { prayer: t(`prayers.names.${next.prayer}`), time: clock(next.at) })}</Text>
          <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{placeName(state.location)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('prayers.next.in')}</Text>
          <Text style={{ color: p.primary, fontSize: 17, fontWeight: '600' }}>{countdown(now, next.at, false)}</Text>
        </View>
      </Pressable>}
  </View>;
}

const s = StyleSheet.create({
  section: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 68, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg },
});
