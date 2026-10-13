import { AccountError, request, REQUEST_TIMEOUT } from './auth-client';
import type { HalaqaPush, HalaqaPushResult, Remote } from './sync/types';

interface Options {
  url: string;
  apiKey: string;
  /** The signed-in user's access token (`force`: refreshed first). */
  token: (force?: boolean) => Promise<string>;
  fetch?: typeof fetch;
  timeout?: number;
}

/** A photo to upload: a file on the phone (sent as a form), or the bytes themselves (web). */
export type PhotoBody = Blob | { uri: string; name: string; type: string };
/** How long a photo may be cached on the way (it never changes: a new photo has a new name). */
const PHOTO_CACHE_SECONDS = 3600;
/** The photos bucket (see supabase/migrations/…_profiles_and_devices.sql). */
const AVATARS = 'avatars';

/**
 * The account's data, through the database functions of supabase/migrations (the Data API's
 * `rpc`) and its Storage (profile photos). Both act as the signed-in user, so the database's
 * access rules always apply.
 */
export function createAccountApi({ url, apiKey, token, fetch: send = fetch, timeout = REQUEST_TIMEOUT }: Options) {
  /** A request as the user: an access token the account no longer takes is refreshed once. */
  async function authed<T>(path: string, init: RequestInit & { headers?: Record<string, string> }): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const access = await token(attempt > 0);
      const response = await request(send, `${url}${path}`, {
        ...init, headers: { apikey: apiKey, Authorization: `Bearer ${access}`, Accept: 'application/json', ...init.headers },
      }, timeout);
      if (response.status === 401) {
        if (attempt === 0) continue;
        throw new AccountError('session');
      }
      const text = await response.text().catch(() => '');
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!response.ok) throw new AccountError(response.status >= 500 && response.status !== 501 ? 'network' : 'failed', (json as { message?: string })?.message ?? `HTTP ${response.status}`);
      return json as T;
    }
  }
  const rpc = <T>(name: string, args: Record<string, unknown> = {}) =>
    authed<T>(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });

  const remote: Remote = {
    documentRevisions: () => rpc('document_revisions'),
    getDocuments: (keys) => rpc('get_documents', { p_keys: keys }),
    putDocument: (key, data, base) => rpc('put_document', { p_key: key, p_data: data, p_base: base }),
    halaqaVersions: () => rpc('halaqa_versions'),
    pullHalaqa: (id, since) => rpc('pull_halaqa', { p_halaqa: id, p_since: since }),
    pushHalaqa: (id, push: HalaqaPush) => rpc<HalaqaPushResult>('push_halaqa', { p_halaqa: id, p_meta: push.meta ?? null, p_students: push.students, p_entries: push.entries }),
  };
  return {
    ...remote,
    /** Deletes the account and everything kept with it. */
    deleteAccount: () => rpc<void>('delete_account'),

    /** The user's name and photo path; null before they set any. */
    async profile(): Promise<{ fullName: string; avatar: string | null } | null> {
      const rows = await rpc<{ full_name: string; avatar: string | null }[]>('my_profile');
      return rows?.[0] ? { fullName: rows[0].full_name, avatar: rows[0].avatar } : null;
    },
    setProfileName: (fullName: string) => rpc<void>('set_profile_name', { p_full_name: fullName }),
    /** Puts a photo (or none) in the profile; returns the one it replaced. */
    setProfilePhoto: (avatar: string | null) => rpc<string | null>('set_profile_photo', { p_avatar: avatar }),
    /** Puts a photo at `path` (in the user's folder) in the photos bucket. */
    uploadPhoto(path: string, photo: PhotoBody) {
      const target = `/storage/v1/object/${AVATARS}/${path}`;
      if (photo instanceof Blob) {
        return authed<unknown>(target, { method: 'POST', body: photo, headers: { 'x-upsert': 'false', 'cache-control': `max-age=${PHOTO_CACHE_SECONDS}`, 'Content-Type': 'image/jpeg' } });
      }
      // As Supabase's own client sends a file: its fields before it, the form sets its own type.
      const form = new FormData();
      form.append('cacheControl', String(PHOTO_CACHE_SECONDS));
      form.append('', photo as unknown as Blob);
      return authed<unknown>(target, { method: 'POST', body: form, headers: { 'x-upsert': 'false' } });
    },
    /** A link to a photo that works for `seconds` (the bucket is private). */
    async photoLink(path: string, seconds: number): Promise<string> {
      const json = await authed<{ signedURL?: string; signedUrl?: string }>(`/storage/v1/object/sign/${AVATARS}/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: seconds }),
      });
      const link = json?.signedURL ?? json?.signedUrl;
      if (!link) throw new AccountError('failed', 'No signed link');
      return /^https?:/.test(link) ? link : `${url}/storage/v1${link.startsWith('/') ? '' : '/'}${link}`;
    },
    removePhotos: (paths: string[]) => authed<unknown>(`/storage/v1/object/${AVATARS}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths }),
    }),
    /** Every photo in a folder of the bucket (the user's own), as paths. */
    async listPhotos(folder: string): Promise<string[]> {
      const items = await authed<{ name?: string; id?: string | null }[]>(`/storage/v1/object/list/${AVATARS}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: folder, limit: 1000, offset: 0 }),
      });
      // Files have an id; folders (none are made here) don't.
      return (items ?? []).filter((item) => item.name && item.id).map((item) => `${folder}/${item.name}`);
    },

    /** Names this phone's sign-in session, so the account's list of devices can say which it is. */
    registerDevice: (name: string, platform: 'android' | 'ios' | 'web') => rpc<void>('register_device', { p_name: name, p_platform: platform }),
    sessions: () => rpc<unknown>('my_sessions'),
    /** Signs one of the account's devices out; false when it was already gone. */
    endSession: (id: string) => rpc<boolean>('end_session', { p_session: id }),
  };
}

export type AccountApi = ReturnType<typeof createAccountApi>;
