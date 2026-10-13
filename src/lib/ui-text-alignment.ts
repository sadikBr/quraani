export type TextAlignment = 'auto' | 'left' | 'right' | 'center' | 'justify';

/** Physical alignment for an explicitly RTL text node.
 * RN 0.86 Android interprets right as the paragraph's opposite edge.
 * Auto follows its RTL paragraph start; web/iOS use physical left/right.
 */
export function rtlTextAlignment(alignment: TextAlignment, platform: string): TextAlignment {
  if (platform !== 'android') return alignment;
  if (alignment === 'right') return 'auto';
  if (alignment === 'left') return 'right';
  return alignment;
}

/**
 * A text field written right to left: its text, placeholder and cursor at the right. A field's
 * alignment is the platform's own (on Android, the field's gravity), which is physical whatever
 * the layout's direction: unlike text (see `rtlTextAlignment`), `right` is the right on every
 * platform, and `left` would hold an Arabic field to the left. Latin typed into it (an email)
 * keeps the right too.
 */
export const rtlInput = { textAlign: 'right', writingDirection: 'rtl' } as const;
