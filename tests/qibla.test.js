import { expect, test } from 'bun:test';
import { distanceToKaaba, facing, qiblaBearing, turn, windOf } from '../src/features/prayers/qibla';

test('the qibla from known places, and the way to Makkah', () => {
  // Casablanca faces a little south of east; Paris south-east; New York north-east; Jakarta west-north-west.
  expect(qiblaBearing({ latitude: 33.5883, longitude: -7.6114 })).toBeCloseTo(94, 0);
  expect(qiblaBearing({ latitude: 48.8566, longitude: 2.3522 })).toBeCloseTo(119, 0);
  expect(qiblaBearing({ latitude: 40.7128, longitude: -74.006 })).toBeCloseTo(58.5, 0);
  expect(qiblaBearing({ latitude: -6.2088, longitude: 106.8456 })).toBeCloseTo(295, 0);
  expect(distanceToKaaba({ latitude: 33.5883, longitude: -7.6114 })).toBeGreaterThan(4800);
  expect(distanceToKaaba({ latitude: 33.5883, longitude: -7.6114 })).toBeLessThan(4850);
  expect(distanceToKaaba({ latitude: 21.4225, longitude: 39.8262 })).toBeLessThan(1);
  expect([windOf(94), windOf(119), windOf(58), windOf(295), windOf(280), windOf(359)]).toEqual(['e', 'se', 'ne', 'nw', 'w', 'n']);
});

test('turning takes the shorter way, and facing holds until clearly off', () => {
  expect([turn(40, 94), turn(140, 94), turn(350, 10), turn(10, 350), turn(0, 180)]).toEqual([54, -46, 20, -20, 180]);
  expect([facing(2.5, false), facing(4, false), facing(5, true), facing(7, true)]).toEqual([true, false, true, false]);
});
