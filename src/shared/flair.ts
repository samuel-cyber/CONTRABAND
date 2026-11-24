import { FLAIR_MILESTONES } from './balance';

export type FlairProgress = {
  shifts: number;
  bestStreak: number;
  lifetimeCut: number;
};

/** The highest milestone flair earned, or null if none yet. */
export const flairFor = (p: FlairProgress): string | null => {
  for (const m of FLAIR_MILESTONES) {
    if ('minLifetimeCut' in m && p.lifetimeCut >= m.minLifetimeCut)
      return m.text;
    if ('minBestStreak' in m && p.bestStreak >= m.minBestStreak) return m.text;
    if ('minShifts' in m && p.shifts >= m.minShifts) return m.text;
  }
  return null;
};
