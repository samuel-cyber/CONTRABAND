import { HONESTY_MIN_BAGS, HONESTY_WINDOW_DAYS } from './balance';
import { daysBetween } from './day';

export type BagOutcome = 'clean' | 'dirty';
/** dayKey -> outcome of the bag the user packed that day. */
export type BagHistory = Readonly<Record<string, BagOutcome>>;

export type HonestyBadge =
  | { kind: 'new'; text: string }
  | { kind: 'rated'; percent: number; text: string };

const inWindow = (key: string, today: string): boolean => {
  const age = daysBetween(key, today);
  return age >= 0 && age < HONESTY_WINDOW_DAYS;
};

export const honestyBadge = (
  history: BagHistory,
  today: string
): HonestyBadge => {
  const recent = Object.entries(history).filter(([key]) =>
    inWindow(key, today)
  );
  if (recent.length < HONESTY_MIN_BAGS)
    return { kind: 'new', text: 'New Traveler' };
  const clean = recent.filter(([, outcome]) => outcome === 'clean').length;
  const percent = Math.round((clean / recent.length) * 100);
  return { kind: 'rated', percent, text: `${percent}% Honest` };
};

/** History keys that have fallen out of the window and can be deleted. */
export const staleHistoryKeys = (
  history: BagHistory,
  today: string
): string[] => Object.keys(history).filter((key) => !inWindow(key, today));

export type Streak = { streak: number; best: number; lastPlayedDay: string };

/**
 * Streak after completing a shift on `today`. Consecutive UTC days extend it,
 * a gap resets it to 1, and a second completion on the same day changes nothing.
 */
export const nextStreak = (prev: Streak | null, today: string): Streak => {
  if (!prev) return { streak: 1, best: 1, lastPlayedDay: today };
  const gap = daysBetween(prev.lastPlayedDay, today);
  if (gap <= 0) return prev;
  const streak = gap === 1 ? prev.streak + 1 : 1;
  return { streak, best: Math.max(prev.best, streak), lastPlayedDay: today };
};
