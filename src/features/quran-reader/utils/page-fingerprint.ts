/** Two independent 32-bit hashes keep image revisions stable across restarts. */
export function pageFingerprint(xml: string): string {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < xml.length; i++) {
    const char = xml.charCodeAt(i);
    a = Math.imul(a ^ char, 16777619);
    b = Math.imul(b, 33) ^ char;
  }
  return `${xml.length}-${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
}
