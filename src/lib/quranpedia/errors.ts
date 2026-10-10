export type QuranpediaErrorCode = 'network' | 'timeout' | 'http' | 'invalid-response';

export class QuranpediaError extends Error {
  constructor(
    public readonly code: QuranpediaErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'QuranpediaError';
  }
}

/** Transient failures are retried sooner; a validated cache is served for every failure. */
export function isTransientError(error: QuranpediaError): boolean {
  return error.code === 'network' || error.code === 'timeout' ||
    (error.code === 'http' && (error.status === 429 || (error.status ?? 0) >= 500));
}

/** Background refresh backoff: honour Retry-After, otherwise wait longer for non-transient failures. */
export function refreshBackoffMs(error: QuranpediaError): number {
  if (error.retryAfterSeconds !== undefined) return Math.max(60_000, error.retryAfterSeconds * 1000);
  return isTransientError(error) ? 5 * 60_000 : 60 * 60_000;
}
