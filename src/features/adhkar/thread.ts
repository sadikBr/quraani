/**
 * Where the beads sit on the session's string, a bead a dhikr. The bead of the dhikr shown takes a
 * wider slot, room for its ring, and the others share the rest of the string evenly.
 *
 * Positions are counted from the string's right end, as the app reads right to left, and are
 * worked out here rather than left to the layout: on Android, a slot that changed its width when
 * the dhikr changed kept part of its old size.
 */
export interface BeadLayout {
  /** The centre of bead `index`, from the string's left end. */
  x(index: number): number;
  /** The bead under a point `x` from the string's left end (the nearest one, within the string). */
  at(x: number): number;
}

export function beadLayout(count: number, current: number, width: number, wide: number): BeadLayout {
  if (count <= 1 || width <= 0) return { x: () => width / 2, at: () => 0 };
  const here = Math.min(Math.max(0, Math.round(current)), count - 1);
  const slot = Math.min(wide, width);
  const narrow = (width - slot) / (count - 1);
  /** Where a bead's slot starts, and how wide it is, from the right end. */
  const start = (i: number) => (i <= here ? i * narrow : here * narrow + slot + (i - here - 1) * narrow);
  const size = (i: number) => (i === here ? slot : narrow);
  return {
    x: (i) => width - (start(i) + size(i) / 2),
    at: (x) => {
      const from = width - x;
      const before = here * narrow;
      const index = from < before ? Math.floor(from / narrow)
        : from < before + slot ? here
          : here + 1 + Math.floor((from - before - slot) / narrow);
      return Math.min(Math.max(0, index), count - 1);
    },
  };
}
