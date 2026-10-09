import { expect, test } from 'bun:test';
import { decodeReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';
import { readerThemeOptions, readerThemes, resolveReaderTheme } from '../src/features/quran-reader/theme';

test('every theme survives preference storage without losing reading settings', () => {
  for (const { id } of readerThemeOptions) {
    const saved = { appearance: id, mode: 'text', textLayout: 'flowing', fontSize: 36, spacious: true };
    expect(decodeReadingPreferences(JSON.stringify(saved))).toEqual(saved);
  }
  for (const appearance of ['toString', '__proto__', 'constructor', {}, null]) {
    expect(decodeReadingPreferences(JSON.stringify({ appearance })).appearance).toBe('system');
  }
});

test('only the device option follows system appearance; custom night themes use light status icons', () => {
  expect(resolveReaderTheme('system', 'dark')).toEqual({ palette: readerThemes.dark, dark: true });
  expect(resolveReaderTheme('system', 'light')).toEqual({ palette: readerThemes.light, dark: false });
  expect(resolveReaderTheme('system', null)).toEqual({ palette: readerThemes.light, dark: false });
  for (const { id, dark } of readerThemeOptions.filter(({ id }) => id !== 'system')) {
    expect(resolveReaderTheme(id, 'dark')).toEqual({ palette: readerThemes[id], dark });
    expect(resolveReaderTheme(id, 'light')).toEqual({ palette: readerThemes[id], dark });
  }
});

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('all themes keep Quran text, labels, and selected controls legible', () => {
  for (const [id, palette] of Object.entries(readerThemes)) {
    for (const [foreground, background] of [
      ['text', 'paper'], ['text', 'background'], ['muted', 'paper'], ['muted', 'background'],
      ['accent', 'paper'], ['accent', 'accentSoft'], ['onHero', 'hero'], ['heroMuted', 'hero'],
    ]) {
      expect(contrast(palette[foreground], palette[background]), `${id}: ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(palette.ornament, palette.paper), `${id}: ayah markers`).toBeGreaterThanOrEqual(3);
  }
});
