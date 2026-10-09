import { Platform, Pressable, StyleSheet, Text as QuranText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { QuranSearchResult } from '../../utils/search';
import type { ReaderPalette } from '../../theme';
import { readerShape } from '../../design';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { ReaderIcon } from '../ui/reader-chrome';

export function AyahResultCard({ item, palette: p, fontFamily, bookmarked, saved, canSave, onOpen, onSave }: {
  item: QuranSearchResult; palette: ReaderPalette; fontFamily: string; bookmarked: boolean; saved: boolean; canSave: boolean; onOpen: () => void; onSave: () => void;
}) {
  return <View style={[s.card, { backgroundColor: p.paper, borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.surahName}، الآية ${item.reference.ayahNumber}، صفحة ${item.pageNumber}. ${item.text}`} accessibilityHint="فتح الآية وتحديدها في المصحف" onPress={onOpen}
      style={({ pressed }) => [s.body, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
      <View style={s.heading}>
        <Text accessibilityLabel={item.surahName} style={[calligraphyStyle(32), { color: p.ornament, flex: 1 }]}>{surahNameGlyph(item.reference.surahNumber)}</Text>
        <View style={[s.reference, { backgroundColor: p.accentSoft }]}><Text style={{ color: p.accent, fontSize: 11 }}>الآية {item.reference.ayahNumber}</Text></View>
      </View>
      <QuranText numberOfLines={3} style={[s.ayah, { color: p.text, fontFamily }]}>{item.text}</QuranText>
      <Text style={{ color: p.muted, fontSize: 11 }}>صفحة {item.pageNumber}</Text>
    </Pressable>
    <View style={[s.footer, { borderColor: p.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${bookmarked ? 'إزالة حفظ' : 'حفظ'} ${item.surahName}، الآية ${item.reference.ayahNumber}`} accessibilityState={{ disabled: !canSave, selected: bookmarked }} aria-pressed={bookmarked} disabled={!canSave} onPress={onSave}
        style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: canSave ? 1 : 0.4 }]}>
        <ReaderIcon name={bookmarked && !saved ? 'check' : 'bookmark'} color={bookmarked ? p.accent : p.muted} size={18} />
        <Text style={{ color: bookmarked ? p.accent : p.muted, fontSize: 12 }}>{saved ? 'إزالة الحفظ' : bookmarked ? 'محفوظة' : 'حفظ الآية'}</Text>
      </Pressable>
      <View style={{ width: 1, height: 18, backgroundColor: p.border }} />
      <Pressable accessibilityRole="button" accessibilityLabel={`فتح ${item.surahName}، الآية ${item.reference.ayahNumber}`} onPress={onOpen} style={({ pressed }) => [s.action, { backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
        <Text style={{ color: p.accent, fontSize: 12, fontWeight: '600' }}>فتح في المصحف</Text><ReaderIcon name="chevron" color={p.accent} size={16} />
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden', marginBottom: 12 },
  body: { padding: 16, gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reference: { borderRadius: readerShape.control, paddingHorizontal: 10, paddingVertical: 3 },
  ayah: { fontSize: 24, lineHeight: 46, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'auto' : 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  action: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 7 },
});
