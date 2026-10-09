import { StyleSheet, View } from 'react-native';
import type { ReaderAppearance, ReaderPalette } from '../../theme';
import type { ReaderTextLayout } from '../../types/reader';
import { ReaderThemePicker } from './reader-theme-picker';
import { readerLayout } from '../../design';
import { ReaderTextComfort } from './reader-text-comfort';

interface Props {
  fixedPage: boolean; palette: ReaderPalette; appearance: ReaderAppearance;
  setAppearance: (value: ReaderAppearance) => void; fontSize: number; setFontSize: (value: number) => void;
  spacious: boolean; setSpacious: (value: boolean) => void; textLayout: ReaderTextLayout;
}
export function ReaderSettings({ fixedPage, palette, appearance, setAppearance, fontSize, setFontSize, spacious, setSpacious, textLayout }: Props) {
  return <View style={styles.sections}>
    {!fixedPage && <ReaderTextComfort palette={palette} fontSize={fontSize} setFontSize={setFontSize} spacious={spacious} setSpacious={setSpacious} textLayout={textLayout} />}
    <ReaderThemePicker appearance={appearance} onChange={setAppearance} palette={palette} />
  </View>;
}
const styles = StyleSheet.create({
  sections: { gap: readerLayout.sectionGap },
});
