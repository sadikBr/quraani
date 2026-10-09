import type { ReaderAppearance, ReaderPalette } from '../../theme';
import type { ReaderTextLayout } from '../../types/reader';
import { ReaderThemePicker } from './reader-theme-picker';
import { ReaderTextComfort } from './reader-text-comfort';

interface Props {
  section: 'reading' | 'appearance';
  fixedPage: boolean; palette: ReaderPalette; appearance: ReaderAppearance;
  setAppearance: (value: ReaderAppearance) => void; fontSize: number; setFontSize: (value: number) => void;
  spacious: boolean; setSpacious: (value: boolean) => void; textLayout: ReaderTextLayout;
}
export function ReaderSettings({ section, fixedPage, palette, appearance, setAppearance, fontSize, setFontSize, spacious, setSpacious, textLayout }: Props) {
  if (section === 'appearance') return <ReaderThemePicker appearance={appearance} onChange={setAppearance} palette={palette} />;
  return fixedPage ? null : <ReaderTextComfort palette={palette} fontSize={fontSize} setFontSize={setFontSize} spacious={spacious} setSpacious={setSpacious} textLayout={textLayout} />;
}
