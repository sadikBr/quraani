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

export function canUseStaleCache(error: QuranpediaError): boolean {
  return error.code === 'network' || error.code === 'timeout' ||
    (error.code === 'http' && (error.status === 429 || (error.status ?? 0) >= 500));
}
