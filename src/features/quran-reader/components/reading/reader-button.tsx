import { Button } from '@/components/ui';
import type { ReaderPalette } from '../../theme';

interface Props {
  children: string;
  label?: string;
  onPress: () => void;
  palette: ReaderPalette;
  /** The primary (filled) style; otherwise outline. */
  selected?: boolean;
  disabled?: boolean;
}

/** A full-width, 48-tall phone button (design system `default` or `outline`). */
export function ReaderButton({ children, label, onPress, palette, selected, disabled }: Props) {
  return <Button label={label} onPress={onPress} palette={palette} variant={selected ? 'default' : 'outline'} size="lg" disabled={disabled} selected={!!selected} block>{children}</Button>;
}
