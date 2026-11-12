import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { contentStorage } from '@/features/quran-reader/storage/content-storage';
import { createPersistedStore } from '@/features/quran-reader/state/persisted-store';
import { usePlans } from '@/features/plans/provider';
import { useAccount } from '@/features/account/provider';
import { AccountError } from '@/features/account/auth-client';
import type { InviteKind, InvitePreview, JoinResult } from '@/features/account/api';
import { absent, activeStudents, applyHalaqat, decodeHalaqat, defaultHalaqatState, entryOf, HALAQAT_KEY, heard, sessionClosed,
  type Halaqa, type HalaqatChange, type HalaqatState, type MemberReminder, type ReminderLead } from './model';
import { createMembershipStore, type MembershipState, type MembershipStore, type Person, type TeachingRole } from './membership';
import { observeHalaqaNotifications, syncHalaqaReminders } from './notifications';
import { registerHalaqat } from '@/features/account/registry';
import { halaqatSource } from '@/features/account/sources';

interface HalaqatContext {
  state: HalaqatState;
  /** The saved halaqat have been read (or reading them failed). */
  ready: boolean;
  /** Reading or saving failed; changes are kept and saving is retried. */
  error: boolean;
  /** Scheduling the reminders failed. */
  reminderError: boolean;
  change: (change: HalaqatChange) => void;
}

interface MembershipContext {
  /**
   * Halaqat are shared between a teacher and those in it, so they need an account: signed out
   * (false), they wait on the phone; undefined while the session is read.
   */
  signedIn: boolean | undefined;
  membership: MembershipState;
  /** The user's role in a halaqa they teach: theirs, unless the account says they teach it with its owner. */
  roleOf: (halaqa: string) => TeachingRole;
  refresh: () => Promise<void>;
  preview: (code: string) => Promise<InvitePreview | null>;
  /** Joins with a code (`name`: theirs in the halaqa); null when the code opens nothing. */
  join: (code: string, name: string) => Promise<JoinResult | null>;
  /** Leaves a halaqa they are a member of, or teach with its owner. */
  leave: (halaqa: string) => Promise<void>;
  /** The reminder the user chose on this phone for a halaqa they are a member of. */
  reminderOf: (halaqa: string) => ReminderLead | undefined;
  setReminder: (halaqa: string, lead: ReminderLead | undefined) => Promise<void>;
  invite: (halaqa: string, kind: InviteKind, renew?: boolean) => Promise<{ code: string; expiresAt: string | null }>;
  people: (halaqa: string) => Promise<Person[]>;
  removePerson: (halaqa: string, user: string) => Promise<void>;
}

const Context = createContext<HalaqatContext | null>(null);
const Membership = createContext<MembershipContext | null>(null);
const noMembership: MembershipState = { roles: {}, joined: [], people: {}, photos: {}, reminders: {}, loaded: false, refreshing: false };
const signedOut = () => Promise.reject(new AccountError('session'));

/**
 * The halaqat, saved on the phone as they change; the user's place in those shared through their
 * account; and the reminders before their sessions, those they supervise and those they are in.
 */
export function HalaqatProvider({ children }: PropsWithChildren) {
  const { today } = usePlans();
  const { user, api } = useAccount();
  const signedIn = user === undefined ? undefined : !!user;
  const userId = user?.id;
  const membershipStore = useMemo(() => userId && api ? createMembershipStore({ user: userId, api, storage: contentStorage }) : undefined, [userId, api]);
  const membership = useSyncExternalStore(
    useCallback((listener: () => void) => membershipStore?.subscribe(listener) ?? (() => {}), [membershipStore]),
    () => membershipStore?.getState() ?? noMembership, () => membershipStore?.getState() ?? noMembership);
  const [store] = useState(() => createPersistedStore<HalaqatState, HalaqatChange>({
    storage: contentStorage, key: HALAQAT_KEY, fallback: defaultHalaqatState, decode: decodeHalaqat, apply: applyHalaqat,
  }));
  useEffect(() => store.start(), [store]);
  useEffect(() => registerHalaqat(halaqatSource(store)), [store]);
  const { value: state, ready, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [reminderError, setReminderError] = useState(false);
  // The halaqat the user is a member of with a reminder they chose, as the reminders see them.
  const members: MemberReminder[] = signedIn ? membership.joined.flatMap((j) => {
    const before = membership.reminders[j.halaqa.id];
    return before === undefined ? [] : [{ halaqa: j.halaqa, before }];
  }) : [];
  // What the reminders depend on: each halaqa's name, days, time and reminder, whether it has
  // participants, and which sessions are already done. Rescheduled when that changes, and each day.
  // Signed out, there are none.
  const facts = (h: Halaqa, before: number | undefined) => {
    const students = activeStudents(h);
    return [h.id, h.name, h.weekdays, h.time, before, students.length,
      h.sessions.filter((s) => s.date >= today && students.every((p) => heard(entryOf(s, p.id)) || absent(entryOf(s, p.id)))).map((s) => s.date)];
  };
  const schedule = JSON.stringify(signedIn ? [state.halaqat.map((h) => facts(h, h.reminder?.before)), members.map((m) => facts(m.halaqa, m.before))] : []);
  // Signed in, the halaqat the user is a member of are read from the phone first: scheduled
  // without them, their reminders would be cancelled at each start and set again a moment later.
  const membersRead = !signedIn || !membershipStore || membership.loaded;
  useEffect(() => {
    if (!ready || signedIn === undefined || !membersRead) return;
    let active = true;
    void syncHalaqaReminders(signedIn ? state : defaultHalaqatState, members).then(() => { if (active) setReminderError(false); }, () => { if (active) setReminderError(true); });
    return () => { active = false; };
    // `state` and `members` are read as they are when what the reminders depend on (`schedule`) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, schedule, today, signedIn, membersRead]);
  // The same function for the store's life, so what depends on it doesn't run again at each change.
  // A closed session is not written to, whatever screen asks.
  const change = useCallback((next: HalaqatChange) => {
    if ((next.type === 'saveEntries' || next.type === 'deleteSession') && sessionClosed(next.date, today)) return;
    store.update(next);
  }, [store, today]);
  const value = useMemo(() => ({ state, ready, error, reminderError, change }), [state, ready, error, reminderError, change]);
  return <Context.Provider value={value}>
    <MembershipProvider signedIn={signedIn} store={membershipStore} membership={membership}>{children}</MembershipProvider>
  </Context.Provider>;
}

/** The halaqat shared through the account: the user's roles, those they joined, and the way in. */
function MembershipProvider({ signedIn, store, membership, children }: PropsWithChildren<{
  signedIn: boolean | undefined; store: MembershipStore | undefined; membership: MembershipState;
}>) {
  const { today } = usePlans();
  const { api, syncNow } = useAccount();
  const { change } = useContext(Context)!;
  // Read when needed: it changes with every step of a sync, and the actions below stay the same.
  const sync = useRef(syncNow);
  useEffect(() => { sync.current = syncNow; }, [syncNow]);
  useEffect(() => {
    if (!store) return;
    void store.refresh(today);
    const appState = AppState.addEventListener('change', (next) => { if (next === 'active') void store.refresh(today); });
    return () => appState.remove();
  }, [store, today]);

  const actions = useMemo<Omit<MembershipContext, 'signedIn' | 'membership' | 'roleOf' | 'reminderOf'>>(() => ({
    refresh: () => store?.refresh(today) ?? Promise.resolve(),
    preview: (code) => api ? api.previewInvite(code) : signedOut(),
    async join(code, name) {
      if (!api || !store) return signedOut();
      const joined = await api.joinHalaqa(code, name, today);
      if (joined) {
        await store.refresh(today);
        // A co-teacher's phone keeps the halaqa itself, from the account.
        if (joined.role === 'teacher') await sync.current().catch(() => {});
      }
      return joined;
    },
    async leave(halaqa) {
      if (!api || !store) return signedOut();
      await api.leaveHalaqa(halaqa, today);
      // Gone from the phone once the account no longer counts them in it.
      change({ type: 'deleteHalaqa', halaqa });
      await store.forget(halaqa);
    },
    async invite(halaqa, kind, renew = false) {
      if (!api) return signedOut();
      const { code, expires_at } = await api.halaqaInvite(halaqa, kind, renew);
      return { code, expiresAt: expires_at };
    },
    people: (halaqa) => store ? store.people(halaqa) : signedOut(),
    async removePerson(halaqa, person) {
      if (!api || !store) return signedOut();
      await api.removeHalaqaMember(halaqa, person);
      await store.people(halaqa);
    },
    setReminder: (halaqa, lead) => store ? store.setReminder(halaqa, lead) : signedOut(),
  }), [store, api, today, change]);
  const value = useMemo<MembershipContext>(() => ({
    signedIn, membership, ...actions,
    roleOf: (halaqa) => membership.roles[halaqa] ?? 'owner',
    reminderOf: (halaqa) => membership.reminders[halaqa],
  }), [signedIn, membership, actions]);
  return <Membership.Provider value={value}>{children}</Membership.Provider>;
}

export function useHalaqat() {
  const value = useContext(Context);
  if (!value) throw new Error('HalaqatProvider is missing');
  return value;
}

export function useMembership() {
  const value = useContext(Membership);
  if (!value) throw new Error('HalaqatProvider is missing');
  return value;
}

export function useHalaqa(id: string | undefined) {
  const { state, ready } = useHalaqat();
  return { halaqa: state.halaqat.find((h) => h.id === id), ready };
}

/** Opens the session a reminder was about; for a member, the halaqa as they see it. */
export function HalaqaNotificationObserver() {
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key) return;
    return observeHalaqaNotifications((halaqa, date, member) => member
      ? router.push({ pathname: '/halaqat/[id]', params: { id: halaqa } })
      : router.push({ pathname: '/halaqat/session', params: { halaqa, date } }));
  }, [navigation?.key]);
  return null;
}
