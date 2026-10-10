/** Pure colour helpers (no React Native import, so tests and theme code can use them). */
/** Colour with alpha, from a #RRGGBB palette value. */
export function withAlpha(color: string, alpha: number) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}` : color;
}

export function isDarkColor(color: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

/** Blend `b` into `a` by `amount` (0–1); both #RRGGBB. */
export function mixColor(a: string, b: string, amount: number) {
  const pa = /^#([0-9a-f]{6})$/i.exec(a)?.[1], pb = /^#([0-9a-f]{6})$/i.exec(b)?.[1];
  if (!pa || !pb) return a;
  return '#' + [0, 2, 4].map(i => Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - amount) + parseInt(pb.slice(i, i + 2), 16) * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}
