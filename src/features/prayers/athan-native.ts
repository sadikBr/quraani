import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/** The app's own Android module (`modules/athan`): whole athans played at their time. */
interface AthanNativeModule {
  schedule(json: string): void;
  play(json: string): void;
  test(json: string, seconds: number): void;
  showTimes(json: string): void;
  setScreenStyle(json: string): void;
  previewScreen(json: string): boolean;
  hideTimes(): void;
  setWidgetTimes(json: string): void;
  setWirdWidget(json: string): void;
  pinWidget(kind: string): boolean;
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): boolean;
  stop(): boolean;
  isPlaying(): boolean;
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openBatteryOptimizationSettings(): boolean;
}

/** Missing in Expo Go, on iOS and on the web: whole athans fall back to their opening. */
export const athanModule = Platform.OS === 'android' ? requireOptionalNativeModule<AthanNativeModule>('Athan') : null;

/** `heading` tops the athan's screen: «حان وقت صلاة». */
export interface AthanLabels { stop: string; channel: string; fallbackChannel: string; heading: string }
/** What the athan's screen shows, besides the heading. */
export interface AthanScreenText { name: string; time: string; date: string; place: string }
export interface AthanEntry extends Partial<AthanScreenText> { id: string; at: number; voice: string; title: string; body: string; notifyAfter?: boolean }

/** Every call is guarded: a module problem must not break the screen or the other alerts. */
function attempt<T>(run: (module: AthanNativeModule) => T, fallback: T): T {
  if (!athanModule) return fallback;
  try { return run(athanModule); } catch { return fallback; }
}

export const scheduleAthans = (labels: AthanLabels, athans: AthanEntry[]) => {
  if (!athanModule) return;
  // Errors go to the caller, which reports that scheduling failed.
  athanModule.schedule(JSON.stringify({ labels, athans }));
};
/** The whole athan by its alarm path in `seconds`. Errors go to the caller. */
export const testAthan = (labels: AthanLabels, athan: AthanEntry, seconds: number) => {
  athanModule?.test(JSON.stringify({ labels, athan }), Math.round(seconds));
};
/** The prayer times notification's content: see `AthanTimes.show` in the module. */
export interface TimesNotification {
  labels: { channel: string; tomorrow: string; countdown: string };
  place: string;
  url: string;
  names: Record<string, string>;
  /** Days in the phone's calendar; the module writes the clock times itself, in the phone's zone. */
  days: { day: string; date: string; times: { prayer: string; at: number }[] }[];
}
/** Shows or updates the prayer times notification. Errors go to the caller. */
export const showTimesNotification = (content: TimesNotification) => { athanModule?.showTimes(JSON.stringify(content)); };
export const hideTimesNotification = () => attempt((m) => { m.hideTimes(); return true; }, false);
/** The times the home-screen widget shows (those of the notification), or none without a place. */
export const setWidgetTimes = (content: TimesNotification | null) => attempt((m) => { m.setWidgetTimes(content ? JSON.stringify(content) : ''); return true; }, false);
/** Asks the launcher to add one of the app's widgets to the home screen. False where it cannot be asked. */
export type WidgetKind = 'prayer' | 'prayer-small' | 'wird';
export const pinWidget = (kind: WidgetKind) => attempt((m) => m.pinWidget(kind), false);
/** What the wird widget says on `day` (`today`) and on the days after it (`later`): see `WirdWidget.save` in the module. */
export interface WirdWidgetContent {
  day: string;
  today: { heading: string; title: string; detail: string };
  later: { heading: string; title: string; detail: string };
  streak: string;
  streakUntil: string;
  url: string;
}
export const setWirdWidget = (content: WirdWidgetContent | null) => attempt((m) => { m.setWirdWidget(content ? JSON.stringify(content) : ''); return true; }, false);
/** How the athan's screen looks (see `AthanScreenStyle` in the module). */
export const setAthanScreenStyle = (style: object) => attempt((m) => { m.setScreenStyle(JSON.stringify(style)); return true; }, false);
/** Opens the athan's screen now, silent. Resolves whether it opened. */
export const previewAthanScreen = (text: AthanScreenText & { heading: string; close: string }) => attempt((m) => m.previewScreen(JSON.stringify(text)), false);
export const canUseFullScreenIntent = () => attempt((m) => m.canUseFullScreenIntent(), true);
export const openFullScreenIntentSettings = () => attempt((m) => m.openFullScreenIntentSettings(), false);
export const stopAthan = () => attempt((m) => m.stop(), false);
export const athanPlaying = () => attempt((m) => m.isPlaying(), false);
export const canScheduleExactAlarms = () => attempt((m) => m.canScheduleExactAlarms(), true);
export const openExactAlarmSettings = () => attempt((m) => m.openExactAlarmSettings(), false);
export const ignoresBatteryOptimizations = () => attempt((m) => m.isIgnoringBatteryOptimizations(), true);
export const openBatteryOptimizationSettings = () => attempt((m) => m.openBatteryOptimizationSettings(), false);
