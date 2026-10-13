import type { CacheStorage } from '@/lib/quranpedia/cache';
import type { AccountApi, PhotoBody } from './api';

/**
 * The account's profile: a name and a photo, kept in the account (a row and a file in the
 * private photos bucket) and remembered on the phone, so the account screen shows them at once and
 * offline. The photo is shown through a signed link, renewed before it expires.
 */

export interface Profile {
  fullName: string;
  /** The photo's path in the photos bucket. */
  avatar: string | null;
  /** A link to the photo, and until when it works (ms). */
  photo?: { url: string; until: number };
}

export interface ProfileState {
  /** Undefined until read (from the phone, then the account). */
  profile: Profile | undefined;
  busy: boolean;
}

/** How long a photo link works, and how early it is renewed. */
const LINK_SECONDS = 7 * 24 * 3600;
const RENEW_MS = 24 * 3600 * 1000;
export const NAME_LIMIT = 80;
export const profileKey = (user: string) => `account:profile:v1:${user}`;

function decodeProfile(raw: string | null): Profile | undefined {
  if (!raw) return undefined;
  try {
    const p = JSON.parse(raw) as Profile;
    if (typeof p?.fullName !== 'string' || (p.avatar !== null && typeof p.avatar !== 'string')) return undefined;
    const photo = p.photo && typeof p.photo.url === 'string' && Number.isFinite(p.photo.until) ? p.photo : undefined;
    return { fullName: p.fullName, avatar: p.avatar, ...(photo ? { photo } : {}) };
  } catch {
    return undefined;
  }
}

/** A new name for a photo in the user's folder (a new name each time, so no copy is stale). */
export const photoPath = (user: string) => `${user}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;

/** The letter shown in place of a photo: the name's first, or the email's. */
export function initialOf(name: string, email: string) {
  const source = name.trim() || email.trim();
  const letter = [...source][0] ?? '';
  return letter.toLocaleUpperCase();
}

export function createProfileStore({ user, api, storage, now = Date.now }: {
  user: string;
  api: Pick<AccountApi, 'profile' | 'setProfileName' | 'setProfilePhoto' | 'uploadPhoto' | 'photoLink' | 'removePhotos'>;
  storage: Pick<CacheStorage, 'getItem' | 'setItem'>;
  now?: () => number;
}) {
  let state: ProfileState = { profile: undefined, busy: false };
  const listeners = new Set<() => void>();
  const publish = (next: Partial<ProfileState>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };
  const remember = (profile: Profile) => storage.setItem(profileKey(user), JSON.stringify(profile)).catch(() => {});
  // Counts the changes made here: a read of the account begun before one is out of date.
  let changes = 0;
  // Changes run one after another.
  let queue: Promise<unknown> = Promise.resolve();

  /** The profile with a working link to its photo (the same one while it lasts). */
  async function withLink(profile: Profile): Promise<Profile> {
    const { photo: _old, ...rest } = profile;
    if (!profile.avatar) return rest;
    if (profile.photo && profile.photo.until - RENEW_MS > now()) return profile;
    try {
      return { ...rest, photo: { url: await api.photoLink(profile.avatar, LINK_SECONDS), until: now() + LINK_SECONDS * 1000 } };
    } catch {
      // Offline: the old link may still work, or the photo is in the image cache.
      return profile;
    }
  }
  async function keep(profile: Profile) {
    publish({ profile });
    await remember(profile);
  }
  /** What the phone remembers, then what the account has (offline, the phone's stays). */
  async function load() {
    const begun = changes;
    const cached = decodeProfile(await storage.getItem(profileKey(user)).catch(() => null));
    if (cached && !state.profile) publish({ profile: cached });
    const fresh = await api.profile();
    const known = state.profile ?? cached;
    const base: Profile = fresh ? { ...fresh, ...(known?.avatar === fresh.avatar && known.photo ? { photo: known.photo } : {}) } : { fullName: '', avatar: null };
    const next = await withLink(base);
    if (begun === changes) await keep(next);
  }
  /** A change: one at a time, after the profile has been read, marked busy while it runs. */
  function change(work: (profile: Profile) => Promise<void>): Promise<void> {
    const run = queue.then(async () => {
      publish({ busy: true });
      changes++;
      try {
        if (!state.profile) await load();
        await work(state.profile ?? { fullName: '', avatar: null });
      } finally {
        changes++;
        publish({ busy: false });
      }
    });
    queue = run.catch(() => {});
    return run;
  }
  const removeQuietly = (path: string | null | undefined, keepPath?: string) =>
    path && path !== keepPath ? api.removePhotos([path]).then(() => {}, () => {}) : Promise.resolve();

  return {
    getState: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,

    setName: (fullName: string) => change(async (profile) => {
      const name = fullName.trim().slice(0, NAME_LIMIT);
      await api.setProfileName(name);
      await keep({ ...profile, fullName: name });
    }),

    /** Puts a new photo in place of the old one (removed once the new one is in the profile). */
    setPhoto: (body: PhotoBody) => change(async (profile) => {
      const path = photoPath(user);
      await api.uploadPhoto(path, body);
      let previous: string | null;
      try {
        previous = await api.setProfilePhoto(path);
      } catch (error) {
        // The answer may have been lost on the way back: the account says whether it took it.
        const account = await api.profile().catch(() => undefined);
        if (account?.avatar !== path) {
          // Removed only when surely not in the profile (unknown, it stays: a stray file at worst).
          if (account !== undefined) await removeQuietly(path);
          throw error;
        }
        previous = profile.avatar;
      }
      await keep(await withLink({ fullName: profile.fullName, avatar: path }));
      await removeQuietly(previous, path);
    }),

    removePhoto: () => change(async (profile) => {
      const previous = await api.setProfilePhoto(null);
      await keep({ fullName: profile.fullName, avatar: null });
      await removeQuietly(previous);
    }),
  };
}

export type ProfileStore = ReturnType<typeof createProfileStore>;

// Devices -------------------------------------------------------------------------------------

export interface Device {
  id: string;
  /** The name the device gave itself when it signed in (none for older sign-ins). */
  name?: string;
  platform?: 'android' | 'ios' | 'web';
  signedIn: number;
  lastActive: number;
  /** This phone. */
  current: boolean;
}

/** A time from the account; one without a zone is UTC. */
export function timeOf(value: unknown): number {
  if (typeof value !== 'string' || !value) return NaN;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  return Date.parse(/(?:Z|[+-]\d\d(?::?\d\d)?)$/i.test(iso) ? iso : `${iso}Z`);
}

/** The account's devices (from `my_sessions`), this one first, then the most recently active. */
export function devicesFrom(json: unknown): Device[] {
  if (!Array.isArray(json)) return [];
  const devices: Device[] = [];
  for (const s of json as Record<string, unknown>[]) {
    if (!s || typeof s.id !== 'string') continue;
    const signedIn = timeOf(s.created_at);
    const lastActive = [timeOf(s.refreshed_at), timeOf(s.updated_at), signedIn].filter(Number.isFinite).reduce((a, b) => Math.max(a, b), -Infinity);
    devices.push({
      id: s.id,
      ...(typeof s.name === 'string' && s.name ? { name: s.name } : {}),
      ...(s.platform === 'android' || s.platform === 'ios' || s.platform === 'web' ? { platform: s.platform } : {}),
      signedIn: Number.isFinite(signedIn) ? signedIn : 0,
      lastActive: Number.isFinite(lastActive) ? lastActive : 0,
      current: s.current === true,
    });
  }
  return devices.sort((a, b) => Number(b.current) - Number(a.current) || b.lastActive - a.lastActive);
}
