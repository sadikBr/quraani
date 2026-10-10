import { Platform, Pressable, StyleSheet, Text as QuranText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { QuranSearchResult } from '../../utils/search';
import type { ReaderPalette } from '../../theme';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { ReaderIcon } from '../ui/reader-chrome';
import { listRowFrame } from '../ui/library-chrome';

/** One row of the results list; `index`/`count` let the row draw its share of the list's shared frame. */
export function AyahResultCard({ item, palette: p, fontFamily, bookmarked, saved, canSave, onOpen, onSave, index = 0, count = 1 }: {
  item: QuranSearchResult; palette: ReaderPalette; fontFamily: string; bookmarked: boolean; saved: boolean; canSave: boolean; onOpen: () => void; onSave: () => void;
  index?: number; count?: number;
}) {
  return <View style={[listRowFrame(index, count), { backgroundColor: p.paper, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.surahName}، الآية ${item.reference.ayahNumber}، صفحة ${item.pageNumber}. ${item.text}`} accessibilityHint="فتح الآية وتحديدها في المصحف" onPress={onOpen}
      style={({ pressed }) => [s.body, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
      <View style={s.heading}>
        <Text accessibilityLabel={item.surahName} style={[calligraphyStyle(32), { color: p.ornament, flex: 1 }]}>{surahNameGlyph(item.reference.surahNumber)}</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>الآية {item.reference.ayahNumber} · صفحة {item.pageNumber}</Text>
      </View>
      <QuranText numberOfLines={3} style={[s.ayah, { color: p.text, fontFamily }]}>{item.text}</QuranText>
    </Pressable>
    <View style={[s.footer, { borderColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${bookmarked ? 'إزالة حفظ' : 'حفظ'} ${item.surahName}، الآية ${item.reference.ayahNumber}`} accessibilityState={{ disabled: !canSave, selected: bookmarked }} aria-pressed={bookmarked} disabled={!canSave} onPress={onSave}
        style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: canSave ? 1 : 0.4 }]}>
        <ReaderIcon name={bookmarked && !saved ? 'check' : 'bookmark'} color={bookmarked ? p.accent : p.muted} size={18} />
        <Text style={{ color: bookmarked ? p.accent : p.muted, fontSize: 13 }}>{saved ? 'إزالة الحفظ' : bookmarked ? 'محفوظة' : 'حفظ الآية'}</Text>
      </Pressable>
      <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: p.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`فتح ${item.surahName}، الآية ${item.reference.ayahNumber}`} onPress={onOpen} style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
        <Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>فتح في المصحف</Text><ReaderIcon name="chevron" color={p.accent} size={16} />
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
