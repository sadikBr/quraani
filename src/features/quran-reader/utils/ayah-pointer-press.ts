/** Separate a tap from a hold; cancel both when a swipe or scroll starts. */
export function createAyahPointerPress(delay = 450) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | undefined;
  let consumed = false;
  const end = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; origin = undefined; };
  const cancel = () => { end(); consumed = true; };
  return {
    start(x: number, y: number, onHold?: () => void) {
      end(); consumed = false; origin = { x, y };
      if (onHold) timer = setTimeout(() => { timer = undefined; consumed = true; onHold(); }, delay);
    },
    move(x: number, y: number) {
      if (origin && Math.hypot(x - origin.x, y - origin.y) > 8) cancel();
    },
    end,
    cancel,
    consumeClick() {
      end();
      const wasConsumed = consumed;
      consumed = false;
      return wasConsumed;
    },
  };
}
