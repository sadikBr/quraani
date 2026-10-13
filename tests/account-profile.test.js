import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { createAccountApi } from '../src/features/account/api';
import { createProfileStore, devicesFrom, initialOf, photoPath, profileKey, timeOf } from '../src/features/account/profile';

const USER = '00000000-0000-0000-0000-00000000000d';
const URL = 'https://project.supabase.co', KEY = 'sb_publishable_test';

/** The account's profile and photos in memory, as the SQL and Storage keep them. */
function fakeAccount() {
  const files = new Map();
  let row = null, links = 0, offline = false;
  const online = () => { if (offline) throw Object.assign(new Error('offline'), { kind: 'network' }); };
  const api = {
    async profile() { online(); return row && { ...row }; },
    async setProfileName(fullName) { online(); row = { fullName: fullName.trim(), avatar: row?.avatar ?? null }; },
    async setProfilePhoto(avatar) {
      online();
      if (avatar && !avatar.startsWith(`${USER}/`)) throw new Error('violates check constraint');
      const previous = row?.avatar ?? null;
      row = { fullName: row?.fullName ?? '', avatar };
      return previous;
    },
    async uploadPhoto(path, body) { online(); if (files.has(path)) throw new Error('exists'); files.set(path, body); },
    async photoLink(path, seconds) { online(); if (!files.has(path)) throw new Error('not found'); links++; return `${URL}/storage/v1/object/sign/avatars/${path}?token=t${links}&s=${seconds}`; },
    async removePhotos(paths) { online(); for (const path of paths) files.delete(path); },
  };
  return { api, files, get row() { return row; }, set row(value) { row = value; }, get links() { return links; }, set offline(value) { offline = value; } };
}

describe('the profile', () => {
  test('a name and a photo: set, shown through a link, and remembered on the phone', async () => {
    let clock = 1_000_000;
    const account = fakeAccount(), storage = new MemoryCacheStorage();
    const store = createProfileStore({ user: USER, api: account.api, storage, now: () => clock });
    await store.load();
    expect(store.getState().profile).toEqual({ fullName: '', avatar: null });
    await store.setName('  إبراهيم صادق  ');
    expect(account.row).toEqual({ fullName: 'إبراهيم صادق', avatar: null });

    await store.setPhoto('first-photo-bytes');
    const first = store.getState().profile;
    expect(first.avatar).toMatch(new RegExp(`^${USER}/[a-z0-9-]+\\.jpg$`));
    expect(first.photo.url).toContain(first.avatar);
    expect(account.row).toEqual({ fullName: 'إبراهيم صادق', avatar: first.avatar });

    await store.setPhoto('second-photo-bytes');
    const second = store.getState().profile;
    expect(second.avatar).not.toBe(first.avatar);
    expect([...account.files.keys()]).toEqual([second.avatar]); // the old photo is removed

    // Another launch, offline: the phone shows what it remembers.
    account.offline = true;
    const again = createProfileStore({ user: USER, api: account.api, storage, now: () => clock });
    await again.load().catch(() => {});
    expect(again.getState().profile).toEqual(second);

    // Online, a link that still works is kept; one about to expire is renewed.
    account.offline = false;
    const links = account.links;
    await again.load();
    expect(account.links).toBe(links);
    clock += 6.5 * 24 * 3600 * 1000;
    await again.load();
    expect(account.links).toBe(links + 1);

    await again.removePhoto();
    expect(again.getState().profile).toEqual({ fullName: 'إبراهيم صادق', avatar: null });
    expect(account.files.size).toBe(0);
    expect(JSON.parse(await storage.getItem(profileKey(USER))).avatar).toBeNull();
  });

  test('a photo the profile couldn\'t take is removed again, and the old one stays', async () => {
    const account = fakeAccount(), storage = new MemoryCacheStorage();
    const store = createProfileStore({ user: USER, api: account.api, storage });
    await store.load();
    await store.setPhoto('kept');
    const kept = store.getState().profile.avatar;
    account.api.setProfilePhoto = async () => { throw new Error('refused'); };
    await expect(store.setPhoto('lost')).rejects.toThrow('refused');
    expect([...account.files.keys()]).toEqual([kept]);
    expect(store.getState().profile.avatar).toBe(kept);
    expect(store.getState().busy).toBe(false);
  });

  test('a photo the account took though its answer was lost is kept, and the old one goes', async () => {
    const account = fakeAccount(), storage = new MemoryCacheStorage();
    const store = createProfileStore({ user: USER, api: account.api, storage });
    await store.load();
    await store.setPhoto('old');
    const old = store.getState().profile.avatar;
    const take = account.api.setProfilePhoto;
    account.api.setProfilePhoto = async (avatar) => { await take(avatar); throw new Error('timed out'); };
    await store.setPhoto('new');
    const now = store.getState().profile.avatar;
    expect(now).not.toBe(old);
    expect(account.row.avatar).toBe(now);
    expect([...account.files.keys()]).toEqual([now]);

    // Its answer lost and the account out of reach: the new file stays (it may be in the profile).
    account.api.setProfilePhoto = async () => { account.offline = true; throw new Error('timed out'); };
    await expect(store.setPhoto('unknown')).rejects.toThrow();
    account.offline = false;
    expect(account.files.size).toBe(2);
  });

  test('the name and the photo change apart, even before the profile is read', async () => {
    const account = fakeAccount(), storage = new MemoryCacheStorage();
    account.row = { fullName: 'من هاتف آخر', avatar: `${USER}/other.jpg` };
    account.files.set(`${USER}/other.jpg`, 'bytes');
    // Never read (no connection when the app opened): a new name doesn't take the photo away.
    const store = createProfileStore({ user: USER, api: account.api, storage });
    await store.setName('إبراهيم');
    expect(account.row).toEqual({ fullName: 'إبراهيم', avatar: `${USER}/other.jpg` });
    expect(store.getState().profile).toMatchObject({ fullName: 'إبراهيم', avatar: `${USER}/other.jpg` });

    // Another phone changed the photo since: this one's new photo replaces the account's, not its own old copy.
    const other = createProfileStore({ user: USER, api: account.api, storage: new MemoryCacheStorage() });
    await other.load();
    await other.setPhoto('from the other phone');
    const between = account.row.avatar;
    await store.setPhoto('from this phone');
    expect(account.row.fullName).toBe('إبراهيم');
    expect([...account.files.keys()]).toEqual([account.row.avatar]);
    expect(account.row.avatar).not.toBe(between);
  });

  test('a read begun before a change doesn\'t undo it, and changes run one at a time', async () => {
    const account = fakeAccount(), storage = new MemoryCacheStorage();
    const store = createProfileStore({ user: USER, api: account.api, storage });
    await store.load();
    // A slow read: it sees the account before the photo.
    const read = account.api.profile;
    let release;
    account.api.profile = async () => { const before = await read(); await new Promise((r) => { release = r; }); return before; };
    const slow = store.load();
    await Promise.resolve(); await Promise.resolve();
    account.api.profile = read;
    await store.setPhoto('photo');
    const avatar = store.getState().profile.avatar;
    release();
    await slow;
    expect(store.getState().profile.avatar).toBe(avatar);

    // Two photos at once: one after the other, and only the last stays.
    await Promise.all([store.setPhoto('a'), store.setPhoto('b')]);
    expect([...account.files.keys()]).toEqual([account.row.avatar]);
    expect(account.files.get(account.row.avatar)).toBe('b');
  });

  test('names and letters', () => {
    expect(photoPath(USER)).toMatch(/^[0-9a-f-]{36}\/[a-z0-9-]{1,80}\.jpg$/);
    expect(initialOf('  إبراهيم', 'me@example.com')).toBe('إ');
    expect(initialOf('', 'me@example.com')).toBe('M');
  });
});

describe('devices', () => {
  test('the account\'s sessions read as devices, this one first', () => {
    const devices = devicesFrom([
      { id: 'a', created_at: '2026-10-10T08:00:00+00:00', refreshed_at: '2026-10-12 09:30:00.123', updated_at: '2026-10-10T08:00:00+00:00', name: 'Pixel 8 · Android 15', platform: 'android', current: false },
      { id: 'b', created_at: '2026-10-13T12:00:00Z', refreshed_at: null, updated_at: '2026-10-13T15:40:00Z', name: 'Samsung SM-A546E · Android 14', platform: 'android', current: true },
      { id: 'c', created_at: '2026-10-11T10:00:00Z', refreshed_at: '2026-10-13T10:00:00', updated_at: null, name: null, platform: null, current: false },
      { nonsense: true },
    ]);
    expect(devices.map((d) => d.id)).toEqual(['b', 'c', 'a']);
    expect(devices[0]).toMatchObject({ current: true, name: 'Samsung SM-A546E · Android 14', lastActive: Date.parse('2026-10-13T15:40:00Z') });
    expect(devices[1].name).toBeUndefined();
    expect(devices[2].lastActive).toBe(Date.parse('2026-10-12T09:30:00.123Z')); // no zone: UTC
    expect(timeOf('2026-10-12 09:30:00')).toBe(Date.parse('2026-10-12T09:30:00Z'));
    expect(devicesFrom(null)).toEqual([]);
  });
});

describe('the account\'s photos and devices, over the wire', () => {
  const server = (routes) => {
    const requests = [];
    const fetch = async (url, init) => {
      const path = url.slice(URL.length);
      requests.push({ path, method: init.method, headers: init.headers, body: init.body });
      return routes[path.split('?')[0]](init);
    };
    return { fetch, requests };
  };
  const json = (status, body) => new Response(body === undefined ? '' : JSON.stringify(body), { status });

  test('photos go to the user\'s folder, and come back through a signed link', async () => {
    const { fetch, requests } = server({
      [`/storage/v1/object/avatars/${USER}/x.jpg`]: () => json(200, { Key: `avatars/${USER}/x.jpg` }),
      [`/storage/v1/object/sign/avatars/${USER}/x.jpg`]: () => json(200, { signedURL: `/object/sign/avatars/${USER}/x.jpg?token=abc` }),
      '/storage/v1/object/avatars': () => json(200, []),
      '/storage/v1/object/list/avatars': () => json(200, [{ name: 'x.jpg', id: 'f1' }, { name: 'folder', id: null }]),
      '/rest/v1/rpc/set_profile_photo': () => json(200, `${USER}/old.jpg`),
      '/rest/v1/rpc/my_sessions': () => json(200, []),
      '/rest/v1/rpc/end_session': () => json(200, true),
    });
    const api = createAccountApi({ url: URL, apiKey: KEY, token: async () => 'token', fetch });
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });
    await api.uploadPhoto(`${USER}/x.jpg`, blob);
    expect(requests[0]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer token', apikey: KEY, 'x-upsert': 'false', 'Content-Type': 'image/jpeg', 'cache-control': 'max-age=3600' } });
    expect(requests[0].body).toBe(blob);
    // On a phone, the file's bytes, sent as they are (Expo's fetch can't send a form part that points at a file).
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    await api.uploadPhoto(`${USER}/x.jpg`, bytes);
    expect(requests[1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' } });
    expect(requests[1].body).toBe(bytes);
    expect(await api.photoLink(`${USER}/x.jpg`, 60)).toBe(`${URL}/storage/v1/object/sign/avatars/${USER}/x.jpg?token=abc`);
    expect(JSON.parse(requests[2].body)).toEqual({ expiresIn: 60 });
    await api.removePhotos([`${USER}/x.jpg`]);
    expect(requests[3]).toMatchObject({ method: 'DELETE', body: JSON.stringify({ prefixes: [`${USER}/x.jpg`] }) });
    expect(await api.endSession('s1')).toBe(true);
    expect(JSON.parse(requests[4].body)).toEqual({ p_session: 's1' });
    expect(await api.listPhotos(USER)).toEqual([`${USER}/x.jpg`]);
    expect(JSON.parse(requests[5].body)).toEqual({ prefix: USER, limit: 1000, offset: 0 });
    expect(await api.setProfilePhoto(`${USER}/x.jpg`)).toBe(`${USER}/old.jpg`);
    expect(JSON.parse(requests[6].body)).toEqual({ p_avatar: `${USER}/x.jpg` });
  });
});
