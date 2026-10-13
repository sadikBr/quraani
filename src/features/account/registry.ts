import type { DocumentSource, HalaqatSource } from './sync/types';

/**
 * The datasets that sync with the account, registered by the providers that keep them (each one
 * the only writer of its data on the phone). Sync reads them from here, and hears when they change.
 */

const documents = new Map<string, DocumentSource>();
let halaqat: HalaqatSource | undefined;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

/**
 * Registers a dataset kept whole; returns the way to take it back. Once taken back (its provider
 * went away), a sync that still holds it can't change it: nothing lands in a store no longer shown.
 */
export function registerDocument(source: DocumentSource) {
  let live = true;
  const entry: DocumentSource = { ...source, replace: (raw, expected) => live ? source.replace(raw, expected) : Promise.resolve(false) };
  documents.set(source.key, entry);
  const stop = source.subscribe(changed);
  changed();
  return () => {
    live = false;
    stop();
    if (documents.get(source.key) === entry) documents.delete(source.key);
  };
}

export function registerHalaqat(source: HalaqatSource) {
  let live = true;
  const entry: HalaqatSource = { ...source, transform: (change) => live && source.transform(change) };
  halaqat = entry;
  const stop = source.subscribe(changed);
  changed();
  return () => {
    live = false;
    stop();
    if (halaqat === entry) halaqat = undefined;
  };
}

export const syncedDocuments = () => [...documents.values()];
export const syncedHalaqat = () => halaqat;
/** Called when a dataset registers or changes. */
export function onSyncedChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
