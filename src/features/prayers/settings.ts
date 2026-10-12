import { isMethodId, isPrayerId, dayOf, dayTimes, PRAYERS, shiftDay, type Adjustments, type PrayerId, type TimesSettings } from './times';
import { isCityId, type CityId } from './cities';

/** What happens at a prayer's time: nothing, a notification, a notification with the takbir, or the whole athan. */
export const ALERT_KINDS = ['off', 'notify', 'takbir', 'full'] as const;
export type AlertKind = typeof ALERT_KINDS[number];
/**
 * Voices of the whole athan (`assets/athan/README.md` has each recording's source): the athans of
 * the three mosques first, then the muezzins.
 */
export const MOSQUE_VOICES = ['makkah', 'madinah', 'aqsa'] as const;
export const MUEZZIN_VOICES = ['alafasy', 'alafasy2', 'nufais', 'zahrani', 'qatami', 'dosari', 'kurdi', 'abdulbasit', 'ozcan'] as const;
export const VOICES = [...MOSQUE_VOICES, ...MUEZZIN_VOICES] as const;
export type VoiceId = typeof VOICES[number];
/** Takbir sounds of the notification: each voice's opening «الله أكبر، الله أكبر», and a single takbir. */
export const TAKBIRS = [...VOICES, 'single'] as const;
export type TakbirId = typeof TAKBIRS[number];
/** The athan's screen: photos of mosques (in the Android module's resources), then plain colours. */
export const SCREEN_PHOTOS = ['makkah_night', 'makkah_day', 'madinah', 'madinah_night', 'aqsa', 'hassan2', 'koutoubia'] as const;
export const SCREEN_BACKGROUNDS = [...SCREEN_PHOTOS, 'green', 'night'] as const;
export type ScreenBackground = typeof SCREEN_BACKGROUNDS[number];
export type ScreenPhoto = typeof SCREEN_PHOTOS[number];
export const isScreenPhoto = (id: ScreenBackground): id is ScreenPhoto => (SCREEN_PHOTOS as readonly string[]).includes(id);
export const SCREEN_DIMS = ['light', 'medium', 'strong'] as const;
export const SCREEN_MOTIONS = ['pulse', 'glow', 'none'] as const;
export interface AthanScreenStyle {
  background: ScreenBackground;
  /** How much the photo is darkened under the text. */
  dim: typeof SCREEN_DIMS[number];
  /** Rings pulsing out from the time, a breathing glow, or nothing (the photo then stays still too). */
  motion: typeof SCREEN_MOTIONS[number];
  /** The Hijri date under the time. */
  date: boolean;
}
export const defaultScreen: AthanScreenStyle = { background: 'makkah_night', dim: 'medium', motion: 'pulse', date: true };

/** A reminder this many minutes before each prayer that has an alert (0: none). */
export const BEFORE_OPTIONS = [0, 5, 10, 15, 30] as const;
/** The lengths offered once the reminder is on. */
export const BEFORE_MINUTES = BEFORE_OPTIONS.filter((minutes) => minutes > 0);
/** Offered until 2026-10; a reminder saved with it comes 15 minutes before, the nearest offered. */
const LEGACY_BEFORE = 20;
export const ADJUSTMENT_LIMIT = 30;
export const HIJRI_OFFSET_LIMIT = 2;

export interface PrayerLocation {
  source: 'gps' | 'city';
  /** A bundled city: chosen from the list, or the one the position found is in. */
  city?: CityId;
  /** Otherwise the nearest bundled city, to name the place («قرب …»). */
  near?: CityId;
  /** A name kept from an earlier version. */
  name?: string;
  latitude: number;
  longitude: number;
  /** When the position was set (ISO). */
  updated: string;
}

export interface PrayerState extends TimesSettings {
  version: 1;
  location: PrayerLocation | null;
  /** Alerts at all: the switch that asks for notifications. */
  enabled: boolean;
  alerts: Record<PrayerId, AlertKind>;
  before: number;
  /** The whole athan's voice. */
  voice: VoiceId;
  /** The takbir notification's sound. */
  takbir: TakbirId;
  hijriOffset: number;
  /** The prayer times notification, always shown (Android app). */
  timesNotification: boolean;
  /** How the whole athan's screen looks. */
  screen: AthanScreenStyle;
}

export const PRAYERS_KEY = 'prayers:v1';
const noAdjustments: Adjustments = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
export const defaultAlerts: Record<PrayerId, AlertKind> = { fajr: 'takbir', sunrise: 'off', dhuhr: 'takbir', asr: 'takbir', maghrib: 'takbir', isha: 'takbir' };
export const defaultPrayerState: PrayerState = {
  version: 1, location: null, method: 'habous', madhab: 'shafi', adjustments: noAdjustments,
  enabled: false, alerts: defaultAlerts, before: 0, voice: 'makkah', takbir: 'makkah', hijriOffset: 0, timesNotification: false,
  screen: defaultScreen,
};

const within = (value: unknown, limit: number) => Number.isInteger(value) && Math.abs(value as number) <= limit;
const finite = (value: unknown, limit: number): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

function decodeLocation(value: unknown): PrayerLocation | null {
  if (!value || typeof value !== 'object') return null;
  const l = value as Partial<PrayerLocation>;
  if (!finite(l.latitude, 90) || !finite(l.longitude, 180) || (l.source !== 'gps' && l.source !== 'city')) return null;
  const city = isCityId(l.city) ? l.city : undefined;
  if (l.source === 'city' && !city) return null;
  const near = !city && isCityId(l.near) ? l.near : undefined;
  return {
    source: l.source, ...(city ? { city } : {}), ...(near ? { near } : {}), ...(typeof l.name === 'string' && l.name.trim() ? { name: l.name.trim().slice(0, 80) } : {}),
    latitude: l.latitude, longitude: l.longitude, updated: typeof l.updated === 'string' ? l.updated : '',
  };
}

function decodeRecord<T>(value: unknown, fallback: Record<PrayerId, T>, valid: (item: unknown) => boolean): Record<PrayerId, T> {
  const saved = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(PRAYERS.map((p) => [p, valid(saved[p]) ? saved[p] : fallback[p]])) as Record<PrayerId, T>;
}

/** «أذان قصير» (the athan's opening) became the takbir. */
function decodeAlerts(value: unknown): Record<PrayerId, AlertKind> {
  const saved = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const migrated = Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v === 'short' ? 'takbir' : v]));
  const alerts = decodeRecord(migrated, defaultPrayerState.alerts, (v) => ALERT_KINDS.includes(v as AlertKind));
  // No athan nor takbir at sunrise: it only ends the time of Fajr.
  return alerts.sunrise === 'takbir' || alerts.sunrise === 'full' ? { ...alerts, sunrise: 'notify' } : alerts;
}

function decodeScreen(value: unknown): AthanScreenStyle {
  const s = (value && typeof value === 'object' ? value : {}) as Partial<AthanScreenStyle>;
  const d = defaultScreen;
  return {
    background: SCREEN_BACKGROUNDS.includes(s.background as ScreenBackground) ? s.background! : d.background,
    dim: SCREEN_DIMS.includes(s.dim as AthanScreenStyle['dim']) ? s.dim! : d.dim,
    motion: SCREEN_MOTIONS.includes(s.motion as AthanScreenStyle['motion']) ? s.motion! : d.motion,
    date: typeof s.date === 'boolean' ? s.date : d.date,
  };
}

/** Keeps what is valid of a saved or changed state; anything else takes its default. */
export function normalizePrayers(value: unknown): PrayerState {
  const s = (value && typeof value === 'object' ? value : {}) as Partial<PrayerState>;
  const d = defaultPrayerState;
  return {
    version: 1,
    location: decodeLocation(s.location),
    method: isMethodId(s.method) ? s.method : d.method,
    madhab: s.madhab === 'hanafi' ? 'hanafi' : 'shafi',
    adjustments: decodeRecord(s.adjustments, d.adjustments, (v) => within(v, ADJUSTMENT_LIMIT)),
    enabled: typeof s.enabled === 'boolean' ? s.enabled : d.enabled,
    alerts: decodeAlerts(s.alerts),
    before: s.before === LEGACY_BEFORE ? 15 : BEFORE_OPTIONS.includes(s.before as never) ? s.before! : d.before,
    voice: VOICES.includes(s.voice as VoiceId) ? s.voice! : d.voice,
    takbir: TAKBIRS.includes(s.takbir as TakbirId) ? s.takbir! : d.takbir,
    hijriOffset: within(s.hijriOffset, HIJRI_OFFSET_LIMIT) ? s.hijriOffset! : d.hijriOffset,
    timesNotification: typeof s.timesNotification === 'boolean' ? s.timesNotification : d.timesNotification,
    screen: decodeScreen(s.screen),
  };
}

export function decodePrayers(raw: string | null): PrayerState {
  if (!raw) return defaultPrayerState;
  try { return normalizePrayers(JSON.parse(raw)); } catch { return defaultPrayerState; }
}

/** A change is the fields it sets; the result is checked like saved data. */
export type PrayerChange = Partial<Omit<PrayerState, 'version'>>;
export const applyPrayers = (state: PrayerState, change: PrayerChange): PrayerState => normalizePrayers({ ...state, ...change });

/** Notifications scheduled by the app start with this, so they can be told from the others. */
export const ALERT_PREFIX = 'quranni-prayer:';

export interface PrayerAlert {
  id: string;
  prayer: PrayerId;
  /** `takbir` plays the chosen takbir; `before` comes `minutes` ahead of the time. */
  kind: 'notify' | 'takbir' | 'before';
  /** When the notification fires. */
  date: Date;
  /** The prayer's time. */
  time: Date;
  minutes?: number;
}

/** A whole athan, played by the app's own Android module. */
export interface NativeAthan { id: string; prayer: PrayerId; time: Date }
/**
 * The module still plays an athan this late (its alarm was delayed), so one that just passed stays
 * in the list it is given, or a new list would cancel it.
 */
export const NATIVE_GRACE_MS = 10 * 60_000;

export interface AlertHorizon {
  /** Days of notifications to schedule (the system keeps a limited number). */
  days: number;
  /** Whole athans are played by the app's Android module; without it they fall back to the takbir. */
  native: boolean;
  /** Days of whole athans to give the module, which arms one at a time. */
  nativeDays: number;
}

/** Everything to schedule from `now`, earliest first. Nothing without a place or with alerts off. */
export function prayerAlerts(state: PrayerState, now: Date, horizon: AlertHorizon): { notifications: PrayerAlert[]; athans: NativeAthan[] } {
  const notifications: PrayerAlert[] = [], athans: NativeAthan[] = [];
  if (!state.enabled || !state.location) return { notifications, athans };
  const today = dayOf(now), stamp = (date: Date) => Math.round(date.getTime() / 60000);
  const days = Math.max(horizon.days, horizon.native ? horizon.nativeDays : 0);
  for (let i = 0; i < days; i++) {
    const times = dayTimes(state.location, shiftDay(today, i), state);
    for (const prayer of PRAYERS) {
      const kind = state.alerts[prayer], time = times[prayer];
      if (kind === 'off' || !Number.isFinite(time.getTime())) continue;
      if (kind === 'full' && horizon.native) {
        if (i < horizon.nativeDays && time.getTime() > now.getTime() - NATIVE_GRACE_MS) athans.push({ id: `${prayer}:${stamp(time)}`, prayer, time });
      } else if (i < horizon.days && time > now) {
        const as = kind === 'full' ? 'takbir' : kind;
        notifications.push({ id: `${ALERT_PREFIX}${prayer}:${as}:${stamp(time)}`, prayer, kind: as, date: time, time });
      }
      const before = new Date(time.getTime() - state.before * 60000);
      if (state.before > 0 && i < horizon.days && before > now) {
        notifications.push({ id: `${ALERT_PREFIX}${prayer}:before${state.before}:${stamp(time)}`, prayer, kind: 'before', date: before, time, minutes: state.before });
      }
    }
  }
  return { notifications: notifications.sort((a, b) => a.date.getTime() - b.date.getTime()), athans };
}

/** A day's six times (those that exist at the place). */
export interface TimesOfDay { day: string; times: { prayer: PrayerId; at: Date }[] }

/**
 * The times of `count` days from today, for the prayer times notification, which shows the day of
 * the next one. Nothing without a place.
 */
export function upcomingTimes(state: PrayerState, now: Date, count: number): TimesOfDay[] {
  if (!state.location) return [];
  const today = dayOf(now);
  return Array.from({ length: count }, (_, i) => {
    const day = shiftDay(today, i), times = dayTimes(state.location!, day, state);
    return { day, times: PRAYERS.map((prayer) => ({ prayer, at: times[prayer] })).filter((m) => Number.isFinite(m.at.getTime())) };
  });
}

export const isPrayerAlertData = (data: unknown): data is { prayer: PrayerId } =>
  !!data && typeof data === 'object' && isPrayerId((data as { prayer?: unknown }).prayer);
