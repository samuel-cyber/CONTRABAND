import { context, reddit, redis } from '@devvit/web/server';
import { flairFor } from '../../shared/flair';
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

export type PlayerStats = Streak & {
  shifts: number;
  flair: string;
  lifetimeCut: number;
};

export const readStats = async (userId: string): Promise<PlayerStats> => {
  const raw = await redis.hGetAll(keys.userStats(userId));
  return {
    streak: int(raw.streak),
    best: int(raw.best),
    lastPlayedDay: raw.lastPlayedDay ?? '',
    shifts: int(raw.shifts),
    flair: raw.flair ?? '',
    lifetimeCut: int(raw.cut),
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

/** Best-effort milestone flair. Never throws; never blocks gameplay. */
export const awardFlair = async (ident: Identity): Promise<void> => {
  try {
    const stats = await readStats(ident.userId);
    const text = flairFor({
      shifts: stats.shifts,
      bestStreak: stats.best,
      lifetimeCut: stats.lifetimeCut,
    });
    if (!text || text === stats.flair) return;
    await reddit.setUserFlair({
      subredditName: context.subredditName,
      username: ident.username,
      text,
      backgroundColor: '#D93829',
      textColor: 'light',
    });
    await redis.hSet(keys.userStats(ident.userId), { flair: text });
  } catch (error) {
    console.warn(`Flair not set for ${ident.username}`, error);
  }
};
