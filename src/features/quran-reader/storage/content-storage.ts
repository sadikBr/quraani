import Storage from "expo-sqlite/kv-store";

import type { CacheStorage } from "@/lib/quranpedia/cache";

/** Metro selects content-storage.web.ts for web; native data survives restarts. */
export const contentStorage: CacheStorage = {
    getItem: (key) => Storage.getItem(key),
    setItem: (key, value) => Storage.setItem(key, value),
    async removeItem(key) {
        await Storage.removeItem(key);
    },
};
