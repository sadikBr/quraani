import { describe, expect, test } from 'bun:test';
import { createElement as h, isValidElement } from 'react';
import { layoutKey, splitLastLine, textOf } from '../src/components/last-line';

// Stands for React Native's Text, the host span.
const Text = (props) => props.children;

const hidden = { color: 'card', opacity: 0 };
/** The text of a tree, with hidden runs in brackets; a span's background shown as {…}. */
function show(node, inHidden = false) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return inHidden ? `[${node}]` : String(node);
  if (Array.isArray(node)) return node.map((child) => show(child, inHidden)).join('');
  const style = [node.props.style].flat(3).filter(Boolean);
  const isHidden = style.some((s) => s === hidden);
  const background = style.reduce((bg, s) => s.backgroundColor !== undefined ? s.backgroundColor : bg, undefined);
  const inner = Array.isArray(node.props.children) || typeof node.props.children !== 'object' || node.props.children === null
    ? show(node.props.children, inHidden || isHidden) : show(node.props.children, inHidden || isHidden);
  return background && background !== 'transparent' ? `{${inner}}` : inner;
}

describe('justified text with a centred last line', () => {
  // Two ayahs; the second is selected (highlighted) and its marker is a span of its own.
  const ayahs = [
    h(Text, { key: 1 }, 'الحمد لله رب العالمين', ' ', h(Text, { style: { color: 'gold' } }, '١'), ' '),
    h(Text, { key: 2, style: { backgroundColor: 'yellow' } }, 'الرحمن الرحيم', ' ', h(Text, { style: { color: 'gold' } }, '٢'), ' '),
  ];
  const all = textOf(ayahs);

  test('the text is read as the text view joins it', () => {
    expect(all).toBe('الحمد لله رب العالمين ١ الرحمن الرحيم ٢ ');
  });

  test('the last line is hidden in place and drawn on its own, spans and highlight kept', () => {
    const at = all.indexOf('الرحيم');
    const { main, line } = splitLastLine(ayahs, at, hidden, Text);
    // Same characters in the same order, so the layout does not change.
    expect(textOf(main)).toBe(all);
    expect(textOf(line)).toBe('الرحيم ٢ ');
    // In the paragraph the line is hidden, and the selected ayah's highlight stops where it starts.
    expect(show(main)).toBe('الحمد لله رب العالمين ١ {الرحمن }[الرحيم][ ][٢][ ]');
    // The centred copy keeps the highlight and the marker's span.
    expect(show(line)).toBe('{الرحيم ٢ }');
  });

  test('a single line is centred whole', () => {
    const { main, line } = splitLastLine(ayahs, 0, hidden, Text);
    expect(textOf(line)).toBe(all);
    // Nothing of the paragraph is left visible: every run is hidden.
    expect(show(main).replace(/\[[^\]]*\]/g, '')).toBe('');
    expect(textOf(main)).toBe(all);
  });

  /** What React would warn about: spans in a list (every list here is a new one) without a key, or sharing one. */
  function keyProblems(node, problems = []) {
    if (Array.isArray(node)) {
      const keys = node.filter(isValidElement).map((child) => child.key);
      if (keys.some((key) => key === null)) problems.push(`missing key in “${textOf(node)}”`);
      if (new Set(keys).size !== keys.length) problems.push(`repeated key in “${textOf(node)}”`);
      node.forEach((child) => keyProblems(child, problems));
    } else if (isValidElement(node)) keyProblems(node.props.children, problems);
    return problems;
  }

  test('every span in the pieces has a key of its own (the ayah numbers have none)', () => {
    const shapes = [
      ayahs,
      // The reader's ayah layout: the text, then its number's span.
      ['الرحمن الرحيم', h(Text, { style: { color: 'gold' } }, ' ', '٢')],
      // A single span, keyed or not, so both halves hold the same span.
      h(Text, { key: 'x' }, 'كلمات ', h(Text, null, '١'), ' أخرى'),
      h(Text, null, 'كلمات ', h(Text, null, '١'), ' أخرى'),
    ];
    for (const children of shapes) {
      const length = textOf(children).length;
      for (const at of [0, 4, Math.floor(length / 2), length - 2]) {
        const { main, line } = splitLastLine(children, at, hidden, Text);
        expect(keyProblems(main)).toEqual([]);
        expect(keyProblems(line)).toEqual([]);
      }
    }
  });

  test('a layout is known again only for the same text in the same type', () => {
    const style = { fontFamily: 'QuranWarsh', fontSize: 32, lineHeight: 61, color: 'black' };
    const key = layoutKey('قل هو الله أحد', style);
    // Colours and highlights do not move the lines.
    expect(layoutKey('قل هو الله أحد', { ...style, color: 'gold', backgroundColor: 'yellow' })).toBe(key);
    // Another size, spacing, font or text does.
    expect(layoutKey('قل هو الله أحد', { ...style, fontSize: 36 })).not.toBe(key);
    expect(layoutKey('قل هو الله أحد', { ...style, lineHeight: 72 })).not.toBe(key);
    expect(layoutKey('قل هو الله أحد', { ...style, fontFamily: 'QuranHafs' })).not.toBe(key);
    expect(layoutKey('قل هو الله احد', style)).not.toBe(key);
    expect(layoutKey('', undefined)).toBe(layoutKey('', {}));
  });
});
