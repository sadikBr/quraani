import type { AyahReference } from '@/lib/quranpedia/types';
import type { ReaderContent, QuranPage } from '../quran-reader/types/reader';
import { assertPlanIndex, buildPlanIndex, nextPortion, recordProgress, type PlanIndex } from './engine';
import { isRecurringPlan, type ReadingPlan } from './types';

export interface PlanReadingSession {
  id: string;
  name: string;
  /** Recurring goals read one selected surah at a time, even when they are far apart. */
  recurring: boolean;
  remainingSurahs: number;
  index: PlanIndex;
  portion: NonNullable<ReturnType<typeof nextPortion>>;
  firstPage: number;
  lastPage: number;
  /** Original pages retain their artwork/cache identity. */
  pages: QuranPage[];
  /** Text and quick jumps are limited to the exact assigned ayahs. */
  content: ReaderContent;
  contains: (ayah: AyahReference) => boolean;
}

export function createReadingSession(plan: ReadingPlan, content: ReaderContent, cycle: string | undefined, slot: string | undefined, today: string): PlanReadingSession {
  const index = buildPlanIndex(content);
  assertPlanIndex(plan, index);
  const portion = nextPortion(plan, today);
  if (!portion?.due || String(portion.cycle) !== cycle || String(portion.slot) !== slot) {
    throw new Error('هذا الورد لم يعد متاحًا. افتح الهدف لاختيار وردك الحالي.');
  }
  const firstPage = index.ayahs[portion.start].pageNumber;
  const lastPage = index.ayahs[portion.end - 1].pageNumber;
  const keys = new Set(index.ayahs.slice(portion.start, portion.end).map(a => `${a.surahNumber}:${a.ayahNumber}`));
  const contains = (ayah: AyahReference) => ayah.mushafId === index.mushafId && keys.has(`${ayah.surahNumber}:${ayah.ayahNumber}`);
  const pages = content.pages.filter(p => p.number >= firstPage && p.number <= lastPage);
  return {
    id: plan.id, name: plan.name, recurring: isRecurringPlan(plan), remainingSurahs: isRecurringPlan(plan) ? plan.ranges.length - portion.slot - 1 : 0, index, portion, firstPage, lastPage, pages, contains,
    content: {
      ...content,
      pages: pages.map(p => ({ ...p, ayahs: p.ayahs.filter(contains), previousAyah: p.previousAyah && contains(p.previousAyah) ? p.previousAyah : undefined })),
      quran: { ...content.quran, surahs: content.quran.surahs.map(s => ({ ...s, ayahs: s.ayahs.filter(contains) })).filter(s => s.ayahs.length) },
    },
  };
}

export function sessionPageEnd(session: PlanReadingSession, pageNumber: number): number {
  if (pageNumber < session.firstPage || pageNumber > session.lastPage) return session.portion.start;
  return Math.min(session.portion.end, session.index.ayahs.findLastIndex(a => a.pageNumber <= pageNumber) + 1);
}

/** Revalidate inside the serialized write; rescheduling or a repeated tap must not finish a different portion. */
export function saveReadingSession(plan: ReadingPlan, session: PlanReadingSession, to: number, today: string): ReadingPlan {
  assertPlanIndex(plan, session.index);
  const next = nextPortion(plan, today);
  if (plan.id !== session.id || !next?.due || next.cycle !== session.portion.cycle || next.slot !== session.portion.slot ||
    next.start !== session.portion.start || next.end !== session.portion.end || !Number.isInteger(to) || to <= next.start || to > next.end) {
    throw new Error('تغيّر هذا الورد. عد إلى الهدف لعرض تقدمك الحالي.');
  }
  return recordProgress(plan, { cycle: next.cycle, slot: next.slot, to }, today);
}
