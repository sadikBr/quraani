import { expect, test } from 'bun:test';
import { buildPlanIndex, createPlan, nextPortion, recordProgress, reschedulePlan } from '../src/features/plans/engine';
import { createReadingSession, saveReadingSession, sessionPageEnd } from '../src/features/plans/reading-session';
import { restoreReadingPosition, ayahDestination } from '../src/features/quran-reader/utils/navigation';

const today = '2026-10-09';
function fixture(mushafId = 4) {
  const ayahs = Array.from({ length: 604 * 3 }, (_, i) => ({ mushafId, surahNumber: 1, ayahNumber: i + 1,
    pageNumber: Math.floor(i / 3) + 1, juzNumber: Math.floor(i / 61) + 1, hizbQuarter: Math.floor(i / 8) + 1 }));
  const entries = stride => ayahs.filter((_, i) => i % stride === 0).map((a, i) => ({ number: i + 1, start: a, pageNumber: a.pageNumber }));
  const pages = Array.from({ length: 604 }, (_, i) => ({ mushafId, number: i + 1, ayahs: ayahs.slice(i * 3, i * 3 + 3), previousAyah: ayahs[i * 3 - 1] }));
  return { quran: { id: mushafId, surahs: [{ number: 1, name: 'سورة اختبار', ayahs }] }, pages, hizbIndex: entries(32), quarterHizbIndex: entries(8), juzIndex: entries(64) };
}
function planFor(content, changes = {}) {
  return createPlan({ name: 'ورد اختبار', riwayah: content.quran.id === 4 ? 'warsh' : 'hafs', goal: { type: 'wird', amount: 14 }, unit: 'pages',
    start: { kind: 'page', number: 5 }, startDate: today, repeat: false, reminder: { enabled: false, hour: 20, minute: 0 }, ...changes }, buildPlanIndex(content), 'reading-test');
}
const open = (plan, content, date = today) => {
  const next = nextPortion(plan, date);
  return createReadingSession(plan, content, String(next.cycle), String(next.slot), date);
};

test('a 14-page wird exposes only its assigned pages in either riwayah, retaining original printed artwork identity', () => {
  for (const id of [4, 2]) {
    const content = fixture(id), plan = planFor(content), session = open(plan, content);
    expect(session.pages.map(p => p.number)).toEqual(Array.from({ length: 14 }, (_, i) => i + 5));
    expect(session.firstPage).toBe(5); expect(session.lastPage).toBe(18);
    expect(session.pages[0]).toBe(content.pages[4]);
    expect(session.content.pages[0].previousAyah).toBeUndefined();
    expect(session.content.pages.at(-1).ayahs.at(-1)).toBe(content.pages[17].ayahs.at(-1));
    expect(ayahDestination(session.content, 1, 12)).toBeUndefined();
    expect(ayahDestination(session.content, 1, 55)).toBeUndefined();
    expect(session.contains(content.pages[4].ayahs[0])).toBe(true);
    expect(session.contains({ ...content.pages[4].ayahs[0], mushafId: id === 4 ? 2 : 4 })).toBe(false);
    expect(sessionPageEnd(session, 4)).toBe(session.portion.start);
    expect(sessionPageEnd(session, 19)).toBe(session.portion.start);
    expect(sessionPageEnd(session, 18)).toBe(session.portion.end);
    expect(plan.cycle.progress).toEqual([]);
  }
});

test('a khatma uses the current scheduled portion, not a fixed daily page count or the full Quran', () => {
  for (const id of [4, 2]) for (const unit of ['pages', 'hizbs', 'juzs']) {
    const content = fixture(id);
    let plan = planFor(content, { goal: { type: 'khatma', weeks: 6 }, unit });
    for (let i = 0; i < 3; i++) {
      const session = open(plan, content, '2026-10-20');
      expect(session.firstPage).toBe(session.index.ayahs[plan.cycle.cursor].pageNumber);
      expect(session.lastPage).toBe(session.index.ayahs[plan.cycle.sessions[i].end - 1].pageNumber);
      expect(session.content.quran.surahs.flatMap(s => s.ayahs)).toEqual(session.index.ayahs.slice(session.portion.start, session.portion.end));
      plan = saveReadingSession(plan, session, session.portion.end, '2026-10-20');
    }
  }
});

test('partial progress resumes at the remaining ayah, restricts quick jumps, and clamps saved reading position to the portion', () => {
  const content = fixture(), original = planFor(content);
  const plan = recordProgress(original, { cycle: 1, slot: 0, to: 20 }, today);
  const session = open(plan, content);
  expect(session.firstPage).toBe(7);
  expect(session.lastPage).toBe(18);
  expect(session.content.pages[0].ayahs.map(a => a.ayahNumber)).toEqual([21]);
  expect(session.content.pages[0].previousAyah).toBeUndefined();
  expect(ayahDestination(session.content, 1, 20)).toBeUndefined();
  const restored = restoreReadingPosition(JSON.stringify({ mushafId: 4, pageNumber: 600, scrollY: 900 }), session.content);
  expect(restored.pageNumber).toBe(7); expect(restored.scrollY).toBe(0);
  const saved = saveReadingSession(plan, session, sessionPageEnd(session, 8), today);
  expect(saved.cycle.cursor).toBe(24);
  expect(open(saved, content).firstPage).toBe(9);
});

test('a single-ayah portion and a final Quran page have exact text bounds and a valid completion receipt', () => {
  const content = fixture();
  const plan = planFor(content, { goal: { type: 'khatma', weeks: 52 }, start: { kind: 'page', number: 604 } });
  const session = open(plan, content);
  expect(session.firstPage).toBe(604); expect(session.lastPage).toBe(604);
  expect(session.content.pages[0].ayahs.map(a => a.ayahNumber)).toEqual([1810]);
  expect(sessionPageEnd(session, 604)).toBe(session.portion.end);
  const daily = planFor(content, { start: { kind: 'page', number: 604 } });
  const dailySession = open(daily, content);
  expect(saveReadingSession(daily, dailySession, dailySession.portion.end, today).status).toBe('completed');
});

test('stale, future, paused, archived and mismatched reading links cannot open an unrestricted reader', () => {
  const content = fixture(), plan = planFor(content);
  for (const status of ['paused', 'archived', 'completed']) {
    expect(() => createReadingSession({ ...plan, status }, content, '1', '0', today)).toThrow();
  }
  expect(() => createReadingSession(plan, content, '2', '0', today)).toThrow();
  expect(() => createReadingSession(plan, content, '1', '1', today)).toThrow();
  expect(() => createReadingSession(plan, content, undefined, undefined, today)).toThrow();
  expect(() => createReadingSession(plan, fixture(2), '1', '0', today)).toThrow();
  expect(() => open(planFor(content, { startDate: '2026-10-10' }), content)).toThrow();
});

test('completion cannot spill into the next portion, repeat a write, or use changed schedule boundaries', () => {
  const content = fixture(), plan = planFor(content), session = open(plan, content);
  expect(() => saveReadingSession(plan, session, session.portion.end + 1, today)).toThrow();
  const saved = saveReadingSession(plan, session, session.portion.end, today);
  expect(saved.cycle.cursor).toBe(session.portion.end);
  expect(saved.cycle.progress).toHaveLength(1);
  expect(() => saveReadingSession(saved, session, session.portion.end, today)).toThrow();
  expect(() => saveReadingSession({ ...plan, status: 'archived' }, session, session.portion.end, today)).toThrow();
  const khatma = planFor(content, { goal: { type: 'khatma', weeks: 6 } });
  const prior = open(khatma, content);
  const rescheduled = reschedulePlan(khatma, buildPlanIndex(content), 'redistribute', '2026-10-20');
  expect(() => saveReadingSession(rescheduled, prior, prior.portion.end, '2026-10-20')).toThrow();
});
