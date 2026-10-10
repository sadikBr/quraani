/** One ayah of the mushaf, in reading order. */
export interface QueueAyah { surahNumber: number; ayahNumber: number; pageNumber: number }

/**
 * Where playback is: an ayah of the mushaf (by index into the reading order), whether its
 * surah's basmala is being recited first, and how many times the ayah has been heard.
 */
export interface QueuePosition {
  index: number;
  basmala: boolean;
  /** Completed recitations of the current ayah. */
  heard: number;
}

export interface QueuePlan {
  /** Last ayah index to play (inclusive). */
  end: number;
  /** Times each ayah is recited; 0 repeats until stopped. */
  repeat: number;
  /** Whether the basmala precedes ayah 1 of this surah. */
  basmalaBefore: (surahNumber: number) => boolean;
}

/** Starting at an ayah: its surah's basmala comes first when the ayah opens the surah. */
export function startAt(ayahs: readonly QueueAyah[], index: number, plan: QueuePlan): QueuePosition {
  const ayah = ayahs[index];
  return { index, basmala: ayah.ayahNumber === 1 && plan.basmalaBefore(ayah.surahNumber), heard: 0 };
}

/** After the current recitation ends: the basmala leads into its ayah; an ayah repeats, then moves on; null at the end. */
export function afterFinished(ayahs: readonly QueueAyah[], position: QueuePosition, plan: QueuePlan): QueuePosition | null {
  if (position.basmala) return { ...position, basmala: false };
  const heard = position.heard + 1;
  if (plan.repeat === 0 || heard < plan.repeat) return { ...position, heard };
  const next = position.index + 1;
  if (next > plan.end || next >= ayahs.length) return null;
  return startAt(ayahs, next, plan);
}

/** Manual skips go straight to the ayah (no basmala) and start its repetitions over. */
export function skipTo(ayahs: readonly QueueAyah[], index: number, plan: QueuePlan): QueuePosition | null {
  if (index < 0 || index >= ayahs.length || index > plan.end) return null;
  return { index, basmala: false, heard: 0 };
}
