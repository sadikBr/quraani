/**
 * JSON with its object keys sorted, so that the same data always reads the same however it was
 * built (the database returns keys in its own order).
 */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? 'null' : canonical(item)).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}

/** A short fingerprint of a string (53-bit cyrb53): equal data, equal fingerprint. */
export function hash(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + `.${text.length.toString(36)}`;
}

/** The fingerprint of some data, however its keys are ordered. */
export const fingerprint = (value: unknown) => hash(canonical(value));
/** The fingerprint of serialized data. */
export const fingerprintOf = (raw: string) => fingerprint(JSON.parse(raw));
