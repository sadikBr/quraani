/** Small LRU of ready-to-display images; concurrent callers share one decode. */
export function createPreparedImageCache<T>(sizeOf: (value: T) => number, options: { capacity?: number; byteBudget?: number } = {}) {
  const capacity = options.capacity ?? 6;
  const byteBudget = options.byteBudget ?? 64 * 1024 * 1024;
  const ready = new Map<string, { value: T; bytes: number }>();
  const pending = new Map<string, Promise<T>>();
  let bytes = 0;
  const peek = (key: string) => ready.get(key)?.value;
  const load = (key: string, prepare: () => Promise<T>): Promise<T> => {
    const saved = ready.get(key);
    if (saved) { ready.delete(key); ready.set(key, saved); return Promise.resolve(saved.value); }
    const existing = pending.get(key);
    if (existing) return existing;
    const task = Promise.resolve().then(prepare).then((value) => {
      const size = sizeOf(value);
      ready.set(key, { value, bytes: size }); bytes += size;
      while (ready.size > 1 && (ready.size > capacity || bytes > byteBudget)) {
        const oldest = ready.keys().next().value!;
        bytes -= ready.get(oldest)!.bytes;
        // Mounted Image views retain their own reference. Do not release a
        // native image here while it may still be visible on a neighboring page.
        ready.delete(oldest);
      }
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
  return { peek, load };
}
