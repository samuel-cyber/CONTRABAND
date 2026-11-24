import { context, reddit, redis } from '@devvit/web/server';
import type { BagHistory, BagOutcome, Streak } from '../../shared/reputation';
import { int } from './errors';
import { keys } from './keys';

export type Identity = { userId: string; username: string };

export const getIdentity = async (): Promise<Identity | null> => {
  const userId = context.userId;
  if (!userId) return null;
  const username = context.username ?? (await reddit.getCurrentUsername());
  return username ? { userId, username } : null;
};

/** Best effort; a missing Snoovatar falls back to initials on the client. */
export const resolveSnoovatar = async (
  username: string
): Promise<string | null> => {
  if (context.snoovatar) return context.snoovatar;
  try {
    return (await reddit.getSnoovatarUrl(username)) ?? null;
  } catch (error) {
    console.warn(`Snoovatar lookup failed for ${username}`, error);
    return null;
  }
};

export type PlayerStats = Streak & { shifts: number; flair: string };

export const readStats = async (userId: string): Promise<PlayerStats> => {
  const raw = await redis.hGetAll(keys.userStats(userId));
  return {
    streak: int(raw.streak),
    best: int(raw.best),
    lastPlayedDay: raw.lastPlayedDay ?? '',
    shifts: int(raw.shifts),
    flair: raw.flair ?? '',
  };
};

const isOutcome = (v: string): v is BagOutcome =>
  v === 'clean' || v === 'dirty';

export const readHistory = async (userId: string): Promise<BagHistory> => {
  const raw = await redis.hGetAll(keys.userHistory(userId));
  const out: Record<string, BagOutcome> = {};
  for (const [day, value] of Object.entries(raw)) {
    if (isOutcome(value)) out[day] = value;
  }
  return out;
};
