import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';
import { AccountError, createAuthClient, linkParams, type AccountUser } from './auth-client';
import { createAccountApi, type PhotoBody } from './api';
import { createProfileStore, devicesFrom, profileKey, type Device, type ProfileState } from './profile';
import { deviceName, devicePlatform } from './device';
import { createSyncEngine, type SyncState } from './sync/engine';
import { ledgerKey } from './sync/ledger';
import { onSyncedChange, syncedDocuments, syncedHalaqat } from './registry';

/** How long after the last change on the phone it goes to the account. */
const QUIET_MS = 10_000;

interface AccountContext {
  /** The signed-in user; null when signed out; undefined while the saved session is read. */
  user: AccountUser | null | undefined;
  sync: SyncState;
  /** Makes an account; true when signed in at once, false when its email is to be confirmed first. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  /** Signs in from a link in an account email (the part after its `#`); returns what it was for. */
  adopt: (fragment: string) => Promise<string>;
  updatePassword: (password: string, current?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** Settles the documents changed on both sides: the phone's copies, or the account's. */
  settle: (keep: 'phone' | 'account') => Promise<void>;

  /** The name and photo (undefined until read). */
  profile: ProfileState;
  refreshProfile: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  setPhoto: (body: PhotoBody) => Promise<void>;
  removePhoto: () => Promise<void>;
  /** The devices signed in to the account, this one first. */
  devices: () => Promise<Device[]>;
  endDevice: (id: string) => Promise<void>;
  endOtherDevices: () => Promise<void>;
}

const idle: SyncState = { syncing: false, conflicts: [], unreadable: [] };
const noProfile: ProfileState = { profile: undefined, busy: false };
const signedOut = () => Promise.reject(new AccountError('session'));
const Context = createContext<AccountContext | null>(null);

// One client for the app's lifetime: the session is one, whatever screen asks for it.
const auth = createAuthClient({ url: SUPABASE_URL, apiKey: SUPABASE_PUBLISHABLE_KEY, storage: contentStorage });
const api = createAccountApi({ url: SUPABASE_URL, apiKey: SUPABASE_PUBLISHABLE_KEY, token: (force) => auth.token(force) });
/** The account's data as one user: a sync begun for them stops once someone else is signed in. */
const apiFor = (user: string) => createAccountApi({ url: SUPABASE_URL, apiKey: SUPABASE_PUBLISHABLE_KEY,
  token: (force) => auth.user()?.id === user ? auth.token(force) : Promise.reject(new AccountError('session')) });
/** Where the links in account emails lead: this app's screen that signs in from them. */
const callback = () => Linking.createURL('account/callback');

/**
 * The account and its sync. Signed in, the phone's data syncs: when the app opens or comes back,
 * a few seconds after a change, and when the app goes to the background. Signed out, nothing
 * changes on the phone.
 */
export function AccountProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    const read = () => { if (active) setUser(auth.user()); };
    const stop = auth.subscribe(read);
    void auth.load().then(read);
    return () => { active = false; stop(); };
  }, []);

  const userId = user?.id;
  const engine = useMemo(() => userId
    ? createSyncEngine({ user: userId, remote: apiFor(userId), storage: contentStorage, documents: syncedDocuments, halaqat: syncedHalaqat }) : undefined, [userId]);
  useEffect(() => {
    if (!engine) return;
    const next = engine;
    next.start();
    // The first sync once the phone's data has been read (a dataset read later syncs when it is).
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => { timer = undefined; void next.run(); }, 1500);
    const later = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = undefined; if (next.pending()) void next.run(); }, QUIET_MS);
    };
    const stopChanges = onSyncedChange(later);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void next.run();
      // Leaving the app: what is waiting goes now (the phone may stop the app at any time after).
      else if (state === 'background' && next.pending()) { if (timer) clearTimeout(timer); timer = undefined; void next.run(); }
    });
    return () => { if (timer) clearTimeout(timer); stopChanges(); appState.remove(); next.stop(); };
  }, [engine]);

  // The profile, as the phone remembers it and then as the account has it; this device named.
  const people = useMemo(() => userId ? { api: apiFor(userId), profile: createProfileStore({ user: userId, api: apiFor(userId), storage: contentStorage }) } : undefined, [userId]);
  useEffect(() => {
    if (!people) return;
    void people.profile.load().catch(() => {});
    void people.api.registerDevice(deviceName(), devicePlatform()).catch(() => {});
    // Read again when the app comes back (changed on another phone, or not read for want of a connection).
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void people.profile.load().catch(() => {}); });
    return () => appState.remove();
  }, [people]);
  const profile = useSyncExternalStore(
    useCallback((listener: () => void) => people?.profile.subscribe(listener) ?? (() => {}), [people]),
    () => people?.profile.getState() ?? noProfile, () => people?.profile.getState() ?? noProfile);

  // Apart from the rest, so they stay the same functions while the sync moves.
  const personal = useMemo(() => ({
    refreshProfile: () => people?.profile.load() ?? Promise.resolve(),
    setName: (name: string) => people?.profile.setName(name) ?? signedOut(),
    setPhoto: (body: PhotoBody) => people?.profile.setPhoto(body) ?? signedOut(),
    removePhoto: () => people?.profile.removePhoto() ?? signedOut(),
    devices: async () => people ? devicesFrom(await people.api.sessions()) : signedOut(),
    endDevice: async (id: string) => { if (!people) return signedOut(); await people.api.endSession(id); },
    endOtherDevices: () => auth.signOutOthers(),
  }), [people]);

  const sync = useSyncExternalStore(
    useCallback((listener: () => void) => engine?.subscribe(listener) ?? (() => {}), [engine]),
    () => engine?.getState() ?? idle, () => engine?.getState() ?? idle);

  const value = useMemo<AccountContext>(() => ({
    user, sync,
    signUp: (email, password) => auth.signUp(email, password, callback()),
    signIn: (email, password) => auth.signIn(email, password),
    resendConfirmation: (email) => auth.resendConfirmation(email, callback()),
    requestReset: (email) => auth.requestReset(email, callback()),
    adopt: (fragment) => auth.adopt(linkParams(`#${fragment}`)),
    updatePassword: (password, current) => auth.updatePassword(password, current),
    signOut: () => auth.signOut(),
    async deleteAccount() {
      const id = auth.user()?.id;
      // The photos first (the database can't remove files from Storage): every one in the user's
      // folder, strays included.
      if (people && id) await people.api.listPhotos(id).then((paths) => paths.length ? people.api.removePhotos(paths) : undefined).catch(() => {});
      await api.deleteAccount();
      await auth.forget();
      if (id) await Promise.all([ledgerKey(id), profileKey(id)].map((key) => contentStorage.removeItem(key).catch(() => {})));
    },
    syncNow: () => engine?.run() ?? Promise.resolve(),
    settle: (keep) => engine?.settle(keep) ?? Promise.resolve(),

    profile,
    ...personal,
  }), [user, sync, engine, profile, people, personal]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error('AccountProvider is missing');
  return value;
}
