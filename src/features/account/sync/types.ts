import type { HalaqatState } from '@/features/halaqat/model';

// What the account offers (the database functions in supabase/migrations) -----------------------

export interface DocumentRevision { key: string; revision: number }
export interface RemoteDocument extends DocumentRevision { data: unknown }

export interface HalaqaRevision {
  id: string; revision: number; version: number; deleted: boolean;
  /** `teacher`: its owner or a co-teacher; `member`: a participant from their own phone. */
  role: 'teacher' | 'member';
  /** Whether it is the user's own (absent from an older account: taken as theirs). */
  owner?: boolean;
}
export interface PulledStudent { id: string; revision: number; deleted: boolean; data: unknown }
export interface PulledEntry { date: string; student: string; session: string; revision: number; deleted: boolean; data: unknown }
export interface PulledHalaqa {
  id: string; revision: number; version: number; deleted: boolean; data: unknown;
  /** Those changed after the version asked for, deleted ones too. */
  students: PulledStudent[]; entries: PulledEntry[];
}

/** Changes to a halaqa, each on the revision it was based on (0: new). A deletion may leave out its data. */
export interface HalaqaPush {
  meta?: { base: number; data?: unknown; deleted?: boolean };
  students: { id: string; base: number; data?: unknown; deleted?: boolean }[];
  entries: { date: string; student: string; session?: string; base: number; data?: unknown; deleted?: boolean }[];
}
/** Each one's new revision, or null when it had changed since its base; the halaqa's version before and after. */
export interface HalaqaPushResult {
  meta: number | null;
  students: Record<string, number | null>;
  entries: Record<string, number | null>;
  before: number;
  after: number;
}

export interface Remote {
  documentRevisions(): Promise<DocumentRevision[]>;
  getDocuments(keys: string[]): Promise<RemoteDocument[]>;
  /** The new revision, or null when the account's copy changed since `base` (0: it has none). */
  putDocument(key: string, data: unknown, base: number): Promise<number | null>;
  halaqaVersions(): Promise<HalaqaRevision[]>;
  pullHalaqa(id: string, since: number): Promise<PulledHalaqa | null>;
  pushHalaqa(id: string, push: HalaqaPush): Promise<HalaqaPushResult>;
}

// What the phone offers -----------------------------------------------------------------------------

/** A dataset kept whole in the account. */
export interface DocumentSource {
  /** Its storage key on the phone, and its name in the account. */
  key: string;
  /**
   * `ask`: when both the phone's copy and the account's changed, the user chooses.
   * `restore`: the phone's own (its settings): the account's copy comes down only to a phone that
   * has none of its own yet (a new phone); otherwise the phone's goes up.
   */
  policy: 'ask' | 'restore';
  /** The phone's copy, serialized; undefined while it is being read. */
  read(): string | undefined;
  /**
   * Throws when a copy can't be used whole by this version of the app (written by a newer one):
   * reading it would lose some of it.
   */
  check(raw: string): void;
  /** Whether a (usable) copy holds nothing of the user's: only the defaults. */
  empty(raw: string): boolean;
  /**
   * Puts the account's copy in place of the phone's, if the phone's is still `expected`; false
   * when it changed meanwhile. Throws when the account's copy can't be used (it is checked).
   */
  replace(raw: string, expected: string): Promise<boolean>;
  /** Called when the phone's copy changes. */
  subscribe(listener: () => void): () => void;
}

/** The halaqat, kept in the account as records. */
export interface HalaqatSource {
  read(): HalaqatState | undefined;
  /**
   * Changes the halaqat at once from what they are now; false when they can't be changed yet (not
   * read). Throws (and changes nothing) when `change` throws or its result doesn't check.
   */
  transform(change: (state: HalaqatState) => HalaqatState): boolean;
  /** Whether what `transform` changed is now written on the phone. */
  settled?(): Promise<boolean>;
  subscribe(listener: () => void): () => void;
}

// What the phone remembers of the account -----------------------------------------------------------

/** A record as last synced: its revision in the account and the fingerprint of its data then. */
export interface Mark { revision: number; fp: string }
export interface HalaqaMark extends Mark {
  /** The halaqa's version last downloaded: everything up to it is on the phone. */
  version: number;
  students: Record<string, Mark>;
  /** By `date|student`. */
  entries: Record<string, Mark>;
}
export interface Ledger {
  version: 1;
  /** The account these marks belong to. */
  user: string;
  documents: Record<string, Mark>;
  halaqat: Record<string, HalaqaMark>;
}

/** A document changed both on the phone and in the account since they were last in step. */
export interface DocumentConflict {
  key: string;
  /** The account's copy, serialized, and its revision. */
  account: string;
  revision: number;
}
