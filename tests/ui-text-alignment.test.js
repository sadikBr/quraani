import { expect, test } from 'bun:test';
import { rtlTextAlignment } from '../src/lib/ui-text-alignment';

test('Android RTL headings use paragraph start instead of the reversed right alignment', () => {
  expect(rtlTextAlignment('right', 'android')).toBe('auto');
  expect(rtlTextAlignment('left', 'android')).toBe('right');
});
test('web/iOS retain physical alignment and centered or justified text is never reversed', () => {
  for (const platform of ['android', 'ios', 'web']) {
    expect(rtlTextAlignment('center', platform)).toBe('center');
    expect(rtlTextAlignment('justify', platform)).toBe('justify');
  }
  for (const platform of ['ios', 'web']) {
    expect(rtlTextAlignment('right', platform)).toBe('right');
    expect(rtlTextAlignment('left', platform)).toBe('left');
  }
});
