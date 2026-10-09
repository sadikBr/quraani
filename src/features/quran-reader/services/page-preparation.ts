let interacting = false;
let scrollIdleAt = 0;
let queue = Promise.resolve();

export function deferPrintedPagePreparation() { scrollIdleAt = Date.now() + 180; }
export function setPrintedPageInteraction(value: boolean) { interacting = value; }
export async function waitForPagePreparation() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  while (interacting || Date.now() < scrollIdleAt) await new Promise<void>((resolve) => setTimeout(resolve, 32));
  if (typeof requestIdleCallback === 'function') {
    await new Promise<void>((resolve) => requestIdleCallback(() => resolve(), { timeout: 500 }));
  }
  while (interacting || Date.now() < scrollIdleAt) await new Promise<void>((resolve) => setTimeout(resolve, 32));
}

/** Give frames/input a turn between CPU-heavy jobs instead of a preload burst. */
export function preparePageWhenIdle<T>(work: () => T): Promise<T> {
  const next = queue.then(async () => { await waitForPagePreparation(); return work(); });
  queue = next.then(() => {}, () => {});
  return next;
}
