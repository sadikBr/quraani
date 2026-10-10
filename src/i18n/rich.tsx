import { Fragment, type ReactNode } from 'react';
import { translateParts } from './translate';
import type { MessageArgs, MessageKey } from './types';

/** Like t(), but placeholders may be React nodes, e.g. a bold name inside a sentence. */
export function tRich<K extends MessageKey>(key: K, ...args: MessageArgs<K, ReactNode>): ReactNode {
  return translateParts<ReactNode>(key, args[0] as Record<string, ReactNode> | undefined).map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
