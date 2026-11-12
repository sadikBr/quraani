import type { CacheStorage } from '@/lib/quranpedia/cache';

/**
 * Signing in to the account with an email and a password (Supabase Auth, over plain HTTP; nothing
 * native). Signing up sends a confirmation email whose link opens the app, which signs in once
 * the user agrees (`peek`, then `adopt`); a forgotten password is reset from such a link too. The session stays on
 * the phone and is refreshed before it expires, one refresh at a time (each one replaces the
 * refresh token); signing out (or in as someone else) meanwhile wins over a refresh in flight.
 */

export interface AccountUser { id: string; email: string }
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** When the access token expires, by this phone's clock (ms). */
  expiresAt: number;
  user: AccountUser;
}

export type AccountProblem =
  | 'invalid_email' | 'invalid_credentials' | 'email_not_confirmed' | 'weak_password' | 'same_password' | 'email_taken' | 'current_password'
  | 'rate_limited' | 'not_allowed' | 'link_expired'
  /** No connection, or the account didn't answer in time. */
  | 'network'
  /** The session ended (signed out elsewhere, or the account was deleted): sign in again. */
  | 'session'
  | 'failed';

export class AccountError extends Error {
  constructor(readonly kind: AccountProblem, message: string = kind) { super(message); }
}

export const SESSION_KEY = 'account:session:v1';
/** Refresh this long before the access token expires. */
const MARGIN = 60_000;
/** A request that hasn't answered by then is given up (and retried later). */
export const REQUEST_TIMEOUT = 30_000;
/** The shortest password asked for (the account may ask for more). */
export const PASSWORD_MIN = 8;

interface Options {
  url: string;
  /** The project's publishable key (public by design). */
  apiKey: string;
  storage: Pick<CacheStorage, 'getItem' | 'setItem' | 'removeItem'>;
  fetch?: typeof fetch;
  now?: () => number;
  timeout?: number;
}

/** A request that gives up after `timeout` ms; offline and timed out both read as 'network'. */
export async function request(send: typeof fetch, url: string, init: RequestInit, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await send(url, { ...init, signal: controller.signal });
  } catch (error) {
    // Kept for the logs: not every failure to send is the connection's.
    throw new AccountError('network', error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

const sessionCodes = new Set(['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'user_not_found', 'bad_jwt', 'user_banned']);
interface AuthErrorBody { error_code?: string; code?: string | number; error?: string; msg?: string; error_description?: string }
function problemOf(path: string, status: number, body: AuthErrorBody | null): AccountProblem {
  const code = body?.error_code ?? (typeof body?.code === 'string' ? body.code : undefined) ?? body?.error;
  if (status === 429 || code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'rate_limited';
  if (code && sessionCodes.has(code)) return 'session';
  if (path.startsWith('/token?grant_type=refresh_token')) return code === 'invalid_grant' ? 'session' : 'failed';
  if (code === 'invalid_credentials' || (path.startsWith('/token') && code === 'invalid_grant')) return 'invalid_credentials';
  if (code === 'email_not_confirmed') return 'email_not_confirmed';
  if (code === 'weak_password') return 'weak_password';
  if (code === 'same_password') return 'same_password';
  if (code === 'current_password_invalid' || code === 'current_password_required') return 'current_password';
  if (code === 'user_already_exists' || code === 'email_exists') return 'email_taken';
  if (code === 'email_address_not_authorized' || code === 'signup_disabled') return 'not_allowed';
  if (code === 'email_address_invalid' || (code === 'validation_failed' && /mail/i.test(body?.msg ?? ''))) return 'invalid_email';
  return 'failed';
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
/** Enough to catch a slip before asking the account; it checks the rest. */
export const plausibleEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));

function decodeSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    return typeof s?.accessToken === 'string' && typeof s.refreshToken === 'string' && Number.isFinite(s.expiresAt) &&
      typeof s.user?.id === 'string' && typeof s.user.email === 'string' ? s : null;
  } catch {
    return null;
  }
}

/** The tokens in the part after `#` of a link from an account email (or the error it carries). */
export function linkParams(url: string): Record<string, string> {
  const at = url.indexOf('#');
  if (at < 0) return {};
  return Object.fromEntries(url.slice(at + 1).split('&').filter(Boolean).map((pair) => {
    const [key, value = ''] = pair.split('=');
    return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' '))];
  }));
}

export function createAuthClient({ url, apiKey, storage, fetch: send = fetch, now = Date.now, timeout = REQUEST_TIMEOUT }: Options) {
  let session: Session | null = null;
  let loaded = false;
  let loading: Promise<Session | null> | undefined;
  let refreshing: Promise<Session> | undefined;
  // Bumped by every sign-in and sign-out: a refresh that started before one doesn't land after it.
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());

  async function call(path: string, body: unknown, { token, method = 'POST' }: { token?: string; method?: string } = {}) {
    const response = await request(send, `${url}/auth/v1${path}`, {
      method,
      headers: { apikey: apiKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
    }, timeout);
    const text = await response.text().catch(() => '');
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!response.ok) {
      const error = json as AuthErrorBody | null;
      throw new AccountError(problemOf(path, response.status, error), error?.msg ?? error?.error_description ?? `HTTP ${response.status}`);
    }
    return json as Record<string, unknown> | null;
  }

  function sessionFrom(json: Record<string, unknown> | null, email?: string): Session {
    const user = json?.user as { id?: unknown; email?: unknown } | undefined;
    if (typeof json?.access_token !== 'string' || typeof json.refresh_token !== 'string' || typeof user?.id !== 'string') throw new AccountError('failed', 'Unexpected session');
    const seconds = Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
    return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: now() + seconds * 1000,
      user: { id: user.id, email: typeof user.email === 'string' ? user.email : email ?? '' } };
  }

  async function keep(next: Session | null) {
    session = next;
    publish();
    if (next) await storage.setItem(SESSION_KEY, JSON.stringify(next)).catch(() => {});
    else await storage.removeItem(SESSION_KEY).catch(() => {});
  }
  /** A new session (or none), ending anything begun for the one before. */
  const begin = (next: Session | null) => { generation++; refreshing = undefined; loaded = true; return keep(next); };

  const load = () => loading ??= storage.getItem(SESSION_KEY).catch(() => null).then((raw) => {
    // A session set or ended meanwhile (signing in or out while this was read) wins.
    if (!loaded) { session = decodeSession(raw); loaded = true; }
    publish();
    return session;
  });
  /** An access token for the account, refreshed first when it is about to expire (or when `force`d). */
  async function token(force = false): Promise<string> {
    if (!loaded) await load();
    const current = session;
    if (!current) throw new AccountError('session');
    if (!force && current.expiresAt - MARGIN > now()) return current.accessToken;
    const started = generation;
    refreshing ??= (async () => {
      try {
        const next = sessionFrom(await call('/token?grant_type=refresh_token', { refresh_token: current.refreshToken }), current.user.email);
        // Signed out or in as someone else meanwhile: this refresh is no longer wanted.
        if (generation !== started) throw new AccountError('session');
        await keep(next);
        return next;
      } catch (error) {
        // The session is over: signed out here too. Anything else (offline) keeps it for later.
        if (error instanceof AccountError && error.kind === 'session' && generation === started && session?.refreshToken === current.refreshToken) await begin(null);
        throw error;
      } finally {
        if (generation === started) refreshing = undefined;
      }
    })();
    return (await refreshing).accessToken;
  }

  const redirect = (to?: string) => to ? `?redirect_to=${encodeURIComponent(to)}` : '';
  /** The user a link's tokens belong to, as the account says (or the error the link carries). */
  function linkUser(link: Record<string, string>) {
    if (link.error || link.error_code) throw new AccountError(link.error_code === 'otp_expired' ? 'link_expired' : 'failed', link.error_description ?? link.error);
    if (!link.access_token || !link.refresh_token) throw new AccountError('failed', 'No tokens in link');
    return call('/user', undefined, { token: link.access_token, method: 'GET' });
  }

  return {
    /** Reads the saved session; resolves with the current one (null when signed out). */
    load: () => load().then(() => session),
    /** The signed-in user, null when signed out (and before `load` finishes). */
    user: () => session?.user ?? null,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /**
     * Makes an account. Signed in at once when the account needs no confirmation; otherwise a
     * confirmation email is on its way (its link opens `confirmTo`), and this resolves false.
     */
    async signUp(email: string, password: string, confirmTo?: string): Promise<boolean> {
      const json = await call(`/signup${redirect(confirmTo)}`, { email: normalizeEmail(email), password });
      if (typeof json?.access_token !== 'string') return false;
      await begin(sessionFrom(json, normalizeEmail(email)));
      return true;
    },
    async signIn(email: string, password: string) {
      await begin(sessionFrom(await call('/token?grant_type=password', { email: normalizeEmail(email), password }), normalizeEmail(email)));
    },
    /** Sends the confirmation email again. */
    async resendConfirmation(email: string, confirmTo?: string) {
      await call(`/resend${redirect(confirmTo)}`, { type: 'signup', email: normalizeEmail(email) });
    },
    /** Sends an email to set a new password; its link opens `resetTo`. */
    async requestReset(email: string, resetTo?: string) {
      await call(`/recover${redirect(resetTo)}`, { email: normalizeEmail(email) });
    },
    /**
     * Whose account a link from an account email opens, without signing in. A link is not proof
     * that this phone's owner asked for it (anyone can send one that opens the app), so the app
     * shows this account and asks before `adopt`.
     */
    async peek(link: Record<string, string>): Promise<AccountUser> {
      const user = await linkUser(link);
      if (typeof user?.id !== 'string' || typeof user.email !== 'string') throw new AccountError('failed', 'Unexpected user');
      return { id: user.id, email: user.email };
    },
    /**
     * Signs in from a link in an account email (confirmation or password reset): the tokens after
     * its `#`. Returns what the link was for.
     */
    async adopt(link: Record<string, string>): Promise<string> {
      const user = await linkUser(link);
      await begin(sessionFrom({ ...link, user }));
      return link.type ?? '';
    },
    /**
     * Sets a new password for the signed-in user; `current` is the one it replaces (the project
     * asks for it, except right after a reset link).
     */
    async updatePassword(password: string, current?: string) {
      await call('/user', { password, ...(current ? { current_password: current } : {}) }, { token: await token(), method: 'PUT' });
    },

    token,

    /** Signs out on this phone (the account's other sessions stay). */
    async signOut() {
      const current = session;
      await begin(null);
      if (current) await call('/logout?scope=local', {}, { token: current.accessToken }).catch(() => {});
    },
    /** Signs the account's other devices out (this one stays signed in). */
    async signOutOthers() {
      await call('/logout?scope=others', {}, { token: await token() });
    },
    /** Forgets the session without telling the account (it was deleted). */
    forget: () => begin(null),
  };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
