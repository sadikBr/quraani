import {
    CACHE_VERSION,
    type CacheStorage,
    CONTENT_TTL_MS,
    decodeCacheEntry,
    MemoryCacheStorage,
} from "./cache";
import { canUseStaleCache, QuranpediaError } from "./errors";
import {
    decodeBookContent,
    decodeBooks,
    decodeTranslations,
} from "./related-content";
import type { AyahReference } from "./types";
import {
    decodeAyah,
    decodeMushafs,
    decodeQuran,
    decodeSurahAyahs,
} from "./validation";

export const QURANPEDIA_BASE_URL = "https://api.quranpedia.net/v1";

export interface ContentResult<T> {
    data: T;
    fetchedAt: number;
    source: "network" | "cache";
    stale: boolean;
    /** Expose this in the reader when serving older content offline. */
    refreshError?: QuranpediaError;
}

export interface RequestOptions {
    forceRefresh?: boolean;
    allowStale?: boolean;
}

interface ClientOptions {
    storage?: CacheStorage;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
    timeoutMs?: number;
    ttlMs?: number;
    onCacheError?: (error: unknown) => void;
}

function validId(value: number, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || value < 1 || value > max)
        throw new RangeError("Invalid Quran reference");
}

/** Framework-independent: mobile and a future web app can share this client. */
export class QuranpediaClient {
    private readonly storage: CacheStorage;
    private readonly fetcher: typeof globalThis.fetch;
    private readonly now: () => number;
    private readonly timeoutMs: number;
    private readonly ttlMs: number;
    private readonly pending = new Map<
        string,
        Promise<{ payload: unknown; fetchedAt: number }>
    >();

    constructor(private readonly options: ClientOptions = {}) {
        this.storage = options.storage ?? new MemoryCacheStorage();
        this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.now = options.now ?? Date.now;
        this.timeoutMs = options.timeoutMs ?? 15_000;
        this.ttlMs = options.ttlMs ?? CONTENT_TTL_MS;
        if (
            !Number.isFinite(this.timeoutMs) ||
            this.timeoutMs <= 0 ||
            !Number.isFinite(this.ttlMs) ||
            this.ttlMs < 0
        ) {
            throw new RangeError("Invalid timeout or cache lifetime");
        }
    }

    getMushafs(options?: RequestOptions) {
        return this.get("/mushafs", decodeMushafs, options);
    }

    getTafsirBooks(surah: number, ayah: number) {
        validId(surah, 114);
        validId(ayah);
        return this.get(`/ayah/${surah}/${ayah}/tafsir`, decodeBooks);
    }

    getBookContent(surah: number, ayah: number, book: number) {
        validId(surah, 114);
        validId(ayah);
        validId(book);
        return this.get(`/ayah/${surah}/${ayah}/book/${book}`, (value) => {
            const content = decodeBookContent(value);
            if (content.book.id !== book)
                throw new QuranpediaError(
                    "invalid-response",
                    "Content source mismatch",
                );
            return content;
        });
    }

    getTranslations(surah: number, ayah: number, language: "en" | "fr") {
        validId(surah, 114);
        validId(ayah);
        if (!["en", "fr"].includes(language))
            throw new RangeError("Invalid translation language");
        return this.get(
            `/translations/${surah}/${ayah}/${language}`,
            decodeTranslations,
        );
    }

    getMushaf(mushafId: number, options?: RequestOptions) {
        validId(mushafId);
        return this.get(
            `/mushafs/${mushafId}`,
            (v) => decodeQuran(v, mushafId),
            options,
        );
    }

    getSurah(mushafId: number, surahNumber: number, options?: RequestOptions) {
        validId(mushafId);
        validId(surahNumber, 114);
        return this.get(
            `/mushafs/${mushafId}/${surahNumber}`,
            (v) => decodeSurahAyahs(v, mushafId, surahNumber),
            options,
        );
    }

    getAyah(reference: AyahReference, options?: RequestOptions) {
        const { mushafId, surahNumber, ayahNumber } = reference;
        validId(mushafId);
        validId(surahNumber, 114);
        validId(ayahNumber);
        return this.get(
            `/mushafs/${mushafId}/${surahNumber}/${ayahNumber}`,
            (v) => {
                const ayah = decodeAyah(v, mushafId, surahNumber);
                if (ayah.ayahNumber !== ayahNumber)
                    throw new QuranpediaError(
                        "invalid-response",
                        "Ayah number mismatch",
                    );
                return ayah;
            },
            options,
        );
    }

    private async get<T>(
        path: string,
        decode: (value: unknown) => T,
        options: RequestOptions = {},
    ): Promise<ContentResult<T>> {
        const key = `quranpedia:v${CACHE_VERSION}:${path}`;
        let entry = null;
        let cached: T | undefined;
        try {
            entry = decodeCacheEntry(await this.storage.getItem(key));
            if (entry) {
                cached = decode(entry.payload);
                // A clock rollback must not make an old entry fresh indefinitely.
                const age = this.now() - entry.fetchedAt;
                if (!options.forceRefresh && age >= 0 && age < this.ttlMs) {
                    return {
                        data: cached,
                        fetchedAt: entry.fetchedAt,
                        source: "cache",
                        stale: false,
                    };
                }
            }
        } catch (error) {
            entry = null;
            cached = undefined;
            this.options.onCacheError?.(error);
        }

        try {
            let request = this.pending.get(path);
            if (!request) {
                request = this.fetchAndCache(path, key, decode);
                this.pending.set(path, request);
            }
            const result = await request;
            return {
                data: decode(result.payload),
                fetchedAt: result.fetchedAt,
                source: "network",
                stale: false,
            };
        } catch (error) {
            if (
                error instanceof QuranpediaError &&
                (options.allowStale ?? true) &&
                entry &&
                cached !== undefined &&
                canUseStaleCache(error)
            ) {
                return {
                    data: cached,
                    fetchedAt: entry.fetchedAt,
                    source: "cache",
                    stale: true,
                    refreshError: error,
                };
            }
            throw error;
        } finally {
            this.pending.delete(path);
        }
    }

    private async fetchAndCache<T>(
        path: string,
        key: string,
        decode: (value: unknown) => T,
    ) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        let payload: unknown;
        try {
            const response = await this.fetcher(
                `${QURANPEDIA_BASE_URL}${path}`,
                {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                },
            );
            if (!response.ok) {
                const retryHeader = response.headers.get("Retry-After");
                const retry = retryHeader ? Number(retryHeader) : NaN;
                throw new QuranpediaError(
                    "http",
                    `Quranpedia request failed (${response.status})`,
                    response.status,
                    Number.isFinite(retry) && retry >= 0 ? retry : undefined,
                );
            }
            try {
                payload = await response.json();
            } catch (error) {
                if (controller.signal.aborted) throw error;
                throw new QuranpediaError(
                    "invalid-response",
                    "Quranpedia did not return valid JSON",
                );
            }
            decode(payload); // Validate before persisting; never overwrite good data with an error page.
        } catch (error) {
            if (controller.signal.aborted)
                throw new QuranpediaError(
                    "timeout",
                    "Quranpedia request timed out",
                );
            if (error instanceof QuranpediaError) throw error;
            throw new QuranpediaError("network", "Unable to reach Quranpedia");
        } finally {
            clearTimeout(timer);
        }
        const fetchedAt = this.now();
        try {
            await this.storage.setItem(
                key,
                JSON.stringify({ version: CACHE_VERSION, fetchedAt, payload }),
            );
        } catch (error) {
            this.options.onCacheError?.(error);
        }
        return { payload, fetchedAt };
    }
}
