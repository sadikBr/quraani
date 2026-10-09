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
