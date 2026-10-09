import type { Riwayah } from '../quran-reader/riwayat';

export type PlanUnit = 'pages' | 'hizbs' | 'juzs';
export type PlanGoal = { type: 'khatma'; weeks: number } | { type: 'wird'; amount: number };
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
export interface ReadingPlan {
  id: string;
  name: string;
  riwayah: Riwayah;
  goal: PlanGoal;
  unit: PlanUnit;
  startDate: string;
  repeat: boolean;
  status: PlanStatus;
  pausedOn?: string;
  /** Local calendar date; archived goals expire after 14 days. */
  archivedOn?: string;
  /** Future plan types can share the calendar without sharing a reading strategy. */
  weekdays: number[];
  reminder: { enabled: boolean; hour: number; minute: number };
  corpus: string;
  totalAyahs: number;
  cycle: PlanCycle;
  history: { number: number; startedOn: string; completedOn: string; ayahs: number }[];
}
export interface PlanDraft {
  name: string;
  riwayah: Riwayah;
  goal: PlanGoal;
  unit: PlanUnit;
  startDate: string;
  start: PlanStart;
  repeat: boolean;
  reminder: ReadingPlan['reminder'];
}
