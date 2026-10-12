import { Platform, Pressable, StyleSheet, Text as QuranText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { QuranSearchResult } from '../../utils/search';
import type { ReaderPalette } from '../../theme';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { ReaderIcon } from '../ui/reader-chrome';
import { listRowFrame } from '../ui/library-chrome';
import { t } from '@/i18n';

/** One row of the results list; `index`/`count` let the row draw its share of the list's shared frame. */
export function AyahResultCard({ item, palette: p, fontFamily, display = (text) => text, bookmarked, saved, canSave, onOpen, onSave, index = 0, count = 1 }: {
  item: QuranSearchResult; palette: ReaderPalette; fontFamily: string; bookmarked: boolean; saved: boolean; canSave: boolean; onOpen: () => void; onSave: () => void;
  /** The text as the font draws it (see `quranScript`). */
  display?: (text: string) => string;
  index?: number; count?: number;
}) {
  return <View style={[listRowFrame(index, count), { backgroundColor: p.card, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('library.result.label', { surah: item.surahName, ayah: item.reference.ayahNumber, page: item.pageNumber, text: item.text })} accessibilityHint={t('library.result.hint')} onPress={onOpen}
      style={({ pressed }) => [s.body, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={s.heading}>
        <Text accessibilityLabel={item.surahName} style={[calligraphyStyle(32), { color: p.ornament, flex: 1 }]}>{surahNameGlyph(item.reference.surahNumber)}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('library.result.position', { ayah: item.reference.ayahNumber, page: item.pageNumber })}</Text>
      </View>
      <QuranText numberOfLines={3} style={[s.ayah, { color: p.foreground, fontFamily }]}>{display(item.text)}</QuranText>
    </Pressable>
    <View style={[s.footer, { borderColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={bookmarked ? t('library.result.unsaveLabel', { surah: item.surahName, ayah: item.reference.ayahNumber }) : t('library.result.saveLabel', { surah: item.surahName, ayah: item.reference.ayahNumber })} accessibilityState={{ disabled: !canSave, selected: bookmarked }} aria-pressed={bookmarked} disabled={!canSave} onPress={onSave}
        style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accent : 'transparent', opacity: canSave ? 1 : 0.4 }]}>
        <ReaderIcon name={bookmarked && !saved ? 'check' : 'bookmark'} color={bookmarked ? p.primary : p.mutedForeground} size={18} />
        <Text style={{ color: bookmarked ? p.primary : p.mutedForeground, fontSize: 14, fontWeight: '500' }}>{saved ? t('library.result.unsave') : bookmarked ? t('library.result.saved') : t('library.result.save')}</Text>
      </Pressable>
      <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: p.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('library.result.openLabel', { surah: item.surahName, ayah: item.reference.ayahNumber })} onPress={onOpen} style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('library.result.open')}</Text><ReaderIcon name="chevron" color={p.primary} size={16} />
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  body: { padding: 16, paddingBottom: 12, gap: 10 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ayah: { fontSize: 24, lineHeight: 46, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'auto' : 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  action: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 7 },
});
