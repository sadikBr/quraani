import { useEffect, useState } from 'react';
import { createAyahPointerPress } from '../../utils/ayah-pointer-press';
import type { AyahTextActionProps } from './ayah-text-action';

// A native HTML button cannot wrap inline across paragraph lines, even with
// display: inline. Keep the text as a span with equivalent keyboard actions.
export function AyahTextAction({ children, color, label, hint, onPress, onLongPress }: AyahTextActionProps) {
  const [press] = useState(() => createAyahPointerPress());
  useEffect(() => () => press.cancel(), [press]);
  return <span role="button" tabIndex={0} aria-label={label} aria-description={hint}
    style={{ color, cursor: 'pointer', WebkitTouchCallout: 'none', userSelect: 'none' }}
    onPointerDown={(event) => { if (event.button === 0 && event.isPrimary) press.start(event.clientX, event.clientY, onLongPress); else press.cancel(); }}
    onPointerMove={(event) => press.move(event.clientX, event.clientY)}
    onPointerUp={press.end} onPointerCancel={press.cancel} onPointerLeave={press.cancel}
    onContextMenu={onLongPress ? (event) => { event.preventDefault(); event.stopPropagation(); press.cancel(); onLongPress(); } : undefined}
    onClick={(event) => { event.stopPropagation(); if (!press.consumeClick()) onPress(); }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onPress(); }
    }}>{children}</span>;
}
