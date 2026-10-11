import type { AthanLabels } from './athan-native';
import type { PrayerState, TakbirId } from './settings';
import type { PrayerId } from './times';

export const alertsSupported = false;
export const fullAthanSupported = false;
export const athanSoundsSupported = false;
export class PrayerAlertError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') { super(issue); }
}
export const takbirChannelId = (takbir: TakbirId) => `prayer-takbir-${takbir}`;
export const athanLabels = (takbir: TakbirId): AthanLabels => ({ stop: '', channel: '', fallbackChannel: takbirChannelId(takbir) });
export async function requestPrayerAlerts(_takbir: TakbirId): Promise<void> { throw new PrayerAlertError('unavailable'); }
export const TEST_SECONDS = 10;
export async function testPrayerAlert(_state: PrayerState, _kind: 'notify' | 'takbir' | 'full', _prayer: PrayerId, _time: Date) { throw new PrayerAlertError('unavailable'); }
export async function syncPrayerAlerts(_state: PrayerState) {}
export function observePrayerNotifications(_open: () => void) { return () => {}; }
