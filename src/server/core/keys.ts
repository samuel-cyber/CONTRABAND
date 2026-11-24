// Every Redis key in one place. Day-scoped keys expire DAY_KEY_TTL_SECONDS
// after the start of their day; user keys are tiny and permanent.

import { DAY_KEY_TTL_SECONDS } from '../../shared/balance';
import { dayKeyToDate } from '../../shared/day';

export const keys = {
  /** hash: data (StoredBag JSON), passes, busts, cut, buster1..3 */
  bag: (d: string, userId: string) => `day:${d}:bag:${userId}`,
  /** zset: userId -> times assigned to an inspector */
  pool: (d: string) => `day:${d}:pool`,
  /** string: ShiftState JSON */
  shift: (d: string, userId: string) => `day:${d}:shift:${userId}`,
  /** zset: userId -> officer profit */
  lbOfficer: (d: string) => `day:${d}:lb:officer`,
  /** zset: userId -> smuggler's cut for bags packed on day d */
  lbSmuggler: (d: string) => `day:${d}:lb:smuggler`,
  /** hash: userId -> username (for leaderboards) */
  names: (d: string) => `day:${d}:names`,
  /** hash: busted, shifts, bags */
  dayStats: (d: string) => `day:${d}:stats`,
  /** string: postId of the day's checkpoint post */
  dayPost: (d: string) => `day:${d}:post`,
  /** hash: streak, best, lastPlayedDay, shifts, flair */
  userStats: (userId: string) => `user:${userId}:stats`,
  /** hash: dayKey -> clean|dirty (pruned to the honesty window) */
  userHistory: (userId: string) => `user:${userId}:history`,
  /** string counter: checkpoint post number */
  checkpointCounter: () => 'checkpoint:count',
} as const;

/** Seconds until a day-scoped key for day `d` should expire. */
export const dayTtlSeconds = (d: string, now: number = Date.now()): number => {
  const expiresAt = dayKeyToDate(d).getTime() + DAY_KEY_TTL_SECONDS * 1000;
  return Math.max(60, Math.ceil((expiresAt - now) / 1000));
};
