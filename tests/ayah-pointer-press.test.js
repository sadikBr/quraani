import { expect, test } from 'bun:test';
import { createAyahPointerPress } from '../src/features/quran-reader/utils/ayah-pointer-press';

test('a stationary tap, even when held, is immediately available on release', () => {
  const press = createAyahPointerPress();
  press.start(10, 20);
  press.move(12, 21);
  press.end();
  expect(press.consumeClick()).toBe(false);
});

test('horizontal swipes, vertical scrolling, cancellation and leaving a target suppress clicks', () => {
  for (const gesture of [(p) => p.move(30, 20), (p) => p.move(10, 40), (p) => p.cancel()]) {
    const press = createAyahPointerPress();
    press.start(10, 20);
    gesture(press);
    press.end();
    expect(press.consumeClick()).toBe(true);
    press.start(10, 20);
    press.end();
    expect(press.consumeClick()).toBe(false);
  }
});

test('moving out and back is still a drag, while keyboard clicks need no pointer down', () => {
  const press = createAyahPointerPress();
  expect(press.consumeClick()).toBe(false);
  press.start(10, 20);
  press.move(10, 60);
  press.move(10, 20);
  expect(press.consumeClick()).toBe(true);
});

test('long pressing a verse opens its actions once and consumes the release tap', async () => {
  let opened = 0;
  const press = createAyahPointerPress(10);
  press.start(10, 20, () => opened++);
  await new Promise((resolve) => setTimeout(resolve, 25));
  press.end();
  expect(opened).toBe(1);
  expect(press.consumeClick()).toBe(true);
});

test('a short tap or scroll cancels the long-press timer', async () => {
  let opened = 0;
  for (const cancel of [(p) => p.end(), (p) => p.move(10, 40), (p) => p.cancel()]) {
    const press = createAyahPointerPress(10);
    press.start(10, 20, () => opened++);
    cancel(press);
  }
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(opened).toBe(0);
});
