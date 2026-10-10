import Storage from "expo-sqlite/kv-store";

import { createBoundedStorage } from "./bounded-storage";

/**
 * Metro selects content-storage.web.ts for web; native data survives restarts.
 * Re-downloadable caches are evicted least-recently-used beyond the budget;
 * user data keys pass straight through (see isCacheKey).
 */
export const contentStorage = createBoundedStorage(
    {
        getItem: (key) => Storage.getItem(key),
        setItem: (key, value) => Storage.setItem(key, value),
        async removeItem(key) {
            await Storage.removeItem(key);
        },
        getAllKeys: () => Storage.getAllKeys(),
    },
    { budget: 150 * 1024 * 1024 },
);
