import { Platform, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { t } from '@/i18n';

/** A code as it is shown and shared: two groups of four, «K7Q2-MX4P». */
export const formatCode = (code: string) => code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
/** A code as typed: upper case, letters and digits only, at most eight. */
export const cleanCode = (typed: string) => typed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

/** The link that opens the app on the join screen with the code filled in. */
export const joinLink = (code: string) => Linking.createURL('halaqat/join', { queryParams: { code } });

/** Shares a message (an invitation) the phone's way; copies it where sharing isn't offered. */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'dismissed'> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) throw new Error('No sharing');
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    await Clipboard.setStringAsync(message);
    return 'copied';
  }
}

export const copyText = (text: string) => Clipboard.setStringAsync(text);

/**
 * A code set as tiles, two groups of four with a dash between, each letter on its own small tile
 * with a gold rim, as letters are set on a lawh: read aloud letter by letter.
 */
export function CodeTiles({ code, palette: p, size = 'lg' }: { code: string; palette: ReaderPalette; size?: 'lg' | 'md' }) {
  const cell = size === 'lg' ? 34 : 28;
  const letters = code.split('');
  return <View accessible accessibilityLabel={t('halaqat.sharing.codeLabel', { code: letters.join(' ') })} style={s.row} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
    {[letters.slice(0, 4), letters.slice(4)].map((group, g) => <View key={g} style={s.group}>
      {g === 1 && <Text style={{ color: withAlpha(p.ornament, 0.8), fontSize: cell * 0.6, marginHorizontal: 2 }} aria-hidden>–</Text>}
      {group.map((letter, i) => <View key={i} style={[s.cell, { width: cell, height: cell * 1.22, borderColor: withAlpha(p.ornament, 0.6), backgroundColor: p.background }]}>
        <Text style={{ color: p.foreground, fontSize: cell * 0.62, lineHeight: cell * 0.9, fontFamily: 'UiSans', fontWeight: '700', writingDirection: 'ltr' }}>{letter}</Text>
      </View>)}
    </View>)}
  </View>;
}

// Left to right whatever the page's direction: a code reads as it is typed (the web takes `dir`).
const ltr = Platform.OS === 'web' ? {} : { direction: 'ltr' as const };
const s = StyleSheet.create({
  row: { flexDirection: 'row', ...ltr, alignItems: 'center', justifyContent: 'center', gap: 4 },
  group: { flexDirection: 'row', ...ltr, alignItems: 'center', gap: 4 },
  cell: { borderWidth: 1, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
