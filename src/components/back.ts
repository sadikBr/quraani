import { useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { t } from '@/i18n';
import type { Back } from '@/components/craft/page';

/** The route of the reader (`src/app/index.tsx`). */
const READER = 'index';

/**
 * The way back from a page reached in the app's stack: to the mushaf, by its name, when the page
 * was opened from it (or was opened alone, from a link or a notification); otherwise to the page
 * it was opened from (the home screen, the prayer times…), by an arrow alone, so the button never
 * says the mushaf when it goes elsewhere.
 */
export function useBack(): Back {
  const navigation = useNavigation();
  // Where the page was opened from does not change while it is open.
  const [fromReader] = useState(() => {
    try {
      const state = navigation.getState();
      if (!state) return true;
      const previous = state.index > 0 ? state.routes[state.index - 1] : undefined;
      return !previous || previous.name === READER;
    } catch {
      return true;
    }
  });
  return fromReader
    ? { label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.canGoBack() ? router.back() : router.replace('/') }
    : { label: t('common.back'), onPress: () => router.canGoBack() ? router.back() : router.replace('/') };
}
