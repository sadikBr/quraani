import type { Riwayah } from '../quran-reader/riwayat';

export type PlanUnit = 'pages' | 'hizbs' | 'juzs';
export type SequentialGoal = { type: 'khatma'; weeks: number } | { type: 'wird'; amount: number };
export type PlanGoal = SequentialGoal | { type: 'recurring'; surahs: number[] };
export type PlanStart = { kind: 'page' | 'surah' | 'hizb'; number: number };
export type PlanStatus = 'active' | 'paused' | 'completed' | 'archived';
export interface PlanSession { date: string; start: number; end: number }
export interface PlanProgress { date: string; from: number; to: number }
export interface PlanCycle {
  number: number;
  start: number;
  cursor: number;
  sessions: PlanSession[];
  availableDate: string;
  completedOn?: string;
  progress: PlanProgress[];
}
interface PlanBase {
  id: string;
  name: string;
  riwayah: Riwayah;
  startDate: string;
  status: PlanStatus;
  pausedOn?: string;
  /** Local calendar date; archived goals expire after 14 days. */
  archivedOn?: string;
  /** Local calendar weekdays: Sunday = 0. */
  weekdays: number[];
  reminder: { enabled: boolean; hour: number; minute: number };
  corpus: string;
  totalAyahs: number;
}
export interface SequentialPlan extends PlanBase {
  goal: SequentialGoal;
  unit: PlanUnit;
  repeat: boolean;
  cycle: PlanCycle;
  history: { number: number; startedOn: string; completedOn: string; ayahs: number }[];
}
export interface RecurringRange { surah: number; start: number; end: number }
export interface RecurringOccurrence {
  date: string;
  /** Exact edition ordinals, bound to the selected surah within this occurrence. */
  progress: { range: number; from: number; to: number }[];
}
export interface RecurringPlan extends PlanBase {
  goal: { type: 'recurring'; surahs: number[] };
  ranges: RecurringRange[];
  occurrences: RecurringOccurrence[];
}
export type ReadingPlan = SequentialPlan | RecurringPlan;
export function isRecurringPlan(plan: ReadingPlan): plan is RecurringPlan { return plan.goal.type === 'recurring'; }
export interface PlanDraft {
  name: string;
  riwayah: Riwayah;
  goal: SequentialGoal;
  unit: PlanUnit;
  startDate: string;
  start: PlanStart;
  repeat: boolean;
  reminder: ReadingPlan['reminder'];
}
export interface RecurringDraft {
  name: string;
  riwayah: Riwayah;
  surahs: number[];
  weekdays: number[];
  startDate: string;
  reminder: ReadingPlan['reminder'];
}
