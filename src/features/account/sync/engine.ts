import type { CacheStorage } from '@/lib/quranpedia/cache';
import { settleDocument, syncDocuments } from './documents';
import { fingerprintOf } from './fingerprint';
import { pushFor, syncHalaqat } from './halaqat';
import { decodeLedger, ledgerKey } from './ledger';
import type { DocumentConflict, DocumentSource, HalaqatSource, Ledger, Remote } from './types';

export type SyncProblem = 'network' | 'session' | 'failed';

export interface SyncState {
  syncing: boolean;
  /** When the last sync finished (ms), if one has. */
  lastSynced?: number;
  /** Why the last sync didn't finish, or left something out. */
  problem?: SyncProblem;
  /** Documents changed on both sides, waiting for the user. */
  conflicts: DocumentConflict[];
  /** Documents whose account copy this version of the app can't use. */
  unreadable: string[];
}

export interface SyncOptions {
  /** The signed-in user: the marks are theirs. */
  user: string;
  remote: Remote;
  storage: Pick<CacheStorage, 'getItem' | 'setItem'>;
  documents: () => DocumentSource[];
  halaqat: () => HalaqatSource | undefined;
  now?: () => number;
}

/** Errors from the account that say what went wrong (see `api.ts`). */
export const problemOf = (error: unknown): SyncProblem => {
  const kind = (error as { kind?: string })?.kind;
  return kind === 'network' ? 'network' : kind === 'session' ? 'session' : 'failed';
};

/**
 * Syncs the phone with one account: one sync at a time (asking during one runs another right
 * after), with what the phone knows of the account kept on the phone between syncs.
 */
export function createSyncEngine({ user, remote, storage, documents, halaqat, now = Date.now }: SyncOptions) {
  let ledger: Ledger | undefined;
  let state: SyncState = { syncing: false, conflicts: [], unreadable: [] };
  let running: Promise<void> | undefined;
  let again = false;
  let stopped = false;
  // The datasets read at the last sync: one read only since (it loaded late) still has to sync.
  const seen = new Set<string>();
  let halaqatSeen = false;
  const listeners = new Set<() => void>();
  const publish = (next: Partial<SyncState>) => { state = { ...state, ...next }; if (!stopped) listeners.forEach((l) => l()); };
  // Each account's marks are its own: another account signing in on the phone leaves them be. A
  // failed read stops the sync (it is retried) rather than start from no marks and save over them.
  const key = ledgerKey(user);
  const load = async () => ledger ??= decodeLedger(await storage.getItem(key), user);
  const saveLedger = () => ledger ? storage.setItem(key, JSON.stringify(ledger)).catch(() => {}) : Promise.resolve();

  async function once() {
    publish({ syncing: true });
    try {
      const marks = await load();
      const sources = documents();
      for (const source of sources) if (source.read() !== undefined) seen.add(source.key);
      halaqatSeen ||= !!halaqat()?.read();
      const docs = await syncDocuments(remote, sources, marks);
      if (stopped) return;
      const source = halaqat();
      const { failed } = source ? await syncHalaqat(remote, source, marks) : { failed: [] };
      publish({ syncing: false, lastSynced: now(), problem: failed.length ? 'failed' : undefined, conflicts: docs.conflicts, unreadable: docs.unreadable });
    } catch (error) {
      publish({ syncing: false, problem: problemOf(error) });
    } finally {
      await saveLedger();
    }
  }

  function run(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) { again = true; return running; }
    running = (async () => {
      do { again = false; await once(); } while (again && !stopped);
    })().finally(() => { running = undefined; });
    return running;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    run,
    /** Settles every waiting conflict one way: the phone's copies go up, or the account's come down. */
    async settle(keep: 'phone' | 'account') {
      try {
        const marks = await load();
        const sources = new Map(documents().map((s) => [s.key, s]));
        for (const conflict of state.conflicts) {
          const source = sources.get(conflict.key);
          // One that can't be settled now is found again by the sync below.
          if (source) await settleDocument(remote, source, marks, conflict, keep).catch(() => false);
        }
        await saveLedger();
      } catch {
        // The marks couldn't be read: the sync below says so.
      }
      publish({ conflicts: [] });
      await run();
    },
    /** Whether the phone has changes the account doesn't (cheap enough to ask after every change). */
    pending(): boolean {
      if (!ledger) return true;
      for (const source of documents()) {
        const local = source.read();
        if (local === undefined) continue;
        if (!seen.has(source.key)) return true;
        const mark = ledger.documents[source.key];
        if (mark ? mark.fp !== fingerprintOf(local) : !source.empty(local)) return true;
      }
      const halaqatState = halaqat()?.read();
      if (!halaqatState) return false;
      if (!halaqatSeen) return true;
      if (halaqatState.halaqat.some((h) => pushFor(h, ledger!.halaqat[h.id]))) return true;
      return Object.keys(ledger.halaqat).some((id) => !halaqatState.halaqat.some((h) => h.id === id));
    },
    /** Stops syncing (signed out, or the screen tree went away); `start` takes it up again. */
    stop() { stopped = true; },
    start() { stopped = false; },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
