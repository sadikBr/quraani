// Encode once per page/theme. Numeric entities keep XML Unicode intact and let
// the same base64 data URI work with native image decoders and the browser.
export function svgImageUri(xml: string): string {
  const ascii = xml.replace(/[^\x00-\x7F]/gu, (char) => `&#${char.codePointAt(0)};`);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  for (let start = 0; start < ascii.length; start += 12288) {
    let chunk = '';
    for (let i = start; i < Math.min(start + 12288, ascii.length); i += 3) {
      const a = ascii.charCodeAt(i), b = ascii.charCodeAt(i + 1), c = ascii.charCodeAt(i + 2);
      chunk += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] +
        (i + 1 < ascii.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
        (i + 2 < ascii.length ? alphabet[c & 63] : '=');
    }
    chunks.push(chunk);
  }
  return `data:image/svg+xml;base64,${chunks.join('')}`;
}
