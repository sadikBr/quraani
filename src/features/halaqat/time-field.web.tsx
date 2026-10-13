import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import type { TimeFieldProps } from './time-field';

/** The browser's own time field, drawn as the phone's pill. */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const { palette: p, dark } = useReadingPreferences();
  return <input aria-label={label} type="time" value={value} onChange={(event) => { if (event.target.value) onChange(event.target.value); }}
    style={{ minHeight: 40, minWidth: 84, padding: '0 12px', boxSizing: 'border-box', border: `1px solid ${withAlpha(p.ornament, 0.6)}`, borderRadius: readerShape.pill,
      background: withAlpha(p.ornament, 0.08), color: p.foreground, colorScheme: dark ? 'dark' : 'light', fontFamily: 'UiNumericSemiBold', fontSize: 18, textAlign: 'center' }} />;
}
