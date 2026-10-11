import { collections, isCollectionId, type CollectionId } from './content';

export interface ReminderSetting { enabled: boolean; hour: number; minute: number }
export type ReminderKind = 'morning' | 'evening';

/** Saved adhkar data: today's counts and the reminders. Counts belong to one calendar day. */
export interface AdhkarState {
  version: 1;
  /** Local date (YYYY-MM-DD) of the counts. */
  day: string;
  /** Times each dhikr was said that day, by collection and dhikr key. */
  counts: Partial<Record<CollectionId, Record<string, number>>>;
  reminders: Record<ReminderKind, ReminderSetting>;
  /** The misbaha's count: it keeps counting across days until restarted. */
  misbaha: number;
}

export const ADHKAR_KEY = 'adhkar:v1';
export const defaultAdhkarState: AdhkarState = {
  version: 1, day: '', counts: {},
  reminders: { morning: { enabled: false, hour: 7, minute: 0 }, evening: { enabled: false, hour: 17, minute: 0 } },
  misbaha: 0,
};

const validReminder = (value: unknown, fallback: ReminderSetting): ReminderSetting => {
  const r = value as Partial<ReminderSetting> | null;
  return r && typeof r.enabled === 'boolean' && Number.isInteger(r.hour) && r.hour! >= 0 && r.hour! <= 23
    && Number.isInteger(r.minute) && r.minute! >= 0 && r.minute! <= 59 ? { enabled: r.enabled, hour: r.hour!, minute: r.minute! } : fallback;
};

/** Reads saved data, keeping whatever is valid. */
export function decodeAdhkar(raw: string | null): AdhkarState {
  if (raw === null) return defaultAdhkarState;
  let saved: Partial<AdhkarState> | null;
  try { saved = JSON.parse(raw); } catch { return defaultAdhkarState; }
  if (!saved || saved.version !== 1) return defaultAdhkarState;
  const counts: AdhkarState['counts'] = {};
  for (const [id, values] of Object.entries(saved.counts ?? {})) {
    if (!isCollectionId(id) || !values || typeof values !== 'object') continue;
    const limits = new Map(collections[id].map((d) => [d.key, d.count]));
    const kept = Object.entries(values).filter(([key, n]) => limits.has(key) && Number.isInteger(n) && n > 0)
      .map(([key, n]) => [key, Math.min(n, limits.get(key)!)]);
    if (kept.length) counts[id] = Object.fromEntries(kept);
  }
  return {
    version: 1,
    day: typeof saved.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.day) ? saved.day : '',
    counts,
    reminders: {
      morning: validReminder(saved.reminders?.morning, defaultAdhkarState.reminders.morning),
      evening: validReminder(saved.reminders?.evening, defaultAdhkarState.reminders.evening),
    },
    misbaha: Number.isSafeInteger(saved.misbaha) && saved.misbaha! > 0 ? saved.misbaha! : 0,
  };
}

export type AdhkarChange =
  | { type: 'step'; day: string; collection: CollectionId; key: string; delta: 1 | -1 }
  | { type: 'reset'; day: string; collection: CollectionId }
  | { type: 'reminder'; kind: ReminderKind; value: ReminderSetting }
  /** One more bead on the misbaha. */
  | { type: 'tasbih' }
  /** Restarting the misbaha (0), or taking a restart back. */
  | { type: 'misbaha'; count: number };

/** Counts move within 0 and the dhikr's count; a new day starts from nothing. */
export function applyAdhkar(state: AdhkarState, change: AdhkarChange): AdhkarState {
  if (change.type === 'reminder') return { ...state, reminders: { ...state.reminders, [change.kind]: change.value } };
  if (change.type === 'tasbih') return { ...state, misbaha: state.misbaha + 1 };
  if (change.type === 'misbaha') return { ...state, misbaha: Math.max(0, Math.floor(change.count)) };
  const counts = state.day === change.day ? state.counts : {};
  if (change.type === 'reset') {
    const rest = { ...counts };
    delete rest[change.collection];
    return { ...state, day: change.day, counts: rest };
  }
  const dhikr = collections[change.collection].find((d) => d.key === change.key);
  if (!dhikr) return state;
  const current = counts[change.collection] ?? {};
  const next = Math.max(0, Math.min(dhikr.count, (current[change.key] ?? 0) + change.delta));
  const updated = { ...current, [change.key]: next };
  if (!next) delete updated[change.key];
  return { ...state, day: change.day, counts: { ...counts, [change.collection]: updated } };
}

/** Today's counts of a collection (empty once the day has passed). */
export function countsOn(state: AdhkarState, collection: CollectionId, day: string): Record<string, number> {
  return state.day === day ? state.counts[collection] ?? {} : {};
}

export interface CollectionProgress {
  /** Adhkar said as many times as asked. */
  done: number;
  total: number;
  /** Something was counted today. */
  started: boolean;
  complete: boolean;
}

export function collectionProgress(state: AdhkarState, collection: CollectionId, day: string): CollectionProgress {
  const counts = countsOn(state, collection, day);
  const items = collections[collection];
  const done = items.filter((d) => (counts[d.key] ?? 0) >= d.count).length;
  return { done, total: items.length, started: Object.keys(counts).length > 0, complete: done === items.length };
}

export const REMINDER_PREFIX = 'quranni-adhkar:';
export interface AdhkarReminder { id: string; kind: ReminderKind; date: Date }

/**
 * Reminders for the coming days, as one-off notifications so a day whose adhkar are already
 * done is skipped. They are rescheduled whenever the app opens or the adhkar change.
 */
export function adhkarReminderQueue(state: AdhkarState, now: Date, days = 14): AdhkarReminder[] {
  const reminders: AdhkarReminder[] = [];
  for (const kind of ['morning', 'evening'] as const) {
    const setting = state.reminders[kind];
    if (!setting.enabled) continue;
    for (let offset = 0; offset < days; offset++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, setting.hour, setting.minute);
      if (date.getTime() <= now.getTime()) continue;
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (collectionProgress(state, kind, day).complete) continue;
      reminders.push({ id: `${REMINDER_PREFIX}${kind}:${day}:${String(setting.hour).padStart(2, '0')}${String(setting.minute).padStart(2, '0')}`, kind, date });
    }
  }
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The first dhikr not yet finished, or -1. */
export function nextUnfinished(collection: CollectionId, counts: Record<string, number>, after = -1): number {
  const items = collections[collection];
  for (let i = after + 1; i < items.length; i++) if ((counts[items[i].key] ?? 0) < items[i].count) return i;
  for (let i = 0; i <= after && i < items.length; i++) if ((counts[items[i].key] ?? 0) < items[i].count) return i;
  return -1;
}

