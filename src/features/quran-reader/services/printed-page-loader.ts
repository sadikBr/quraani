import type { QuranPage } from '../types/reader';
import type { PrintedPage } from '../utils/printed-page';

type Priority = 'visible' | 'prefetch';
interface Job {
  page: QuranPage;
  priority: Priority;
  started: boolean;
  promise: Promise<PrintedPage>;
  resolve: (page: PrintedPage) => void;
  reject: (error: unknown) => void;
}

/** Bounded, deduplicated downloads. Background work leaves a slot for a jump. */
export function createPrintedPageLoader(fetchPage: (page: QuranPage) => Promise<PrintedPage>, options: { capacity?: number; byteBudget?: number; ttl?: number; now?: () => number } = {}) {
  const capacity = options.capacity ?? 32;
  const byteBudget = options.byteBudget ?? 32 * 1024 * 1024;
  const ttl = options.ttl ?? 24 * 60 * 60 * 1000;
  const now = options.now ?? Date.now;
  const memory = new Map<number, { page: PrintedPage; savedAt: number; bytes: number }>();
  const pending = new Map<number, Job>();
  let bytes = 0;
  let active = 0;
  let backgroundActive = 0;
  const valid = (page: QuranPage) => page.mushafId === 4 && Number.isInteger(page.number) && page.number >= 1 && page.number <= 604;
  const peek = (page: QuranPage) => valid(page) ? memory.get(page.number)?.page : undefined;
  const touch = (number: number) => { const entry = memory.get(number); if (entry) { memory.delete(number); memory.set(number, entry); } return entry; };
  const remember = (number: number, page: PrintedPage) => {
    bytes -= memory.get(number)?.bytes ?? 0;
    memory.delete(number);
    const size = page.xml.length * 2;
    memory.set(number, { page, savedAt: now(), bytes: size }); bytes += size;
    while (memory.size > 1 && (memory.size > capacity || bytes > byteBudget)) {
      const first = memory.keys().next().value!;
      bytes -= memory.get(first)!.bytes; memory.delete(first);
    }
  };
  const pump = () => {
    while (active < 3) {
      const jobs = [...pending.values()].filter((job) => !job.started);
      const job = jobs.find((job) => job.priority === 'visible') ?? (backgroundActive < 2 ? jobs[0] : undefined);
      if (!job) break;
      job.started = true;
      const background = job.priority === 'prefetch';
      active++; if (background) backgroundActive++;
      void Promise.resolve().then(() => fetchPage(job.page)).then((page) => { remember(job.page.number, page); job.resolve(page); }, job.reject).finally(() => {
        pending.delete(job.page.number); active--; if (background) backgroundActive--; pump();
      });
    }
  };
  const enqueue = (page: QuranPage, priority: Priority): Promise<PrintedPage> => {
    const running = pending.get(page.number);
    if (running) {
      if (priority === 'visible') running.priority = priority;
      pump(); return running.promise;
    }
    let resolve!: Job['resolve']; let reject!: Job['reject'];
    const promise = new Promise<PrintedPage>((yes, no) => { resolve = yes; reject = no; });
    pending.set(page.number, { page, priority, started: false, promise, resolve, reject });
    pump(); return promise;
  };
  const load = (page: QuranPage, priority: Priority = 'visible'): Promise<PrintedPage> => {
    if (!valid(page)) return Promise.reject(new Error('Warsh mushaf page is unavailable'));
    const cached = touch(page.number);
    if (cached) {
      // Never remove readable artwork while a refresh is in flight.
      if (now() - cached.savedAt >= ttl) void enqueue(page, priority).catch(() => {});
      return Promise.resolve(cached.page);
    }
    return enqueue(page, priority);
  };
  const prefetch = (pages: QuranPage[], onReady?: (artwork: PrintedPage, page: QuranPage) => void) => {
    const wanted = new Set(pages.map((page) => page.number));
    // A jump/direction change replaces queued work; already-running downloads are reusable.
    for (const [number, job] of pending) {
      if (!job.started && job.priority === 'prefetch' && !wanted.has(number)) {
        pending.delete(number); job.reject(new Error('Preload window changed'));
      }
    }
    for (const page of pages) void load(page, 'prefetch').then((artwork) => onReady?.(artwork, page)).catch(() => {});
  };
  // A disk-cache refresh updates an already warm page without filling memory
  // with pages the reader has since left behind.
  const update = (page: QuranPage, artwork: PrintedPage) => {
    if (memory.has(page.number)) remember(page.number, artwork);
  };
  return { peek, load, prefetch, update };
}
