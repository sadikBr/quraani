/** The sign the mushaf writes at the end of an ayah of prostration (سجدة التلاوة). */
// eslint-disable-next-line no-restricted-syntax -- a sign of the Quran's text, matched in it
export const SAJDA_SIGN = '۩';

/** Whether the ayah's text carries the sign, as the edition gives it. */
export const hasSajda = (text: string) => text.includes(SAJDA_SIGN);

/**
 * The ayah's text up to the sign, and the sign when it closes the text (as it does in both
 * editions), so it can be drawn in its own colour. The text itself is never changed.
 */
export function splitSajda(text: string): { text: string; sign: string } {
  return text.endsWith(SAJDA_SIGN) ? { text: text.slice(0, -1), sign: SAJDA_SIGN } : { text, sign: '' };
}
