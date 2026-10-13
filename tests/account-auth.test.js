import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { AccountError, createAuthClient, linkParams, plausibleEmail, SESSION_KEY } from '../src/features/account/auth-client';
import { createAccountApi } from '../src/features/account/api';

const URL = 'https://project.supabase.co', KEY = 'sb_publishable_test';
const json = (status, body) => new Response(body === undefined ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sessionBody = (n, expires = 3600, id = 'user-1') => ({ access_token: `access-${n}`, refresh_token: `refresh-${n}`, token_type: 'bearer', expires_in: expires, user: { id, email: 'me@example.com' } });
const kind = (promise) => promise.then(() => 'ok', (e) => e instanceof AccountError ? e.kind : String(e));

/** A fetch that answers from `routes` (path → (body, init) => Response) and records the requests. */
function server(routes) {
  const requests = [];
  const fetch = async (url, init) => {
    const path = url.slice(URL.length);
    requests.push({ path, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[path] ?? routes[path.split('?')[0]];
    if (!route) throw new TypeError('Network request failed');
    return route(init.body ? JSON.parse(init.body) : undefined, init);
  };
  return { fetch, requests };
}
const client = (routes, extra = {}) => {
  const storage = extra.storage ?? new MemoryCacheStorage();
  const { fetch, requests } = server(routes);
  return { auth: createAuthClient({ url: URL, apiKey: KEY, storage, fetch, ...extra }), storage, requests };
};

describe('email and password', () => {
  test('signing up asks to confirm the email; signing in keeps the session, which comes back', async () => {
    const { auth, storage, requests } = client({
      '/auth/v1/signup': () => json(200, { id: 'user-1', email: 'me@example.com', confirmation_sent_at: '2026-10-13T12:00:00Z' }),
      '/auth/v1/token?grant_type=password': (body) => body.password === 'right-password' ? json(200, sessionBody(1))
        : json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    }, { now: () => 1_000_000 });
    expect(await auth.signUp(' Me@Example.com ', 'right-password', 'quranmobile://account/callback')).toBe(false);
    expect(requests[0]).toMatchObject({ path: '/auth/v1/signup?redirect_to=quranmobile%3A%2F%2Faccount%2Fcallback', body: { email: 'me@example.com', password: 'right-password' } });
    expect(auth.user()).toBeNull();
    expect(await kind(auth.signIn('me@example.com', 'wrong'))).toBe('invalid_credentials');
    await auth.signIn('me@example.com', 'right-password');
    expect(auth.user()).toEqual({ id: 'user-1', email: 'me@example.com' });
    expect(await auth.token()).toBe('access-1');
    expect(JSON.parse(await storage.getItem(SESSION_KEY)).expiresAt).toBe(1_000_000 + 3_600_000);
    const again = createAuthClient({ url: URL, apiKey: KEY, storage, fetch: server({}).fetch });
    expect(again.user()).toBeNull();
    expect((await again.load())?.user.id).toBe('user-1');
  });

  test('an account that needs no confirmation is signed in at once', async () => {
    const { auth } = client({ '/auth/v1/signup': () => json(200, sessionBody(1)) });
    expect(await auth.signUp('me@example.com', 'long-enough')).toBe(true);
    expect(auth.user()?.id).toBe('user-1');
  });

  test('what went wrong is told apart', async () => {
    const failing = (status, body) => client({ '/auth/v1/signup': () => json(status, body), '/auth/v1/token': () => json(status, body), '/auth/v1/recover': () => json(status, body) }).auth;
    expect(await kind(failing(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' }).signIn('a@b.co', 'x'))).toBe('email_not_confirmed');
    expect(await kind(failing(422, { error_code: 'weak_password', msg: 'weak' }).signUp('a@b.co', 'x'))).toBe('weak_password');
    expect(await kind(failing(422, { error_code: 'user_already_exists', msg: 'exists' }).signUp('a@b.co', 'x'))).toBe('email_taken');
    expect(await kind(failing(400, { error_code: 'email_address_invalid', msg: 'no' }).signUp('a@b', 'x'))).toBe('invalid_email');
    expect(await kind(failing(429, { error_code: 'over_email_send_rate_limit', msg: 'slow' }).requestReset('a@b.co'))).toBe('rate_limited');
    expect(await kind(failing(400, { error_code: 'email_address_not_authorized', msg: 'no' }).requestReset('a@b.co'))).toBe('not_allowed');
    expect(await kind(failing(500, { msg: 'boom' }).signIn('a@b.co', 'x'))).toBe('failed');
    const signedIn = client({ '/auth/v1/token?grant_type=password': () => json(200, sessionBody(1)),
      '/auth/v1/user': () => json(400, { code: 400, error_code: 'current_password_invalid', msg: 'Current password required when setting new password.' }) }).auth;
    await signedIn.signIn('a@b.co', 'x');
    expect(await kind(signedIn.updatePassword('new-password', 'wrong'))).toBe('current_password');
    expect(await kind(client({}).auth.signIn('a@b.co', 'x'))).toBe('network');
    expect(plausibleEmail(' me@example.com ')).toBe(true);
    expect(plausibleEmail('me@example')).toBe(false);
  });

  test('a request that doesn\'t answer is given up', async () => {
    const auth = createAuthClient({ url: URL, apiKey: KEY, storage: new MemoryCacheStorage(), timeout: 20,
      fetch: (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
    expect(await kind(auth.signIn('a@b.co', 'x'))).toBe('network');
  });

  test('a link from an email signs in: a confirmation, or a password reset then a new password', async () => {
    const { auth, requests } = client({
      '/auth/v1/user': (body, init) => init.method === 'GET' ? json(200, { id: 'user-1', email: 'me@example.com' }) : json(200, { id: 'user-1' }),
    });
    const link = 'quranmobile://account/callback#access_token=access-9&expires_at=99&expires_in=3600&refresh_token=refresh-9&token_type=bearer&type=recovery';
    expect(linkParams(link)).toMatchObject({ access_token: 'access-9', refresh_token: 'refresh-9', type: 'recovery' });
    expect(await auth.adopt(linkParams(link))).toBe('recovery');
    expect(requests[0]).toMatchObject({ path: '/auth/v1/user', method: 'GET', headers: { Authorization: 'Bearer access-9' } });
    expect(auth.user()).toEqual({ id: 'user-1', email: 'me@example.com' });
    await auth.updatePassword('a-new-password');
    expect(requests[1]).toMatchObject({ path: '/auth/v1/user', method: 'PUT', body: { password: 'a-new-password' }, headers: { Authorization: 'Bearer access-9' } });
    await auth.updatePassword('another-one', 'a-new-password');
    expect(requests[2].body).toEqual({ password: 'another-one', current_password: 'a-new-password' });
    const expired = linkParams('quranmobile://account/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(await kind(auth.adopt(expired))).toBe('link_expired');
  });
});

describe('the session', () => {
  const signedIn = async (routes, now = () => 0) => {
    const c = client({ '/auth/v1/token?grant_type=password': () => json(200, sessionBody(1)), ...routes }, { now });
    await c.auth.signIn('me@example.com', 'pw');
    return c;
  };

  test('refreshed before it expires, once for many callers', async () => {
    let clock = 0, refreshes = 0;
    const { auth, storage } = await signedIn({
      '/auth/v1/token?grant_type=refresh_token': (body) => { refreshes++; expect(body).toEqual({ refresh_token: `refresh-${refreshes}` }); return json(200, sessionBody(refreshes + 1)); },
    }, () => clock);
    clock = 3_600_000 - 30_000;
    expect(await Promise.all([auth.token(), auth.token(), auth.token()])).toEqual(['access-2', 'access-2', 'access-2']);
    expect(refreshes).toBe(1);
    expect(JSON.parse(await storage.getItem(SESSION_KEY)).refreshToken).toBe('refresh-2');
    expect(await auth.token(true)).toBe('access-3');
  });

  test('ended in the account: signed out here; offline or rate-limited: kept', async () => {
    let answer = () => { throw new TypeError('offline'); };
    const { auth, storage } = await signedIn({ '/auth/v1/token?grant_type=refresh_token': () => answer() });
    expect(await kind(auth.token(true))).toBe('network');
    answer = () => json(429, { error_code: 'over_request_rate_limit', msg: 'slow' });
    expect(await kind(auth.token(true))).toBe('rate_limited');
    answer = () => json(403, { msg: 'blocked by a proxy' });
    expect(await kind(auth.token(true))).toBe('failed');
    expect(auth.user()).not.toBeNull();
    answer = () => json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    expect(await kind(auth.token(true))).toBe('session');
    expect(auth.user()).toBeNull();
    expect(await storage.getItem(SESSION_KEY)).toBeNull();
  });

  test('signing out stays signed out, even with a refresh on its way', async () => {
    let release;
    const { auth, storage, requests } = await signedIn({
      '/auth/v1/token?grant_type=refresh_token': () => new Promise((resolve) => { release = () => resolve(json(200, sessionBody(2))); }),
      '/auth/v1/logout': () => json(204),
    });
    await auth.load();
    const late = auth.token(true);
    await new Promise((r) => setTimeout(r, 5));
    await auth.signOut();
    release();
    expect(await kind(late)).toBe('session');
    expect(auth.user()).toBeNull();
    expect(await storage.getItem(SESSION_KEY)).toBeNull();
    expect(await kind(auth.token())).toBe('session');
    expect(requests.find((r) => r.path === '/auth/v1/logout?scope=local').headers.Authorization).toBe('Bearer access-1');
  });
});

describe('the account\'s data', () => {
  test('database functions are called as the user, refreshing an expired token once', async () => {
    const tokens = [];
    let expired = true;
    const { fetch, requests } = server({
      '/rest/v1/rpc/put_document': () => { if (expired) { expired = false; return json(401, { message: 'JWT expired' }); } return json(200, 2); },
      '/rest/v1/rpc/document_revisions': () => json(200, [{ key: 'plans:v1', revision: 2 }]),
      '/rest/v1/rpc/delete_account': () => json(204),
    });
    const api = createAccountApi({ url: URL, apiKey: KEY, fetch, token: async (force) => { tokens.push(force); return force ? 'fresh' : 'old'; } });
    expect(await api.putDocument('plans:v1', { a: 1 }, 1)).toBe(2);
    expect(tokens).toEqual([false, true]);
    expect(requests[1]).toMatchObject({ path: '/rest/v1/rpc/put_document', body: { p_key: 'plans:v1', p_data: { a: 1 }, p_base: 1 },
      headers: { apikey: KEY, Authorization: 'Bearer fresh', 'Content-Type': 'application/json', Accept: 'application/json' } });
    expect(await api.documentRevisions()).toEqual([{ key: 'plans:v1', revision: 2 }]);
    expect(await api.deleteAccount()).toBeNull();
  });

  test('errors say whether to try again later', async () => {
    const api = (status, body) => createAccountApi({ url: URL, apiKey: KEY, token: async () => 't', fetch: server({ '/rest/v1/rpc/halaqa_versions': () => json(status, body) }).fetch });
    await expect(api(401, {}).halaqaVersions()).rejects.toMatchObject({ kind: 'session' });
    await expect(api(503, {}).halaqaVersions()).rejects.toMatchObject({ kind: 'network' });
    await expect(api(400, { message: 'halaqa_deleted' }).halaqaVersions()).rejects.toMatchObject({ kind: 'failed', message: 'halaqa_deleted' });
    await expect(createAccountApi({ url: URL, apiKey: KEY, token: async () => 't', fetch: server({}).fetch }).halaqaVersions()).rejects.toMatchObject({ kind: 'network' });
  });
});
