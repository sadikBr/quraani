import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import ts from 'typescript';
import { localDate } from '../src/features/plans/dates';

/** Run the installed SDK's actual JS with only the phone's native bridge replaced.
 * Resolve .android/.ios/.native modules as Metro does, without globally mocking
 * React Native or weakening Expo Go's remote-push restriction in other tests.
 */
function phoneRuntime(os, { expoGo = true, channelError } = {}) {
  const cache = new Map(), loaded = new Set(), listeners = new Map();
  const scheduled = new Map(), cancelled = [], channels = [];
  let lastResponse = null, granted = true;
  const platform = { OS: os, select: values => values[os] ?? values.native ?? values.default };
  class EventEmitter {
    addListener(name, callback) {
      const callbacks = listeners.get(name) ?? new Set();
      callbacks.add(callback); listeners.set(name, callbacks);
      return { remove: () => callbacks.delete(callback) };
    }
    emit(name, value) { for (const callback of listeners.get(name) ?? []) callback(value); }
  }
  const permission = () => ({ granted, status: granted ? 'granted' : 'denied', canAskAgain: true, expires: 'never' });
  const native = {
    ExpoNotificationsHandlerModule: { handleNotificationAsync: async () => {} },
    ExpoNotificationsEmitter: { getLastNotificationResponse: () => lastResponse, clearLastNotificationResponse: () => { lastResponse = null; } },
    ExpoNotificationPermissionsModule: { getPermissionsAsync: async () => permission(), requestPermissionsAsync: async () => permission() },
    ExpoNotificationChannelManager: { setNotificationChannelAsync: async (id, channel) => { channels.push(id); if (channelError) throw channelError; return channel; } },
    ExpoNotificationScheduler: {
      getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
      scheduleNotificationAsync: async (identifier, content, trigger) => { scheduled.set(identifier, { identifier, content, trigger }); return identifier; },
      cancelScheduledNotificationAsync: async id => { cancelled.push(id); scheduled.delete(id); },
    },
  };
  const externals = {
    'react-native': { Platform: platform },
    expo: { isRunningInExpoGo: () => expoGo, PermissionStatus: { GRANTED: 'granted' } },
    'expo-modules-core': {
      Platform: platform, LegacyEventEmitter: EventEmitter, EventEmitter,
      CodedError: Error, UnavailabilityError: Error,
      requireNativeModule(name) {
        if (!(name in native)) throw new Error(`Unexpected native module: ${name}`);
        return native[name];
      },
    },
  };
  function resolveModule(specifier, parent) {
    if (specifier.startsWith('@/')) specifier = resolve(import.meta.dir, '../src', specifier.slice(2));
    const path = specifier.startsWith('.') || specifier.startsWith('/') ? resolve(dirname(parent), specifier) : createRequire(parent).resolve(specifier);
    const extension = extname(path) === '.js' || extname(path) === '.ts' ? extname(path) : '';
    const base = extension ? path.slice(0, -extension.length) : path;
    for (const suffix of [`.${os}.js`, '.native.js', extension || '.ts', '.js', '/index.ts']) {
      if (existsSync(base + suffix)) return base + suffix;
    }
    throw new Error(`Cannot resolve ${specifier}`);
  }
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    loaded.add(file);
    const module = { exports: {} }; cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const require = specifier => specifier in externals ? externals[specifier] : load(resolveModule(specifier, file));
    new Function('require', 'module', 'exports', '__DEV__', source)(require, module, module.exports, true);
    return module.exports;
  }
  const entry = resolve(import.meta.dir, '../src/features/plans/notifications.ts');
  return { api: () => load(entry), loaded, scheduled, cancelled, channels, listeners,
    save: (plan, persist) => load(resolve(import.meta.dir, '../src/features/plans/save-with-reminder.ts')).saveWithReminder(plan, persist, load(entry).requestPlanReminders),
    deny: () => { granted = false; },
    response: id => ({ notification: { request: { content: { data: { planId: id } } } } }),
    setLastResponse: value => { lastResponse = value; },
  };
}

for (const os of ['android', 'ios']) for (const expoGo of [true, false]) {
  test(`${os} ${expoGo ? 'Expo Go' : 'app build'} schedules local reminders on the appropriate channel`, async () => {
    const phone = phoneRuntime(os, { expoGo });
    const api = phone.api();
    expect(api.remindersSupported).toBe(true);
    expect([...phone.loaded].some(path => /(?:DevicePushToken|TokenEmitter|warnOfExpoGoPushUsage|expo-notifications\/build\/index)/.test(path))).toBe(false);
    await api.requestPlanReminders();
    expect(phone.channels.includes('reading-plans')).toBe(os === 'android' && !expoGo);
    const today = localDate();
    const plan = { id: 'plan-local-test', name: 'وردي اليومي', status: 'active', repeat: false, startDate: today,
      goal: { type: 'wird', amount: 5 }, cycle: { availableDate: today }, weekdays: [0, 1, 2, 3, 4, 5, 6],
      reminder: { enabled: true, hour: 20, minute: 0 } };
    phone.scheduled.set('unrelated', { identifier: 'unrelated', content: {} });
    phone.scheduled.set('quranni-plan:stale', { identifier: 'quranni-plan:stale', content: {} });
    await api.syncPlanReminders([plan]);
    const reminders = [...phone.scheduled.values()].filter(n => n.identifier.startsWith('quranni-plan:'));
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.length).toBeLessThanOrEqual(30);
    expect(reminders[0].trigger.type).toBe('date');
    expect(reminders[0].trigger.channelId).toBe(os === 'android' && !expoGo ? 'reading-plans' : undefined);
    expect(reminders[0].trigger.timestamp).toBeGreaterThan(Date.now());
    expect(reminders[0].content.data.planId).toBe(plan.id);
    expect(phone.cancelled).toEqual(['quranni-plan:stale']);
    // A terminology change refreshes existing reminders without changing the
    // persisted identifiers or the destination of a notification tap.
    const original = reminders[0];
    phone.scheduled.set(original.identifier, { ...original, content: { ...original.content, body: 'حان وقت وردك. افتح خطتك لمتابعة القراءة.' } });
    await api.syncPlanReminders([plan]);
    expect(phone.scheduled.get(original.identifier).content.body).toContain('هدفك');
    expect(phone.scheduled.get(original.identifier).content.data.planId).toBe(plan.id);
    await api.syncPlanReminders([{ ...plan, status: 'paused' }]);
    expect([...phone.scheduled.keys()]).toEqual(['unrelated']);

    const opened = [];
    phone.setLastResponse(phone.response(plan.id));
    const stop = api.observePlanNotifications(id => opened.push(id));
    expect(opened).toEqual([plan.id]);
    for (const callback of phone.listeners.get('onDidReceiveNotificationResponse')) callback(phone.response('plan-another'));
    expect(opened).toEqual([plan.id, 'plan-another']);
    stop();
    expect(phone.listeners.get('onDidReceiveNotificationResponse').size).toBe(0);
    phone.deny();
    await expect(api.requestPlanReminders()).rejects.toThrow('لم يُسمح بالإشعارات');
  });
}

const providerError = new Error('Call to ExpoNotificationChannelManager.setNotificationChannelAsync rejected: null cannot be cast to non-null type expo.modules.notifications.notifications.channels.NotificationsChannelsProvider');
test('Expo Go never calls its broken channel manager, and a missing provider in an app build uses the fallback', async () => {
  for (const expoGo of [true, false]) {
    const phone = phoneRuntime('android', { expoGo, channelError: providerError });
    const api = phone.api();
    await api.requestPlanReminders();
    const today = localDate();
    await api.syncPlanReminders([{ id: 'plan-fallback', name: 'ختمتي', status: 'active', goal: { type: 'wird' }, startDate: today,
      cycle: { availableDate: today }, weekdays: [0, 1, 2, 3, 4, 5, 6], reminder: { enabled: true, hour: 20, minute: 0 } }]);
    expect(phone.scheduled.size).toBeGreaterThan(0);
    for (const notification of phone.scheduled.values()) expect(notification.trigger.channelId).toBeUndefined();
    expect(phone.channels.length).toBe(expoGo ? 0 : 1);
  }
});

test('a khatma is persisted with reminders off if setup fails, while storage errors still reject', async () => {
  const { createPlansRepository, decodePlans } = await import('../src/features/plans/repository');
  const today = localDate();
  const plan = { id: 'plan-save-test', name: 'ختمتي', riwayah: 'warsh', goal: { type: 'khatma', weeks: 1 }, unit: 'pages',
    status: 'active', startDate: today, repeat: true, corpus: 'test-corpus', totalAyahs: 7, weekdays: [0, 1, 2, 3, 4, 5, 6],
    cycle: { number: 1, start: 0, cursor: 0, availableDate: today, sessions: [{ date: today, start: 0, end: 7 }], progress: [] }, history: [],
    reminder: { enabled: true, hour: 20, minute: 0 } };
  for (const denied of [true, false]) {
    const phone = phoneRuntime('android', { expoGo: false, channelError: denied ? undefined : new Error('native setup failed') });
    if (denied) phone.deny();
    let stored = null;
    const repository = createPlansRepository({ getItem: async () => stored, setItem: async (_, raw) => { stored = raw; }, removeItem: async () => {} });
    await repository.load();
    const issue = await phone.save(plan, async saved => { await repository.update(items => [...items, saved]); });
    expect(issue).toBe(denied ? 'permission' : 'unavailable');
    expect(decodePlans(stored)).toEqual([{ ...plan, reminder: { ...plan.reminder, enabled: false } }]);
    expect(plan.reminder.enabled).toBe(true);
    await expect(phone.save(plan, async () => { throw new Error('disk full'); })).rejects.toThrow('disk full');
  }
});
