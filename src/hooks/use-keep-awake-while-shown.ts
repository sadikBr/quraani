import { useEffect } from 'react';
import { useIsFocused } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * Keeps the phone's screen on while this screen is the one shown (reading, practising, a halaqa's
 * session, adhkar): hands are often off the phone there. Under another screen, and everywhere
 * else in the app, the phone sleeps as usual. Each screen has its own `tag`, so one leaving does
 * not let the phone sleep under another.
 */
export function useKeepAwakeWhileShown(tag: string) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    // Where the screen cannot be kept on (some browsers), it sleeps as usual.
    void activateKeepAwakeAsync(tag).catch(() => {});
    return () => { void deactivateKeepAwake(tag).catch(() => {}); };
  }, [focused, tag]);
}
