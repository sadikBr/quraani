import { Button, Tabs } from '@/components/ui';
import type { ReaderPalette } from '../../theme';
import type { ReaderIconName } from './reader-icon';

export { ReaderIcon, type ReaderIconName } from './reader-icon';

/** Outline icon button (`icon-lg`, 40px) with hit slop to 48. */
export function IconButton({ name, label, onPress, palette }: { name: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette }) {
  return <Button icon={name} label={label} onPress={onPress} palette={palette} variant="outline" />;
}

/** In-page switching between a few options: the design system's segmented Tabs. */
export function Segments<T extends string>({ options, value, onChange, palette }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; palette: ReaderPalette }) {
  return <Tabs options={options} value={value} onChange={onChange} palette={palette} role="button" />;
}
