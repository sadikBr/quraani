/**
 * SDK 57's package entry point imports DevicePushTokenAutoRegistration.fx,
 * which registers a remote-push listener and throws in Android Expo Go.
 * Plans only use local notifications, which Expo Go supports. Keep these
 * module imports isolated here and recheck them when upgrading Expo SDK.
 */
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export { IosAuthorizationStatus } from 'expo-notifications/build/NotificationPermissions.types';
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
export { deleteNotificationChannelAsync } from 'expo-notifications/build/deleteNotificationChannelAsync';
export { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
export { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
export { SchedulableTriggerInputTypes, type NotificationResponse } from 'expo-notifications/build/Notifications.types';
export {
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  clearLastNotificationResponse,
} from 'expo-notifications/build/NotificationsEmitter';
