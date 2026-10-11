import { describe, expect, test } from 'bun:test';
import { createElement as h } from 'react';
import { splitLastLine, textOf } from '../src/components/last-line';

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
});
