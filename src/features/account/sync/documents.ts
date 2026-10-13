import { fingerprint, fingerprintOf } from './fingerprint';
import type { DocumentConflict, DocumentSource, Ledger, Remote } from './types';

export interface DocumentsResult {
  /** Changed on both sides, to be settled by the user. */
  conflicts: DocumentConflict[];
  /** The account's copy can't be used by this version of the app (it is left as it is). */
  unreadable: string[];
}

/**
 * Brings each document in step with the account: a change on one side only goes to the other; a
 * change on both sides is either the same, or settled by `policy` (or left to the user). Only what
 * changed since the last sync (`ledger`, updated here) moves, so a phone that missed a change can
 * never overwrite it.
 */
export async function syncDocuments(remote: Remote, sources: DocumentSource[], ledger: Ledger): Promise<DocumentsResult> {
  const revisions = new Map((await remote.documentRevisions()).map((d) => [d.key, d.revision]));
  const conflicts: DocumentConflict[] = [], unreadable: string[] = [];
  const uploads: { source: DocumentSource; local: string; fp: string; base: number }[] = [];
  const downloads: { source: DocumentSource; local: string; fp: string; changed: boolean; revision: number }[] = [];

  for (const source of sources) {
    const local = source.read();
    if (local === undefined) continue;
    const fp = fingerprintOf(local), mark = ledger.documents[source.key], revision = revisions.get(source.key);
    const changed = !mark || mark.fp !== fp;
    if (revision !== undefined && (!mark || revision !== mark.revision)) {
      // The phone's own settings stay as they are; its next change goes up over the account's.
      if (source.policy === 'restore' && !source.empty(local)) {
        if (changed) uploads.push({ source, local, fp, base: revision });
        else ledger.documents[source.key] = { revision, fp };
        continue;
      }
      downloads.push({ source, local, fp, changed, revision });
    }
    // The account has none: the phone's goes up (unless it holds nothing yet).
    else if (revision === undefined) { if (mark || !source.empty(local)) uploads.push({ source, local, fp, base: 0 }); }
    else if (changed) uploads.push({ source, local, fp, base: mark!.revision });
  }

  if (downloads.length) {
    const copies = new Map((await remote.getDocuments(downloads.map((d) => d.source.key))).map((d) => [d.key, d]));
    for (const { source, local, fp, changed } of downloads) {
      const copy = copies.get(source.key);
      if (!copy) continue;
      const account = JSON.stringify(copy.data), accountFp = fingerprint(copy.data);
      if (accountFp === fp) { ledger.documents[source.key] = { revision: copy.revision, fp }; continue; }
      // Written by a newer version of the app: left as it is, and nothing goes over it.
      try { source.check(account); } catch { unreadable.push(source.key); continue; }
      if (!changed || source.empty(local)) {
        if (await source.replace(account, local)) ledger.documents[source.key] = { revision: copy.revision, fp: accountFp };
        continue;
      }
      if (source.empty(account)) uploads.push({ source, local, fp, base: copy.revision });
      else conflicts.push({ key: source.key, account, revision: copy.revision });
    }
  }

  for (const { source, local, fp, base } of uploads) {
    const revision = await remote.putDocument(source.key, JSON.parse(local), base);
    // Refused: the account's copy moved on meanwhile; the next sync downloads it first.
    if (revision !== null) ledger.documents[source.key] = { revision, fp };
  }
  return { conflicts, unreadable };
}

/** Settles a conflict: keep the phone's copy (it goes to the account) or the account's (it comes to the phone). */
export async function settleDocument(remote: Remote, source: DocumentSource, ledger: Ledger, conflict: DocumentConflict, keep: 'phone' | 'account'): Promise<boolean> {
  const local = source.read();
  if (local === undefined) return false;
  if (keep === 'account') {
    if (!await source.replace(conflict.account, local)) return false;
    ledger.documents[source.key] = { revision: conflict.revision, fp: fingerprintOf(conflict.account) };
    return true;
  }
  const revision = await remote.putDocument(source.key, JSON.parse(local), conflict.revision);
  if (revision === null) return false;
  ledger.documents[source.key] = { revision, fp: fingerprintOf(local) };
  return true;
}
