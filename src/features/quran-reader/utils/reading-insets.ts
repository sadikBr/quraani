interface ReadingInsets {
  top: number;
  bottom: number;
}

/** Keep the largest measured safe area during this portrait reading session. */
export function reserveReadingInsets(current: ReadingInsets, measured: ReadingInsets): ReadingInsets {
  const top = Math.max(current.top, measured.top);
  const bottom = Math.max(current.bottom, measured.bottom);
  return top === current.top && bottom === current.bottom ? current : { top, bottom };
}
