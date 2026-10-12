import { Fragment, cloneElement, createElement, isValidElement, type ElementType, type ReactElement, type ReactNode } from 'react';

/** For `JustifiedText`: nested text cut where its last line starts. No React Native here, so it can be tested. */

const NO_BACKGROUND = { backgroundColor: 'transparent' };

/** The characters of nested text, as the text view joins them. */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return '';
}

type Part = 'head' | 'tail' | 'hiddenTail';

/**
 * The part of nested text before character `at` (`head`) or from it (`tail`), keeping every span
 * and cutting those across `at`. `hiddenTail` is the tail made invisible: each run takes the
 * `hidden` style, and spans of the host `Text` lose their background (a selected ayah's highlight).
 * The pieces come back in new lists, so each span keeps its key or, lacking one (a span written
 * beside text, such as an ayah's number), takes its place as its key.
 */
function cut(node: ReactNode, start: number, at: number, part: Part, hidden: object, key: string, Text: ElementType): { out: ReactNode; end: number } {
  if (node === null || node === undefined || typeof node === 'boolean') return { out: null, end: start };
  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node), end = start + text.length;
    const split = Math.min(text.length, Math.max(0, at - start));
    if (part === 'head') return { out: split ? text.slice(0, split) : null, end };
    const tail = text.slice(split);
    if (!tail) return { out: null, end };
    return { out: part === 'tail' ? tail : createElement(Text, { key, style: hidden }, tail), end };
  }
  if (Array.isArray(node)) {
    let position = start;
    const out = node.map((child, i) => {
      const result = cut(child, position, at, part, hidden, `${key}.${i}`, Text);
      position = result.end;
      return result.out;
    });
    return { out, end: position };
  }
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode; style?: unknown }>;
    const end = start + textOf(element.props.children).length;
    if (part === 'head' ? start >= at : end <= at) return { out: null, end };
    const inner = cut(element.props.children, start, at, part, hidden, key, Text);
    const clear = part === 'hiddenTail' && element.type === Text ? { style: [element.props.style, NO_BACKGROUND] } : {};
    return { out: cloneElement(element, { ...clear, key: element.key ?? key }, inner.out), end };
  }
  return { out: null, end: start };
}

/**
 * Nested text split before character `at` (where its last line starts): the whole text with that
 * line hidden (`main`, for the layout) and the line itself (`line`, drawn centred over it).
 */
export function splitLastLine(children: ReactNode, at: number, hidden: object, Text: ElementType) {
  // The two halves hold the same spans, so each half is a list of its own and their keys never meet.
  return {
    main: [
      createElement(Fragment, { key: 'h' }, cut(children, 0, at, 'head', hidden, 'h', Text).out),
      createElement(Fragment, { key: 't' }, cut(children, 0, at, 'hiddenTail', hidden, 't', Text).out),
    ],
    line: cut(children, 0, at, 'tail', hidden, 'c', Text).out,
  };
}
