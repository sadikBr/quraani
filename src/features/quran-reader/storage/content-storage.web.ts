import { MemoryCacheStorage, type CacheStorage } from "@/lib/quranpedia/cache";

// IndexedDB avoids localStorage's small quota for the full mushaf response.
let database: Promise<IDBDatabase> | undefined;
const serverStorage = new MemoryCacheStorage();

function openDatabase(): Promise<IDBDatabase> {
    if (!database) {
        database = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("quran-reader", 1);
            request.onupgradeneeded = () =>
                request.result.createObjectStore("content");
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    database = undefined;
                };
                resolve(db);
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () =>
                reject(new Error("Quran cache upgrade blocked"));
        }).catch((error) => {
            database = undefined;
            throw error;
        });
    }
    return database;
}

async function transact<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("content", mode);
        const request = action(transaction.objectStore("content"));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () =>
            reject(
                transaction.error ??
                    new Error("Quran cache transaction aborted"),
            );
    });
}

export const contentStorage: CacheStorage = {
    async getItem(key) {
        if (typeof indexedDB === "undefined") return serverStorage.getItem(key);
        const value = await transact("readonly", (store) => store.get(key));
        return typeof value === "string" ? value : null;
    },
    async setItem(key, value) {
        if (typeof indexedDB === "undefined")
            return serverStorage.setItem(key, value);
        await transact("readwrite", (store) => store.put(value, key));
    },
    async removeItem(key) {
        if (typeof indexedDB === "undefined")
            return serverStorage.removeItem(key);
        await transact("readwrite", (store) => store.delete(key));
    },
};
