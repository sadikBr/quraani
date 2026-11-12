import {
    CACHE_VERSION,
    type CacheStorage,
    CONTENT_TTL_MS,
    CORPUS_TTL_MS,
    decodeCacheEntry,
    MemoryCacheStorage,
} from "./cache";
import { QuranpediaError, refreshBackoffMs } from "./errors";
import { decodeReciters } from "./reciters";
import { decodeBookContent, decodeTranslations } from "./related-content";
import type { AyahReference } from "./types";
import {
    BOOK_SERVICES,
    type BookService,
    decodeFatwas,
    decodeMeanings,
    decodeNotes,
    decodeQiraat,
    decodeSayings,
    decodeServiceBooks,
    decodeSimilar,
    decodeTopics,
    decodeTranslationLanguages,
} from "./ayah-services";
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
    /** `bundle`: the copy that ships with the app (the Quran text itself). */
    source: "network" | "cache" | "bundle";
    /** True when the copy is older than its lifetime or a refresh failed. */
    stale: boolean;
    /** Expose this in the reader when serving older content offline. */
    refreshError?: QuranpediaError;
    /**
     * Set when expired cache was returned immediately: settles with the
     * refreshed content, or null if the background refresh failed or was
     * deferred by backoff. Never rejects.
     */
    revalidated?: Promise<ContentResult<T> | null>;
}

export interface RequestOptions {
    /** Wait for the network (ignoring freshness and backoff). Failures are still reported via refreshError unless allowStale is false. */
    forceRefresh?: boolean;
    /** false: never return expired or fallback cache; failures throw. */
    allowStale?: boolean;
}

interface ClientOptions {
    storage?: CacheStorage;
    fetch?: typeof globalThis.fetch;
    now?: () => number;
    timeoutMs?: number;
    /** Lifetime of related content (tafsir, translations). */
    ttlMs?: number;
    /** Lifetime of mushaf text, metadata and the edition catalog. */
    corpusTtlMs?: number;
    onCacheError?: (error: unknown) => void;
}

interface Fetched {
    data: unknown;
    fetchedAt: number;
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
    private readonly corpusTtlMs: number;
    /** In-flight network requests only; every entry goes to the network. */
    private readonly pending = new Map<string, Promise<Fetched>>();
    private readonly failures = new Map<string, QuranpediaError>();
    private readonly retryAt = new Map<string, number>();

    constructor(private readonly options: ClientOptions = {}) {
        this.storage = options.storage ?? new MemoryCacheStorage();
        this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.now = options.now ?? Date.now;
        this.timeoutMs = options.timeoutMs ?? 15_000;
        this.ttlMs = options.ttlMs ?? CONTENT_TTL_MS;
        this.corpusTtlMs = options.corpusTtlMs ?? CORPUS_TTL_MS;
        if (
            !Number.isFinite(this.timeoutMs) ||
            this.timeoutMs <= 0 ||
            ![this.ttlMs, this.corpusTtlMs].every(
                (ttl) => Number.isFinite(ttl) && ttl >= 0,
            )
        ) {
            throw new RangeError("Invalid timeout or cache lifetime");
        }
    }

    getMushafs(options?: RequestOptions) {
        return this.get("/mushafs", decodeMushafs, options, this.corpusTtlMs);
    }

    /** Every recitation edition with its audio server and, for surah files, ayah timings. */
    getReciters(options?: RequestOptions) {
        return this.get("/reciters", decodeReciters, options, this.corpusTtlMs);
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

    /** The books of one kind that treat an ayah (Hafs numbering), each read with getBookContent. */
    getAyahBooks(surah: number, ayah: number, service: BookService) {
        validId(surah, 114);
        validId(ayah);
        if (!BOOK_SERVICES.includes(service))
            throw new RangeError("Invalid ayah service");
        return this.get(`/ayah/${surah}/${ayah}/${service}`, decodeServiceBooks);
    }

    /** The meanings of the ayah's rare words, by book. */
    getMeanings(surah: number, ayah: number) {
        return this.service(surah, ayah, "meanings", decodeMeanings);
    }

    /** The ayahs that resemble it, as memorizers tell them apart. */
    getSimilar(surah: number, ayah: number) {
        return this.service(surah, ayah, "similar", decodeSimilar);
    }

    /** Its words read in more than one way, with each rawi's reading. */
    getQiraat(surah: number, ayah: number) {
        return this.service(surah, ayah, "qiraat", decodeQiraat);
    }

    getTopics(surah: number, ayah: number) {
        return this.service(surah, ayah, "topics", decodeTopics);
    }

    getFatwas(surah: number, ayah: number) {
        return this.service(surah, ayah, "fatwa", decodeFatwas);
    }

    /** Reflections on the ayah (tadabbur). */
    getNotes(surah: number, ayah: number) {
        return this.service(surah, ayah, "notes", decodeNotes);
    }

    /** What the companions and their successors narrated of it. */
    getSayings(surah: number, ayah: number) {
        return this.service(surah, ayah, "sayings", decodeSayings);
    }

    /** The languages the ayah is translated into. */
    getTranslationLanguages(surah: number, ayah: number) {
        validId(surah, 114);
        validId(ayah);
        return this.get(
            `/translations/available-languages/${surah}/${ayah}`,
            decodeTranslationLanguages,
        );
    }

    private service<T>(
        surah: number,
        ayah: number,
        name: string,
        decode: (value: unknown) => T,
    ) {
        validId(surah, 114);
        validId(ayah);
        return this.get(`/ayah/${surah}/${ayah}/${name}`, decode);
    }

    getTranslations(surah: number, ayah: number, language: string) {
        validId(surah, 114);
        validId(ayah);
        if (!/^[a-z]{2,3}$/.test(language))
            throw new RangeError("Invalid translation language");
        return this.get(
            `/translations/${surah}/${ayah}/${language}`,
            decodeTranslations,
        );
    }

    /**
     * `expected.riwayahName` is checked while decoding, so a payload for the
     * wrong riwayah is rejected before it can be cached.
     */
    getMushaf(
        mushafId: number,
        options?: RequestOptions,
        expected?: { riwayahName: string },
    ) {
        validId(mushafId);
        return this.get(
            `/mushafs/${mushafId}`,
            (v) => {
                const quran = decodeQuran(v, mushafId);
                if (expected && quran.riwayah.name !== expected.riwayahName)
                    throw new QuranpediaError(
                        "invalid-response",
                        "The selected riwayah does not match the source",
                    );
                return quran;
            },
            options,
            this.corpusTtlMs,
        );
    }

    getSurah(mushafId: number, surahNumber: number, options?: RequestOptions) {
        validId(mushafId);
        validId(surahNumber, 114);
        return this.get(
            `/mushafs/${mushafId}/${surahNumber}`,
            (v) => decodeSurahAyahs(v, mushafId, surahNumber),
            options,
            this.corpusTtlMs,
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
            this.corpusTtlMs,
        );
    }

    /**
     * Stale-while-revalidate: an expired but valid cache entry is returned at
     * once and refreshed in the background (deduplicated, with backoff after a
     * failure). Without a usable cache, or with forceRefresh, the caller waits
     * for the network. Any failure falls back to a validated cache entry.
     */
    private async get<T>(
        path: string,
        decode: (value: unknown) => T,
        options: RequestOptions = {},
        ttl = this.ttlMs,
    ): Promise<ContentResult<T>> {
        const key = `quranpedia:v${CACHE_VERSION}:${path}`;
        const allowStale = options.allowStale ?? true;
        let cached: { data: T; fetchedAt: number } | undefined;
        // A strict forced refresh never uses the cache, so skip decoding it.
        if (!options.forceRefresh || allowStale) {
            try {
                const entry = decodeCacheEntry(await this.storage.getItem(key));
                if (entry)
                    cached = {
                        data: decode(entry.payload),
                        fetchedAt: entry.fetchedAt,
                    };
            } catch (error) {
                this.options.onCacheError?.(error);
            }
        }
        if (cached && !options.forceRefresh) {
            // A clock rollback must not make an old entry fresh indefinitely.
            const age = this.now() - cached.fetchedAt;
            if (age >= 0 && age < ttl)
                return { ...cached, source: "cache", stale: false };
            if (allowStale) {
                const refreshError = this.failures.get(path);
                return {
                    ...cached,
                    source: "cache",
                    stale: true,
                    ...(refreshError && { refreshError }),
                    revalidated: this.revalidate(path, key, decode),
                };
            }
        }
        try {
            const result = await this.request(path, key, decode);
            return {
                data: result.data as T,
                fetchedAt: result.fetchedAt,
                source: "network",
                stale: false,
            };
        } catch (error) {
            if (allowStale && cached && error instanceof QuranpediaError) {
                return {
                    ...cached,
                    source: "cache",
                    stale: true,
                    refreshError: error,
                };
            }
            throw error;
        }
    }

    private revalidate<T>(
        path: string,
        key: string,
        decode: (value: unknown) => T,
    ): Promise<ContentResult<T> | null> {
        // Join a running request; otherwise respect the failure backoff so a
        // broken refresh is not retried on every screen mount.
        if (!this.pending.has(path) && (this.retryAt.get(path) ?? 0) > this.now())
            return Promise.resolve(null);
        return this.request(path, key, decode).then(
            (result): ContentResult<T> => ({
                data: result.data as T,
                fetchedAt: result.fetchedAt,
                source: "network",
                stale: false,
            }),
            () => null,
        );
    }

    private request(
        path: string,
        key: string,
        decode: (value: unknown) => unknown,
    ): Promise<Fetched> {
        const existing = this.pending.get(path);
        if (existing) return existing;
        const request: Promise<Fetched> = this.fetchAndCache(path, key, decode)
            .then(
                (result) => {
                    this.failures.delete(path);
                    this.retryAt.delete(path);
                    return result;
                },
                (error: unknown) => {
                    if (error instanceof QuranpediaError) {
                        this.failures.set(path, error);
                        this.retryAt.set(path, this.now() + refreshBackoffMs(error));
                    }
                    throw error;
                },
            )
            .finally(() => {
                // Only remove our own entry, never a newer request for the same path.
                if (this.pending.get(path) === request) this.pending.delete(path);
            });
        this.pending.set(path, request);
        return request;
    }

    private async fetchAndCache(
        path: string,
        key: string,
        decode: (value: unknown) => unknown,
    ): Promise<Fetched> {
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
        let data: unknown;
        try {
            // Validate before persisting; never overwrite good data with an error page.
            data = decode(payload);
        } catch (error) {
            if (error instanceof QuranpediaError) throw error;
            throw new QuranpediaError(
                "invalid-response",
                "Quranpedia returned unexpected data",
            );
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
        return { data, fetchedAt };
    }
}
